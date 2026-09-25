/**
 * 诊断规则引擎（Sapdon UI Designer）
 *
 * 把 `doc/dev/ui-lessons.md` / `ui-architecture.md` / `AGENTS.md` 里踩过的坑做成**静态可判定**的规则：
 * 编辑器里一改就报。凡是需要引擎或真机才能判的（模板内部结构、引擎侧集合实例、字体度量、
 * 绑定表达式求值）**一律不报** —— 诊断面板变噪音比不报还糟。
 *
 * 严重度：`error` 引擎必拒/必炸 → `warn` 大概率出错 → `info` 风格/前兆。
 * 每条规则的依据写在 `RULES[].why`，改动规则请连依据一起改。
 */

import { schemaFor } from './catalog.js'
import { gridDimensions } from './layout.js'
import { managerNodes, screenKind, screenOf, uiFileName } from './model.js'
import { normalizeTexturePath, resolveTexture } from './textures.js'

/** 某个 id 是不是被某个多页管理器登记为页面板 */
function isManagedPage(doc, id) {
  return managerNodes(doc).some((m) => (m.pages || []).some((p) => p.panel === id))
}

/** 找元素的父（诊断页面板是否同时挂在容器里） */
function findOwnerDoc(doc, id, parentId = null, nodes = null) {
  for (const n of nodes || doc.elements || []) {
    if (n.id === id) return { parentId, node: n }
    const hit = findOwnerDoc(doc, id, n.id, n.controls)
    if (hit) return hit
  }
  return null
}

export const SEVERITY_ORDER = { error: 0, warn: 1, info: 2 }
export const RULES = Object.freeze({
  'id-charset': { title: 'id 含非法字符', severity: 'error', why: 'id 同时是控件名、门控键与引用名，只允许 A-Za-z0-9_-（对照 checkUIName）' },
  'id-duplicate': { title: 'id 重复', severity: 'error', why: '序列化是 { [id]: json }，重名会互相覆盖 ⇒ 静默丢控件' },
  'identifier-charset': { title: 'UI 文件标识符非法', severity: 'error', why: 'identifier 同时是 namespace 与 ui/<name>.json 文件名（门控键 = UISystem.name）' },
  'collection-index': { title: 'collection_index 不是合法属性', severity: 'error', why: '引擎报 Unknown property [collection_index]；集合顺序靠放置顺序（sapdon-ui.md §7.3）' },
  'pressed-button-name-prop': { title: 'pressed_button_name 写成了属性', severity: 'error', why: '必须用变量：写成属性会报 Unknown property [pressed_button_name]（ui-lessons.md §2.2）' },
  'page-id-prefix': { title: 'panelId 缺 sapdon_ui: 前缀', severity: 'error', why: '路由靠 title 前缀分流，否则走原生表单（sapdon-ui.md §1）' },
  'page-id-duplicate': { title: '页面 panelId 重复', severity: 'error', why: '$panel_id 精确匹配，重复页永远显示同一页' },
  'main-route-panel-id': { title: '主屏 panelId 与 name 不一致', severity: 'error', why: '框架的 `new SapdonFormUI("ns:nm", …)` 把 panelId 定死为 `sapdon_ui:<nm>`（nm 同时是文件名与 factory id 后缀），生成代码推不出别的名字 ⇒ 改首行屏名或改 panelId' },
  'view-route-not-expressible': { title: '第 2 条起换了自己的面板（一个文件只有一个 root）', severity: 'error', why: '每个 UI 文件只有一个根面板 `root`（元素名固定，同名会互相覆盖），多页面只能在**同一份**内容/按键面板里用门控做 ⇒ 第 2 行起的 content/buttons 必须与首行一致' },
  'page-content-missing': { title: '页面缺内容面板', severity: 'error', why: '页面壳固定渲染 content+buttons 两块，缺引用会报引用缺失（sapdon-ui.md §7.4）' },
  'grid-child-offset': { title: 'grid 子项带 offset', severity: 'warn', why: '网格接管子控件定位，offset 无效；要偏移请包一层 panel（ui-lessons.md §5）' },
  'grid-child-position': { title: 'grid 子项缺 grid_position', severity: 'warn', why: '引擎靠 grid_position（行优先序号）把格子绑到内容（AGENTS.md 手册槽位坑）' },
  'grid-order-vs-position': { title: 'grid 声明顺序与 grid_position 不一致', severity: 'warn', why: 'known-pitfalls.md §4.13（真机实测）：格位落点跟 controls 数组顺序走，grid_position 不参与定位；框架的容器格盘靠"先按 grid_position 行优先排序"规避' },
  'light-text-button-empty-binding': { title: 'light_text_button + 空 $button_text', severity: 'warn', why: 'binding_name 变空串 ⇒ 整条控制链不渲染（ui-lessons.md §2.1）' },
  'page-buttons-missing': { title: '页面缺按键面板', severity: 'warn', why: '壳固定渲染两块，纯内容页也要给一个空面板（sapdon-ui.md §7.4）' },
  'form-button-orphan': { title: 'FormButton 游离在格盘外', severity: 'warn', why: '集合/门控绑定由 FormButtonGrid.addButton 注入，游离按钮无效（ui-lessons.md §3）' },
  'form-button-texture-partial': { title: '三态纹理不全', severity: 'warn', why: 'setTexture(d,h,p) 是三参一起用；只填一部分会生成空纹理 Image 子控件' },
  'stack-child-offset': { title: 'stack_panel 子项带 offset', severity: 'warn', why: '流式布局接管主轴定位，offset 不参与排布' },
  'stack-child-unsized': { title: '流式子项未声明尺寸', severity: 'info', why: '沿主轴尺寸缺省时引擎按 default 处理，落位不可预期；建议显式给百分比' },
  'text-line-length': { title: '长文本未手动换行', severity: 'info', why: '中文一行约 16 汉字，超长请手动 \\n 拆行（AGENTS.md NeoGuidebook 节）' },
  'unknown-prop': { title: '属性键不在目录里', severity: 'warn', why: 'codegen/preview 只认 catalog 声明的键；未知键会被**静默丢弃**（要么补进 catalog，要么是拼错了）' },
  'root-not-referenced': { title: '根元素没有被任何页面引用', severity: 'info', why: '没被 content/buttons 引用的根元素不会进 UI 文件（生成的代码里是死代码）' },
  'texture-invalid': { title: '纹理引用路径非法', severity: 'error', why: '带 `..`/空段或不在 textures/ 下的引用解析不出文件 ⇒ 真机报 Missing referenced asset' },
  'texture-missing': { title: '纹理在任何资源包里都找不到', severity: 'warn', why: '真机报 Missing referenced asset（AGENTS.md：item icon 引用必须与纹理清单键一致；UI 贴图同理）。需要编辑器连上资源包索引才判定' },
  'texture-case': { title: '纹理路径大小写与包内不一致', severity: 'info', why: '包内文件名区分大小写（原版是 textures/ui/white，不是 White）；区分大小写的平台/打包方式下会找不到。属性面板"浏览…"选出来的是包内规范写法' },
  'ungated-page': { title: '页面内容没有任何显隐门控', severity: 'info', why: '多页共用一个 UI 文件时，没门控会导致多页同时可见' },
  'screen-kind-freeform': { title: '自由摆放屏（不做规范校验）', severity: 'info', why: 'hud / 容器 两类屏由框架的 HudUISystem / ContainerUISystem 落文件，编辑器只保证"摆出来"，不校验 root/内容/按钮/门控 —— 游戏里是否生效由你的挂载代码决定（2026-09 用户口径）' },
  'screen-kind-form-empty': { title: 'form 屏缺屏名/内容面板/按键面板', severity: 'error', why: 'form 屏要生成 `new SapdonFormUI("ns:屏名", 内容面板, 按键面板)`，三者缺一都生成不出来（屏名在顶栏、两块面板在顶栏选）' },
  'manager-no-container': { title: '多页管理器没选门控容器', severity: 'error', why: '`PagePanelManage(container)` 的第一个参数就是它 —— 页面板会被挂进这个容器并逐块挂门控；不选就生成不出代码' },
  'manager-page-no-panel': { title: '多页管理器有一页没选面板', severity: 'error', why: '每一页都要给页面板（`addPage(panel, tag)`），否则这一页没有东西可门控' },
  'manager-page-tag-dup': { title: '多页管理器里 tag 重复', severity: 'error', why: 'tag 是运行期 `.body()` 的匹配串，重复 ⇒ 两页同时可见（前缀匹配时短 tag 还会顺带点亮长的）' },
  'manager-page-in-container': { title: '页面板同时挂在门控容器里', severity: 'warn', why: '管理器会自己把页面板挂进容器（`container.addControl(panel)`）；同时又是容器的子项 ⇒ 产物里挂两次' },
})

const ANCHOR_ID_CHARS = /^[A-Za-z0-9_-]+$/
const VISIBLE_TARGETS = new Set(['#visible', 'visible'])

function diag(rule, id, message) {
  const meta = RULES[rule]
  return { rule, severity: meta.severity, id, message, why: meta.why, key: `${rule}:${id || '-'}` }
}

/**
 * @param {object} doc 工程文档
 * @param {{textureIndex?: {paths:Set<string>, noPreview?:Set<string>}|null}} [opts]
 *        `textureIndex` 来自 `serve.mjs` 的资源包扫描；**不传就不判定纹理存在性**（不猜）
 * @returns {{ items: object[], counts: {error:number,warn:number,info:number} }}
 */
export function diagnose(doc, opts = {}) {
  const items = []
  const seenIds = new Map()
  const textureIndex = opts.textureIndex || null
  const kind = screenKind(doc)
  const isForm = kind === 'form'

  // 文档级：identifier 只对 form 屏是「文件名/引用前缀」；hud 固定写原版 hud_screen、容器走 ContainerUISystem 自己的命名
  const identifier = (doc.uiSystem && doc.uiSystem.identifier) || ''
  if (isForm && (!identifier || !ANCHOR_ID_CHARS.test(identifier))) {
    items.push(diag('identifier-charset', null, `identifier "${identifier}" 非法：只允许 A-Za-z0-9_-（它同时是 ns_nm 那段文件名）`))
  }
  if (!isForm) {
    items.push(
      diag(
        'screen-kind-freeform',
        null,
        `${kind === 'hud' ? 'HUD' : '容器'}屏：自由摆放，编辑器不校验 root/内容/按钮/门控（产物文件 = ${uiFileName(doc)}）`,
      ),
    )
  }
  const contentIds = new Set()
  const earlyScreen = screenOf(doc)
  if (earlyScreen.content) contentIds.add(earlyScreen.content)

  const walk = (nodes, parent) => {
    for (const node of nodes || []) {
      // 1/2 id
      if (!ANCHOR_ID_CHARS.test(node.id)) items.push(diag('id-charset', node.id, `id "${node.id}" 含非法字符（只允许 A-Za-z0-9_-）`))
      if (seenIds.has(node.id)) items.push(diag('id-duplicate', node.id, `id "${node.id}" 重复：产物里会互相覆盖，只剩最后一个`))
      else seenIds.set(node.id, node)

      const props = node.props || {}

      // 未知属性键（会被 codegen/preview 静默丢弃 —— 必须报出来）
      const knownKeys = new Set(schemaFor(node.type).packs.flatMap((pk) => pk.props.map((d) => d.key)).concat(schemaFor(node.type).raw.map((d) => d.key), schemaFor(node.type).ctorProps.map((d) => d.key)))
      for (const key of Object.keys(props)) {
        if (!knownKeys.has(key)) {
          items.push(diag('unknown-prop', node.id, `${node.type} 上没有 "${key}" 这个属性：生成代码与产物预览都会**忽略它**（补进 catalog 或删掉）`))
        }
      }

      // 5 collection_index（任何节点上出现都不合法）
      if (Object.prototype.hasOwnProperty.call(props, 'collection_index')) {
        items.push(diag('collection-index', node.id, '删掉它：引擎报 Unknown property [collection_index]，集合顺序靠放置顺序'))
      }
      // 6 pressed_button_name 写成属性
      if (Object.prototype.hasOwnProperty.call(props, 'pressed_button_name')) {
        items.push(diag('pressed-button-name-prop', node.id, '改成变量：普通按钮用 addVariable("pressed_button_name", "button.menu_exit")'))
      }
      // 7 light_text_button 空 binding
      if (node.template === 'common_buttons.light_text_button' && (node.vars || {}).button_text === '') {
        items.push(diag('light-text-button-empty-binding', node.id, '$button_text 是空串 ⇒ binding_name 为空 ⇒ 整条控制链不渲染；图标按钮请用 common.button'))
      }

      // grid 子项
      if (parent && parent.type === 'grid') {
        if (Object.prototype.hasOwnProperty.call(props, 'offset')) {
          items.push(diag('grid-child-offset', node.id, 'grid 里 offset 无效：要偏移请把内容包进一层 panel，offset 放内层'))
        }
        if (!Array.isArray(node.gridPosition)) {
          items.push(diag('grid-child-position', node.id, '缺 grid_position：引擎靠它（行优先序号）把格子绑到内容'))
        }
      }      // flow 子项
      if (parent && parent.type === 'stack_panel') {
        if (Object.prototype.hasOwnProperty.call(props, 'offset')) {
          items.push(diag('stack-child-offset', node.id, 'stack_panel 主轴位置由流式排布决定，offset 不生效'))
        }
        if (!Object.prototype.hasOwnProperty.call(props, 'size')) {
          items.push(diag('stack-child-unsized', node.id, '未声明 size：建议显式给百分比（如 ["100%", "30%"]），否则落位不可预期'))
        }
      }
      // FormButton
      if (node.type === 'form_button') {
        if (!parent || parent.type !== 'form_button_grid') {
          items.push(diag('form-button-orphan', node.id, 'FormButton 必须放进 FormButtonGrid（addButton 才会注入集合/门控绑定）'))
        }
        const tex = ['default', 'hover', 'pressed'].map((k) => props[`texture_${k}`] || '')
        if (tex.some(Boolean) && !tex.every(Boolean)) {
          items.push(diag('form-button-texture-partial', node.id, 'setTexture(d,h,p) 三个纹理要一起给；缺的会被生成成空纹理 Image'))
        }
      }
      // 纹理引用（有索引才判存在性；路径非法无论如何都报）
      for (const [key, value] of [['texture', props.texture], ['texture_default', props.texture_default], ['texture_hover', props.texture_hover], ['texture_pressed', props.texture_pressed]]) {
        if (value === undefined || value === '') continue
        const raw = String(value)
        const path = normalizeTexturePath(raw)
        if (!path || !path.startsWith('textures/')) {
          items.push(diag('texture-invalid', node.id, `${key}="${raw}" 不是合法纹理引用（应形如 textures/ui/xxx，不带扩展名）`))
          continue
        }
        if (textureIndex && textureIndex.paths) {
          const res = resolveTexture(path, textureIndex)
          if (res.known === false) {
            items.push(
              diag('texture-missing', node.id, `${key}="${path}" 在已加载的资源包里找不到（原版 + 工程包都扫过了）⇒ 真机会报 Missing referenced asset`),
            )
          } else if (res.caseMismatch) {
            items.push(diag('texture-case', node.id, `${key}="${path}" 只差大小写：包内规范写法是 "${res.caseMismatch}"`))
          }
        }
      }

      // Label 文本启发式
      if (node.type === 'label') {
        const text = String(props.text ?? '')
        if (text.length > 16 && !text.includes('\\n') && !text.includes('\n')) {
          items.push(diag('text-line-length', node.id, `文本 ${text.length} 字未换行：中文一行约 16 汉字，建议手动 \\n 拆行`))
        }
      }

      // grid 声明顺序 vs grid_position（known-pitfalls.md §4.13）
      if (node.type === 'grid') {
        const [cols] = gridDimensions(props)
        ;(node.controls || []).forEach((child, i) => {
          const gp = Array.isArray(child.gridPosition) ? child.gridPosition : null
          if (!gp) return
          const linear = gp[1] * cols + gp[0]
          if (linear !== i) {
            items.push(
              diag('grid-order-vs-position', child.id, `数组序 ${i} ≠ grid_position 行优先序号 ${linear}：§4.13 说落点跟数组顺序走，真机可能整体错位（要让两者一致，或在容器界面里用框架的槽位 API 排序）`),
            )
          }
        })
      }

      walk(node.controls, node)
    }
  }
  walk(doc.elements, null)

  // 本屏 / 规范级：只有 form 屏走这套（hud / 容器 自由摆放，不校验 root/内容/按钮/门控）
  const scr = screenOf(doc)
  const referenced = new Set([scr.content, scr.buttons].filter(Boolean))
  if (isForm) {
    if (!scr.content || !scr.buttons) {
      items.push(
        diag(
          'screen-kind-form-empty',
          null,
          `本屏还缺${!scr.name ? '屏名' : scr.content ? '按键面板' : '内容面板'}（顶栏「屏名 / 内容 / 按键」），生成不出 SapdonFormUI`,
        ),
      )
    }
    for (const root of doc.elements || []) {
      if (root.type === 'page_panel_manage') continue
      if (!referenced.has(root.id) && !isManagedPage(doc, root.id)) {
        items.push(diag('root-not-referenced', root.id, `根元素 ${root.id} 没有被本屏引用（不会进 UI 文件）`))
      }
    }
  }

  // 多页管理器（三类屏都可能用：hud/容器 也能靠它做多页）
  for (const m of managerNodes(doc)) {
    const container = (m.props && m.props.container) || ''
    if (!container) items.push(diag('manager-no-container', m.id, `多页管理器 ${m.id} 没选门控容器`))
    const tags = []
    for (const p of m.pages || []) {
      if (!p.panel) items.push(diag('manager-page-no-panel', m.id, `管理器 ${m.id} 里 tag="${p.tag}" 的那一页没选面板`))
      if (tags.includes(p.tag)) items.push(diag('manager-page-tag-dup', m.id, `管理器 ${m.id} 里 tag "${p.tag}" 重复`))
      else tags.push(p.tag)
      if (container && p.panel) {
        const owner = findOwnerDoc(doc, p.panel)
        if (owner && owner.parentId === container) {
          items.push(
            diag('manager-page-in-container', m.id, `页面板 ${p.panel} 已经是容器 ${container} 的子项，管理器还会再挂一次 ⇒ 产物里挂两次`),
          )
        }
      }
    }
  }

  // 门控缺失（有内容面板、又没有任何 #visible 门控时提醒）
  if (isForm && (scr.content || scr.buttons) && !managerNodes(doc).some((m) => (m.pages || []).length)) {
    const gated = new Set()
    const collect = (nodes) => {
      for (const n of nodes || []) {
        if ((n.bindings || []).some((b) => VISIBLE_TARGETS.has(String(b.target || '')))) gated.add(n.id)
        collect(n.controls)
      }
    }
    collect(doc.elements)
    const rootsHaveGate = [...contentIds].some((id) => {
      let hit = false
      const rec = (nodes) => {
        for (const n of nodes || []) {
          if (n.id === id) {
            if (gated.has(n.id)) hit = true
            const inner = (ns) => {
              for (const m of ns || []) {
                if (gated.has(m.id)) hit = true
                inner(m.controls)
              }
            }
            inner(n.controls)
            return
          }
          rec(n.controls)
        }
      }
      rec(doc.elements)
      return hit
    })
    if (!rootsHaveGate) {
      items.push(diag('ungated-page', null, '没有任何元素挂 #visible 门控：多页会同时可见（单页工程可忽略）'))
    }
  }

  items.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || String(a.id).localeCompare(String(b.id)))
  const counts = { error: 0, warn: 0, info: 0 }
  for (const it of items) counts[it.severity]++
  return { items, counts }
}
