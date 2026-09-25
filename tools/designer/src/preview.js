/**
 * JSON UI 产物预览（Sapdon UI Designer）
 *
 * 本模块是 **`uic` 的等价物**：把工程模型摊成「框架真的会写出的 JSON UI」。
 * 它镜像 `src/core/ui/**` 的序列化语义（逐条核对过）：
 *
 *  1. `UIElement.serialize()`：`properties`（`type` + `addProp` 来的键）→ 合并各属性包自有字段
 *     → 并入 `$变量` → 输出 `{ [id@template]: json }`；**未赋值字段绝不出现**。
 *  2. `Control.addControl()` 把子节点序列化结果**按调用顺序**推进 `controls`。
 *  3. `StackPanel` 永远带 `orientation`（默认 vertical）；`Grid`/`ScrollingPanel` 的 `type` 是
 *     `grid`/`scroll_view`（构造器修正）。
 *  4. `Grid.addGridItem()` 把内容**包一层** `grid_item_N` 面板（`grid_position` 在包裹层上）。
 *  5. `FormButtonGrid.addButton(slot, btn, pos)`：`offset = [(pos - 基准格)·100%]`、
 *     注入"激活三件套"、包裹名 `grid_item_<slot 三位补零>`；`enableDebug()` 只作用在格子上。
 *  6. `SapdonFormUI` = 一个 UI 文件：`{ namespace, <content>, <buttons>, <页面根壳> }`；
 *     `ServerFormUI` = `server_form.json` 路由壳（4 个元素 + 每条路由一个 gated factory）。
 *
 * ⚠️ 与真实框架产物的**逐字段一致性由 `tests/designer-codegen.test.mjs` 的交叉验证兜底**
 *    （跑真 `dist/core/ui/**` 对比）。**不要**为了让测试变绿而放宽那条断言。
 *
 * 比较约定：框架会把 `DataBindingObject` **实例**直接塞进 `bindings`（原型不等于普通对象），
 * 所以比对与展示统一先做 `jsonNormalize()`（= 构建期真正落盘的那份 JSON）。
 */

import { schemaFor } from './catalog.js'
import { gridDimensions } from './layout.js'
import { managerNodes, screenKind, screenNamespace, screenOf, uiFileName } from './model.js'

/** 序列化用的归一：抹掉类原型与 undefined 键（= 真正落盘的 JSON） */
export function jsonNormalize(value) {
  return JSON.parse(JSON.stringify(value))
}

/** 调试框控件（镜像 `UIElement.enableDebug()`，默认无 color） */
export function debugBoard(color) {
  const board = {
    type: 'image',
    texture: 'textures/ui/focus_border_white',
    nineslice_size: 1,
    fill: true,
    keep_ratio: false,
    size: ['100%', '100%'],
  }
  if (color) board.color = color
  return { debug_board: board }
}

const RED = [1, 0, 0, 1]

/** 属性包字段归属（`schemaFor` 只读一份 schema） */
function packFields(node) {
  const out = {}
  for (const pack of schemaFor(node.type).packs) {
    const obj = {}
    for (const def of pack.props) {
      if (Object.prototype.hasOwnProperty.call(node.props, def.key)) obj[def.key] = node.props[def.key]
    }
    if (Object.keys(obj).length) out[pack.id] = obj
  }
  return out
}

function rawPropFields(node) {
  const out = {}
  for (const def of schemaFor(node.type).raw) {
    if (Object.prototype.hasOwnProperty.call(node.props, def.key)) out[def.key] = node.props[def.key]
  }
  return out
}

/** id@template */
export function jsonKey(node) {
  return node.template ? `${node.id}@${node.template}` : node.id
}

function bindingsJSON(node) {
  return (node.bindings || []).map((b) => {
    const o = {}
    if (b.type) o.binding_type = b.type
    if (b.collection) o.binding_collection_name = b.collection
    if (b.collectionPrefix) o.binding_collection_prefix = b.collectionPrefix
    if (b.name) o.binding_name = b.name
    if (b.nameOverride) o.binding_name_override = b.nameOverride
    if (b.condition) o.binding_condition = b.condition
    if (b.sourceControl) o.source_control_name = b.sourceControl
    if (b.source) o.source_property_name = b.source
    if (b.target) o.target_property_name = b.target
    if (b.resolveSiblingScope) o.resolve_sibling_scope = true
    if (b.ignored) o.ignored = true
    return o
  })
}

/**
 * 单元素 → `{ [id@template]: json }`
 * @param {object} node 模型节点
 * @param {object|null} parent 父节点（`form_button` 的 offset 由父格盘决定）
 */
export function previewElement(node, parent = null) {
  const key = jsonKey(node)
  const fields = packFields(node)
  const out = {}

  if (node.type === 'form_button_grid') return { [key]: formButtonGridJSON(node) }
  // FormButton 的模板是**类内固定**的（`super(id, 'common.button')`）⇒ 产物键永远带 @common.button
  if (node.type === 'form_button') return { [`${node.id}@common.button`]: formButtonJSON(node, parent) }

  // properties：type（StackPanel 还会先塞 orientation）+ addProp 直通键
  out.type = node.type
  if (node.type === 'stack_panel') out.orientation = node.props.orientation || 'vertical'
  Object.assign(out, rawPropFields(node))

  // 属性包合并（顺序无关；数值语义才要紧）
  for (const id of ['grid', 'text', 'sprite', 'input', 'sound', 'scroll', 'layout', 'control']) {
    if (fields[id]) Object.assign(out, fields[id])
  }

  // controls
  const isGrid = node.type === 'grid'
  if (isGrid) {
    // Grid 的子项一律经 addGridItem 包一层 grid_item_N（grid_position 在包裹层上）
    const rebuilt = []
    if (node.debug) rebuilt.push(debugBoard())
    ;(node.controls || []).forEach((child, i) => {
      const gp = Array.isArray(child.gridPosition) ? child.gridPosition : [0, 0]
      const wrapper = { type: 'panel', grid_position: gp }
      const innerControls = [previewElement(child, node)]
      if (child.debug) innerControls.push(debugBoard(RED)) // addGridItem 的 debugColor 追加在内容之后
      wrapper.controls = innerControls
      rebuilt.push({ [`grid_item_${i}`]: wrapper })
    })
    if (rebuilt.length) out.controls = rebuilt
  } else {
    // 调试框固定在最前（codegen 先 .enableDebug() 再 .addControl）
    const children = []
    if (node.debug) children.push(debugBoard())
    for (const child of node.controls || []) children.push(previewElement(child, node))
    if (children.length) out.controls = children
  }

  if (node.bindings && node.bindings.length) {
    const binds = bindingsJSON(node)
    if (binds.length) out.bindings = binds
  }
  if (node.modifications && node.modifications.length) out.modifications = node.modifications.map((m) => ({ ...m }))
  for (const [k, v] of Object.entries(node.vars || {})) out[`$${k}`] = v

  return { [key]: out }
}

/** FormButtonGrid：构造函数 + addButton 的产物（见文件头第 5 条） */
function formButtonGridJSON(node) {
  const [cols] = gridDimensions(node.props)
  const out = {
    type: 'grid',
    collection_name: 'form_buttons',
    grid_dimensions: gridDimensions(node.props),
    size: node.props.size || ['100%', '100%'],
  }
  const controls = []
  ;(node.controls || []).forEach((child, i) => {
    const slot = Number.isFinite(child.slot) ? child.slot : i
    const baseCol = ((slot % cols) + cols) % cols
    const baseRow = Math.floor(slot / cols)
    const pos = Array.isArray(child.pos) ? child.pos : [0, 0]
    const col = -baseCol + pos[0]
    const row = -baseRow + pos[1]
    const wrapperName = `grid_item_${String(slot).padStart(3, '0')}`
    const inner = [{ [`${child.id}@common.button`]: formButtonJSON(child, node, [`${col * 100}%`, `${row * 100}%`]) }]
    if (node.debug) inner.push(debugBoard(RED))
    controls.push({ [wrapperName]: { type: 'panel', grid_position: [baseCol, baseRow], controls: inner } })
  })
  if (controls.length) out.controls = controls
  return out
}

/** FormButton：Button@common.button + 三态纹理 + 门控变量 + 激活三件套 + （可选）图标/文字子控件 */
function formButtonJSON(node, parent, offsetOverride) {
  const props = node.props || {}
  const out = { type: 'button' }
  const layout = {}
  if (Object.prototype.hasOwnProperty.call(props, 'size')) layout.size = props.size
  if (Object.prototype.hasOwnProperty.call(props, 'anchor')) {
    layout.anchor_from = props.anchor
    layout.anchor_to = props.anchor
  }
  const inGrid = parent && parent.type === 'form_button_grid'
  if (inGrid) layout.offset = offsetOverride || ['0%', '0%']
  if (Object.keys(layout).length) Object.assign(out, layout)

  // setTexture(d,h,p) 三个一起建 Image（空串也建空纹理 Image —— 与参考产物逐字段一致）
  const imageStates = ['default', 'hover', 'pressed'].map((name) => [name, props[`texture_${name}`] || ''])
  const controls = []
  if (imageStates.some(([, tex]) => tex)) {
    for (const [name, tex] of imageStates) controls.push({ [name]: { type: 'image', texture: tex } })
  }
  for (const child of node.controls || []) controls.push(previewElement(child, node))
  if (controls.length) out.controls = controls

  if (inGrid) {
    // FormButtonGrid.injectBindings 的"激活三件套"
    out.bindings = [
      { binding_type: 'collection_details', binding_collection_name: 'form_buttons' },
      { binding_type: 'collection', binding_collection_name: 'form_buttons', binding_name: '#form_button_text' },
      { binding_type: 'view', source_property_name: '($binding_button_text = #form_button_text)', target_property_name: '#visible' },
    ]
  }
  // FormButton 构造器固定注入的变量
  const vars = { pressed_button_name: 'button.form_button_click', ...(node.vars || {}) }
  if (props.binding) vars.binding_button_text = props.binding
  for (const [k, v] of Object.entries(vars)) out[`$${k}`] = v
  return out
}

// ---------------------------------------------------------------------------
// 系统级：一个 UI 文件 / server_form 路由壳
// ---------------------------------------------------------------------------

/** 屏幕根面板（镜像 `ServerFormUI.createPageRoot`）：元素 id 固定 `root`，门控写在它上面 */
export const ROOT_ID = 'root'
/** 路由前缀（ActionForm title）：与 `ServerFormUI.MARKER` 一致 */
export const FORM_MARKER = 'sapdon_ui:'

export function pageRootJSON({ panelId, contentRef, buttonsRef }) {
  const out = {
    type: 'panel',
    controls: [
      { [`content@${contentRef}`]: { type: undefined } },
      { [`buttons@${buttonsRef}`]: { type: undefined } },
    ],
    bindings: [
      { binding_name: '#title_text' },
      { binding_type: 'view', source_property_name: `(not( (#title_text - '${panelId}') = #title_text))`, target_property_name: '#visible' },
    ],
    $panel_id: panelId,
    $title_text: '#title_text',
    $form_text: '#form_text',
  }
  return { [ROOT_ID]: out }
}

/**
 * 一个工程 = **一个屏** = 一个 UI 文件（`new SapdonFormUI("ns:<屏名>", …)`）。
 *
 * 文件与 namespace 都是 **`ns_nm`**（框架约定），引用前缀同它。文件里只有**一个根面板 `root`**：
 * 先挂内容/按键面板，再挂 root，最后把各 `PagePanelManage` 登记的页面板挂进门控容器。
 * 多页面**不靠多个根** —— 页面板由管理器挂进门控容器（`$gtag` + `#form_text` 前缀门控）。
 */
export function previewUiFile(doc) {
  const ns = screenNamespace(doc)
  const out = { namespace: ns }
  const added = new Set()
  const scr = screenOf(doc)
  const push = (id) => {
    if (!id || added.has(id)) return null
    const node = findNode(doc.elements, id)
    if (!node) return null
    Object.assign(out, previewElement(node, null))
    added.add(id)
    return node
  }
  const content = push(scr.content)
  const buttons = push(scr.buttons)
  if (content || buttons) {
    Object.assign(
      out,
      pageRootJSON({
        panelId: `${FORM_MARKER}${scr.name}`,
        contentRef: content ? `${ns}.${content.id}` : '',
        buttonsRef: buttons ? `${ns}.${buttons.id}` : '',
      }),
    )
  }
  applyManagers(doc, out, ns)
  return out
}

/** 多页管理器：镜像 `PagePanelManage` —— 给每页挂门控变量 + 绑定，再挂进容器 */
function applyManagers(doc, out, ns) {
  for (const manager of managerNodes(doc)) {
    const containerNode = manager.props && manager.props.container ? findNode(doc.elements, manager.props.container) : null
    const target = containerNode ? out[jsonKey(containerNode)] : null
    if (!target || !containerNode) continue
    const mode = manager.props && manager.props.mode === 'eq' ? 'eq' : 'prefix'
    const variable = mode === 'prefix' ? 'gtag' : 'binding_text'
    if (!Array.isArray(target.controls)) target.controls = []
    for (const page of manager.pages || []) {
      const node = page.panel ? findNode(doc.elements, page.panel) : null
      if (!node) continue
      const json = (previewElement(node, containerNode) || {})[jsonKey(node)] || {}
      json[`$${variable}`] = page.tag
      json.bindings = [...(json.bindings || []), gateBindingJSON(mode, variable)]
      target.controls.push({ [jsonKey(node)]: json })
    }
  }
}

function gateBindingJSON(mode, variable) {
  return {
    binding_type: 'view',
    source_property_name: mode === 'prefix' ? `(not( (#form_text - $${variable}) = #form_text))` : `($${variable} = #form_text)`,
    target_property_name: '#visible',
  }
}

/** server_form.json 路由壳（镜像 `ServerFormUI._ensureBuilt` + 每屏一个 factory，`long_form` 固定指向 `@<ns_nm>.root`） */
export function previewServerForm(doc) {
  const NS = 'server_form'
  const scr = screenOf(doc)
  const content = scr.content ? findNode(doc.elements, scr.content) : null
  const screenNs = content ? screenNamespace(doc) : NS
  const hasScreen = !!(scr.content || scr.buttons)
  const factories = hasScreen
    ? [
        {
          [`sapdon_form_factory_${scr.name}`]: {
            type: 'panel',
            factory: { name: 'server_form_factory', control_ids: { long_form: `@${screenNs}.${ROOT_ID}` } },
          },
        },
      ]
    : []

  return {
    namespace: NS,
    main_screen_content: {
      type: undefined,
      size: ['fill', 'fill'],
      modifications: [{ array_name: 'controls', operation: 'insert_back', value: factories }],
    },
    long_form: {
      type: undefined,
      modifications: [
        {
          array_name: 'bindings',
          operation: 'insert_back',
          value: [
            { binding_name: '#title_text' },
            { binding_type: 'view', source_property_name: "((#title_text - 'sapdon_ui:') = #title_text)", target_property_name: '#visible' },
          ],
        },
      ],
    },
    screen_exit_animation_pop_wait: {
      type: undefined,
      anim_type: 'offset',
      easing: 'linear',
      duration: 0.1,
      from: [0, 0],
      to: [0, 0],
      play_event: 'screen.exit_pop',
      end_event: 'screen.exit_end',
    },
    // ★ key 带模板：`UISystem.toObject()` 用 element.id（id@template）当键
    'third_party_server_screen@common.base_screen': {
      type: 'screen',
      button_mappings: [{ from_button_id: 'button.menu_cancel', to_button_id: 'button.menu_exit', mapping_type: 'global' }],
      $screen_content: `${NS}.main_screen_content`,
      $screen_animations: [`@${NS}.screen_exit_animation_pop_wait`],
      $background_animations: [`@${NS}.screen_exit_animation_pop_wait`],
    },
  }
}

/**
 * 全部产物。
 *
 * - `form` 屏：UI 文件（一个工程一个）+ `server_form.json` 路由壳 —— 镜像 `SapdonFormUI` / `ServerFormUI`
 * - `hud` / `容器` 屏：**不预览框架产物**（文件由 `HudUISystem`（写原版 `hud_screen`）/
 *   `ContainerUISystem`（写 `ui/<nm>.json`）落，含编辑器不建模的挂载与槽位换算）⇒
 *   返回 `freeform: true` + 一句说明，只列元素与目标文件名，**不伪造**。
 */
export function previewAll(doc) {
  const path = doc.uiSystem.path || 'ui/'
  const kind = screenKind(doc)
  if (kind !== 'form') {
    return {
      freeform: true,
      kind,
      file: uiFileName(doc),
      note:
        kind === 'hud'
          ? 'HUD 屏由 HudUISystem 写原版 ui/hud_screen.json（挂载走 mountRootElement）；编辑器只负责画布与元素，不预览框架产物。'
          : '容器屏由 ContainerUISystem 落 ui/<nm>.json，槽位（addSlot）与基座换算在框架/项目侧；编辑器只负责画布与元素，不预览框架产物。',
      elements: (doc.elements || []).filter((el) => el.type !== 'page_panel_manage').map((el) => ({ id: el.id, type: el.type, json: jsonNormalize(previewElement(el, null)) })),
    }
  }
  return {
    // ★ 文件名 = `ns_nm`（框架 `UISystemRegistry` 拼 `path + name + '.json'`）
    uiFile: { file: uiFileName(doc), system: previewUiFile(doc) },
    serverForm: { file: `${path}server_form.json`, system: previewServerForm(doc) },
  }
}

// 局部引用（避免与 model.js 形成循环 import）
function findNode(nodes, id) {
  for (const n of nodes || []) {
    if (n.id === id) return n
    const hit = findNode(n.controls, id)
    if (hit) return hit
  }
  return null
}
