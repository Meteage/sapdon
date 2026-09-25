/**
 * 工程模型（Sapdon UI Designer）
 *
 * 持有 `.sui.json` 文档、选中态与撤销栈。**不碰 DOM**，因此可以在 Node 里被单测直接驱动
 * （`tests/designer-codegen.test.mjs` 就是这么加载示例工程的）。
 *
 * ★ 三态属性（本工具的核心不变量）：`node.props` 是**稀疏 map**，
 *   键存在 ⟺ 框架会把该字段写进 JSON UI 产物。
 *   - 删键 = Qt 的 `resetProperty()`（回到"未声明"，产物里没有这个字段）
 *   - 设成默认值 ≠ 删键（产物里会多一个字段，可能改变既有渲染）
 *   既有基线产物对**逐字节**敏感（guidebook 587870 字节判据），所以这条不能松。
 */

import { schemaFor, widgetFor, editableKeys, PACK_PROPS } from './catalog.js'
import { gridDimensions } from './layout.js'

export const SCHEMA_VERSION = 1
export const TOOL_ID = 'sapdon-designer'

// ---------------------------------------------------------------------------
// 建文档
// ---------------------------------------------------------------------------

export function emptyProject(identifier = 'sapdon_ui_page', kind = 'form') {
  return {
    formatVersion: SCHEMA_VERSION,
    tool: TOOL_ID,
    uiSystem: { identifier, path: 'ui/' },
    canvas: { size: [320, 207], zoom: 2 },
    /** 屏幕类型（2026-09 三方口径）：'form' 自定义表单屏 | 'container' 容器 | 'hud' 常驻 HUD */
    screenKind: SCREEN_KINDS.includes(kind) ? kind : 'form',
    /**
     * 本屏（一个工程 = 一个屏）：`name` = nm 段（文件名/factory/panelId 来源），
     * `content` / `buttons` = 两块面板的元素 id。**没有页面列表** ——
     * 多页面归可放置的 `PagePanelManage` 对象管（`node.pages`）。
     */
    screen: { name: defaultScreenName(identifier), content: null, buttons: null },
    elements: [],
  }
}

function defaultScreenName(identifier) {
  const ns = String(identifier || 'sapdon_ui')
  return ns.endsWith('_ui') ? 'screen' : `${ns}_screen`
}

/** 本屏（旧工程从 `pages[0]` 迁过来） */
export function screenOf(doc) {
  const s = (doc && doc.screen) || {}
  return {
    name: s.name || defaultScreenName(doc && doc.uiSystem && doc.uiSystem.identifier),
    content: s.content ?? null,
    buttons: s.buttons ?? null,
  }
}

/** 工程里的多页管理器节点（`PagePanelManage`） */
export function managerNodes(doc) {
  return (doc && doc.elements ? doc.elements : []).filter((n) => n.type === 'page_panel_manage')
}

/**
 * 门控模拟能选的值：管理器登记的 tag + 元素上写死的门控变量值（`$gtag` / `$binding_text`）。
 * 这是"门控视图"的**唯一数据源** —— 没有管理器对象时也能从元素绑定里认出来。
 */
export function gateTags(doc) {
  const tags = new Set()
  for (const m of managerNodes(doc)) {
    for (const p of m.pages || []) if (p.tag) tags.add(String(p.tag))
  }
  const walk = (nodes) => {
    for (const n of nodes || []) {
      for (const [k, v] of Object.entries(n.vars || {})) {
        if ((k === 'gtag' || k === 'binding_text') && v) tags.add(String(v))
      }
      walk(n.controls)
    }
  }
  walk((doc && doc.elements) || [])
  return [...tags]
}

/** 三类屏幕（只有 form 走「root + 内容/按钮 + 门控」那套规范校验） */
export const SCREEN_KINDS = ['form', 'container', 'hud']

/** 屏幕类型（旧工程没有这个字段 ⇒ form） */
export function screenKind(doc) {
  const k = doc && doc.screenKind
  return SCREEN_KINDS.includes(k) ? k : 'form'
}

/**
 * 屏的 UI namespace = `ns_nm`（框架约定，见 `SapdonFormUI`）。
 *
 * `new SapdonFormUI("ns:nm", …)` 的 UI 文件名与 namespace **都是 `ns_nm`**
 * （`sapdon_ui:book` → `ui/sapdon_ui_book.json`，文件里引用前缀也是 `sapdon_ui_book.xxx`）。
 * 设计器工程里 `uiSystem.identifier` 存的是 **ns 段**，`nm` 取首行屏名。
 */
export function screenNamespace(doc) {
  const ns = (doc && doc.uiSystem && doc.uiSystem.identifier) || 'ui'
  const nm = screenOf(doc).name || ns
  return `${ns}_${nm}`
}

/**
 * 产物文件名（按屏幕类型取**框架各自的真实规则**，不猜）：
 *  - `form`：`ui/<ns_nm>.json`（`SapdonFormUI` → `UISystemRegistry` 拼 `path + name + '.json'`）
 *  - `container`：`ui/<nm>.json`（`ContainerUISystem(identifier)` 直接把 identifier 交给 `UISystem`）
 *  - `hud`：`ui/hud_screen.json`（`HudUISystem` 固定改原版 `hud_screen`）
 */
export function uiFileName(doc) {
  const path = (doc && doc.uiSystem && doc.uiSystem.path) || 'ui/'
  const kind = screenKind(doc)
  if (kind === 'hud') return `${path}hud_screen.json`
  if (kind === 'container') {
    const nm = screenOf(doc).name || (doc && doc.uiSystem && doc.uiSystem.identifier) || 'ui'
    return `${path}${nm}.json`
  }
  return `${path}${screenNamespace(doc)}.json`
}

/** 新建节点：只预置**构造器必填**的入参（组合件），其余一律留空 —— 见文件头三态说明 */
export function createNode(doc, type) {
  const w = widgetFor(type)
  if (!w) throw new Error(`未知控件类型: ${type}`)
  const node = {
    id: uniqueId(doc, defaultIdBase(type)),
    type,
    template: '',
    debug: false,
    props: {},
    vars: {},
    bindings: [],
    modifications: [],
    controls: [],
  }
  if (type === 'form_button_grid') node.props = { dimensions: [2, 1], size: ['100%', '100%'] }
  if (type === 'form_button') {
    node.props = { anchor: 'top_left', size: [24, 24], binding: '' }
    node.slot = 0
    node.pos = [0, 0]
  }
  if (type === 'grid') node.props = {}
  // 多页管理器：非视觉对象；`container` = 门控容器（内容面板）元素 id，`pages[]` = 「tag + 页面板」
  if (type === 'page_panel_manage') {
    node.props = { container: '', mode: 'prefix' }
    node.pages = []
  }
  return node
}

function defaultIdBase(type) {
  const w = widgetFor(type)
  const ctor = w ? w.ctor : 'el'
  const snake = ctor.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()
  return snake
}

/** 文档内 id 唯一（框架里 `{ [id]: json }` 会互相覆盖 ⇒ 静默丢控件） */
export function uniqueId(doc, base) {
  const used = new Set()
  walk(doc.elements, (n) => used.add(n.id))
  const safe = String(base || 'el').replace(/[^A-Za-z0-9_-]/g, '_') || 'el'
  if (!used.has(safe)) return safe
  let i = 2
  while (used.has(`${safe}_${i}`)) i++
  return `${safe}_${i}`
}

// ---------------------------------------------------------------------------
// 遍历 / 查找
// ---------------------------------------------------------------------------

export function walk(nodes, fn, parentId = null) {
  for (const n of nodes || []) {
    fn(n, parentId)
    walk(n.controls, fn, n.id)
  }
}

export function findNode(nodes, id) {
  let hit = null
  walk(nodes, (n) => {
    if (n.id === id) hit = n
  })
  return hit
}

/** 定位：返回 { node, siblings, index, parentId }；parents 是 id 数组（根为 null） */
export function locate(doc, id, trail = []) {
  const walkLocate = (nodes, parentId, trailIds) => {
    for (let i = 0; i < (nodes || []).length; i++) {
      const n = nodes[i]
      if (n.id === id) return { node: n, siblings: nodes, index: i, parentId, trail: trailIds }
      const sub = walkLocate(n.controls, n.id, [...trailIds, n.id])
      if (sub) return sub
    }
    return null
  }
  return walkLocate(doc.elements, null, trail)
}

/** 扁平列表（对象树用），带深度与父 id */
export function flatten(doc) {
  const out = []
  const rec = (nodes, depth, parentId) => {
    for (const n of nodes || []) {
      out.push({ node: n, depth, parentId })
      rec(n.controls, depth + 1, n.id)
    }
  }
  rec(doc.elements, 0, null)
  return out
}

// ---------------------------------------------------------------------------
// 稳定序列化（同模型 → 逐字节同样的 JSON/TS，diff 友好）
// ---------------------------------------------------------------------------

export function orderedProps(type, props) {
  const order = editableKeys(type).map((d) => d.key)
  const keys = Object.keys(props || {})
  const known = order.filter((k) => keys.includes(k))
  const unknown = keys.filter((k) => !order.includes(k)).sort()
  return [...known, ...unknown]
}

function orderedObject(map, order) {
  const out = {}
  for (const k of order) if (Object.prototype.hasOwnProperty.call(map, k)) out[k] = map[k]
  return out
}

export function nodeToJSON(node) {
  const out = { id: node.id, type: node.type }
  if (node.template) out.template = node.template
  if (node.debug) out.debug = true
  if (Array.isArray(node.gridPosition)) out.gridPosition = node.gridPosition
  if (Number.isFinite(node.slot)) out.slot = node.slot
  if (Array.isArray(node.pos) && (node.pos[0] || node.pos[1])) out.pos = node.pos
  if (node.type === 'page_panel_manage') {
    out.pages = (node.pages || []).map((p) => ({ tag: p.tag, panel: p.panel ?? null }))
  }
  const props = orderedProps(node.type, node.props)
  if (props.length) out.props = orderedObject(node.props, props)
  const vars = Object.keys(node.vars || {}).sort()
  if (vars.length) out.vars = orderedObject(node.vars, vars)
  if (node.bindings && node.bindings.length) out.bindings = node.bindings.map((b) => ({ ...b }))
  if (node.modifications && node.modifications.length) out.modifications = node.modifications.map((m) => ({ ...m }))
  if (node.controls && node.controls.length) out.controls = node.controls.map(nodeToJSON)
  return out
}

export function projectToJSON(doc) {
  return {
    formatVersion: SCHEMA_VERSION,
    tool: TOOL_ID,
    uiSystem: { identifier: doc.uiSystem.identifier, path: doc.uiSystem.path || 'ui/' },
    canvas: { size: [...doc.canvas.size], zoom: doc.canvas.zoom || 2 },
    screenKind: screenKind(doc),
    screen: { ...screenOf(doc) },
    elements: doc.elements.map(nodeToJSON),
  }
}

export function serializeProject(doc) {
  return JSON.stringify(projectToJSON(doc), null, 2)
}

// ---------------------------------------------------------------------------
// 载入 + 规整
// ---------------------------------------------------------------------------

export function loadProject(raw) {
  const errors = []
  let data = raw
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw)
    } catch (e) {
      return { project: null, errors: [`JSON 解析失败: ${e.message}`] }
    }
  }
  if (!data || typeof data !== 'object') return { project: null, errors: ['工程内容不是对象'] }
  if (Number(data.formatVersion) > SCHEMA_VERSION) errors.push(`工程 formatVersion=${data.formatVersion} 比本工具（${SCHEMA_VERSION}）新，可能有字段被忽略`)

  const doc = emptyProject((data.uiSystem && data.uiSystem.identifier) || 'sapdon_ui_page', data.screenKind)
  doc.uiSystem.path = (data.uiSystem && data.uiSystem.path) || 'ui/'
  if (data.canvas && Array.isArray(data.canvas.size) && data.canvas.size.length === 2) doc.canvas.size = [...data.canvas.size]
  if (data.canvas && Number.isFinite(data.canvas.zoom)) doc.canvas.zoom = data.canvas.zoom

  const norm = (n, parentType) => {
    const type = n.type || (n.controls ? 'panel' : 'label')
    const w = widgetFor(type)
    if (!w) {
      errors.push(`未知控件类型 ${type}（id=${n.id}）已按 panel 处理`)
    }
    const node = {
      id: n.id || uniqueId(doc, defaultIdBase(type)),
      type: w ? type : 'panel',
      template: n.template || '',
      debug: n.debug === true,
      props: { ...(n.props || {}) },
      vars: { ...(n.vars || {}) },
      bindings: Array.isArray(n.bindings) ? n.bindings.map((b) => ({ ...b })) : [],
      modifications: Array.isArray(n.modifications) ? n.modifications.map((m) => ({ ...m })) : [],
      controls: [],
    }
    if (Array.isArray(n.gridPosition)) node.gridPosition = [Number(n.gridPosition[0]) || 0, Number(n.gridPosition[1]) || 0]
    if (Number.isFinite(n.slot)) node.slot = n.slot
    if (Array.isArray(n.pos)) node.pos = [Number(n.pos[0]) || 0, Number(n.pos[1]) || 0]
    // 多页管理器（PagePanelManage）：非视觉对象，自带页列表
    if (node.type === 'page_panel_manage') {
      node.pages = (Array.isArray(n.pages) ? n.pages : []).map((p, i) => ({
        tag: p.tag ?? `page${i + 1}`,
        panel: p.panel || null,
      }))
    }
    if (parentType === 'grid' && !node.gridPosition) node.gridPosition = [0, 0]
    node.controls = (Array.isArray(n.controls) ? n.controls : []).map((c) => norm(c, node.type))
    return node
  }
  doc.elements = (Array.isArray(data.elements) ? data.elements : []).map((n) => norm(n, null))
  // 本屏：新工程读 `screen`；会话早期的工程（`pages[]`）把首行迁过来
  const legacyFirst = Array.isArray(data.pages) ? data.pages[0] : null
  const sc = data.screen || legacyFirst || {}
  doc.screen = {
    name: sc.name || defaultScreenName(doc.uiSystem.identifier),
    content: sc.content || null,
    buttons: sc.buttons || null,
  }
  if (legacyFirst && !data.screen) {
    errors.push('工程是早期格式（页面列表）：已把首行迁成「本屏」；多页面请放一个 PagePanelManage 对象（tag/面板在它的属性里编辑）')
  }
  return { project: doc, errors }
}

// ---------------------------------------------------------------------------
// Store：文档 + 选中 + 撤销栈
// ---------------------------------------------------------------------------

const UNDO_LIMIT = 80

export class Store {
  constructor(doc) {
    this.doc = doc || emptyProject()
    this.selection = null
    /** 多选集合（有序，最后一个是"主选"，属性面板编辑它）—— `selection` 永远等于它的最后一项 */
    this.selectedIds = []
    this.listeners = new Set()
    this.undoStack = []
    this.redoStack = []
    this.dirty = false
    /** 剪贴板（Ctrl+C/V）：存**序列化后的节点**，粘贴时重建 id */
    this.clipboard = null
  }

  // --- 订阅 ---
  on(fn) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  emit(reason = 'change') {
    for (const fn of this.listeners) fn(this, reason)
  }

  // --- 撤销 ---
  snapshot() {
    this.undoStack.push(structuredClone(projectToJSON(this.doc)))
    if (this.undoStack.length > UNDO_LIMIT) this.undoStack.shift()
    this.redoStack.length = 0
  }

  /** 包住一次编辑：先快照，再改，再广播 */
  edit(label, fn) {
    this.snapshot()
    fn(this.doc)
    this.dirty = true
    this.emit(label)
  }

  canUndo() {
    return this.undoStack.length > 0
  }

  canRedo() {
    return this.redoStack.length > 0
  }

  /** 撤销/重做后把已经不存在的选中项丢掉（多选也要一起收拾） */
  pruneSelection() {
    this.selectedIds = this.selectedIds.filter((id) => !!findNode(this.doc.elements, id))
    if (this.selection && !findNode(this.doc.elements, this.selection)) {
      this.selection = this.selectedIds[this.selectedIds.length - 1] || null
    }
    if (!this.selection && this.selectedIds.length) this.selection = this.selectedIds[this.selectedIds.length - 1]
  }

  undo() {
    if (!this.undoStack.length) return
    this.redoStack.push(structuredClone(projectToJSON(this.doc)))
    const prev = this.undoStack.pop()
    const { project } = loadProject(prev)
    this.doc = project
    this.pruneSelection()
    this.emit('undo')
  }

  redo() {
    if (!this.redoStack.length) return
    this.undoStack.push(structuredClone(projectToJSON(this.doc)))
    const next = this.redoStack.pop()
    const { project } = loadProject(next)
    this.doc = project
    this.pruneSelection()
    this.emit('redo')
  }

  // --- 查询 ---
  node(id) {
    return id ? findNode(this.doc.elements, id) : null
  }

  locate(id) {
    return locate(this.doc, id)
  }

  /**
   * 选中（Qt 的选择语义）：
   *  - 默认单选；`add` = Ctrl 点（切换这一项）；`range` = Shift 点（从当前主选到它，按**树的可视顺序**）
   *  - 传 `null` 清空
   */
  select(id, { add = false, range = false } = {}) {
    if (id === null || id === undefined) {
      this.selectedIds = []
      this.selection = null
      this.emit('select')
      return
    }
    if (add) {
      this.selectedIds = this.selectedIds.includes(id) ? this.selectedIds.filter((x) => x !== id) : [...this.selectedIds, id]
      this.selection = this.selectedIds[this.selectedIds.length - 1] || null
    } else if (range && this.selection) {
      const order = flatten(this.doc).map((r) => r.node.id)
      const a = order.indexOf(this.selection)
      const b = order.indexOf(id)
      if (a >= 0 && b >= 0) {
        const [lo, hi] = a <= b ? [a, b] : [b, a]
        this.selectedIds = order.slice(lo, hi + 1)
      } else {
        this.selectedIds = [id]
      }
      this.selection = id
    } else {
      this.selectedIds = [id]
      this.selection = id
    }
    this.emit('select')
  }

  /** 直接给一组 id（框选用：交集选定，主选 = 最后一个） */
  selectMany(ids) {
    const list = (ids || []).filter((id) => !!this.node(id))
    this.selectedIds = list
    this.selection = list[list.length - 1] || null
    this.emit('select')
  }

  get selectedNodes() {
    return this.selectedIds.map((id) => this.node(id)).filter(Boolean)
  }

  /** 多选（≥2 个）才算"批量操作"；单选时属性面板按老样子走 */
  get multi() {
    return this.selectedIds.length > 1
  }

  get selected() {
    return this.node(this.selection)
  }

  // --- 结构编辑 ---
  addWidget(type, { parentId = null, index = null } = {}) {
    let created = null
    this.edit('add', (doc) => {
      const node = createNode(doc, type)
      if (!parentId) {
        doc.elements.push(node)
      } else {
        const parent = findNode(doc.elements, parentId)
        if (!parent) throw new Error(`找不到父元素 ${parentId}`)
        const at = index === null ? parent.controls.length : Math.max(0, Math.min(index, parent.controls.length))
        parent.controls.splice(at, 0, node)
        reindex(parent)
      }
      created = node
    })
    if (created) this.select(created.id)
    return created
  }

  remove(id) {
    this.removeMany([id])
  }

  /** 批量删除（一次撤销步）：多选删除、以及 Ctrl+X 之后的兜底路径都走它 */
  removeMany(ids) {
    const list = (ids || []).filter(Boolean)
    if (!list.length) return
    this.edit('remove', (doc) => {
      for (const id of list) {
        const loc = locate(doc, id)
        if (!loc) continue
        loc.siblings.splice(loc.index, 1)
        const parent = loc.parentId ? findNode(doc.elements, loc.parentId) : null
        if (parent) reindex(parent)
        // 清掉对本元素的引用：本屏的两块面板 + 各管理器登记的页
        if (doc.screen) {
          if (doc.screen.content === id) doc.screen.content = null
          if (doc.screen.buttons === id) doc.screen.buttons = null
        }
        for (const m of managerNodes(doc)) {
          m.pages = (m.pages || []).filter((p) => p.panel !== id)
          if (m.props && m.props.container === id) m.props.container = ''
        }
      }
    })
    this.selectedIds = this.selectedIds.filter((x) => !list.includes(x))
    this.selection = this.selectedIds[this.selectedIds.length - 1] || null
  }

  /** 兄弟内上下移动 */
  nudge(id, delta) {
    this.edit('nudge', (doc) => {
      const loc = locate(doc, id)
      if (!loc) return
      const to = loc.index + delta
      if (to < 0 || to >= loc.siblings.length) return
      const [n] = loc.siblings.splice(loc.index, 1)
      loc.siblings.splice(to, 0, n)
      const parent = loc.parentId ? findNode(doc.elements, loc.parentId) : null
      if (parent) reindex(parent)
    })
  }

  /** 缩进：成为前一个兄弟的最后一个子项 */
  indent(id) {
    this.edit('indent', (doc) => {
      const loc = locate(doc, id)
      if (!loc || loc.index === 0) return
      const prev = loc.siblings[loc.index - 1]
      const [n] = loc.siblings.splice(loc.index, 1)
      prev.controls.push(n)
      reindex(prev)
    })
  }

  /** 反缩进：成为父节点的下一个兄弟 */
  outdent(id) {
    this.edit('outdent', (doc) => {
      const loc = locate(doc, id)
      if (!loc || !loc.parentId) return
      const parentLoc = locate(doc, loc.parentId)
      if (!parentLoc) return
      const [n] = loc.siblings.splice(loc.index, 1)
      parentLoc.siblings.splice(parentLoc.index + 1, 0, n)
      reindex(parentLoc.siblings[parentLoc.index] || parentLoc.siblings[parentLoc.index + 1])
    })
  }

  /** 拖到另一个父节点 */
  reparent(id, parentId, index = null) {
    if (id === parentId) return
    this.edit('reparent', (doc) => {
      const loc = locate(doc, id)
      const parent = parentId ? findNode(doc.elements, parentId) : null
      if (!loc || (parentId && !parent)) return
      // 防环：目标不能是自己的后代
      let bad = false
      walk(loc.node.controls, (n) => {
        if (n.id === parentId) bad = true
      })
      if (bad) return
      const [n] = loc.siblings.splice(loc.index, 1)
      const target = parent ? parent.controls : doc.elements
      const at = index === null ? target.length : Math.max(0, Math.min(index, target.length))
      target.splice(at, 0, n)
      if (parent) reindex(parent)
      if (loc.parentId) {
        const oldParent = findNode(doc.elements, loc.parentId)
        if (oldParent) reindex(oldParent)
      }
    })
  }

  rename(id, newId) {
    const clean = String(newId || '').trim()
    if (!clean) return
    this.edit('rename', (doc) => {
      const loc = locate(doc, id)
      if (!loc) return
      const others = []
      walk(doc.elements, (n) => {
        if (n.id !== id) others.push(n.id)
      })
      let final = clean.replace(/[^A-Za-z0-9_-]/g, '_')
      let i = 2
      while (others.includes(final)) final = `${clean}_${i++}`
      loc.node.id = final
      // 引用跟着改名：本屏两块面板 + 各管理器登记/容器
      if (doc.screen) {
        if (doc.screen.content === id) doc.screen.content = final
        if (doc.screen.buttons === id) doc.screen.buttons = final
      }
      for (const m of managerNodes(doc)) {
        for (const p of m.pages || []) if (p.panel === id) p.panel = final
        if (m.props && m.props.container === id) m.props.container = final
      }
      this.selection = final
      this.selectedIds = this.selectedIds.map((x) => (x === id ? final : x))
    })
  }

  // --- 属性（三态） ---
  setProp(id, key, value) {
    this.edit('prop', (doc) => {
      const n = findNode(doc.elements, id)
      if (!n) return
      n.props[key] = value
      const parentLoc = locate(doc, id)
      if (parentLoc && parentLoc.parentId) {
        const parent = findNode(doc.elements, parentLoc.parentId)
        if (parent) reindex(parent)
      }
    })
  }

  /** 重置：删键（回到"未声明"，产物里没有该字段） */
  unsetProp(id, key) {
    this.edit('unprop', (doc) => {
      const n = findNode(doc.elements, id)
      if (!n) return
      delete n.props[key]
    })
  }

  setVar(id, name, value) {
    this.edit('var', (doc) => {
      const n = findNode(doc.elements, id)
      if (!n) return
      n.vars[String(name).replace(/^\$/, '')] = value
    })
  }

  unsetVar(id, name) {
    this.edit('unvar', (doc) => {
      const n = findNode(doc.elements, id)
      if (n) delete n.vars[name]
    })
  }

  addBinding(id, binding) {
    this.edit('binding', (doc) => {
      const n = findNode(doc.elements, id)
      if (n) n.bindings.push({ ...binding })
    })
  }

  updateBinding(id, index, patch) {
    this.edit('binding', (doc) => {
      const n = findNode(doc.elements, id)
      if (n && n.bindings[index]) n.bindings[index] = { ...n.bindings[index], ...patch }
    })
  }

  removeBinding(id, index) {
    this.edit('unbinding', (doc) => {
      const n = findNode(doc.elements, id)
      if (n) n.bindings.splice(index, 1)
    })
  }

  setTemplate(id, template) {
    this.edit('template', (doc) => {
      const n = findNode(doc.elements, id)
      if (n) n.template = template || ''
    })
  }

  setDebug(id, on) {
    this.edit('debug', (doc) => {
      const n = findNode(doc.elements, id)
      if (n) n.debug = !!on
    })
  }

  setGridPosition(id, pos) {
    this.edit('gridpos', (doc) => {
      const n = findNode(doc.elements, id)
      if (n) n.gridPosition = [Number(pos[0]) || 0, Number(pos[1]) || 0]
    })
  }

  setSlot(id, slot) {
    this.edit('slot', (doc) => {
      const n = findNode(doc.elements, id)
      if (n) n.slot = Math.max(0, Math.trunc(Number(slot) || 0))
    })
  }

  setPos(id, pos) {
    this.edit('pos', (doc) => {
      const n = findNode(doc.elements, id)
      if (n) n.pos = [Math.trunc(Number(pos[0]) || 0), Math.trunc(Number(pos[1]) || 0)]
    })
  }

  // --- 本屏 / 文档级 ---
  /** 改本屏（`name` = nm 段；`content` / `buttons` = 面板元素 id） */
  setScreen(patch) {
    this.edit('screen', (doc) => {
      doc.screen = { ...screenOf(doc), ...patch }
    })
  }

  /** 给多页管理器加一页（`tag` = 运行期 `.body()` 要 emit 的串，`panel` = 页面板元素 id） */
  addManagerPage(id, patch = {}) {
    this.edit('page', (doc) => {
      const n = findNode(doc.elements, id)
      if (!n || n.type !== 'page_panel_manage') return
      if (!Array.isArray(n.pages)) n.pages = []
      const i = n.pages.length + 1
      n.pages.push({ tag: patch.tag ?? `page${i}`, panel: patch.panel ?? null })
    })
  }

  updateManagerPage(id, index, patch) {
    this.edit('page', (doc) => {
      const n = findNode(doc.elements, id)
      if (n && n.pages && n.pages[index]) n.pages[index] = { ...n.pages[index], ...patch }
    })
  }

  removeManagerPage(id, index) {
    this.edit('page', (doc) => {
      const n = findNode(doc.elements, id)
      if (n && n.pages) n.pages.splice(index, 1)
    })
  }

  setUiSystem(patch) {
    this.edit('uisystem', (doc) => {
      doc.uiSystem = { ...doc.uiSystem, ...patch }
    })
  }

  /** 屏幕类型：form（按规范）| container | hud（后两类自由摆放，不做规范校验） */
  setScreenKind(kind) {
    this.edit('screenkind', (doc) => {
      doc.screenKind = SCREEN_KINDS.includes(kind) ? kind : 'form'
    })
  }

  setCanvas(patch) {
    this.edit('canvas', (doc) => {
      doc.canvas = { ...doc.canvas, ...patch }
    })
  }

  /** 直接替换文档（打开工程/新建） */
  reset(doc) {
    this.doc = doc
    this.selection = null
    this.selectedIds = []
    this.clipboard = null
    this.undoStack.length = 0
    this.redoStack.length = 0
    this.emit('reset')
  }

  // --- 批量：复制 / 粘贴 / 副本 / 层序 / 对齐 ---

  /** 复制（Ctrl+C）：把节点**序列化**进剪贴板（深拷贝，之后改原节点不影响粘贴） */
  copy(ids = this.selectedIds) {
    const nodes = (ids || []).map((id) => this.node(id)).filter(Boolean)
    if (!nodes.length) return 0
    this.clipboard = nodes.map((n) => nodeToJSON(n))
    return nodes.length
  }

  get canPaste() {
    return !!(this.clipboard && this.clipboard.length)
  }

  /**
   * 粘贴（Ctrl+V）：粘到**当前选中元素的父级**里（选中的是容器就粘进它内部），紧跟原项之后。
   * id 全部重建（`uniqueId`），最后选中新粘出来的那批。
   */
  paste() {
    if (!this.canPaste) return []
    const anchor = this.selectedIds[this.selection ? this.selectedIds.length - 1 : 0]
    const loc = anchor ? locate(this.doc, anchor) : null
    const target = anchor && isContainerNode(anchor) ? anchor : loc && loc.parentId ? loc.parentId : null
    const created = []
    const createdIds = []
    this.edit('paste', (doc) => {
      const parent = target ? findNode(doc.elements, target) : null
      const siblings = parent ? parent.controls : doc.elements
      let at = parent ? siblings.length : doc.elements.length
      if (!parent && loc) at = (locate(doc, anchor) || loc).index + 1
      const used = new Set(flatten(doc).map((r) => r.node.id))
      for (const raw of this.clipboard) {
        const node = parseNode(doc, raw, used)
        if (!node) continue
        bumpOffset(node)
        siblings.splice(at++, 0, node)
        created.push(node)
        collectIds(node, createdIds)
      }
      if (parent) reindex(parent)
    })
    this.selectMany(createdIds)
    return created
  }

  /** 就地副本（Ctrl+D）：同一父级、紧跟其后、offset +8/+8（看得见它生出来了） */
  duplicate(ids = this.selectedIds) {
    const list = (ids || []).filter(Boolean)
    if (!list.length) return []
    const created = []
    this.edit('duplicate', (doc) => {
      const used = new Set(flatten(doc).map((r) => r.node.id))
      for (const id of list) {
        const loc = locate(doc, id)
        if (!loc) continue
        const copyNode = parseNode(doc, nodeToJSON(loc.node), used)
        if (!copyNode) continue
        bumpOffset(copyNode)
        loc.siblings.splice(loc.index + 1, 0, copyNode)
        created.push(copyNode)
      }
      for (const id of list) {
        const loc = locate(doc, id)
        const parent = loc && loc.parentId ? findNode(doc.elements, loc.parentId) : null
        if (parent) reindex(parent)
      }
    })
    this.selectMany(created.map((n) => n.id))
    return created
  }

  /** 层序升/降（Qt 的 Raise/Lower）：改 `layer` 属性，缺省 0 起算 */
  raiseLower(ids = this.selectedIds, delta = 1) {
    const list = (ids || []).filter(Boolean)
    if (!list.length) return
    this.edit('layer', (doc) => {
      for (const id of list) {
        const n = findNode(doc.elements, id)
        if (!n) continue
        const cur = Number(n.props.layer) || 0
        n.props.layer = Math.max(0, cur + delta)
      }
    })
  }

  /**
   * 批量写 offset（对齐/分布算完的结果一次落盘，只占**一步撤销**）。
   * @param {{id:string, offset:[number,number], size?:[number,number]|null}[]} ops
   */
  applyBoxOps(ops) {
    const list = (ops || []).filter(Boolean)
    if (!list.length) return
    this.edit('align', (doc) => {
      for (const op of list) {
        const n = findNode(doc.elements, op.id)
        if (!n) continue
        if (op.offset) n.props.offset = [Math.round(op.offset[0]), Math.round(op.offset[1])]
        if (op.size) n.props.size = [Math.round(op.size[0]), Math.round(op.size[1])]
      }
    })
  }
}

/** 节点是不是容器（能装子项；管理器不算） */
function isContainerNode(node) {
  if (!node) return false
  const w = widgetFor(node.type)
  return !!(w && w.container)
}

/**
 * 把剪贴板/副本的原始 JSON 变成**当前文档里合法的节点**：
 * 重建整棵子树的 id（避开文档里已有的、以及这一批里互相的），再走一遍 `loadProject` 的规整。
 */
function parseNode(doc, raw, usedIds) {
  const rebuilt = JSON.parse(JSON.stringify(raw))
  const taken = usedIds || new Set(flatten(doc).map((r) => r.node.id))
  const reid = (n) => {
    const base = String(n.id || 'el').replace(/[^A-Za-z0-9_-]/g, '_') || 'el'
    let id = base
    let i = 2
    while (taken.has(id)) id = `${base}_${i++}`
    n.id = id
    taken.add(id)
    for (const c of n.controls || []) reid(c)
  }
  reid(rebuilt)
  const { project } = loadProject({
    formatVersion: SCHEMA_VERSION,
    tool: TOOL_ID,
    uiSystem: { identifier: (doc.uiSystem && doc.uiSystem.identifier) || 'tmp', path: 'ui/' },
    elements: [rebuilt],
  })
  return project && project.elements[0] ? project.elements[0] : null
}

/** 粘贴/副本错开一点，否则完全重合、看着像没生效 */
function bumpOffset(node) {
  const cur = Array.isArray(node.props.offset) ? node.props.offset : [0, 0]
  const nums = cur.map((v) => (typeof v === 'number' ? v : 0))
  node.props.offset = [nums[0] + 8, nums[1] + 8]
}

/** 收一棵子树里所有 id（粘贴后选中整批） */
function collectIds(node, out) {
  out.push(node.id)
  for (const c of node.controls || []) collectIds(c, out)
}

/**
 * 结构变动后同步"引擎侧算出来的定位"：
 * - `grid` 子项的 grid_position 缺省按行优先补齐（引擎靠它把格子绑到内容）
 * - `form_button_grid` 子项的 slot 缺省按顺序补齐（槽位序号 ≠ 视觉序号，见 AGENTS.md）
 */
export function reindex(parent) {
  if (!parent || !Array.isArray(parent.controls)) return
  if (parent.type === 'grid') {
    const [cols] = gridDimensions(parent.props)
    parent.controls.forEach((c, i) => {
      if (!Array.isArray(c.gridPosition)) c.gridPosition = [i % cols, Math.floor(i / cols)]
    })
  }
  if (parent.type === 'form_button_grid') {
    parent.controls.forEach((c, i) => {
      if (!Number.isFinite(c.slot)) c.slot = i
      if (!Array.isArray(c.pos)) c.pos = [0, 0]
    })
  }
}

export { PACK_PROPS, schemaFor }
