/**
 * 画布（Sapdon UI Designer）
 *
 * 渲染策略：把 `layout.js` 算出的盒子铺成**绝对定位的 div**（不是 <canvas>）——
 * 这样命中测试、拖动、缩放手柄全部走 DOM 事件，零依赖且天然支持叠层顺序。
 *
 * 交互（对齐 Qt Designer 的手感）：
 *   点击选中 · 拖动改 offset（grid 子项改 grid_position、表单格子项改 pos）· 右下角手柄改 size
 *   方向键微调 1px（Shift = 10px）· Delete 删除
 *   ★ 沿主轴拖动 stack_panel 子项**不生效**（流式布局接管）——直接弹提示，不骗用户
 */

import { h, render } from './dom.js'
import { layoutTree, paintOrder, offsetFromDrag, sizeFromPixels, formatRect } from '../layout.js'
import { visibilityOf } from '../gate.js'
import { gridDimensions } from '../layout.js'
import { paintNode } from '../paint.js'
import { resolveTexture, nodeTexture } from '../textures.js'

const MODE_LABEL = { anchored: '锚点', flow: '流式', grid: '格位', 'form-grid-cell': '槽位' }

export function renderCanvas(host, app) {
  const { store } = app
  const doc = store.doc
  const [fw, fh] = doc.canvas.size
  const zoom = doc.canvas.zoom || 2
  const layout = layoutTree(doc.elements, { x: 0, y: 0, w: fw, h: fh })
  // 多选面板（对齐/分布）要按盒子几何算，这里把这一份留给它用
  app.lastLayout = layout

  // ★ 门控模拟：被挡掉的元素**真的不画**（不能只调透明度 —— 子项是平铺的兄弟节点，父级变淡盖不住它们；
  //   早先只加 .gated-out 的 22% 透明度，结果三页文字全叠着显示）
  const hidden = new Set()
  if (app.gateEnabled) {
    for (const box of layout.list) {
      const parentHidden = box.parentId ? hidden.has(box.parentId) : false
      const selfHidden = !visibilityOf(box.node, app.sim, true).visible
      if (parentHidden || selfHidden) hidden.add(box.id)
    }
  }

  const viewport = h('div', { class: 'canvas-viewport' })
  const frame = h('div', {
    class: 'canvas-frame',
    style: { width: `${fw * zoom}px`, height: `${fh * zoom}px` },
    dataset: { frame: '1' },
  })
  frame.addEventListener('click', (e) => {
    if (e.target === frame || e.target === viewport) store.select(null)
  })
  // 空白处拖出选框（Qt 的 rubber band）：命中所有**相交**的盒子，主选 = 最后一个
  frame.addEventListener('pointerdown', (e) => {
    if (e.target !== frame && e.target !== viewport) return
    if (e.button !== 0) return
    const startX = e.clientX
    const startY = e.clientY
    const rectOf = frame.getBoundingClientRect ? frame.getBoundingClientRect() : { left: 0, top: 0 }
    const marquee = h('div', { class: 'marquee' })
    let moved = false
    const move = (ev) => {
      const x1 = Math.min(startX, ev.clientX) - rectOf.left
      const y1 = Math.min(startY, ev.clientY) - rectOf.top
      const w = Math.abs(ev.clientX - startX)
      const hgt = Math.abs(ev.clientY - startY)
      if (w < 3 && hgt < 3) return
      moved = true
      marquee.style.left = `${x1}px`
      marquee.style.top = `${y1}px`
      marquee.style.width = `${w}px`
      marquee.style.height = `${hgt}px`
    }
    const up = (ev) => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', up)
      if (marquee.parentElement) marquee.parentElement.removeChild(marquee)
      if (!moved) return
      const x1 = Math.min(startX, ev.clientX) - rectOf.left
      const x2 = Math.max(startX, ev.clientX) - rectOf.left
      const y1 = Math.min(startY, ev.clientY) - rectOf.top
      const y2 = Math.max(startY, ev.clientY) - rectOf.top
      const ids = marqueeHits(layout, { x1, y1, x2, y2 }, zoom)
      store.selectMany(ids)
    }
    frame.appendChild(marquee)
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', up)
  })

  for (const box of paintOrder(layout)) {
    if (hidden.has(box.id)) continue
    frame.appendChild(boxEl(box, layout, app, zoom, frame))
  }

  // 选中框的缩放手柄
  const sel = layout.byId.get(store.selection)
  if (sel && !hidden.has(sel.id)) frame.appendChild(resizeHandle(sel, layout, app, zoom))

  // Ctrl/⌘ + 滚轮 = 缩放（Qt 同款）
  const zoomAt = (delta) => {
    const cur = doc.canvas.zoom || 2
    const next = Math.max(0.5, Math.min(4, Math.round((cur + (delta > 0 ? -0.5 : 0.5)) * 2) / 2))
    if (next !== cur) store.setCanvas({ zoom: next })
  }
  viewport.addEventListener(
    'wheel',
    (e) => {
      if (!e.ctrlKey && !e.metaKey) return
      if (e.preventDefault) e.preventDefault()
      zoomAt(e.deltaY || 0)
    },
    { passive: false },
  )
  viewport.appendChild(frame)
  render(host, [toolbar(app, hidden.size, host), viewport, legend(app, sel)])
}

/** 适应窗口：按可用宽高算出最大整数/半整数倍率（画布比视口大时靠它一键缩回来看全貌） */
function fitZoom(app, host) {
  const doc = app.store.doc
  const [fw, fh] = doc.canvas.size
  const vw = (host && host.clientWidth) || 900
  const vh = (host && host.clientHeight) || 600
  const z = Math.min((vw - 40) / fw, (vh - 60) / fh)
  return Math.max(0.5, Math.min(4, Math.round(z * 2) / 2))
}

function toolbar(app, hiddenCount = 0, host = null) {
  const { store } = app
  const doc = store.doc
  const zoomBtn = (v) =>
    h('button', {
      class: `mini${(doc.canvas.zoom || 2) === v ? ' on' : ''}`,
      text: `${v}×`,
      onclick: () => store.setCanvas({ zoom: v }),
    })
  const modeBtn = (mode, label, title) =>
    h('button', {
      class: `mini${(app.display || 'preview') === mode ? ' on' : ''}`,
      text: label,
      title,
      onclick: () => app.setDisplay(mode),
    })
  const [w, hgt] = doc.canvas.size
  return h(
    'div',
    { class: 'pane-toolbar' },
    modeBtn('preview', '贴图预览', '只看画面：不画控件框，标签只在悬停/选中时出现'),
    modeBtn('wire', '线框', '给每个控件描框并常显标签（调版面时用）'),
    h('span', { class: 'spacer' }),
    h('span', { class: 'muted', text: '画布' }),
    h('input', { type: 'number', class: 'tiny', value: String(w), onchange: (e) => store.setCanvas({ size: [Number(e.target.value) || 320, store.doc.canvas.size[1]] }) }),
    '×',
    h('input', { type: 'number', class: 'tiny', value: String(hgt), onchange: (e) => store.setCanvas({ size: [store.doc.canvas.size[0], Number(e.target.value) || 207] }) }),
    h('span', { class: 'spacer' }),
    h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: app.gateEnabled, onchange: (e) => app.setGate(e.target.checked) }), '门控模拟'),
    app.gateEnabled && hiddenCount ? h('span', { class: 'muted', title: '被门控挡掉的元素不画（在对象树里仍可选中）', text: `已隐藏 ${hiddenCount}` }) : null,
    // 三个门控输入折进一个小三角里：平时不占地方，要看别的页再展开
    h(
      'details',
      { class: 'gate-box' },
      h('summary', { title: '填写运行期会 emit 的值，按绑定表达式模拟显隐' }, '值'),
      h(
        'div',
        { class: 'gate-fields' },
        h('input', { class: 'gate-in', value: app.sim.title, placeholder: '#title_text', oninput: (e) => app.setSim({ title: e.target.value }) }),
        h('input', { class: 'gate-in', value: app.sim.body, placeholder: '#form_text', oninput: (e) => app.setSim({ body: e.target.value }) }),
        h('input', { class: 'gate-in', value: Array.isArray(app.sim.buttons) ? app.sim.buttons.join(',') : app.sim.buttons, placeholder: '#form_button_text', oninput: (e) => app.setSim({ buttons: e.target.value }) }),
      ),
    ),
    h('span', { class: 'spacer' }),
    h('button', { class: 'mini', text: '适应', title: '缩放到适合窗口', onclick: () => store.setCanvas({ zoom: fitZoom(app, host) }) }),
    zoomBtn(1),
    zoomBtn(2),
    zoomBtn(3),
  )
}

function legend(app, selBox) {
  const wire = (app.display || 'preview') === 'wire'
  return h(
    'div',
    { class: 'canvas-legend muted' },
    wire ? h('span', { text: '线框模式：蓝=锚点 · 绿=流式 · 紫=格子 · 亮框=选中' }) : h('span', { text: '贴图预览：画的就是引擎会画的东西（模板内部/集合实例/字体不模拟 —— 真机才是判据）' }),
    h('span', { class: 'spacer' }),
    selBox ? h('span', { class: 'drag-tip', text: `选中 ${selBox.id}：${dragMode(selBox, app.store.doc.canvas.size).hint}` }) : null,
    h('span', { class: 'spacer' }),
    h('span', { text: app.textures ? `${app.textures.paths.size} 张贴图可用` : '未连资源包' }),
  )
}

function boxEl(box, layout, app, zoom, frame) {
  const { store } = app
  const node = box.node
  const r = box.rect
  const sel = store.selection === box.id
  /** 多选里的一员（非主选）—— 画一层淡的选中框，与主选区分开 */
  const coSel = !sel && Array.isArray(store.selectedIds) && store.selectedIds.includes(box.id)
  const wire = (app.display || 'preview') === 'wire'
  const gate = visibilityOf(node, app.sim, app.gateEnabled)
  // 格子参考线：只在选中该容器（或它的直接子项）时画，平时不挡画面
  const selectedContainer = sel || (store.selection && box.id === layout.byId.get(store.selection)?.parentId)

  const showLabel = wire || sel || (gate.unknown || false)
  const el = h('div', {
    class: [
      'canvas-box',
      wire ? `mode-${box.placement}` : 'mode-preview',
      sel ? 'selected' : '',
      coSel ? 'co-selected' : '',
      node.debug ? 'debug' : '',
      gate.visible ? '' : 'gated-out',
      gate.unknown ? 'gate-unknown' : '',
      showLabel ? 'show-label' : '',
    ]
      .filter(Boolean)
      .join(' '),
    style: {
      left: `${r.x * zoom}px`,
      top: `${r.y * zoom}px`,
      width: `${Math.max(r.w * zoom, wire ? 4 : 1)}px`,
      height: `${Math.max(r.h * zoom, wire ? 4 : 1)}px`,
    },
    dataset: { id: box.id },
    title: `${node.id}\n${node.type}${node.template ? `@${node.template}` : ''}\n${formatRect(r)}`,
  })

  // 格子参考线：只在选中该容器（或它的直接子项）时画，平时不挡画面
  if ((box.container === 'grid' || box.container === 'form-grid') && selectedContainer) {
    const [cols, rows] = gridDimensions(node.props)
    for (let c = 1; c < cols; c++) {
      el.appendChild(h('div', { class: 'cell-line v', style: { left: `${(100 * c) / cols}%` } }))
    }
    for (let rr = 1; rr < rows; rr++) {
      el.appendChild(h('div', { class: 'cell-line h', style: { top: `${(100 * rr) / rows}%` } }))
    }
  }

  // ★ 真实贴图 / 文本：绘制指令来自 paint.js（与离屏光栅化共用同一份视觉规则）
  const ops = paintNode(node, { x: 0, y: 0, w: r.w, h: r.h }, { textures: app.textures })
  for (const op of ops) el.appendChild(opToDom(op, zoom))

  const badges = []
  const texBadge = textureBadge(node, app)
  if (texBadge) badges.push(texBadge)
  if (box.notes.includes('grid-offset-ignored')) badges.push('offset 无效(格内)')
  if (box.notes.includes('flow-offset-ignored')) badges.push('offset 无效(流式)')
  if (box.notes.includes('flow-main-size-missing')) badges.push('缺主轴尺寸')
  if (box.notes.includes('form-grid-offset-compensated') && box.ghostOffset) {
    badges.push(`槽 ${box.ghostOffset.slot} → 靠 offset 挪到格[${box.ghostOffset.col},${box.ghostOffset.row}]`)
  } else if (box.placement === 'form-grid-cell' && box.ghostOffset) {
    badges.push(`槽 ${box.ghostOffset.slot}`)
  }
  if (gate.unknown) badges.push('门控未判定')

  el.appendChild(
    h(
      'div',
      { class: 'box-label' },
      // 绘制序号（#N）+ layer（L<n>）：点开线框模式就能看出"谁盖在谁上面"
      h('span', { class: 'box-order', text: wire ? `#${box.order + 1} ` : '' }),
      h('span', { class: 'box-id', text: node.id }),
      h('span', { class: 'box-type', text: node.type }),
      box.layer ? h('span', { class: 'box-layer', text: `L${box.layer}` }) : null,
      badges.length ? h('span', { class: 'box-badge', text: badges.join(' · ') }) : null,
    ),
  )

  el.addEventListener('click', (e) => {
    e.stopPropagation()
    // Shift / Ctrl(Cmd) 点 = 加入/移出多选（Qt 同款）
    store.select(box.id, { add: !!(e.shiftKey || e.ctrlKey || e.metaKey) })
  })
  el.addEventListener('pointerdown', (e) => {
    e.stopPropagation()
    if (e.shiftKey || e.ctrlKey || e.metaKey) return // 加减选集时不起拖动
    if (!(Array.isArray(store.selectedIds) && store.selectedIds.length > 1 && store.selectedIds.includes(box.id))) {
      store.select(box.id)
    }
    // ★ 本体拖动只在"小叶子"上放行（标签/图标这种）：够得着，拖坏也只影响自己。
    //   容器与铺满整页的东西（书壳背景、整页面板）必须拖黄色手柄 —— 否则误抓一下整页就飞了。
    if (e.altKey || bodyDraggable(box, app.store.doc.canvas.size)) startDrag(e, box, layout, app, zoom, frame)
  })
  if (sel) el.appendChild(moveHandle(box, layout, app, zoom, frame))
  return el
}

/**
 * 框选命中：与选框**相交**的盒子（画布像素 → 画布坐标要除以 zoom）。
 * 被命中的容器若整棵子树也相交，只保留最外层命中的那个（避免一框就把整页 79 个元素全选上）。
 * @param {{list:object[]}} layout
 * @param {{x1:number,y1:number,x2:number,y2:number}} box 选框（画布像素）
 * @param {number} zoom
 */
export function marqueeHits(layout, box, zoom = 2) {
  const r = { x1: box.x1 / zoom, y1: box.y1 / zoom, x2: box.x2 / zoom, y2: box.y2 / zoom }
  const hits = layout.list.filter((b) => {
    const q = b.rect
    return q.x < r.x2 && q.x + q.w > r.x1 && q.y < r.y2 && q.y + q.h > r.y1
  })
  const hitIds = new Set(hits.map((b) => b.id))
  // 只留"祖先没被命中"的那些
  return hits.filter((b) => {
    let p = b.parentId
    while (p) {
      if (hitIds.has(p)) return false
      const up = layout.byId.get(p)
      p = up ? up.parentId : null
    }
    return true
  }).map((b) => b.id)
}

/**
 * 本体能不能直接拖：**没有子项**，且**不是铺满整页的大背景**。
 *  · 有子项 ⇒ 动它会带走一整棵子树（外层容器往往铺满整页）⇒ 一律走手柄
 *  · 叶子但铺满整页（书壳 `book_background` / `bg`）⇒ 点哪都抓到它 ⇒ 也走手柄
 * 其余（标签、图标、按钮这类小叶子）直接拖，符合直觉。
 * @param {object} box layout 盒子
 * @param {[number,number]} [canvasSize] 画布尺寸（不给就不做"铺满整页"判断）
 */
export function bodyDraggable(box, canvasSize) {
  const kids = box.node && box.node.controls ? box.node.controls.length : 0
  if (kids > 0) return false
  if (!canvasSize) return true
  const a = (box.rect.w || 0) * (box.rect.h || 0)
  const c = canvasSize[0] * canvasSize[1]
  if (!c) return true
  return a / c <= 0.9
}

/** 选中元素左上角的移动手柄：拖它才移动（对角是缩放手柄） */
function moveHandle(box, layout, app, zoom, frame) {
  const r = box.rect
  const mode = dragMode(box, app.store.doc.canvas.size)
  const handle = h('div', {
    class: 'move-handle',
    style: { left: `${r.x * zoom}px`, top: `${r.y * zoom}px` },
    title: mode.hint,
  })
  handle.addEventListener('pointerdown', (e) => {
    e.stopPropagation()
    startDrag(e, box, layout, app, zoom, frame)
  })
  return handle
}

/**
 * 这个元素拖动会发生什么 —— 四种容器语义不同，必须先告诉用户，否则"一拖就散架"。
 * @returns {{kind:'offset'|'grid'|'form'|'flow', body:boolean, hint:string}}
 */
export function dragMode(box, canvasSize) {
  const body = bodyDraggable(box, canvasSize)
  const how = body ? '拖本体（或左上角手柄）' : '拖左上角黄色手柄'
  if (box.placement === 'flow') return { kind: 'flow', body, hint: `${how} = 在流式容器里换顺序` }
  if (box.placement === 'grid-cell') return { kind: 'grid', body, hint: `${how} = 换格位（吸附到格）` }
  if (box.placement === 'form-grid-cell') return { kind: 'form', body, hint: `${how} = 换目标格（槽位不变）` }
  return { kind: 'offset', body, hint: `${how} = 改 offset（锚点不动）` }
}

/**
 * 拖动：**只画幽灵预览，落点确定后才提交**。
 * 早先是"元素本体实时跟着鼠标走"，外层容器一动整页跟着跑，看着就像散架了。
 */
function startDrag(e, box, layout, app, zoom, frame) {
  const { store } = app
  const node = box.node
  const mode = dragMode(box, store.doc.canvas.size)
  const host = frame
  const startX = e.clientX
  const startY = e.clientY
  if (!host) return

  const parentBox = box.parentId ? layout.byId.get(box.parentId) : null
  const parentRect = parentBox ? parentBox.rect : { x: 0, y: 0, w: store.doc.canvas.size[0], h: store.doc.canvas.size[1] }

  const ghost = h('div', { class: 'drag-ghost' })
  const hint = h('div', { class: 'drag-hint', text: mode.hint })
  host.appendChild(ghost)
  host.appendChild(hint)

  let dx = 0
  let dy = 0
  let target = null
  let moved = false

  const onMove = (ev) => {
    dx = (ev.clientX - startX) / zoom
    dy = (ev.clientY - startY) / zoom
    if (!moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return
    moved = true

    if (mode.kind === 'offset') {
      target = null
      const r = box.rect
      ghost.style.cssText = `left:${(r.x + dx) * zoom}px;top:${(r.y + dy) * zoom}px;width:${r.w * zoom}px;height:${r.h * zoom}px`
      hint.textContent = `offset ${Math.round(dx)}, ${Math.round(dy)}`
    } else if (mode.kind === 'grid' || mode.kind === 'form') {
      const cols = Math.max(1, Number((parentBox.node.props[parentBox.node.type === 'grid' ? 'grid_dimensions' : 'dimensions'] || [1, 1])[0]) || 1)
      const gd = parentBox.node.props.grid_dimensions || parentBox.node.props.dimensions || [1, 1]
      const cw = parentBox.rect.w / Math.max(1, Number(gd[0]) || 1)
      const chh = parentBox.rect.h / Math.max(1, Number(gd[1]) || 1)
      if (mode.kind === 'grid') {
        const gp = Array.isArray(node.gridPosition) ? node.gridPosition : [0, 0]
        target = [
          Math.max(0, Math.min(cols - 1, gp[0] + Math.round(dx / cw))),
          Math.max(0, gp[1] + Math.round(dy / chh)),
        ]
        ghost.style.cssText = `left:${(parentBox.rect.x + target[0] * cw) * zoom}px;top:${(parentBox.rect.y + target[1] * chh) * zoom}px;width:${cw * zoom}px;height:${chh * zoom}px`
      } else {
        const pos = Array.isArray(node.pos) ? node.pos : [0, 0]
        target = [pos[0] + Math.round(dx / cw), pos[1] + Math.round(dy / chh)]
        ghost.style.cssText = `left:${(parentBox.rect.x + target[0] * cw) * zoom}px;top:${(parentBox.rect.y + target[1] * chh) * zoom}px;width:${cw * zoom}px;height:${chh * zoom}px`
      }
      hint.textContent = `${mode.kind === 'grid' ? '格位' : '目标格'} [${target.join(', ')}]`
    } else {
      // 流式：算插入位置，画一条插入线
      const siblings = layout.list.filter((b) => b.parentId === box.parentId && b.id !== box.id)
      const horizontal = (parentBox.node.props || {}).orientation === 'horizontal'
      const origin = parentBox.rect
      // 画布单位下的光标位置 = 原矩形 + 累计位移（不依赖 DOM 度量，测试桩也能跑）
      const cursor = horizontal ? box.rect.x + dx : box.rect.y + dy
      let index = siblings.length
      for (let i = 0; i < siblings.length; i++) {
        const r = siblings[i].rect
        const mid = horizontal ? r.x + r.w / 2 : r.y + r.h / 2
        if (cursor < mid) {
          index = i
          break
        }
      }
      const before = siblings[index]
      const after = siblings[index - 1]
      const at = before ? (horizontal ? before.rect.x : before.rect.y) : after ? (horizontal ? after.rect.x + after.rect.w : after.rect.y + after.rect.h) : horizontal ? origin.x : origin.y
      target = index
      ghost.style.cssText = horizontal
        ? `left:${at * zoom}px;top:${origin.y * zoom}px;width:3px;height:${origin.h * zoom}px`
        : `left:${origin.x * zoom}px;top:${at * zoom}px;height:3px;width:${origin.w * zoom}px`
      hint.textContent = `插入到第 ${index + 1} 位`
    }
  }

  const onUp = () => {
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', onUp)
    if (host.removeChild) {
      host.removeChild(ghost)
      host.removeChild(hint)
    }
    if (!moved) return
    if (mode.kind === 'offset') {
      store.setProp(node.id, 'offset', offsetFromDrag(node.props.offset, Math.round(dx), Math.round(dy), parentRect))
      app.notice(`offset = ${JSON.stringify(store.node(node.id).props.offset)}（锚点没动）`)
    } else if (mode.kind === 'grid') {
      store.setGridPosition(node.id, target)
      app.notice(`grid_position = [${target.join(', ')}]`)
    } else if (mode.kind === 'form') {
      store.setPos(node.id, target)
      app.notice(`目标格 pos = [${target.join(', ')}]（基准格仍由槽位 slot=${node.slot} 决定）`)
    } else {
      store.reparent(node.id, box.parentId, target)
      app.notice(`流式顺序：移到第 ${target + 1} 位`)
    }
  }

  document.addEventListener('pointermove', onMove)
  document.addEventListener('pointerup', onUp)
}

function resizeHandle(box, layout, app, zoom) {
  const { store } = app
  const node = box.node
  const r = box.rect
  const handle = h('div', { class: 'resize-handle', style: { left: `${(r.x + r.w) * zoom}px`, top: `${(r.y + r.h) * zoom}px` } })
  handle.addEventListener('pointerdown', (e) => {
    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    const parentBox = box.parentId ? layout.byId.get(box.parentId) : null
    const parentRect = parentBox ? parentBox.rect : { x: 0, y: 0, w: store.doc.canvas.size[0], h: store.doc.canvas.size[1] }
    const onMove = (ev) => {
      const w = Math.max(2, r.w + (ev.clientX - startX) / zoom)
      const hgt = Math.max(2, r.h + (ev.clientY - startY) / zoom)
      handle.style.left = `${(r.x + w) * zoom}px`
      handle.style.top = `${(r.y + hgt) * zoom}px`
    }
    const onUp = (ev) => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      const w = Math.max(2, r.w + (ev.clientX - startX) / zoom)
      const hgt = Math.max(2, r.h + (ev.clientY - startY) / zoom)
      store.setProp(node.id, 'size', sizeFromPixels(node.props.size, w, hgt, parentRect))
      app.notice(`size = ${JSON.stringify(node.props.size)}（沿用原单位）`)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  })
  return handle
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}

// ---------------------------------------------------------------------------
// ★ 贴图 / 文本渲染（"拿原版贴图资源来显示"）
// ---------------------------------------------------------------------------

/** 该节点在画布上要不要报"纹理"相关的角标 */
function textureBadge(node, app) {
  const props = node.props || {}
  const tex = nodeTexture(node)
  if (!tex) return ''
  const res = resolveTexture(tex, app.textures)
  if (res.known === false) return `缺纹理 ${res.path}`
  if (res.caseMismatch) return `大小写应为 ${res.caseMismatch.replace(/^textures\//, '')}`
  if (!res.previewable) return 'TGA 不能预览'
  if (props.uv !== undefined || props.uv_size !== undefined) return 'uv 未模拟'
  return ''
}

// ---------------------------------------------------------------------------
// ★ 绘制指令 → DOM（与离屏光栅化共用 paint.js 的规则）
// ---------------------------------------------------------------------------

/**
 * 一条绘制指令 → 一个 DOM 层。
 * 贴图那几种模式（九宫格/平铺/裁切）在这里落到 CSS，规则本身在 `src/paint.js` 里决定。
 */
function opToDom(op, zoom = 2) {
  if (op.kind === 'text') {
    const style = {
      fontSize: `${Math.max(6, Math.round(op.fontSize * zoom))}px`,
      textAlign: op.align,
      color: cssColor(op.color),
      lineHeight: String(op.lineHeight),
      justifyContent: op.align === 'left' ? 'flex-start' : op.align === 'right' ? 'flex-end' : 'center',
      opacity: op.alpha === undefined || op.alpha === 1 ? undefined : String(op.alpha),
    }
    if (op.shadow) style.textShadow = '0 1px 2px rgba(0,0,0,.9)'
    return h('div', { class: 'label-text', style }, h('span', { text: op.text }))
  }

  if (op.kind === 'placeholder') {
    if (op.reason === 'uv') return h('div', { class: 'tex-note', text: 'uv 未模拟' })
    const cls = op.reason === 'tga' ? 'tex-missing tga' : 'tex-missing'
    const title =
      op.reason === 'tga'
        ? `${op.texture} 是 .tga，浏览器不能预览（真机正常）`
        : `缺纹理：${op.texture}（原版包与工程包里都没有）`
    return h('div', { class: cls, title, text: op.reason === 'tga' ? 'TGA' : '缺纹理' })
  }

  if (op.kind === 'template') {
    return h('div', { class: 'tex-template', title: `原版模板 @${op.template}：结构在 vanilla UI 文件里，编辑器不解析（真机会正常显示）` })
  }

  const url = op.url
  if (op.nine) {
    // 九宫格：切片规则在 paint.js 里算好（含 src/dst 九块），这里只负责"把每块的源区域拉伸铺满它的目标框"。
    // ★ 必须逐块换算 background-size/position（早期版本按整图缩放 ⇒ 与 dst 几何不一致，画面炸成一坨色块）
    const pieces = op.nine.pieces
    if (pieces && pieces.pieces && pieces.pieces.length) {
      const [sw, sh] = pieces.size
      const wrap = h('div', { class: 'tex-layer nine' })
      for (const piece of pieces.pieces) {
        const [dx, dy, dw, dh] = piece.dst
        const [sx, sy, pw, ph] = piece.src
        const scaleX = (dw * zoom) / pw
        const scaleY = (dh * zoom) / ph
        wrap.appendChild(
          h('div', {
            class: 'nine-piece',
            style: {
              left: `${(dx - op.rect.x) * zoom}px`,
              top: `${(dy - op.rect.y) * zoom}px`,
              width: `${dw * zoom}px`,
              height: `${dh * zoom}px`,
              backgroundImage: `url("${url}")`,
              backgroundSize: `${sw * scaleX}px ${sh * scaleY}px`,
              backgroundPosition: `${-sx * scaleX}px ${-sy * scaleY}px`,
              opacity: op.alpha === undefined ? '1' : String(op.alpha),
              filter: op.gray ? 'grayscale(1)' : undefined,
            },
          }),
        )
      }
      return wrap
    }
    const slice = Array.isArray(op.nine.slice) ? op.nine.slice.join(' ') : `${op.nine.slice}`
    return h('div', {
      class: 'tex-layer nine',
      style: {
        borderImageSource: `url("${url}")`,
        borderImageSlice: slice,
        borderImageRepeat: 'stretch',
        borderWidth: `${Math.max(1, (Array.isArray(op.nine.slice) ? op.nine.slice[0] : op.nine.slice) * zoom)}px`,
      },
    })
  }

  if (op.clip) {
    const { dir, ratio } = op.clip
    const horizontal = dir === 'left' || dir === 'right'
    const stretch = op.fit === 'stretch'
    const size = stretch
      ? horizontal
        ? `${100 / ratio}% 100%`
        : `100% ${100 / ratio}%`
      : horizontal
        ? `auto 100%`
        : `100% auto`
    const inner = h('div', {
      class: 'tex-clip-inner',
      style: {
        backgroundImage: `url("${url}")`,
        backgroundSize: size,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: dir === 'left' ? 'left center' : dir === 'right' ? 'right center' : dir === 'up' ? 'center top' : 'center bottom',
        filter: op.gray ? 'grayscale(1)' : undefined,
      },
    })
    const outerStyle = {
      width: horizontal ? `${ratio * 100}%` : '100%',
      height: horizontal ? '100%' : `${ratio * 100}%`,
      left: dir === 'right' ? 'auto' : '0',
      right: dir === 'right' ? '0' : 'auto',
      top: dir === 'down' ? 'auto' : '0',
      bottom: dir === 'down' ? '0' : 'auto',
      opacity: String(op.alpha === undefined ? 1 : op.alpha),
    }
    return h('div', { class: 'tex-layer clip-outer' }, h('div', { class: 'tex-clip', style: outerStyle }, inner))
  }

  const repeat = op.repeat === 'repeat' ? 'repeat' : op.repeat === 'repeat-x' ? 'repeat-x' : op.repeat === 'repeat-y' ? 'repeat-y' : 'no-repeat'
  const layer = h('div', {
    class: 'tex-layer',
    style: {
      backgroundImage: `url("${url}")`,
      backgroundRepeat: repeat,
      backgroundSize: repeat === 'no-repeat' ? (op.fit === 'stretch' ? '100% 100%' : 'contain') : 'auto',
      backgroundPosition: 'center',
      filter: op.gray ? 'grayscale(1)' : undefined,
      opacity: op.alpha === undefined ? '1' : String(op.alpha),
    },
  })
  return op.state ? h('div', { class: `btn-face state-${op.state}` }, layer) : layer
}

function cssColor(color) {
  if (!Array.isArray(color) || color.length < 3) return '#e8ecf5'
  const to255 = (c) => Math.max(0, Math.min(255, Math.round(Number(c) * 255)))
  const a = color.length > 3 ? Math.max(0, Math.min(1, Number(color[3]))) : 1
  return `rgba(${to255(color[0])},${to255(color[1])},${to255(color[2])},${a})`
}

export { MODE_LABEL, cssColor }
