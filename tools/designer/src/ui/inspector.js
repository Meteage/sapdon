/**
 * 属性面板（Sapdon UI Designer）—— Qt Designer 的 Property Editor 对应物
 *
 * ★ 三态语义（本工具的核心不变量，见 doc/dev/ui-designer.md §4.2）：
 *   - **未声明**：灰字显示目录里的默认值 + `＋` 按钮；产物里**没有**这个字段
 *   - **已声明**：正常色 + 左侧圆点；产物里**会**有（哪怕值等于默认值）
 *   - **重置**：删键（= Qt 的 resetProperty），不是写回默认值
 * 属性面（有哪些键、属于哪个属性包、用什么 setter）全部来自 `catalog.js`，本文件不另立一份。
 */

import { h, render, parseSizeValue, parseNumberPair } from './dom.js'
import { schemaFor, templatesFor, widgetFor, GATE_TEMPLATES, COLLECTION_SUGGESTIONS, TEXTURE_SUGGESTIONS, ACTIVATION_TRIPLE } from '../catalog.js'
import { ANCHOR_NAMES } from '../layout.js'
import { layoutTree } from '../layout.js'
import { alignOps, distributeOps, sameSizeOps, canAlign, canDistribute, ALIGN_MODES } from '../align.js'
import { flatten } from '../model.js'
import { resolveTexture, textureUrl } from '../textures.js'

/** 属性分组折叠状态（跨选中保持：同一控件类型的同一组记住你上次是开还是关） */
const GROUP_STATE = new Map()

export function renderInspector(host, app) {
  const { store } = app
  // 多选：不进单元素属性面板，改出「对齐 / 分布 / 等尺寸 / 层序 / 复制」这一套（Qt 的 alignment toolbar）
  if (store.multi) {
    render(host, [multiPanel(app)])
    return
  }
  const node = store.selected
  if (!node) {
    render(host, [
      h('div', { class: 'pane-head' }, h('span', { text: '属性' })),
      h('div', { class: 'pane-body muted', text: '在画布或对象树里选一个元素。' }),
      h('div', { class: 'pane-foot muted', text: '提示：属性只有"已声明"才会写进产物 —— 未声明 = 产物里没有这个字段。' }),
    ])
    return
  }

  const w = widgetFor(node.type)
  const schema = schemaFor(node.type)
  const parentLoc = store.locate(node.id)
  const parent = parentLoc && parentLoc.parentId ? store.node(parentLoc.parentId) : null
  const assigned = (props) => Object.keys(props).length
  const filter = String(app.inspectorFilter || '').trim().toLowerCase()
  const mk = (key, el) => {
    el.dataset.propKey = key
    return el
  }
  const keep = (key, el) => (!filter ? [el] : String(key).toLowerCase().includes(filter) || String(el.textContent).toLowerCase().includes(filter) ? [el] : [])
  /** 非属性包区块（变量/绑定/槽位）也吃同一套筛选：按可见文本匹配 */
  const keepText = (el) => (!filter ? [el] : String(el.textContent).toLowerCase().includes(filter) ? [el] : [])

  const identity = h(
    'div',
    { class: 'group' },
    h('div', { class: 'group-head' }, h('span', { text: `${node.type}` }), h('span', { class: 'spacer' }), h('span', { class: 'muted', text: w ? w.hint || '' : '' })),
    mk('id', fieldRow('id', h('input', { type: 'text', value: node.id, onchange: (e) => store.rename(node.id, e.target.value) }), {
      hint: '同时是控件名与引用名（只允许 A-Za-z0-9_-）',
      assigned: true,
    })),
    mk('template', fieldRow(
      'template',
      h(
        'select',
        { onchange: (e) => store.setTemplate(node.id, e.target.value) },
        templatesFor(node.type).map((t) => h('option', { value: t.id, selected: (node.template || '') === t.id, text: t.label })),
      ),
      { hint: 'id@template：继承原版/内置模板（Qt 的 promote to custom widget）；会变成 <id>@<template>' },
    )),
    mk('debug', fieldRow('debug', h('input', { type: 'checkbox', checked: node.debug, onchange: (e) => store.setDebug(node.id, e.target.checked) }), {
      hint: 'enableDebug()：加一层红色描边框（发布前记得关）',
    })),
  )

  const identityFiltered = filter
    ? [h('div', { class: 'group' }, h('div', { class: 'group-head' }, h('span', { text: node.type })), h('div', { class: 'group-body' }, ...identity.children[0].childNodes.filter((r) => r.nodeType === 1 && String(r.textContent).toLowerCase().includes(filter))))]
    : [identity]
  const groups = identityFiltered

  // 组合件的构造入参
  if (schema.ctorProps.length) {
    groups.push(
      group(
        node.type === 'form_button_grid' ? '构造入参（FormButtonGrid）' : '构建入参（FormButton）',
        schema.ctorProps.flatMap((def) => keep(def.key, mk(def.key, propRow(node, def, app)))),
        `${assigned(schema.ctorProps.reduce((acc, d) => (Object.prototype.hasOwnProperty.call(node.props, d.key) ? { ...acc, [d.key]: 1 } : acc), {}))}/${schema.ctorProps.length}`,
        `${node.type}::ctor`,
        true,
        filter,
      ),
    )
  }

  const packGroups = schema.packs.map((pack, i) => {
    const rows = pack.props.flatMap((def) => keep(def.key, mk(def.key, propRow(node, def, app))))
    const used = pack.props.filter((d) => Object.prototype.hasOwnProperty.call(node.props, d.key)).length
    return group(`${pack.label} — ${pack.apply}()`, rows, `${used}/${pack.props.length}`, `${node.type}::${pack.id}`, i === 0, filter)
  })
  for (const g of packGroups) if (g) groups.push(g)

  if (schema.raw.length) {
    const used = schema.raw.filter((d) => Object.prototype.hasOwnProperty.call(node.props, d.key)).length
    const g = group(
      '直通属性 — addProp()',
      schema.raw.flatMap((def) => keep(def.key, mk(def.key, propRow(node, def, app)))),
      `${used}/${schema.raw.length}`,
      `${node.type}::raw`,
      false,
      filter,
    )
    if (g) groups.push(g)
  }

  // 多页管理器：页列表在这个**对象**上编辑（不是全局面板）
  if (node.type === 'page_panel_manage') {
    const candidates = flatten(store.doc).map((r) => r.node).filter((n) => n.type !== 'page_panel_manage')
    const panelSelect = (value, onchange) =>
      h(
        'select',
        { onchange: (e) => onchange(e.target.value || null) },
        h('option', { value: '', selected: !value, text: '（未选面板）' }),
        candidates.map((c) => h('option', { value: c.id, selected: c.id === value, text: `${c.id} (${c.type})` })),
      )
    const rows = (node.pages || []).map((page, i) =>
      h(
        'div',
        { class: 'page-card' },
        h(
          'div',
          { class: 'row' },
          h('span', { class: 'k muted', text: 'tag' }),
          h('input', {
            type: 'text',
            value: page.tag || '',
            title: '运行期 .body() 要 emit 的串；门控按它匹配（手册：INDEX / IDX|p1 / CAT:intro|p0）',
            onchange: (e) => store.updateManagerPage(node.id, i, { tag: e.target.value }),
          }),
          h('button', { class: 'mini ghost', text: '✕', title: '删掉这一页', onclick: () => store.removeManagerPage(node.id, i) }),
        ),
        h('div', { class: 'row' }, h('span', { class: 'k muted', text: 'panel' }), panelSelect(page.panel, (v) => store.updateManagerPage(node.id, i, { panel: v }))),
      ),
    )
    const body = [
      h('div', { class: 'row' }, h('span', { class: 'k muted', text: '门控容器' }), panelSelect(node.props.container, (v) => store.setProp(node.id, 'container', v || ''))),
      h(
        'div',
        { class: 'row' },
        h('span', { class: 'k muted', text: '模式' }),
        h(
          'select',
          { onchange: (e) => store.setProp(node.id, 'mode', e.target.value) },
          h('option', { value: 'prefix', selected: node.props.mode !== 'eq', text: 'prefix（body 以 tag 开头）' }),
          h('option', { value: 'eq', selected: node.props.mode === 'eq', text: 'eq（body 与 tag 全等）' }),
        ),
      ),
      ...rows,
      h('button', { class: 'mini', text: '＋ 加一页', onclick: () => store.addManagerPage(node.id, { panel: candidates[0] ? candidates[0].id : null }) }),
      h('div', { class: 'muted', text: '页面板由它挂进容器并逐块挂门控 —— 别再手工把同一块面板放进容器（诊断 manager-page-in-container 会拦）。' }),
    ]
    groups.push(group('多页管理器 — PagePanelManage', body, `${(node.pages || []).length} 页`, `${node.type}::pages`, true, filter))
  }

  // 格子/槽位定位（由引擎/格盘决定，不是普通 props）
  if (parent && parent.type === 'grid') {
    groups.push(
      group(
        '格位（父级是 Grid）',
        [
          mk('grid_position', fieldRow(
            'grid_position',
            pairEditor(node.gridPosition, (pair) => store.setGridPosition(node.id, pair)),
            { assigned: true, hint: '[列, 行]；引擎靠它把格子绑到内容。格内 offset 无效，要偏移请包一层 panel' },
          )),
        ].flatMap((el) => keep('grid_position', el)),
        '',
      ),
    )
  }
  if (parent && parent.type === 'form_button_grid') {
    groups.push(
      group(
        '槽位（父级是 FormButtonGrid）',
        [
          mk('slot', fieldRow('slot', h('input', { type: 'number', min: '0', step: '1', value: String(node.slot ?? 0), onchange: (e) => store.setSlot(node.id, e.target.value) }), {
            assigned: true,
            hint: '★ 运行期 form 里的槽位序号，不是视觉序号（基准格 = [slot%列, slot/列]）',
          })),
          mk('pos', fieldRow('pos', pairEditor(node.pos, (pair) => store.setPos(node.id, pair)), { assigned: true, hint: '叠加到基准格上的视觉位移（addButton 的第 3 参）' })),
        ].flatMap((el) => keep(el.dataset.propKey, el)),
        '',
      ),
    )
  }

  // 变量（$）
  const varKeys = Object.keys(node.vars || {})
  const newVarInput = h('input', { type: 'text', placeholder: '名字（如 binding_text）' })
  groups.push(
    group(
      '变量（$ 前缀，addVariable）',
      [
        ...varKeys.flatMap((k) =>
          keepText(h(
            'div',
            { class: 'row' },
            h('span', { class: 'k assigned', text: `${k}` }),
            h('input', { type: 'text', value: String(node.vars[k]), onchange: (e) => store.setVar(node.id, k, e.target.value) }),
            h('button', { class: 'mini ghost', text: '✕', title: '删除变量', onclick: () => store.unsetVar(node.id, k) }),
          )),
        ),
        ...keepText(h(
          'div',
          { class: 'row' },
          h('span', { class: 'k muted', text: '＋ 新变量' }),
          newVarInput,
          h('button', {
            class: 'mini',
            text: '加',
            onclick: () => {
              const name = newVarInput.value ? String(newVarInput.value).trim().replace(/^\$/, '') : ''
              if (!name) return app.notice('先填变量名')
              store.setVar(node.id, name, '')
            },
          }),
        )),
      ].filter(Boolean),
      `${varKeys.length}`,
      `${node.type}::vars`,
      false,
      filter,
    ),
  )

  // 绑定（门控）
  const binds = node.bindings || []
  groups.push(
    group(
      '数据绑定（门控 / 集合）',
      [
        ...binds.flatMap((b, i) => keepText(bindingRow(node, b, i, app))),
        ...keepText(h(
          'div',
          { class: 'row wrap' },
          h('span', { class: 'k muted', text: '＋ 门控模板' }),
          ...GATE_TEMPLATES.map((t) =>
            h('button', {
              class: 'mini',
              text: t.label,
              title: `${t.hint || ''}\n生成：$${t.var} → ${t.source(t.var)} → ${t.target}`,
              onclick: () => {
                store.setVar(node.id, t.var, t.var === 'panel_id' ? 'sapdon_ui:' : 'page1')
                store.addBinding(node.id, { type: 'view', source: t.source(t.var), target: t.target })
              },
            }),
          ),
        )),
        ...(w && (node.type === 'button' || node.type === 'form_button')
          ? keepText(h('div', { class: 'row wrap' }, h('span', { class: 'k muted', text: '＋ 按钮三件套' }), h('button', {
              class: 'mini',
              text: '激活三件套（collection_details + collection + view）',
              title: '缺一条按钮就不可点/不可见（ui-lessons.md §3）',
              onclick: () => {
                for (const b of ACTIVATION_TRIPLE) {
                  store.addBinding(node.id, { type: b.type, collection: b.collection, name: b.name, source: b.source, target: b.target })
                }
              },
            })))
          : []),
      ].filter(Boolean),
      `${binds.length}`,
      `${node.type}::bindings`,
      false,
      filter,
    ),
  )

  render(host, [
    h('div', { class: 'pane-head' }, h('span', { text: '属性' }), h('span', { class: 'spacer' }), h('span', { class: 'muted', text: node.id })),
    h(
      'div',
      { class: 'pane-toolbar tight' },
      h('input', {
        type: 'text',
        class: 'prop-filter',
        placeholder: '筛选属性名（如 anchor / color）…',
        value: app.inspectorFilter || '',
        oninput: (e) => {
          app.inspectorFilter = e.target.value
          const top = host.querySelector ? host.querySelector('.pane-body') : null
          const keepTop = top ? top.scrollTop : 0
          renderInspector(host, app)
          const body = host.querySelector ? host.querySelector('.pane-body') : null
          if (body) body.scrollTop = keepTop
          const inp = host.querySelector ? host.querySelector('.prop-filter') : null
          if (inp && inp.focus) {
            inp.focus()
            inp.setSelectionRange && inp.setSelectionRange(inp.value.length, inp.value.length)
          }
        },
      }),
    ),
    h('div', { class: 'pane-body' }, ...groups.filter(Boolean)),
    h('div', { class: 'pane-foot muted', text: '圆点 = 该字段已声明（会写进产物）；✕ = 重置成"未声明"（产物里删掉该字段）' }),
  ])
}

// ---------------------------------------------------------------------------

/**
 * 多选面板：对齐 / 分布 / 等尺寸 / 层序 / 复制删除（Qt 的 alignment toolbar）。
 *
 * 几何全部由 `align.js` 纯函数算，结果经 `store.applyBoxOps()` **一次落盘**（一步撤销）。
 * 盒子用 `app.lastLayout`（画布每次渲染都会存下来）；没渲染过就按画布尺寸现算一次。
 */
function multiPanel(app) {
  const { store } = app
  const ids = store.selectedIds.slice()
  const layout =
    app.lastLayout || layoutTree(store.doc.elements, { x: 0, y: 0, w: store.doc.canvas.size[0], h: store.doc.canvas.size[1] })
  const boxes = ids
    .map((id) => layout.byId.get(id))
    .filter(Boolean)
    .map((b) => ({ id: b.id, rect: b.rect, offset: (b.node.props || {}).offset }))

  const btn = (label, title, fn, disabled = false) =>
    h('button', { class: 'mini', text: label, title: title || null, onclick: () => !disabled && fn() })

  const alignRow = h(
    'div',
    { class: 'row wrap' },
    ...Object.entries(ALIGN_MODES).map(([mode, label]) =>
      btn(label, `${label}（以整组包围盒为基准）`, () => store.applyBoxOps(alignOps(boxes, mode)), !canAlign(boxes)),
    ),
  )
  const distRow = h(
    'div',
    { class: 'row wrap' },
    btn('水平分布', '两端不动、中间等间距（≥3 个）', () => store.applyBoxOps(distributeOps(boxes, 'h')), !canDistribute(boxes)),
    btn('垂直分布', '两端不动、中间等间距（≥3 个）', () => store.applyBoxOps(distributeOps(boxes, 'v')), !canDistribute(boxes)),
  )
  const sizeRow = h(
    'div',
    { class: 'row wrap' },
    btn('同宽', '以列表第一个为基准', () => store.applyBoxOps(sameSizeOps(boxes, 'v')), !canAlign(boxes)),
    btn('同高', '以列表第一个为基准', () => store.applyBoxOps(sameSizeOps(boxes, 'h')), !canAlign(boxes)),
    btn('同尺寸', '以列表第一个为基准', () => store.applyBoxOps(sameSizeOps(boxes, 'both')), !canAlign(boxes)),
  )
  const layerRow = h(
    'div',
    { class: 'row wrap' },
    btn('层序 ↑', 'layer +1（后绘制 = 盖在上面）', () => store.raiseLower(ids, 1)),
    btn('层序 ↓', 'layer −1', () => store.raiseLower(ids, -1)),
  )
  const editRow = h(
    'div',
    { class: 'row wrap' },
    btn('复制', 'Ctrl+C', () => app.notice(`已复制 ${store.copy(ids)} 个元素`)),
    btn('副本', 'Ctrl+D：同父级就地复制，offset +8/+8', () => store.duplicate(ids)),
    btn('删除', 'Delete', () => store.removeMany(ids)),
  )

  return h(
    'div',
    { class: 'pane' },
    h(
      'div',
      { class: 'pane-head' },
      h('span', { text: `多选（${boxes.length}）` }),
      h('span', { class: 'spacer' }),
      h('button', { class: 'mini ghost', text: '✕', title: '取消选择', onclick: () => store.select(null) }),
    ),
    h(
      'div',
      { class: 'pane-body' },
      group('对齐 / 分布 / 尺寸', [alignRow, distRow, sizeRow], `${boxes.length} 个`, 'multi::align', true),
      group('层序 / 编辑', [layerRow, editRow], `${boxes.length} 个`, 'multi::edit', true),
      h('div', {
        class: 'muted pad',
        text: '对齐写的是**像素 offset**（Qt 也直接改 geometry）：原本写百分比 offset 的元素，对齐后会变成像素值。',
      }),
      h('div', { class: 'muted pad', text: `元素：${boxes.map((b) => b.id).join('、')}` }),
    ),
  )
}

function cssId(id) {
  return String(id).replace(/[^A-Za-z0-9_-]/g, '_')
}

// ---------------------------------------------------------------------------
// 纹理编辑器：缩略图 + 文本输入 + 从**真实资源包**里挑（原版贴图直接可见可点）
// ---------------------------------------------------------------------------

function textureEditor(value, set, app) {
  const input = h('input', {
    type: 'text',
    value: String(value ?? ''),
    placeholder: 'textures/ui/White',
    onchange: (e) => set(e.target.value),
  })
  const thumb = textureThumb(value, app, 28)
  return h(
    'div',
    { class: 'tex-editor' },
    thumb,
    input,
    h('button', {
      class: 'mini',
      text: '浏览…',
      title: app.textures ? `从已加载的资源包里挑（${app.textures.paths.size} 条）` : '没连上资源包索引：用文本输入，或带 --vanilla 启动 serve.mjs',
      onclick: () => openTexturePicker(app, String(value ?? ''), (pick) => set(pick)),
    }),
  )
}

/** 小缩略图（没索引/找不到就给占位，不猜） */
function textureThumb(texture, app, size) {
  const res = resolveTexture(texture, app.textures)
  const style = { width: `${size}px`, height: `${size}px` }
  if (texture && res.previewable && res.known !== false) style.backgroundImage = `url("${res.url}")`
  const cls = !texture ? 'tex-thumb empty' : res.known === false ? 'tex-thumb missing' : !res.previewable ? 'tex-thumb nopreview' : 'tex-thumb'
  return h('span', {
    class: cls,
    style,
    title: texture ? `${res.path || texture}${res.known === false ? '（资源包里没有）' : ''}${res.previewable ? '' : '（.tga 不能预览）'}` : '未设置纹理',
  })
}

/** 常用贴图：UI 工作真的会用到的那批（首屏先给这些，别一上来糊 240 条墙） */
const COMMON_PATTERNS = [
  /^textures\/ui\/(white|dialog_background|focus_border|saleribbon|arrow|slot_|promotion_slot|button_borderless)/i,
  /^textures\/ui\/(book_|chest_|hud_|icon_|ui_|logo|gear|help)/i,
  /^textures\/ui\/[^/]*(panel|background|divider|scroll|tab|cross|check)/i,
  /^textures\/items\/(book|paper|comparator|iron_ingot|redstone|stick)/i,
]

/** 目录分组（空查询时按这些分段，而不是一坨） */
const PICKER_GROUPS = ['textures/ui/', 'textures/items/', 'textures/gui/', 'textures/blocks/']
const GROUP_CAP = 36
const QUERY_CAP = 60

/**
 * 贴图选择器浮层：搜索 + 缩略图网格 + 点击即选。
 *
 * UX（2026-09 用户反馈"太密集了"后重做）：
 *   · 首屏给**常用**（策展那批）+ **按目录分组**（每组 36 个 + 「更多」），不再一次糊 240 个
 *   · 搜索命中最多 60 个 + 「显示更多」；每格变大（150px 起、缩略图 56px）+ **路径分两行**（目录暗、文件名亮）
 *   · 悬停放大缩略图，`title` 给完整路径；当前值高亮
 */
function openTexturePicker(app, current, onPick) {
  const index = app.textures
  const overlay = h('div', { class: 'picker-overlay' })
  const close = () => document.body.removeChild(overlay)

  const search = h('input', { type: 'text', class: 'picker-search', placeholder: '搜索纹理路径，如 book / arrow / slot…', value: app.textureQuery || '' })
  const count = h('span', { class: 'muted', text: '' })
  const grid = h('div', { class: 'picker-body' })
  const searchCap = { n: QUERY_CAP }
  const expanded = new Set()

  const all = index && index.list ? index.list : []
  const commonList = all.filter((p) => COMMON_PATTERNS.some((re) => re.test(p))).slice(0, 24)

  const cell = (p) => {
    const slash = p.lastIndexOf('/')
    const dir = slash > 0 ? p.slice(0, slash + 1).replace(/^textures\//, '') : ''
    const name = slash > 0 ? p.slice(slash + 1) : p
    return h(
      'button',
      {
        class: `picker-item${p === current ? ' on' : ''}`,
        title: p,
        onclick: () => {
          onPick(p)
          app.textureQuery = ''
          close()
        },
      },
      h('span', { class: 'picker-thumb', style: { backgroundImage: `url("${textureUrl(p)}")` } }),
      h('span', { class: 'picker-path' }, h('span', { class: 'picker-dir', text: dir }), h('span', { class: 'picker-name', text: name })),
    )
  }

  const section = (title, items, more) => {
    if (!items.length) return null
    return h(
      'div',
      { class: 'picker-section' },
      h(
        'div',
        { class: 'picker-section-head' },
        h('span', { text: title }),
        h('span', { class: 'spacer' }),
        more ? h('button', { class: 'mini', text: more.label, onclick: more.onclick }) : null,
      ),
      h('div', { class: 'picker-grid' }, ...items.map(cell)),
    )
  }

  const draw = () => {
    const q = String(search.value || '').trim().toLowerCase()
    app.textureQuery = search.value
    const blocks = []

    if (!index) {
      count.textContent = '没有资源包索引'
      render(grid, [h('div', { class: 'muted pad', text: '启动 serve.mjs 时会自动找 bedrock-samples；也可 --vanilla "<RP 目录>" 指定。' })])
      return
    }

    if (!q) {
      count.textContent = `共 ${all.length} 条 · 先看常用与目录，或直接搜索`
      blocks.push(section(`常用（${commonList.length}）`, commonList))
      const rest = all.filter((p) => !commonList.includes(p))
      for (const prefix of PICKER_GROUPS) {
        const bucket = rest.filter((p) => p.startsWith(prefix))
        const cap = expanded.has(prefix) ? GROUP_CAP * 3 : GROUP_CAP
        blocks.push(
          section(
            `${prefix.replace(/^textures\//, '')}（${bucket.length}）`,
            bucket.slice(0, cap),
            bucket.length > cap ? { label: `显示更多（还有 ${bucket.length - cap}）`, onclick: () => { expanded.add(prefix); draw() } } : null,
          ),
        )
      }
      const others = rest.filter((p) => !PICKER_GROUPS.some((x) => p.startsWith(x)))
      if (others.length) blocks.push(section(`其它（${others.length}）`, others.slice(0, expanded.has('*') ? 120 : GROUP_CAP), others.length > GROUP_CAP ? { label: '显示更多', onclick: () => { expanded.add('*'); draw() } } : null))
    } else {
      const hits = all.filter((p) => p.toLowerCase().includes(q))
      count.textContent = `命中 ${hits.length} 条 · 显示前 ${Math.min(searchCap.n, hits.length)}${hits.length > searchCap.n ? '（继续输入可缩小范围）' : ''}`
      blocks.push(
        section(
          `搜索「${q}」`,
          hits.slice(0, searchCap.n),
          hits.length > searchCap.n ? { label: `显示更多（每次 +${QUERY_CAP}）`, onclick: () => { searchCap.n += QUERY_CAP; draw() } } : null,
        ),
      )
    }

    const visible = blocks.filter(Boolean)
    if (!visible.length) {
      count.textContent = ''
      render(grid, [h('div', { class: 'muted pad', text: `没有匹配「${q}」的纹理。` })])
      return
    }
    render(grid, visible)
  }

  const quick = (label, value) =>
    h('button', {
      class: 'mini',
      text: label,
      onclick: () => {
        search.value = value
        searchCap.n = QUERY_CAP
        draw()
      },
    })

  search.addEventListener('input', () => {
    searchCap.n = QUERY_CAP
    draw()
  })
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close()
  })
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close()
  })

  overlay.appendChild(
    h(
      'div',
      { class: 'picker' },
      h(
        'div',
        { class: 'picker-head' },
        h('span', { text: '选择纹理（原版 + 工程资源包）' }),
        h('span', { class: 'spacer' }),
        count,
        h('button', { class: 'mini', text: '✕', title: '关闭', onclick: close }),
      ),
      h('div', { class: 'picker-toolbar' }, search, quick('book', 'ui/book'), quick('button', 'ui/button'), quick('icon', 'ui/icon'), quick('item', 'textures/items/'), quick('清空', '')),
      grid,
    ),
  )
  document.body.appendChild(overlay)
  if (search.focus) search.focus()
  draw()
}

/**
 * 一个可折叠分组。
 * · 折叠状态**跨选中记忆**（`GROUP_STATE`，键 = `类型::组`）：同一类型的同一组只折叠一次
 * · 默认只展开第一组（版面）；属性面板以前一屏 60+ 行全展开，找东西很累
 * · 有筛选词时：整组无命中就返回 null（不渲染），有命中就强制展开
 */
function group(title, rows, count, key, defaultOpen, filter = '') {
  const visible = (rows || []).filter(Boolean)
  if (filter && !visible.length) return null
  const remembered = GROUP_STATE.get(key)
  const open = filter ? true : remembered === undefined ? !!defaultOpen : remembered
  const body = h('div', { class: 'group-body' }, ...visible)
  const head = h('summary', { class: 'group-head' }, h('span', { text: title }), h('span', { class: 'spacer' }), h('span', { class: 'muted', text: count }))
  const details = h('details', { class: 'group', open }, head, body)
  details.open = !!open // 显式写入：h() 对 false 值不落属性，测试桩与浏览器都要能读到
  // 自己处理折叠（不依赖 <details> 的原生 toggle），这样浏览器与测试桩行为一致
  head.addEventListener('click', (e) => {
    e.preventDefault()
    const next = !details.open
    details.open = next
    GROUP_STATE.set(key, next)
    if (next) details.setAttribute('open', '')
    else if (details.attributes) delete details.attributes.open
    body.style.display = next ? '' : 'none'
  })
  if (!open) body.style.display = 'none'
  return details
}

function fieldRow(key, editor, opts = {}) {
  const row = h(
    'div',
    { class: 'row' },
    h('span', { class: `k${opts.assigned ? ' assigned' : ''}`, title: opts.hint || '', text: key }),
    editor,
    opts.onReset ? h('button', { class: 'mini ghost', text: '✕', title: '重置为未声明', onclick: opts.onReset }) : h('span', { class: 'mini ghost pad' }),
  )
  row.dataset.propKey = key
  return row
}

/** 一行属性：已声明 → 编辑器 + 重置；未声明 → 默认值灰字 + 赋值按钮 */
function propRow(node, def, app) {
  const { store } = app
  const has = Object.prototype.hasOwnProperty.call(node.props, def.key)
  if (!has) {
    const row = h(
      'div',
      { class: 'row unset' },
      h('span', { class: 'k muted', title: def.hint || '', text: def.key }),
      h('span', { class: 'muted def', text: `未声明（默认 ${JSON.stringify(def.default)}）` }),
      h('button', {
        class: 'mini ghost',
        text: '＋',
        title: `赋值 ${JSON.stringify(def.default)}（赋值后会写进产物，即使等于默认值）`,
        onclick: () => store.setProp(node.id, def.key, def.default),
      }),
    )
    row.dataset.propKey = def.key
    return row
  }
  return fieldRow(def.key, editorFor(node, def, app), {
    assigned: true,
    hint: `${def.hint || ''}\nsetter: ${def.setter}()`,
    onReset: () => store.unsetProp(node.id, def.key),
  })
}

function editorFor(node, def, app) {
  const { store } = app
  const value = node.props[def.key]
  const set = (v) => store.setProp(node.id, def.key, v)

  switch (def.type) {
    case 'bool':
      return h('input', { type: 'checkbox', checked: !!value, onchange: (e) => set(e.target.checked) })
    case 'number':
      return h('input', { type: 'number', step: 'any', value: String(value), onchange: (e) => set(Number(e.target.value)) })
    case 'enum':
      return h(
        'select',
        { onchange: (e) => set(coerce(e.target.value)) },
        def.options.map((o) => h('option', { value: String(o), selected: String(o) === String(value), text: String(o) })),
      )
    case 'anchor':
      return h(
        'div',
        { class: 'anchor-cell' },
        h(
          'select',
          { onchange: (e) => set(e.target.value) },
          ANCHOR_NAMES.map((a) => h('option', { value: a, selected: a === value, text: a })),
        ),
        anchorPicker(value, (a) => set(a)),
      )
    case 'size':
      return pairEditor(value, (pair) => set(pair), true)
    case 'offset':
      return pairEditor(value, (pair) => set(pair), true)
    case 'gridDimensions':
      return pairEditor(value, (pair) => set([Math.max(1, Math.trunc(pair[0])), Math.max(1, Math.trunc(pair[1]))]), false)
    case 'color':
      return colorEditor(value, (c) => set(c))
    case 'texture':
      return textureEditor(value, set, app)
    case 'text':
      return h('input', { type: 'text', value: String(value ?? ''), placeholder: '文案或 lang 键', onchange: (e) => set(e.target.value) })
    case 'array':
      return h('input', {
        type: 'text',
        value: JSON.stringify(value),
        onchange: (e) => {
          const parsed = parseLoose(e.target.value)
          if (parsed === undefined) return app.notice('数组请写成 JSON，如 [1, 2] 或 ["a", "b"]')
          set(parsed)
        },
      })
    case 'json':
      return h('textarea', {
        rows: '2',
        value: typeof value === 'string' ? value : JSON.stringify(value),
        onchange: (e) => {
          const parsed = parseLoose(e.target.value)
          if (parsed === undefined) return app.notice('JSON 解析失败，未提交')
          set(parsed)
        },
      })
    default:
      return h('input', {
        type: 'text',
        value: String(value ?? ''),
        list: def.key === 'collection_name' ? 'collection-suggestions' : undefined,
        onchange: (e) => set(e.target.value),
      })
  }
}

function coerce(v) {
  if (v === 'true') return true
  if (v === 'false') return false
  const n = Number(v)
  return v !== '' && Number.isFinite(n) && String(n) === v ? n : v
}

function parseLoose(text) {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function pairEditor(pair, commit, allowUnits) {
  const [a, b] = Array.isArray(pair) ? [String(pair[0] ?? ''), String(pair[1] ?? '')] : ['', '']
  const make = (idx, val) =>
    h('input', {
      type: 'text',
      class: 'pair',
      value: val,
      placeholder: allowUnits ? '0 / "50%" / fill' : '0',
      onchange: (e) => {
        const inputs = e.target.parentElement.querySelectorAll('input.pair')
        const raw = [inputs[0].value, inputs[1].value]
        const parsed = raw.map((t) => (allowUnits ? parseSizeValue(t) : Number(t)))
        if (parsed.some((v) => v === null || (typeof v === 'number' && !Number.isFinite(v)))) {
          return
        }
        commit(parsed)
      },
    })
  return h('div', { class: 'pair-wrap' }, make(0, a), h('span', { class: 'muted', text: ',' }), make(1, b))
}

function colorEditor(color, commit) {
  const arr = Array.isArray(color) ? color.slice(0, 4) : [1, 1, 1, 1]
  while (arr.length < 4) arr.push(1)
  const swatch = h('span', {
    class: 'swatch',
    style: { background: `rgba(${arr.slice(0, 3).map((c) => Math.round(c * 255)).join(',')},${arr[3]})` },
  })
  const inputs = arr.map((c, i) =>
    h('input', {
      type: 'number',
      class: 'color-pair',
      step: '0.05',
      min: '0',
      max: '1',
      value: String(c),
      onchange: (e) => {
        const wrap = e.target.parentElement
        const vals = [...wrap.querySelectorAll('input.color-pair')].map((n) => Number(n.value))
        swatch.style.background = `rgba(${vals.slice(0, 3).map((x) => Math.round(x * 255)).join(',')},${vals[3]})`
        commit(vals)
      },
    }),
  )
  return h('div', { class: 'color-wrap' }, swatch, ...inputs)
}

function anchorPicker(current, commit) {
  const grid = h('div', { class: 'anchor-picker' })
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const name = ['top_left', 'top_middle', 'top_right', 'left_middle', 'center', 'right_middle', 'bottom_left', 'bottom_middle', 'bottom_right'][row * 3 + col]
      grid.appendChild(
        h('button', {
          class: `mini anchor${name === current ? ' on' : ''}`,
          title: name,
          text: name === 'center' ? '·' : '',
          onclick: () => commit(name),
        }),
      )
    }
  }
  return grid
}

function bindingRow(node, binding, index, app) {
  const { store } = app
  const upd = (patch) => store.updateBinding(node.id, index, patch)
  return h(
    'div',
    { class: 'binding' },
    h(
      'div',
      { class: 'row' },
      h('span', { class: 'k muted', text: `#${index + 1}` }),
      h(
        'select',
        { onchange: (e) => upd({ type: e.target.value }) },
        ['view', 'collection', 'collection_details', 'global', 'none'].map((t) => h('option', { value: t, selected: binding.type === t, text: t })),
      ),
      h('input', { type: 'text', value: binding.collection || '', placeholder: 'binding_collection_name', onchange: (e) => upd({ collection: e.target.value }) }),
      h('button', { class: 'mini ghost', text: '✕', title: '删除绑定', onclick: () => store.removeBinding(node.id, index) }),
    ),
    h(
      'div',
      { class: 'row' },
      h('span', { class: 'k muted', text: 'name' }),
      h('input', { type: 'text', value: binding.name || '', placeholder: 'binding_name（如 #form_button_text）', onchange: (e) => upd({ name: e.target.value }) }),
    ),
    h(
      'div',
      { class: 'row' },
      h('span', { class: 'k muted', text: 'source' }),
      h('input', { type: 'text', value: binding.source || '', placeholder: '($binding_text = #form_text)', onchange: (e) => upd({ source: e.target.value }) }),
    ),
    h(
      'div',
      { class: 'row' },
      h('span', { class: 'k muted', text: 'target' }),
      h('input', { type: 'text', value: binding.target || '', placeholder: '#visible', onchange: (e) => upd({ target: e.target.value }) }),
    ),
  )
}

/** 供 app.js 挂全局 datalist */
export const SUGGESTION_LISTS = [
  { id: 'tex-suggestions', values: TEXTURE_SUGGESTIONS },
  { id: 'collection-suggestions', values: COLLECTION_SUGGESTIONS },
]
