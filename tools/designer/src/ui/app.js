/**
 * 编辑器外壳（Sapdon UI Designer）
 *
 * 负责面板拼装、页签、快捷键与"选中 → 操作"的语义；具体渲染交给 canvas/tree/inspector。
 * 刻意**不碰** `window`/`localStorage`/`FileReader` —— 那些走 `opts` 注入
 * （`main.js` 注入浏览器实现，单测里注入桩），这样这个模块能在没有浏览器的环境里被冒烟测试。
 *
 * 面板布局对齐 Qt Designer：左=控件箱/页面，中=画布(产物/代码/诊断)，右=对象树+属性。
 */

import { h, render } from './dom.js'
import { renderCanvas } from './canvas.js'
import { renderTree } from './tree.js'
import { renderInspector, SUGGESTION_LISTS } from './inspector.js'
import { WIDGETS, isContainer, widgetFor, widgetsAllowedIn } from '../catalog.js'
import { generate } from '../codegen.js'
import { previewAll, jsonNormalize, FORM_MARKER } from '../preview.js'
import { diagnose, RULES } from '../diagnostics.js'
import { codeViewHtml } from './highlight.js'
import { flatten, gateTags, screenKind, screenOf, serializeProject } from '../model.js'

export function mountApp(root, store, opts = {}) {
  const app = {
    store,
    tab: 'canvas',
    /** 画布模式：'preview' 只看画面（默认），'wire' 描框调版面 */
    display: 'preview',
    /** 门控模拟：工程里有 #visible 门控就默认打开（否则所有页会叠在一起，看着很乱） */
    gateEnabled: hasPageGates(store.doc),
    sim: { title: '', body: '', buttons: '' },
    statusMessage: '就绪',
    open: opts.open || null,
    download: opts.download || null,
    samples: opts.samples || null,
    loadSample: opts.loadSample || null,
    draft: opts.draft || null,
    /** 版面偏好（侧边栏宽度）的读写口：与草稿分开注入，换工程不重置版式 */
    layout: opts.layout || null,
    setDisplay(mode) {
      app.display = mode === 'wire' ? 'wire' : 'preview'
      renderAll(app)
    },
    /** 纹理索引（服务端扫资源包得到）：{ paths:Set, noPreview:Set } | null（null = 没有资源包，不判定不画图） */
    textures: null,
    setTextures(index) {
      app.textures = index
      renderAll(app)
    },
    notice(msg) {
      app.statusMessage = String(msg)
      if (opts.notice) opts.notice(msg)
      if (app.els) renderStatus(app)
    },
    setSim(patch) {
      app.sim = { ...app.sim, ...patch }
      renderAll(app)
    },
    setGate(on) {
      app.gateEnabled = !!on
      renderAll(app)
    },
    /** 换工程后重置与文档相关的编辑器状态（门控模拟值、默认开关） */
    syncDocDefaults() {
      app.gateEnabled = hasPageGates(store.doc)
      app.sim = defaultSim(store.doc)
    },
    setTab(tab) {
      app.tab = tab
      renderAll(app)
    },
    addWidget(type) {
      addWidget(app, type)
    },
    /** 在树里高亮并滚到刚加/刚选中的元素（加了控件却找不到它在哪，很烦） */
    reveal(id) {
      app.revealId = id
      if (app.revealTimer) clearTimeout(app.revealTimer)
      app.revealTimer = setTimeout(() => {
        app.revealId = null
        if (app.els) renderTree(app.els.treeHost, app)
      }, 1200)
    },
    renameNode(id) {
      const node = store.node(id)
      if (!node) return
      const next = opts.prompt ? opts.prompt('重命名元素 id（只允许 A-Za-z0-9_-）', node.id) : null
      if (next) store.rename(id, next)
    },
    removeNode(id) {
      const ok = opts.confirm ? opts.confirm(`删除元素 ${id} 及其所有子项？`) : true
      if (ok) store.remove(id)
    },
    save() {
      if (opts.save) opts.save(serializeProject(store.doc), `${store.doc.uiSystem.identifier}.sui.json`)
    },
    copy(text, what) {
      if (opts.copy) opts.copy(text)
      app.notice(`已复制${what || ''}`)
    },
    generated() {
      return generate(store.doc)
    },
  }

  const shell = h('div', { class: 'app' })
  const els = {
    topbar: h('div', { class: 'topbar' }),
    main: h('div', { class: 'main' }),
    left: h('div', { class: 'col left' }),
    center: h('div', { class: 'col center' }),
    right: h('div', { class: 'col right' }),
    treeHost: h('div', { class: 'pane' }),
    inspectorHost: h('div', { class: 'pane grow' }),
    status: h('div', { class: 'statusbar' }),
  }
  els.right.appendChild(els.treeHost)
  els.right.appendChild(els.inspectorHost)
  els.splitLeft = splitter('left', app)
  els.splitRight = splitter('right', app)
  // 三列两侧各一个拖拽条：宽度写进 CSS 变量（--col-left / --col-right）
  render(els.main, [els.left, els.splitLeft, els.center, els.splitRight, els.right])
  shell.appendChild(els.topbar)
  shell.appendChild(els.main)
  shell.appendChild(els.status)
  render(root, [shell])

  app.els = els
  app.render = () => renderAll(app)
  /** 只重画控件箱（搜索框边打边筛，不重建整棵树/画布） */
  app.renderToolboxOnly = () => renderToolbox(app)
  // 侧边栏宽度：读回上次的版式（`opts.layout` 注入），没有就用默认值
  applySidebars(app, loadSidebars(app))

  // 门控模拟默认值取自工程第 1 页（用户不用手打 tag 就能看到"这一页长什么样"）
  app.sim = defaultSim(store.doc)

  store.on(() => renderAll(app))
  if (opts.onKey) opts.onKey((e) => handleKey(app, e))
  else document.addEventListener('keydown', (e) => handleKey(app, e))

  renderAll(app)
  return app
}

// ---------------------------------------------------------------------------
// 总渲染
// ---------------------------------------------------------------------------

/** 渲染前记录滚动位置、渲染后还原（选中元素时不该把树/属性面板的滚动位置重置掉） */
function captureScroll(app) {
  const el = app.els
  return {
    tree: el.treeHost && el.treeHost.querySelector ? scrollOf(el.treeHost) : 0,
    inspector: el.inspectorHost && el.inspectorHost.querySelector ? scrollOf(el.inspectorHost) : 0,
    canvas: el.center && el.center.querySelector ? scrollOf(el.center.querySelector('.canvas-viewport')) : 0,
  }
}

function scrollOf(host) {
  const el = host && host.querySelector ? host.querySelector('.pane-body, .tree-body, .canvas-viewport') : null
  return el ? el.scrollTop || 0 : 0
}

function restoreScroll(app, saved) {
  const el = app.els
  const put = (host, selector, top) => {
    if (!host || !host.querySelector || !top) return
    const node = host.querySelector(selector)
    if (node) node.scrollTop = top
  }
  put(el.treeHost, '.tree-body', saved.tree)
  put(el.inspectorHost, '.pane-body', saved.inspector)
  put(el.center, '.canvas-viewport', saved.canvas)
}

function renderAll(app) {
  const { els } = app
  const saved = captureScroll(app)
  renderTopbar(app)
  renderToolbox(app)
  renderCenter(app)
  renderTree(els.treeHost, app)
  renderInspector(els.inspectorHost, app)
  renderStatus(app)
  restoreScroll(app, saved)
}

/** 工程里有没有显隐门控（有就默认打开门控模拟） */
function hasPageGates(doc) {
  let found = false
  const walk = (nodes) => {
    for (const n of nodes || []) {
      if ((n.bindings || []).some((b) => b.target === '#visible')) found = true
      walk(n.controls)
    }
  }
  walk(doc.elements)
  return found
}

/**
 * 默认模拟值：本屏 title（`sapdon_ui:<屏名>`）+ 第一个门控 tag。
 * tag 的唯一来源是 `gateTags(doc)`（多页管理器登记的 tag + 元素上写死的 `$gtag`/`$binding_text`）。
 */
function defaultSim(doc) {
  const scr = screenOf(doc)
  const tag = gateTags(doc)[0] || ''
  return { title: `${FORM_MARKER}${scr.name}`, body: tag, buttons: '' }
}

/** 顶栏 + 状态栏之外的最小中央区宽度（三列都别被拖没了） */
export const SIDEBAR_LIMITS = { left: [160, 640], right: [220, 720], centerMin: 320 }

/** 侧边栏宽度的存储键（与工程草稿分开：换工程不该重置版式） */
const SIDEBAR_KEY = 'sapdon.designer.sidebars'

/** 夹取一个侧边栏宽度（纯函数，便于单测） */
export function clampSidebar(side, width, mainWidth = Infinity) {
  const [min, max] = SIDEBAR_LIMITS[side] || SIDEBAR_LIMITS.left
  const room = Number.isFinite(mainWidth) ? Math.max(min, mainWidth - SIDEBAR_LIMITS.centerMin - 24) : max
  const hi = Math.min(max, room)
  const n = Math.round(Number(width) || 0)
  return Math.max(min, Math.min(hi, n))
}

/** 由指针位置反解某一侧的宽度（纯函数）：左列看指针 x，右列看 (总宽 − x) */
export function sidebarWidthAt(side, pointerX, mainRect) {
  const x = Number(pointerX) || 0
  const raw = side === 'right' ? mainRect.width - x : x
  return clampSidebar(side, raw, mainRect.width)
}

function splitter(side, app) {
  const el = h('div', {
    class: `splitter ${side}`,
    title: '拖动改侧边栏宽度（双击复位）',
    dataset: { splitter: side },
  })
  const body = () => (typeof document !== 'undefined' && document.body) || null
  const setResizing = (on) => {
    const b = body()
    if (!b || !b.classList) return
    if (on) b.classList.add('resizing')
    else b.classList.remove('resizing')
  }
  el.addEventListener('pointerdown', (ev) => {
    if (ev && ev.preventDefault) ev.preventDefault()
    const rect = app.els.main && app.els.main.getBoundingClientRect ? app.els.main.getBoundingClientRect() : { width: 1400, left: 0 }
    const move = (e) => applySidebars(app, { ...app.sidebars, [side]: sidebarWidthAt(side, e.clientX - (rect.left || 0), rect) })
    const up = () => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', up)
      setResizing(false)
      if (el.classList) el.classList.remove('dragging')
      saveSidebars(app)
      app.render()
    }
    setResizing(true)
    if (el.classList) el.classList.add('dragging')
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', up)
  })
  el.addEventListener('dblclick', () => {
    applySidebars(app, { ...app.sidebars, [side]: DEFAULT_SIDEBARS[side] })
    saveSidebars(app)
    app.render()
  })
  return el
}

export const DEFAULT_SIDEBARS = { left: 250, right: 340 }

/** 写一个 CSS 变量（浏览器走 setProperty；DOM 桩的 style 是普通对象，直接赋键） */
function setCssVar(style, name, value) {
  if (!style) return
  if (typeof style.setProperty === 'function') style.setProperty(name, value)
  else style[name] = value
}

/** 把宽度写进 CSS 变量（拖动过程中只改内存里的值，松手才落盘） */
function applySidebars(app, widths) {
  const merged = { left: clampSidebar('left', widths.left), right: clampSidebar('right', widths.right) }
  app.sidebars = merged
  const style = app.els.main && app.els.main.style
  setCssVar(style, '--col-left', `${merged.left}px`)
  setCssVar(style, '--col-right', `${merged.right}px`)
  return merged
}

function loadSidebars(app) {
  try {
    const raw = app.layout && app.layout.get ? app.layout.get(SIDEBAR_KEY) : null
    if (!raw) return { ...DEFAULT_SIDEBARS }
    const parsed = JSON.parse(raw)
    return { left: clampSidebar('left', parsed.left), right: clampSidebar('right', parsed.right) }
  } catch {
    return { ...DEFAULT_SIDEBARS }
  }
}

function saveSidebars(app) {
  try {
    if (app.layout && app.layout.set) app.layout.set(SIDEBAR_KEY, JSON.stringify(app.sidebars || DEFAULT_SIDEBARS))
  } catch {
    /* 存不了就算了：版式不是关键数据 */
  }
}

function renderTopbar(app) {
  const { store, els } = app
  const doc = store.doc
  const identifier = h('input', {
    type: 'text',
    class: 'id-input',
    value: doc.uiSystem.identifier,
    title: 'ns 段：UI 文件与 namespace 都是 ns_nm（只允许 A-Za-z0-9_-）',
    onchange: (e) => store.setUiSystem({ identifier: e.target.value }),
  })
  const kind = h(
    'select',
    {
      class: 'kind-select',
      title: 'form：按规范（root + 内容/按钮 + 门控视图，走 SapdonFormUI）｜容器 / hud：自由摆放，编辑器不校验规范、也不预览框架产物',
      onchange: (e) => store.setScreenKind(e.target.value),
    },
    h('option', { value: 'form', selected: screenKind(doc) === 'form', text: 'form 自定义表单' }),
    h('option', { value: 'container', selected: screenKind(doc) === 'container', text: '容器' }),
    h('option', { value: 'hud', selected: screenKind(doc) === 'hud', text: 'hud 常驻' }),
  )
  const scr = screenOf(doc)
  const nameInput = h('input', {
    type: 'text',
    class: 'id-input',
    value: scr.name || '',
    title: '屏名（nm 段）：UI 文件 = ns_屏名.json、factory = sapdon_form_factory_<屏名>、panelId = sapdon_ui:<屏名>',
    onchange: (e) => store.setScreen({ name: e.target.value }),
  })
  const panelSelect = (value, key) =>
    h(
      'select',
      {
        class: 'ref-select',
        title: '选本屏的' + (key === 'content' ? '内容面板' : '按键面板') + '（必须是本文件里的元素 id）',
        onchange: (e) => store.setScreen({ [key]: e.target.value || null }),
      },
      h('option', { value: '', selected: !value, text: '（空）' }),
      doc.elements
        .filter((r) => r.type !== 'page_panel_manage')
        .map((r) => h('option', { value: r.id, selected: r.id === value, text: r.id })),
    )

  render(els.topbar, [
    h('span', { class: 'brand', text: 'Sapdon UI Designer' }),
    h('span', { class: 'spacer' }),
    h('label', { class: 'inline' }, '屏幕', kind),
    h('label', { class: 'inline' }, 'ns', identifier),
    h('label', { class: 'inline' }, '屏名', nameInput),
    h('label', { class: 'inline' }, '内容', panelSelect(scr.content, 'content')),
    h('label', { class: 'inline' }, '按键', panelSelect(scr.buttons, 'buttons')),
    app.draft
      ? h(
          'span',
          { class: 'draft-chip', title: `上次编辑的草稿（${new Date(app.draft.at).toLocaleString()}）` },
          '有草稿',
          h('button', { class: 'mini', text: '恢复', onclick: () => app.draft.restore() }),
          h('button', { class: 'mini ghost', text: '✕', title: '丢弃草稿', onclick: () => app.draft.discard() }),
        )
      : null,
    h('span', { class: 'spacer' }),
    h('button', { class: 'mini', text: '↶', title: '撤销 Ctrl+Z', onclick: () => store.undo() }),
    h('button', { class: 'mini', text: '↷', title: '重做 Ctrl+Y', onclick: () => store.redo() }),
    app.samples
      ? h(
          'select',
          { title: '载入内置示例（会替换当前工程）', onchange: (e) => app.loadSample && app.loadSample(e.target.value) },
          h('option', { value: '', text: '示例…' }),
          ...Object.entries(app.samples).map(([k, s]) => h('option', { value: k, text: s.label })),
        )
      : null,
    h('button', { class: 'mini', text: '打开', title: '打开 .sui.json', onclick: () => app.open && app.open() }),
    h('button', { class: 'mini primary', text: '保存', title: '保存 .sui.json', onclick: () => app.save() }),
    store.dirty ? h('span', { class: 'dirty', text: '●' }) : null,
  ])
}

function renderToolbox(app) {
  const { store, els } = app
  const sel = store.selected
  const target = sel && isContainer(sel.type) ? sel : sel ? store.node((store.locate(sel.id) || {}).parentId) : null
  const filter = String(app.toolboxFilter || '').trim().toLowerCase()
  const hit = (w) => !filter || `${w.label} ${w.type} ${w.ctor} ${w.hint || ''}`.toLowerCase().includes(filter)
  const groups = new Map()
  for (const w of WIDGETS) {
    if (!hit(w)) continue
    if (!groups.has(w.group)) groups.set(w.group, [])
    groups.get(w.group).push(w)
  }
  const host = els.left
  const toolbox = h('div', { class: 'pane' })
  const search = h('input', {
    type: 'text',
    class: 'toolbox-search',
    value: app.toolboxFilter || '',
    placeholder: '筛选控件（Qt 的 Widget Box 搜索框）',
    title: '按名字/类型/说明筛选；Esc 清空',
    oninput: (e) => {
      app.toolboxFilter = e.target.value
      app.renderToolboxOnly()
    },
    onkeydown: (e) => {
      if (e.key === 'Escape') {
        app.toolboxFilter = ''
        app.renderToolboxOnly()
      }
    },
  })
  toolbox.appendChild(
    h(
      'div',
      { class: 'pane-head' },
      h('span', { text: `控件箱${filter ? `（${[...groups.values()].reduce((n, l) => n + l.length, 0)}）` : ''}` }),
      h('span', { class: 'spacer' }),
      h('span', { class: 'muted', title: '点击就加到选中容器里', text: target ? `→ ${target.id}` : '→ 根' }),
    ),
  )
  toolbox.appendChild(h('div', { class: 'pane-toolbar tight' }, search))
  const body = h('div', { class: 'pane-body toolbox' })
  if (!groups.size) body.appendChild(h('div', { class: 'muted pad', text: `没有匹配「${app.toolboxFilter}」的控件` }))
  for (const [g, list] of groups) {
    body.appendChild(h('div', { class: 'group-caption', text: g }))
    for (const w of list) {
      const allowed = !sel || !isContainer(sel.type) || widgetsAllowedIn(sel.type).some((x) => x.type === w.type)
      body.appendChild(
        h('button', {
          class: `widget${allowed ? '' : ' dim'}`,
          title: `${w.ctor} — ${w.hint || ''}`,
          onclick: () => app.addWidget(w.type),
        }, h('span', { class: 'widget-name', text: w.label })),
      )
    }
  }
  toolbox.appendChild(body)
  render(host, [toolbox])
}

function renderCenter(app) {
  const { els } = app
  const tabs = [
    ['canvas', '画布'],
    ['json', 'JSON 产物'],
    ['code', 'TS 代码'],
    ['diag', `诊断${diagLabel(app)}`],
  ]
  const bar = h(
    'div',
    { class: 'tabs' },
    ...tabs.map(([id, label]) => h('button', { class: `tab${app.tab === id ? ' on' : ''}`, text: label, onclick: () => app.setTab(id) })),
  )
  const body = h('div', { class: 'tab-body' })
  if (app.tab === 'canvas') renderCanvas(body, app)
  else if (app.tab === 'json') renderJsonTab(body, app)
  else if (app.tab === 'code') renderCodeTab(body, app)
  else renderDiagTab(body, app)
  render(els.center, [bar, body, suggestionLists()])
}

function diagLabel(app) {
  const { counts } = diagnose(app.store.doc, { textureIndex: app.textures })
  const bits = []
  if (counts.error) bits.push(`${counts.error}✕`)
  if (counts.warn) bits.push(`${counts.warn}⚠`)
  if (counts.info) bits.push(`${counts.info}i`)
  return bits.length ? `（${bits.join(' ')}）` : ''
}

function suggestionLists() {
  return h(
    'div',
    { class: 'datalists' },
    ...SUGGESTION_LISTS.map((l) => h('datalist', { id: l.id }, l.values.map((v) => h('option', { value: v })))),
  )
}

function renderCodeTab(host, app) {
  const { code } = app.generated()
  render(host, [
    h(
      'div',
      { class: 'pane-toolbar' },
      h('span', { class: 'muted', text: '生成的是框架原生写法（属性包 + 链式 setter + 页面壳 + submit）；单向生成，手改后不回读。' }),
      h('span', { class: 'spacer' }),
      h('button', { class: 'mini', text: '复制全部', onclick: () => app.copy(code, ' TS 代码') }),
      h('button', { class: 'mini', text: '下载 main.generated.ts', onclick: () => app.download && app.download(code, 'main.generated.ts') }),
    ),
    h('div', { class: 'code-host', html: codeViewHtml(code, 'ts') }),
  ])
}

function renderJsonTab(host, app) {
  const all = previewAll(app.store.doc)
  if (all.freeform) {
    render(host, [
      h('div', { class: 'pane-toolbar' }, h('span', { class: 'muted', text: `${all.kind} 屏：自由摆放，编辑器不伪造框架产物` })),
      h('div', { class: 'pad muted', text: all.note }),
      h('div', { class: 'pad muted', text: `目标文件：${all.file}（${app.store.doc.elements.length} 个根元素）` }),
      ...all.elements.map((el) => jsonBlock(el.id, JSON.stringify(el.json, null, 2), app)),
    ])
    return
  }
  const uiText = JSON.stringify(jsonNormalize(all.uiFile.system), null, 2)
  const sfText = JSON.stringify(jsonNormalize(all.serverForm.system), null, 2)
  render(host, [
    h('div', { class: 'pane-toolbar' }, h('span', { class: 'muted', text: '框架会写出的 JSON UI（uic 的等价物）。语义与 serialize()/toObject() 逐字段对齐，由交叉验证测试兜底。' })),
    jsonBlock(all.uiFile.file, uiText, app),
    jsonBlock(all.serverForm.file, sfText, app),
  ])
}

function jsonBlock(title, text, app) {
  return h(
    'details',
    { class: 'json-block', open: true },
    h('summary', {}, h('span', { text: title }), h('span', { class: 'spacer' }), h('button', { class: 'mini', text: '复制', onclick: (e) => { e.preventDefault(); app.copy(text, ` ${title}`) } })),
    h('div', { class: 'code-host', html: codeViewHtml(text, 'json') }),
  )
}

function renderDiagTab(host, app) {
  const { items, counts } = diagnose(app.store.doc, { textureIndex: app.textures })
  const body = h('div', { class: 'diag-body' })
  if (!items.length) body.appendChild(h('div', { class: 'muted pad', text: '没有发现问题。' }))
  for (const it of items) {
    body.appendChild(
      h(
        'div',
        {
          class: `diag ${it.severity}`,
          onclick: () => it.id && app.store.select(it.id),
          title: it.why,
        },
        h('span', { class: 'sev', text: it.severity }),
        h('span', { class: 'diag-id', text: it.id || '文档' }),
        h('span', { class: 'diag-msg', text: it.message }),
      ),
    )
  }
  render(host, [
    h(
      'div',
      { class: 'pane-toolbar' },
      h('span', { class: 'muted', text: `error ${counts.error} · warn ${counts.warn} · info ${counts.info}` }),
      h('span', { class: 'spacer' }),
      h('span', { class: 'muted', text: '点击条目可跳到对应元素；悬停看依据' }),
    ),
    body,
    rulesLegend(),
  ])
}

/** 规则图例：依据全部来自 ui-lessons.md / ui-architecture.md / AGENTS.md */
function rulesLegend() {
  return h(
    'details',
    { class: 'rules' },
    h('summary', { text: `诊断规则（${Object.keys(RULES).length} 条，依据来自 ui-lessons.md / AGENTS.md）` }),
    h(
      'div',
      { class: 'rules-body' },
      ...Object.entries(RULES).map(([id, r]) =>
        h('div', { class: `rule ${r.severity}` }, h('span', { class: 'sev', text: r.severity }), h('code', { text: id }), h('span', { class: 'rule-title', text: r.title }), h('span', { class: 'muted', text: r.why })),
      ),
    ),
  )
}

function renderStatus(app) {
  const { counts } = diagnose(app.store.doc, { textureIndex: app.textures })
  const rows = flatten(app.store.doc)
  const parts = [`元素 ${rows.length}`, `门控 tag ${gateTags(app.store.doc).length}`, app.store.multi ? `已选 ${app.store.selectedIds.length}` : '', app.textures ? `贴图 ${app.textures.paths.size}` : '无贴图索引'].filter(Boolean)
  const diag = []
  if (counts.error) diag.push(`✕${counts.error}`)
  if (counts.warn) diag.push(`⚠${counts.warn}`)
  if (counts.info) diag.push(`i${counts.info}`)
  if (diag.length) parts.push(diag.join(' '))
  render(app.els.status, [
    h('span', { class: 'msg', text: app.statusMessage || '就绪' }),
    h('span', { class: 'spacer' }),
    h('span', { class: 'muted', text: parts.join(' · ') }),
  ])
}

// ---------------------------------------------------------------------------
// 交互
// ---------------------------------------------------------------------------

function addWidget(app, type) {
  const { store } = app
  const sel = store.selected
  if (sel && isContainer(sel.type)) {
    const allowed = widgetsAllowedIn(sel.type)
    if (!allowed.some((w) => w.type === type)) {
      app.notice(`${sel.type} 里不能放 ${type}（例如 FormButton 只能进 FormButtonGrid）`)
      return
    }
    const created = store.addWidget(type, { parentId: sel.id })
    const w = widgetFor(type)
    app.notice(`已加入 ${sel.id}：${w ? w.label : type}`)
    if (created) app.reveal(created.id)
    return
  }
  if (sel) {
    const loc = store.locate(sel.id)
    const created = store.addWidget(type, { parentId: loc ? loc.parentId : null, index: loc ? loc.index + 1 : null })
    app.notice(`已作为 ${sel.id} 的兄弟加入`)
    if (created) app.reveal(created.id)
    return
  }
  const created = store.addWidget(type, {})
  app.notice('已加入根层')
  if (created) app.reveal(created.id)
}

function handleKey(app, e) {
  const tag = (e.target && e.target.tagName) || ''
  const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
  const mod = e.ctrlKey || e.metaKey
  const key = String(e.key || '')
  if (mod && key.toLowerCase() === 'z') {
    e.preventDefault()
    e.shiftKey ? app.store.redo() : app.store.undo()
    return
  }
  if (mod && key.toLowerCase() === 'y') {
    e.preventDefault()
    app.store.redo()
    return
  }
  if (mod && key.toLowerCase() === 's') {
    e.preventDefault()
    app.save()
    return
  }
  // 剪贴板 / 副本 / 层序（Qt 的 Ctrl+C/V/D、Raise/Lower；在输入框里让位给系统剪贴板）
  if (mod && !typing && key.toLowerCase() === 'c') {
    e.preventDefault()
    const n = app.store.copy()
    if (n) app.notice(`已复制 ${n} 个元素`)
    return
  }
  if (mod && !typing && key.toLowerCase() === 'v') {
    e.preventDefault()
    if (app.store.canPaste) app.store.paste()
    return
  }
  if (mod && !typing && key.toLowerCase() === 'd') {
    e.preventDefault()
    app.store.duplicate()
    return
  }
  if (mod && !typing && (key === ']' || key === '[')) {
    e.preventDefault()
    app.store.raiseLower(app.store.selectedIds, key === ']' ? 1 : -1)
    return
  }
  if (mod && !typing && key.toLowerCase() === 'a') {
    e.preventDefault()
    app.store.selectMany(flatten(app.store.doc).map((r) => r.node.id))
    return
  }
  if (typing) return
  // 多选：删除 / 方向键一次处理整批（各占一步撤销）
  if (app.store.multi) {
    const ids = app.store.selectedIds.slice()
    if (key === 'Delete' || key === 'Backspace') {
      e.preventDefault()
      app.store.removeMany(ids)
      return
    }
    const stepMulti = e.shiftKey ? 10 : 1
    const movesMulti = { ArrowLeft: [-stepMulti, 0], ArrowRight: [stepMulti, 0], ArrowUp: [0, -stepMulti], ArrowDown: [0, stepMulti] }
    if (movesMulti[key] && !e.altKey) {
      e.preventDefault()
      const [dx, dy] = movesMulti[key]
      app.store.applyBoxOps(ids.map((x) => {
        const cur = Array.isArray(app.store.node(x).props.offset) ? app.store.node(x).props.offset : [0, 0]
        return { id: x, offset: [(typeof cur[0] === 'number' ? cur[0] : 0) + dx, (typeof cur[1] === 'number' ? cur[1] : 0) + dy] }
      }))
      return
    }
  }
  const id = app.store.selection
  if (!id) return
  if (key === 'Delete' || key === 'Backspace') {
    e.preventDefault()
    app.removeNode(id)
    return
  }
  const step = e.shiftKey ? 10 : 1
  const node = app.store.node(id)
  if (!node) return
  const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
  if (moves[key]) {
    e.preventDefault()
    const [dx, dy] = moves[key]
    if (e.altKey) {
      // Alt+方向：改 size（宽/高）
      const cur = Array.isArray(node.props.size) ? node.props.size : [10, 10]
      const w = (typeof cur[0] === 'number' ? cur[0] : 10) + dx
      const hh = (typeof cur[1] === 'number' ? cur[1] : 10) + dy
      app.store.setProp(id, 'size', [Math.max(1, w), Math.max(1, hh)])
      return
    }
    const cur = Array.isArray(node.props.offset) ? node.props.offset : [0, 0]
    const ox = (typeof cur[0] === 'number' ? cur[0] : 0) + dx
    const oy = (typeof cur[1] === 'number' ? cur[1] : 0) + dy
    app.store.setProp(id, 'offset', [ox, oy])
  }
}
