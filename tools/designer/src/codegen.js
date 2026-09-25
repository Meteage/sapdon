/**
 * 代码生成：工程模型 → sapdon TS 代码（`main.ts` 片段）
 *
 * ★ 唯一"给人用"的产物：生成的是**框架原生写法**（属性包 + 链式 setter + 页面壳 + submit），
 *   不是 JSON UI。人接着手改、进 git diff、走 `registry.submit()` 全链路都成立。
 *
 * 两条不可动摇的约定：
 *  1. **只写已赋值的属性**（`node.props` 的键）——框架 `serialize()` 只拷属性包上存在的字段，
 *     多写一个默认值就会改变既有产物（基线是逐字节判据）。
 *  2. **反序生成**：子元素先声明，父元素后组合（`const child = …; const parent = new Panel(…).addControl(child)`），
 *     这样生成结果与手写的可读性一致，且不依赖 TDZ 技巧。
 *
 * 已知边界（见 doc/dev/ui-designer.md §6.3）：**单向**。手写代码无法无损回读成工程，
 * 约定「生成一次，之后以代码为准」。
 *
 * ⚠️ 一个工程 = **一个 UI 文件** = **一条路由**：`new SapdonFormUI("ns:nm", …)` 的 UI 文件名与
 *    namespace 都是 `ns_nm`（`sapdon_ui:book` → `ui/sapdon_ui_book.json`），同 `ns_nm` 建两次会
 *    **互相覆盖**（`UISystemRegistry` 的 map 按路径覆盖、`_ui_defs` 出现重复项、`GRegistry` 按
 *    root|path|name 去重只留最后一个）。⇒ 一屏一句话 `new SapdonFormUI("ns:<首屏名>", 内容面板, 按钮面板)`；
 *    多页面**不靠多个根**（一个文件只有一个 `root`），在内容面板里用门控做（`PagePanelManage`）。
 */

import { schemaFor } from './catalog.js'
import { gridDimensions } from './layout.js'
import { managerNodes, screenKind, screenNamespace, screenOf, uiFileName } from './model.js'

const CORE = '@sapdon/core'

/** 保留字/非法标识符处理（`sapdon_ui:apple` 这类 id 不能直接当变量名） */
const RESERVED = new Set(['break', 'case', 'catch', 'class', 'const', 'continue', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'new', 'null', 'return', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'let', 'static', 'yield', 'await'])

export function varName(id, used = new Set()) {
  let base = String(id).replace(/[^A-Za-z0-9_$]/g, '_')
  if (!base || /^[0-9]/.test(base)) base = `_${base}`
  if (RESERVED.has(base)) base = `${base}_`
  let name = base
  let i = 2
  while (used.has(name)) name = `${base}_${i++}`
  used.add(name)
  return name
}

/** JS 字面量（双引号，与仓库示例风格一致） */
export function literal(v) {
  if (v === null) return 'null'
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '0'
  if (typeof v === 'boolean') return String(v)
  if (typeof v === 'string') return JSON.stringify(v)
  if (Array.isArray(v)) return `[${v.map(literal).join(', ')}]`
  if (typeof v === 'object') {
    return `{ ${Object.entries(v)
      .map(([k, val]) => `${JSON.stringify(k)}: ${literal(val)}`)
      .join(', ')} }`
  }
  return 'undefined'
}

/** 属性包链（`new Layout().setSize([...]).setAnchorFrom("top_left")`） */
function packChain(pack, props) {
  const segs = []
  for (const def of pack.props) {
    if (!Object.prototype.hasOwnProperty.call(props, def.key)) continue
    segs.push(`.${def.setter}(${literal(props[def.key])})`)
  }
  if (!segs.length) return null
  return `new ${pack.ctor}()${segs.join('')}`
}

function rawSegments(node) {
  const segs = []
  const schema = schemaFor(node.type)
  for (const def of schema.raw) {
    if (!Object.prototype.hasOwnProperty.call(node.props, def.key)) continue
    const value = literal(node.props[def.key])
    if (def.key === 'collection_name') segs.push(`.setCollectionName(${value})`)
    else segs.push(`.addProp(${JSON.stringify(def.key)}, ${value})`)
  }
  return segs
}

function bindingStatement(varRef, binding) {
  const segs = []
  if (binding.type) segs.push(`.setBindingType(${literal(binding.type)})`)
  if (binding.collection) segs.push(`.setBindingCollectionName(${literal(binding.collection)})`)
  if (binding.collectionPrefix) segs.push(`.setBindingCollectionPrefix(${literal(binding.collectionPrefix)})`)
  if (binding.name) segs.push(`.setBindingName(${literal(binding.name)})`)
  if (binding.nameOverride) segs.push(`.setBindingNameOverride(${literal(binding.nameOverride)})`)
  if (binding.condition) segs.push(`.setBindingCondition(${literal(binding.condition)})`)
  if (binding.sourceControl) segs.push(`.setSourceControlName(${literal(binding.sourceControl)})`)
  if (binding.source) segs.push(`.setSourcePropertyName(${literal(binding.source)})`)
  if (binding.target) segs.push(`.setTargetPropertyName(${literal(binding.target)})`)
  if (binding.resolveSiblingScope) segs.push('.setResolveSiblingScope(true)')
  if (binding.ignored) segs.push('.setIgnored(true)')
  return `${varRef}.dataBinding.addDataBinding(new DataBindingObject()${segs.join('')});`
}

const CTOR_BY_TYPE = { panel: 'Panel', stack_panel: 'StackPanel', collection_panel: 'CollectionPanel', grid: 'Grid', scroll_view: 'ScrollingPanel', label: 'Label', image: 'Image', button: 'Button' }

/** 节点 → 框架类名（未知类型退回 UIElement） */
export function ctorName(type) {
  return CTOR_BY_TYPE[type] || 'UIElement'
}

/**
 * 生成一个元素的代码块（后序：先子后父）。
 * @returns {{ lines: string[], varRef: string }}
 */
function elementLines(node, ctx) {
  const used = ctx.used
  const lines = []
  for (const child of node.controls || []) lines.push(...elementLines(child, ctx).lines)

  if (node.type === 'form_button_grid') {
    const v = varName(node.id, used)
    ctx.vars.set(node.id, v)
    const dims = gridDimensions(node.props)
    const size = node.props.size || ['100%', '100%']
    const head = `const ${v} = new FormButtonGrid(${literal(node.id)}, { dimensions: ${literal(dims)}, size: ${literal(size)} })`
    const calls = []
    // ★ enableDebug 必须在 addButton 之前：FormButtonGrid 只在 addButton 里读 this.debug，
    //   放到后面调等于没调（每格的红色调试框不会出现）
    if (node.debug) calls.push('.enableDebug()')
    ;(node.controls || []).forEach((child, i) => {
      const cv = ctx.vars.get(child.id)
      const slot = Number.isFinite(child.slot) ? child.slot : i
      const pos = Array.isArray(child.pos) ? child.pos : [0, 0]
      const extra = pos[0] || pos[1] ? `, ${literal(pos)}` : ''
      calls.push(`.addButton(${slot}, ${cv}${extra})`)
    })
    calls.push('.build()')
    lines.push(`${head}${calls.length ? `\n${calls.map((c) => `    ${c}`).join('\n')}` : ''};`)
    ctx.imports.add('FormButtonGrid')
    return { lines, varRef: v }
  }

  if (node.type === 'form_button') {
    const v = varName(node.id, used)
    ctx.vars.set(node.id, v)
    ctx.imports.add('FormButton')
    const props = node.props || {}
    const segs = []
    const textures = ['default', 'hover', 'pressed'].map((n) => props[`texture_${n}`] || '')
    // 三态纹理：框架的 setTexture(d,h,p) 是**三个一起**建 Image 子控件（空串也会建成空纹理 Image ——
    // 手册索引卡就是 default/pressed 留空、只给 hover），所以「有一个就三个都写」才与参考产物一致
    if (textures.some(Boolean)) segs.push(`.setTexture(${textures.map(literal).join(', ')})`)
    if (props.binding) segs.push(`.setBinding(${literal(props.binding)})`)
    if (Object.prototype.hasOwnProperty.call(props, 'anchor')) segs.push(`.setAnchor(${literal(props.anchor)})`)
    if (Object.prototype.hasOwnProperty.call(props, 'size')) {
      const size = Array.isArray(props.size) ? props.size : [props.size, props.size]
      segs.push(`.setSize(${literal(size[0])}, ${literal(size[1])})`)
    }
    for (const child of node.controls || []) {
      const cv = ctx.vars.get(child.id)
      if (cv) segs.push(`.addControl(${cv})`)
    }
    lines.push(`const ${v} = new FormButton(${literal(node.id)})${segs.join('')};`)
    return { lines, varRef: v }
  }

  // 多页管理器（非视觉对象）：`new PagePanelManage(容器).addPage(面板, "TAG")…build()`
  if (node.type === 'page_panel_manage') {
    const v = varName(node.id, used)
    ctx.imports.add('PagePanelManage')
    const props = node.props || {}
    const containerVar = props.container ? ctx.vars.get(props.container) : null
    const mode = props.mode === 'eq' ? 'eq' : 'prefix'
    if (!containerVar) {
      lines.push(
        `// ⚠️ 多页管理器 ${node.id} 没选门控容器（诊断里是 error）⇒ 生成不了 PagePanelManage`,
      )
      return { lines, varRef: v }
    }
    const segs = []
    for (const page of node.pages || []) {
      const pv = page.panel ? ctx.vars.get(page.panel) : null
      if (!pv) {
        segs.push(`    // ⚠️ 这一页没选面板：${literal(page.tag)} 跳过`)
        continue
      }
      segs.push(`    .addPage(${pv}, ${literal(page.tag)})`)
    }
    if (mode === 'eq') {
      // eq 模式要用对象形态（`addPage` 链式默认 prefix）
      lines.push(
        `const ${v} = new PagePanelManage({\n` +
          `    container: ${containerVar},\n` +
          `    mode: 'eq',\n` +
          `    pages: [\n` +
          (node.pages || [])
            .map((p) => {
              const pv = p.panel ? ctx.vars.get(p.panel) : null
              return pv ? `        { panel: ${pv}, tag: ${literal(p.tag)} },` : `        // ⚠️ 这一页没选面板：${literal(p.tag)} 跳过`
            })
            .join('\n') +
          `\n    ],\n` +
          `}).build();`,
      )
      return { lines, varRef: v }
    }
    lines.push(`const ${v} = new PagePanelManage(${containerVar})\n${segs.join('\n')}\n    .build();`)
    return { lines, varRef: v }
  }

  const v = varName(node.id, used)
  ctx.vars.set(node.id, v)
  const ctor = ctorName(node.type)
  ctx.imports.add(ctor)
  const schema = schemaFor(node.type)

  const segs = []
  for (const pack of schema.packs) {
    const chain = packChain(pack, node.props || {})
    if (!chain) continue
    ctx.imports.add(pack.ctor)
    segs.push(`.${pack.apply}(${chain})`)
  }
  segs.push(...rawSegments(node))
  for (const [k, val] of Object.entries(node.vars || {})) segs.push(`.addVariable(${literal(k)}, ${literal(val)})`)
  if (node.debug) segs.push('.enableDebug()')
  for (const mod of node.modifications || []) {
    segs.push(`.addModification({ array_name: ${literal(mod.array_name)}, operation: ${literal(mod.operation)}, value: ${literal(mod.value)} })`)
  }

  const childVars = (node.controls || []).map((c) => ctx.vars.get(c.id)).filter(Boolean)
  if (node.type === 'grid') {
    ;(node.controls || []).forEach((child, i) => {
      const cv = ctx.vars.get(child.id)
      const gp = Array.isArray(child.gridPosition) ? child.gridPosition : [0, 0]
      if (child.debug) segs.push(`.addGridItem(${literal(gp)}, ${cv}, undefined, [1, 0, 0, 1])`)
      else segs.push(`.addGridItem(${literal(gp)}, ${cv})`)
      void i
    })
  } else {
    for (const cv of childVars) segs.push(`.addControl(${cv})`)
  }

  const head = `const ${v} = new ${ctor}(${literal(node.id)}${node.template ? `, ${literal(node.template)}` : ''})`
  if (!segs.length) lines.push(`${head};`)
  else lines.push(`${head}\n${segs.map((s) => `    ${s}`).join('\n')};`)

  // 绑定不能进链（`addDataBinding` 返回的是 DataBinding 实例，会断链）
  if (node.bindings && node.bindings.length) {
    ctx.imports.add('DataBindingObject')
    for (const b of node.bindings) lines.push(bindingStatement(v, b))
  }
  return { lines, varRef: v }
}

/**
 * 生成整份代码。
 * @returns {{ code: string, meta: { imports: string[], elementVars: object, panelVar: string, pageVars: string[] } }}
 */
export function generate(doc) {
  const ctx = {
    used: new Set(),
    vars: new Map(),
    imports: new Set(['registry']),
  }
  const body = []

  // 管理器要引用容器与页面板的变量 ⇒ 非管理器根元素先生成（避免 TDZ）
  const roots = [...(doc.elements || [])].sort(
    (a, b) => (a.type === 'page_panel_manage' ? 1 : 0) - (b.type === 'page_panel_manage' ? 1 : 0),
  )
  for (const root of roots) {
    const { lines } = elementLines(root, ctx)
    body.push(...lines)
  }

  const ns = doc.uiSystem.identifier
  const panelVar = varName(ns, ctx.used)
  const screen = screenOf(doc)
  const kind = screenKind(doc)

  // form：一屏一句话 `new SapdonFormUI("ns:nm", 内容面板, 按键面板)` —— 挂两个面板 + 建唯一根面板 `root`
  // （门控 + 两个引用）+ 注册 `@<ns_nm>.root` 的 gated factory 全在里面，调用方一个参数都不用重复写。
  // 多页面**不靠多个根**（一个文件只有一个 root）：由 `PagePanelManage` 对象在内容面板里做门控。
  const shell = []
  if (kind === 'form') {
    const contentVar = screen.content ? ctx.vars.get(screen.content) : null
    const buttonsVar = screen.buttons ? ctx.vars.get(screen.buttons) : null
    if (!screen.name || !contentVar || !buttonsVar) {
      shell.push(
        `// ⚠️ 本屏缺${!screen.name ? '屏名' : contentVar ? '按键面板' : '内容面板'}（诊断里是 error）⇒ 生成不了 SapdonFormUI`,
      )
    } else {
      ctx.imports.add('SapdonFormUI')
      shell.push(
        `const ${panelVar} = new SapdonFormUI(${literal(`${ns}:${screen.name}`)}, ${contentVar}, ${buttonsVar});`,
      )
    }
  } else {
    // hud / 容器：**自由摆放** —— 编辑器只保证元素摆出来，挂载与槽位换算交给框架 / 项目侧
    const top = (doc.elements || []).find((n) => n.type !== 'page_panel_manage') || null
    const topVar = top ? ctx.vars.get(top.id) : null
    if (kind === 'hud') {
      ctx.imports.add('HudUISystem')
      shell.push('// HUD 屏：自由摆放（不校验 root/内容/按钮/门控），产物落在原版 ui/hud_screen.json')
      shell.push(
        topVar
          ? `HudUISystem.mountRootElement(${topVar});   // 挂到 HUD 根面板（insert_front）`
          : '// ⚠️ 工程里还没有根元素：先在画布/对象树里加一个最外层元素',
      )
    } else {
      ctx.imports.add('ContainerUISystem')
      shell.push('// 容器屏：自由摆放；槽位（addSlot({ slot, pos, kind? })）由你在框架侧补 —— 编辑器不建模槽位换算')
      shell.push(`const ${panelVar} = new ContainerUISystem(${literal(`${ns}:${screen ? screen.name : ns}`)}, "ui/");`)
      shell.push(
        topVar
          ? `${panelVar}.addControl(${topVar});   // 面板进容器 UI 文件`
          : '// ⚠️ 工程里还没有根元素：先在画布/对象树里加一个最外层元素',
      )
    }
  }

  const imports = [...ctx.imports].sort()
  const header = [
    '/**',
    ` * 由 Sapdon UI Designer 生成 —— 工程: ${ns}（.sui.json，屏幕类型 ${kind}）`,
    ' *',
    ' * 粘进项目 main.ts 即可：`registry.submit()` 会写出',
    ` *   RP/${uiFileName(doc)}（本文件各元素${kind === 'form' ? ' + 根面板 root' : ''}）`,
    ...(kind === 'form'
      ? [` *   RP/${doc.uiSystem.path || 'ui/'}server_form.json（路由壳 + 本屏一个 gated factory → @${screenNamespace(doc)}.root）`]
      : [' *   （hud / 容器 屏不写 server_form：挂载由 HudUISystem / ContainerUISystem 负责）']),
    ' *   RP/ui/_ui_defs.json（自动登记）',
    ' *',
    ' * ⚠️ 单向生成：手改后不要指望能回读进编辑器（doc/dev/ui-designer.md §6.3）。',
    ' */',
  ]

  const shellNote =
    kind === 'form'
      ? [
          '// 说明：SapdonFormUI 内部已完成「挂内容/按键面板 + 建唯一根面板 root（门控在 root 上） + 注册 server_form 路由」',
          '// 多页面不靠多个根（一个文件只有一个 root）：在内容面板里用门控做（手册即此例）',
        ]
      : ['// 说明：hud / 容器 屏自由摆放，编辑器不做 root/内容/按钮/门控 校验（游戏里是否生效由挂载代码决定）']

  const code = [
    ...header,
    `import {\n${imports.map((i) => `    ${i},`).join('\n')}\n} from '${CORE}'`,
    '',
    '// ---------- 元素（后序：先子后父） ----------',
    ...body,
    '',
    `// ---------- 屏幕（${kind}） ----------`,
    ...shell,
    ...shellNote,
    '',
    'registry.submit()',
    '',
  ].join('\n')

  return {
    code,
    meta: {
      imports,
      elementVars: Object.fromEntries(ctx.vars),
      panelVar,
      pageVars: managerNodes(doc).map(() => panelVar),
    },
  }
}
