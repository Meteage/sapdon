/**
 * 代码生成 + 产物预览 单测（Sapdon UI Designer）
 *
 * 运行：`node tests/designer-codegen.test.mjs`
 *
 * ★ 本文件的核心是**交叉验证**：把同一份示例工程分别用
 *   ① 编辑器的 `preview.js`（镜像实现）与 ② **真实框架类**（`dist/core/ui/**`，即 src/core/ui 的 tsc 产物）
 *   各跑一遍，断言两边输出深度相等。这样框架序列化语义一变，测试先红 —— 不靠人肉保证镜像不漂移。
 *   交叉验证需要先 `npx tsc && npx tsc-alias`（与仓库既有测试约定一致）；缺 dist 时跳过并提示。
 *
 * 另外覆盖：诊断规则、生成代码的 TS 语法有效性、生成代码**可执行**（转译 + 换 import + 剥掉 submit）、
 * 门控表达式求值、工程模型的三态属性与撤销。
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

import { loadProject, Store, serializeProject, emptyProject, createNode, uniqueId, managerNodes, screenNamespace, uiFileName } from '../tools/designer/src/model.js'
import { generate, literal, varName } from '../tools/designer/src/codegen.js'
import { previewElement, previewUiFile, previewServerForm, previewAll, jsonNormalize } from '../tools/designer/src/preview.js'
import { diagnose, RULES } from '../tools/designer/src/diagnostics.js'
import { parseGate, evaluateVisibility } from '../tools/designer/src/gate.js'
import { schemaFor, widgetFor } from '../tools/designer/src/catalog.js'
import { SAMPLE } from '../tools/designer/samples/gated_book.js'

const DIST_INDEX = new URL('../dist/core/ui/index.js', import.meta.url)
const hasDist = existsSync(DIST_INDEX)
const SKIP_HINT = '缺少 dist/core/ui（先跑 `npx tsc && npx tsc-alias`）—— 交叉验证被跳过'

const { project: DOC, errors: LOAD_ERRORS } = loadProject(SAMPLE)

// ---------------------------------------------------------------------------
// 工程装载 / 诊断
// ---------------------------------------------------------------------------

test('示例工程可装载且无告警', () => {
  assert.deepEqual(LOAD_ERRORS, [])
  assert.equal(DOC.uiSystem.identifier, 'sapdon_ui', '工程里存的是 ns 段')
  assert.equal(screenNamespace(DOC), 'sapdon_ui_page1', 'UI 文件与 namespace = ns_nm')
  assert.equal(DOC.screen.name, 'page1', '本屏是一个对象（没有页面列表）')
  assert.equal(managerNodes(DOC).length, 1, '多页面靠可放置的 PagePanelManage 对象')
  assert.equal(managerNodes(DOC)[0].pages.length, 2)
})

test('示例工程诊断全绿（error/warn/info 都是 0）', () => {
  const { items, counts } = diagnose(DOC)
  assert.deepEqual(counts, { error: 0, warn: 0, info: 0 }, JSON.stringify(items, null, 1))
})

test('诊断：未声明的属性键会被报出来（否则会被静默丢弃）', () => {
  const doc = loadProject(SAMPLE).project
  const target = findNode(doc.elements, doc.screen.content)
  target.props.text_color_placeholder = 1
  const { items } = diagnose(doc)
  assert.ok(items.some((i) => i.rule === 'unknown-prop' && i.id === target.id))
})

test('诊断：collection_index / 属性形式的 pressed_button_name 都是 error；管理器缺容器/缺面板/重复 tag 也报', () => {
  const doc = loadProject(SAMPLE).project
  const target = findNode(doc.elements, doc.screen.content)
  target.props.collection_index = 0
  target.props.pressed_button_name = 'button.menu_exit'
  const mgr = managerNodes(doc)[0]
  mgr.props.container = ''
  mgr.pages[1] = { tag: 'page1', panel: null }
  const { items } = diagnose(doc)
  const rules = items.filter((i) => i.severity === 'error').map((i) => i.rule)
  assert.ok(rules.includes('collection-index'))
  assert.ok(rules.includes('pressed-button-name-prop'))
  assert.ok(rules.includes('manager-no-container'))
  assert.ok(rules.includes('manager-page-no-panel'))
  assert.ok(rules.includes('manager-page-tag-dup'))
})

test('诊断：grid 子项 offset / 游离 FormButton 会 warn', () => {
  const doc = emptyProject('t')
  const grid = createNode(doc, 'grid')
  const child = { id: 'c', type: 'panel', props: { offset: [1, 1] }, vars: {}, bindings: [], modifications: [], controls: [], gridPosition: [0, 0] }
  grid.controls.push(child)
  const orphan = createNode(doc, 'form_button')
  orphan.props.binding = 'bt'
  doc.elements = [grid, orphan]
  const { items } = diagnose(doc)
  const rules = items.map((i) => i.rule)
  assert.ok(rules.includes('grid-child-offset'))
  assert.ok(rules.includes('form-button-orphan'))
  assert.ok(rules.includes('root-not-referenced'))
})

test('诊断：grid 数组序与 grid_position 不一致要 warn（known-pitfalls §4.13）', () => {
  const doc = emptyProject('t')
  const grid = createNode(doc, 'grid')
  grid.props.grid_dimensions = [2, 2]
  // 数组序 0 放的却是行优先序号 0 之外的格子 → 真机可能整体错位
  grid.controls.push({ id: 'late', type: 'panel', props: {}, vars: {}, bindings: [], modifications: [], controls: [], gridPosition: [1, 1] })
  grid.controls.push({ id: 'first', type: 'panel', props: {}, vars: {}, bindings: [], modifications: [], controls: [], gridPosition: [0, 0] })
  doc.elements = [grid]
  const { items } = diagnose(doc)
  const hit = items.filter((i) => i.rule === 'grid-order-vs-position')
  assert.equal(hit.length, 2, '两个子项的数组序都与 grid_position 不符')
  assert.ok(hit[0].why.includes('§4.13'))
})

test('诊断规则表每条都有标题与依据（防"裸规则"）', () => {
  for (const [id, r] of Object.entries(RULES)) {
    assert.ok(r.title && r.why, `${id} 缺 title/why`)
    assert.ok(['error', 'warn', 'info'].includes(r.severity), `${id} 严重度非法`)
  }
})

// ---------------------------------------------------------------------------
// 代码生成
// ---------------------------------------------------------------------------

test('codegen：只 import 用到的类，且是框架类而非 UIElement', () => {
  const { code, meta } = generate(DOC)
  assert.ok(code.includes("} from '@sapdon/core'"))
  for (const need of ['Panel', 'Label', 'Image', 'StackPanel', 'FormButton', 'FormButtonGrid', 'SapdonFormUI', 'registry']) {
    assert.ok(meta.imports.includes(need), `缺 import: ${need}`)
  }
  assert.ok(!/new UIElement\(/.test(code), '所有元素都应有具体类名')
  assert.ok(!meta.imports.includes('Grid'), '本工程没有 Grid 元素，不该 import')
  assert.ok(!meta.imports.includes('ServerFormUI'), '一屏一句话：不需要 import 低层路由壳')
})

test('codegen：属性包链、变量、绑定、子项顺序正确', () => {
  const { code } = generate(DOC)
  assert.ok(code.includes('const page1_title = new Label("page1_title")'))
  assert.ok(code.includes('.setText(new Text().setText("第一章 · 设计思想").setFontSize("large").setTextAlignment("center"))'))
  assert.ok(code.includes('.addVariable("binding_text", "page1")'))
  assert.ok(code.includes('page1_content.dataBinding.addDataBinding(new DataBindingObject().setBindingType("view").setSourcePropertyName("($binding_text = #form_text)").setTargetPropertyName("#visible"));'))
  assert.ok(code.includes('.addControl(page1_stack);'))
  assert.ok(code.includes('const page1_title_row = new Panel("page1_title_row")'), '后序：子先父后')
  assert.ok(code.indexOf('const page1_title =') < code.indexOf('const page1_title_row ='), '子元素声明在父元素之前')
})

test('codegen：组合件按构建器形态生成，enableDebug 在 addButton 之前', () => {
  const doc = loadProject(SAMPLE).project
  const grid = findNode(doc.elements, 'page2_buttons_grid')
  grid.debug = true
  const { code } = generate(doc)
  assert.ok(code.includes('new FormButtonGrid("page2_buttons_grid", { dimensions: [2, 1], size: ["100%", "100%"] })'))
  assert.ok(code.includes('.addButton(1, btn_home, [1, 0])'), 'pos 非零时带第 3 参')
  assert.ok(code.includes('.addButton(0, btn_prev)'), 'pos 为 [0,0] 时省略第 3 参')
  assert.ok(
    code.includes(
      '.setTexture("textures/ui/book_pageleft_default", "textures/ui/book_pageleft_hover", "textures/ui/book_pageleft_pressed")',
    ),
    '三态纹理（原版 book_* 贴图）应一次性传给 setTexture',
  )
  const dbg = code.indexOf('new FormButtonGrid("page2_buttons_grid"')
  const seg = code.slice(dbg, code.indexOf('.build()', dbg))
  assert.ok(seg.includes('.enableDebug()'), '有 debug 开关')
  assert.ok(seg.indexOf('.enableDebug()') < seg.indexOf('.addButton('), 'enableDebug 必须在 addButton 之前（否则格子调试框不出现）')
})

test('codegen：一屏一句话 `new SapdonFormUI("ns:nm", 内容, 按钮)`（panelId/引用一个字都不用写）', () => {
  const { code } = generate(DOC)
  const ns = screenNamespace(DOC)
  assert.equal((code.match(/new SapdonFormUI\(/g) || []).length, 1, '一屏只 new 一次（同 ns_nm 重复 new 会互相覆盖）')
  assert.ok(
    code.includes(`const sapdon_ui = new SapdonFormUI("sapdon_ui:page1", book_content_panel, book_buttons_panel);`),
    '标识串 = ns:首屏名（UI 文件/namespace = ns_nm = ' + ns + '）；两个面板直接传引用',
  )
  const mainLine = code.split('\n').find((l) => l.includes('new SapdonFormUI(')) || ''
  assert.ok(!/panelId:/.test(mainLine), 'panelId 由框架从 nm 推出来，调用方不该再写')
  assert.ok(code.trimEnd().endsWith('registry.submit()'))
})

test('codegen：多页面不再生成多个根（一个文件只有一个 root）', () => {
  const { code, meta } = generate(DOC)
  assert.equal((code.match(/createPageRoot\(/g) || []).length, 0, '不再手写根面板')
  assert.equal((code.match(/registerPage\(/g) || []).length, 0, '不再手写路由注册')
  assert.ok(!meta.imports.includes('ServerFormUI'))
  assert.ok(code.includes('// 多页面不靠多个根（一个文件只有一个 root）：在内容面板里用门控做（手册即此例）'))
  // 第 2 行起的视图（本例共用同一份面板）不该再产生任何代码
  assert.ok(!code.includes('sapdon_ui:book2'), '视图的 panelId 不产生代码，只贡献门控 tag')
})

test('codegen：没有内容面板的主屏不生成构建代码，只留注释（诊断已报 error）', () => {
  const doc = loadProject(SAMPLE).project
  doc.screen.content = null
  const { code } = generate(doc)
  assert.ok(code.includes('// ⚠️ 本屏缺内容面板'), '留一句可读的注释')
  assert.equal((code.match(/new SapdonFormUI\(/g) || []).length, 0, '缺面板就没法生成 SapdonFormUI')
})

test('codegen：幂等（同模型两次生成逐字节一致）', () => {
  assert.equal(generate(DOC).code, generate(loadProject(SAMPLE).project).code)
})

test('codegen 辅助：literal 转义、varName 处理非法标识符与保留字', () => {
  assert.equal(literal('a"b'), '"a\\"b"')
  assert.equal(literal(['100%', 30]), '["100%", 30]')
  assert.equal(literal(true), 'true')
  assert.equal(varName('sapdon_ui:book'), 'sapdon_ui_book')
  assert.equal(varName('2bad'), '_2bad')
  assert.equal(varName('class'), 'class_')
  const used = new Set(['dup'])
  assert.equal(varName('dup', used), 'dup_2', '同一份代码里变量名必须唯一')
})

test('codegen：生成的 TS 语法有效（用 typescript 转译，不产生 error 级诊断）', async () => {
  const ts = (await import('typescript')).default
  const { code } = generate(DOC)
  const out = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext },
    reportDiagnostics: true,
    fileName: 'main.generated.ts',
  })
  const errors = (out.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error)
  assert.equal(errors.length, 0, errors.map((e) => ts.flattenDiagnosticMessageText(e.messageText, ' ')).join('\n'))
})

// ---------------------------------------------------------------------------
// ★ 交叉验证：真实框架类（dist/core/ui） vs 编辑器镜像
// ---------------------------------------------------------------------------

/** 用真实框架类把模型节点搭出来（属性包 + 链式 setter 全部按 catalog 的 setter 名调用） */
function buildReal(c, node, parent) {
  if (node.type === 'form_button_grid') {
    const g = new c.FormButtonGrid(node.id, {
      dimensions: node.props.dimensions || [1, 1],
      size: node.props.size || ['100%', '100%'],
    })
    if (node.debug) g.enableDebug()
    node.controls.forEach((child, i) => {
      const btn = new c.FormButton(child.id)
      const p = child.props || {}
      const tex = ['default', 'hover', 'pressed'].map((k) => p[`texture_${k}`] || '')
      if (tex.every(Boolean)) btn.setTexture(tex[0], tex[1], tex[2])
      if (p.binding) btn.setBinding(p.binding)
      if ('anchor' in p) btn.setAnchor(p.anchor)
      if ('size' in p) btn.setSize(p.size[0], p.size[1])
      const slot = Number.isFinite(child.slot) ? child.slot : i
      const pos = Array.isArray(child.pos) ? child.pos : [0, 0]
      if (pos[0] || pos[1]) g.addButton(slot, btn, pos)
      else g.addButton(slot, btn)
    })
    return g.build()
  }

  const Ctor = { panel: c.Panel, stack_panel: c.StackPanel, collection_panel: c.CollectionPanel, grid: c.Grid, scroll_view: c.ScrollingPanel, label: c.Label, image: c.Image, button: c.Button }[node.type]
  assert.ok(Ctor, `测试缺 ${node.type} 的真实类映射`)
  const el = node.template ? new Ctor(node.id, node.template) : new Ctor(node.id)

  // 属性包（顺序与 catalog 一致；setter 名写错会在这里直接抛错 —— 顺便校验 catalog）
  for (const pack of schemaFor(node.type).packs) {
    let obj = null
    for (const def of pack.props) {
      if (!Object.prototype.hasOwnProperty.call(node.props, def.key)) continue
      if (!obj) obj = new c[pack.ctor]()
      obj[def.setter](node.props[def.key])
    }
    if (obj) el[pack.apply](obj)
  }
  for (const def of schemaFor(node.type).raw) {
    if (!Object.prototype.hasOwnProperty.call(node.props, def.key)) continue
    if (def.key === 'collection_name') el.setCollectionName(node.props[def.key])
    else el.addProp(def.key, node.props[def.key])
  }
  for (const [k, v] of Object.entries(node.vars || {})) el.addVariable(k, v)
  if (node.debug) el.enableDebug() // 必须在 addControl 之前（调试框排 children 首位）
  for (const mod of node.modifications || []) el.addModification({ array_name: mod.array_name, operation: mod.operation, value: mod.value })

  for (const child of node.controls || []) {
    const childEl = buildReal(c, child, node)
    if (node.type === 'grid') {
      const gp = Array.isArray(child.gridPosition) ? child.gridPosition : [0, 0]
      el.addGridItem(gp, childEl, undefined, child.debug ? [1, 0, 0, 1] : undefined)
    } else {
      el.addControl(childEl)
    }
  }

  for (const b of node.bindings || []) {
    const dbo = new c.DataBindingObject()
    if (b.type) dbo.setBindingType(b.type)
    if (b.collection) dbo.setBindingCollectionName(b.collection)
    if (b.name) dbo.setBindingName(b.name)
    if (b.source) dbo.setSourcePropertyName(b.source)
    if (b.target) dbo.setTargetPropertyName(b.target)
    el.dataBinding.addDataBinding(dbo)
  }
  return el
}

test('★交叉验证：逐元素 serialize() 与 preview.js 输出深度相等', async (t) => {
  if (!hasDist) return t.skip(SKIP_HINT)
  const c = await import(DIST_INDEX.href)

  const walk = (nodes, parent) => {
    for (const node of nodes) {
      // FormButton 的产物（注入的三件套绑定 + offset + 包裹层）由父级 FormButtonGrid 那一次比较覆盖；
      // 单独拿出来比等于比"游离按钮"，语义不同
      if (parent && parent.type === 'form_button_grid') continue
      // 多页管理器不是 UIElement（不产出元素 JSON）；它的行为由下面「一个 UI 文件」那条交叉验证覆盖
      if (node.type === 'page_panel_manage') continue
      const mine = jsonNormalize(previewElement(node, parent))
      const real = jsonNormalize(buildReal(c, node, parent).serialize())
      assert.deepEqual(mine, real, `元素 ${node.id}（${node.type}）的产物不一致`)
      walk(node.controls || [], node)
    }
  }
  walk(DOC.elements, null)
})

test('★交叉验证：多页管理器 → 与真实 PagePanelManage 的产物深度相等', async (t) => {
  if (!hasDist) return t.skip(SKIP_HINT)
  const c = await import(DIST_INDEX.href)

  const mgr = managerNodes(DOC)[0]
  const container = buildReal(c, findNode(DOC.elements, mgr.props.container), null)
  const pages = mgr.pages.map((p) => ({ tag: p.tag, panel: buildReal(c, findNode(DOC.elements, p.panel), null) }))
  const real = new c.PagePanelManage(container)
  for (const p of pages) real.addPage(p.panel, p.tag)
  real.build()

  // 镜像：同一容器 + 同一批页 ⇒ 逐字段相等（门控表达式、挂载顺序、$gtag 变量）
  const ns = `${DOC.uiSystem.identifier}_x`
  const mirrored = jsonNormalize(previewUiFile({ ...DOC, uiSystem: { ...DOC.uiSystem, identifier: ns } }))
  const containerKey = Object.keys(mirrored).find((k) => k.startsWith(`${mgr.props.container}@`) || k === mgr.props.container)
  const controls = mirrored[containerKey].controls
  const tail = controls.slice(controls.length - pages.length)
  assert.deepEqual(tail, jsonNormalize(container.serialize()[containerKey].controls.slice(-pages.length)))
  assert.ok(JSON.stringify(tail).includes('not( (#form_text - $gtag) = #form_text)'), '前缀门控与框架一致')
})

/** 按 id 找元素（含子项） */
function findNode(nodes, id) {
  for (const n of nodes || []) {
    if (n.id === id) return n
    const hit = findNode(n.controls, id)
    if (hit) return hit
  }
  return null
}

test('★交叉验证：一个 UI 文件的 toObject() 与 previewUiFile() 深度相等', async (t) => {
  if (!hasDist) return t.skip(SKIP_HINT)
  const c = await import(DIST_INDEX.href)

  const content = buildReal(c, findNode(DOC.elements, DOC.screen.content), null)
  const buttons = buildReal(c, findNode(DOC.elements, DOC.screen.buttons), null)
  const ns = `${DOC.uiSystem.identifier}_x`
  // 一屏一句话：真实 SapdonFormUI（挂两个面板 + 建唯一根面板 root + 注册路由）
  const form = new c.SapdonFormUI(`${ns}:${DOC.screen.name}`, content, buttons)
  // 多页管理器也走真类（镜像那边由 previewUiFile 内部的 applyManagers 做同一件事）
  for (const mgr of managerNodes(DOC)) {
    const real = new c.PagePanelManage(
      mgr.props.container === DOC.screen.content ? content : buildReal(c, findNode(DOC.elements, mgr.props.container), null),
    )
    for (const p of mgr.pages) real.addPage(buildReal(c, findNode(DOC.elements, p.panel), null), p.tag)
    real.build()
  }
  // 镜像按工程自己的 ns 生成 ⇒ 换个 ns 比：把镜像的引用串一并换成同一份
  const mirrored = jsonNormalize(previewUiFile({ ...DOC, uiSystem: { ...DOC.uiSystem, identifier: ns } }))
  const real = jsonNormalize(form.getSystem().toObject())
  assert.deepEqual(mirrored, real)
  assert.equal(Object.keys(real).filter((k) => k === 'root').length, 1, '文件里只有一个根面板 root')
  const controls = real.book_content_panel.controls.map((x) => Object.keys(x)[0])
  assert.deepEqual(controls.slice(-2), ['managed_page_a', 'managed_page_b'], '管理器把页面板挂进容器（顺序 = 登记顺序）')
})

test('★交叉验证：server_form 路由壳与 previewServerForm() 深度相等', async (t) => {
  if (!hasDist) return t.skip(SKIP_HINT)
  const c = await import(DIST_INDEX.href)

  // 同文件其它用例共用同一份模块实例（工厂是只增列表）⇒ 只比本次新增的工厂 + 静态壳
  const factoriesOf = (mod) =>
    jsonNormalize(mod.ServerFormUI.getSystem().toObject().main_screen_content.modifications[0].value)
  const before = factoriesOf(c).length
  const screen = DOC.screen
  c.ServerFormUI.registerPage({
    panelId: `sapdon_ui:${screen.name}`,
    name: screen.name,
    contentPanel: `${screenNamespace(DOC)}.${screen.content}`,
    buttonsPanel: `${screenNamespace(DOC)}.${screen.buttons}`,
  })
  const real = jsonNormalize(c.ServerFormUI.getSystem().toObject())
  const mirror = jsonNormalize(previewServerForm(DOC))
  const added = factoriesOf(c).slice(before)
  assert.deepEqual(added, mirror.main_screen_content.modifications[0].value)
  assert.ok(JSON.stringify(added).includes(`@${screenNamespace(DOC)}.root`), 'long_form 一律指向 @<ns_nm>.root')
  const strip = (o) => ({ ...o, main_screen_content: undefined })
  assert.deepEqual(strip(real), strip(mirror), '静态路由壳（4 个元素）应逐字段相等')
})

test('★交叉验证：转译并执行**生成出来的代码**，产物与本机预览一致', async (t) => {
  if (!hasDist) return t.skip(SKIP_HINT)
  const c = await import(DIST_INDEX.href)
  const ts = (await import('typescript')).default
  const { code, meta } = generate(DOC)

  // 生成的是 `new SapdonFormUI(...)` 写法 ⇒ 执行它会**顺带建文件 + 注册路由**。先记下 server_form 里已有的
  // factory 数，执行后只比"本次新增的那几条"——同文件其它用例共用同一份模块实例（工厂是只增列表）。
  const factoriesOf = (mod) =>
    jsonNormalize(mod.ServerFormUI.getSystem().toObject().main_screen_content.modifications[0].value)
  const before = factoriesOf(c).length

  // ① 换成真实 dist 的 import ② 剥掉 registry.submit()（会去 fetch dev-server）
  // ③ 把本文件的 UISystem 导出出来以便断言（生成代码里 `sapdon_ui` 是 SapdonFormUI 实例）
  const patched = code
    .replace(/from '@sapdon\/core'/, `from '${DIST_INDEX.href}'`)
    .replace(/^registry\.submit\(\)$/m, '')
    .concat(`\nexport const __panel = ${meta.panelVar}.getSystem()\n`)
  assert.ok(patched.includes('__panel'), 'patched 代码应导出页面系统')

  const js = ts.transpileModule(patched, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext } }).outputText
  const dir = new URL('../.tmp/designer-gen/', import.meta.url)
  await mkdir(dir, { recursive: true })
  const file = new URL(`gen-${Date.now()}.mjs`, dir)
  await writeFile(file, js, 'utf8')

  const mod = await import(pathToFileURL(file.pathname.replace(/^\//, '')).href)
  assert.deepEqual(jsonNormalize(mod.__panel.toObject()), jsonNormalize(previewUiFile(DOC)))

  // ★ 路由的"另一半"产物：主路由靠 SapdonFormUI 内部注册（生成代码里没有 registerPage），
  //   所以这里必须真的执行一遍、把新增 factory 与镜像逐字段对比（漏了它，路由静默缺失查不出来）。
  const added = factoriesOf(c).slice(before)
  assert.deepEqual(
    added,
    jsonNormalize(previewServerForm(DOC).main_screen_content.modifications[0].value),
    'SapdonFormUI 注册的 gated factory 与 previewServerForm() 不一致',
  )
})

// ---------------------------------------------------------------------------
// 门控求值（画布的"门控模拟"靠它）
// ---------------------------------------------------------------------------

test('parseGate：认得出三种字面量判定式，认不出就返回 null', () => {
  assert.deepEqual(parseGate('($binding_text = #form_text)'), { kind: 'eq', varName: 'binding_text', channel: '#form_text' })
  assert.equal(parseGate("(not( (#title_text - 'sapdon_ui:book') = #title_text))").kind, 'title-prefix')
  assert.equal(parseGate('($x = #hud_title_text_string)').channel, '#hud_title_text_string')
  assert.equal(parseGate('(math.sin(#a) > 0.5)'), null, 'Molang 不猜')
  assert.equal(parseGate(''), null)
})

test('evaluateVisibility：页面门控/按钮门控/前缀门控', () => {
  const page = { vars: { binding_text: 'page1' }, bindings: [{ type: 'view', source: '($binding_text = #form_text)', target: '#visible' }] }
  assert.equal(evaluateVisibility(page, { body: 'page1' }), true)
  assert.equal(evaluateVisibility(page, { body: 'page2' }), false)
  assert.equal(evaluateVisibility(page, {}), null, '信息不足 → 未知（画布按可见处理并标未判定）')

  const btn = { vars: { binding_button_text: 'next_button' }, bindings: [{ type: 'view', source: '($binding_button_text = #form_button_text)', target: '#visible' }] }
  assert.equal(evaluateVisibility(btn, { buttons: 'prev_button,next_button' }), true)
  assert.equal(evaluateVisibility(btn, { buttons: ['home_button'] }), false)
  assert.equal(evaluateVisibility(btn, {}), null)

  const root = { vars: { panel_id: 'sapdon_ui:book' }, bindings: [{ type: 'view', source: "(not( (#title_text - 'sapdon_ui:book') = #title_text))", target: '#visible' }] }
  assert.equal(evaluateVisibility(root, { title: 'sapdon_ui:book' }), true)
  assert.equal(evaluateVisibility(root, { title: 'sapdon_ui:other' }), false)
})

test('evaluateVisibility：没有门控绑定时返回 null（不装作知道）', () => {
  assert.equal(evaluateVisibility({ vars: {}, bindings: [] }, { body: 'x' }), null)
})

// ---------------------------------------------------------------------------
// 工程模型：三态属性 / 撤销 / 唯一 id / 存取
// ---------------------------------------------------------------------------

test('三态属性：setProp 写键，unsetProp 删键（不是写回默认值）', () => {
  const store = new Store(loadProject(SAMPLE).project)
  const id = 'page1_title'
  assert.equal('font_scale_factor' in store.node(id).props, false)

  store.setProp(id, 'font_scale_factor', 1) // 赋成"默认值"也要写进产物
  assert.equal(store.node(id).props.font_scale_factor, 1)

  store.unsetProp(id, 'font_scale_factor')
  assert.equal('font_scale_factor' in store.node(id).props, false)
})

test('撤销/重做：回到上一状态，且选择态失效时自动清空', () => {
  const store = new Store(loadProject(SAMPLE).project)
  const before = serializeProject(store.doc)
  store.addWidget('label', { parentId: 'book_content_panel' })
  const added = store.selection
  assert.ok(added)
  assert.notEqual(serializeProject(store.doc), before)

  store.undo()
  assert.equal(store.node(added), null)
  assert.equal(store.selection, null, '被撤销掉的选中项要清掉')

  store.redo()
  assert.ok(store.node(added))
})

test('addWidget/remove 保持结构一致；grid 子项自动补 grid_position', () => {
  const store = new Store(emptyProject('t'))
  const grid = store.addWidget('grid')
  store.setProp(grid.id, 'grid_dimensions', [2, 2])
  const a = store.addWidget('label', { parentId: grid.id })
  const b = store.addWidget('label', { parentId: grid.id })
  assert.deepEqual(store.node(a.id).gridPosition, [0, 0])
  assert.deepEqual(store.node(b.id).gridPosition, [1, 0])

  store.remove(a.id)
  assert.equal(store.node(a.id), null)
})

test('rename 去重：同文件内 id 不重复（重复会互相覆盖 ⇒ 静默丢控件）', () => {
  const store = new Store(loadProject(SAMPLE).project)
  store.rename('page1_title', 'page2_title')
  assert.equal(store.node('page1_title'), null)
  assert.ok(store.node('page2_title_2'), '撞名要自动加后缀')
})

test('uniqueId 只看已用 id', () => {
  const doc = emptyProject('t')
  doc.elements.push(createNode(doc, 'panel'))
  assert.equal(uniqueId(doc, 'panel'), 'panel_2')
  assert.equal(uniqueId(doc, 'brand_new'), 'brand_new')
})

test('存取往返：序列化 → 装载 → 再序列化逐字节一致', () => {
  const store = new Store(loadProject(SAMPLE).project)
  const text = serializeProject(store.doc)
  const again = loadProject(text)
  assert.deepEqual(again.errors, [])
  assert.equal(serializeProject(again.project), text)
})

test('载入非法 JSON 不抛，返回错误列表', () => {
  const bad = loadProject('{oops')
  assert.equal(bad.project, null)
  assert.ok(bad.errors[0].includes('JSON'))
})

test('屏幕类型：form 按规范（SapdonFormUI）；容器 / hud 自由摆放（不校验规范、不预览框架产物）', () => {
  // form：现状 —— 一句话 + 完整规范
  const form = generate(loadProject({ ...SAMPLE, screenKind: 'form' }).project)
  assert.ok(form.code.includes('new SapdonFormUI("sapdon_ui:page1"'), 'form 走 SapdonFormUI')
  assert.equal(previewAll(loadProject({ ...SAMPLE, screenKind: 'form' }).project).freeform, undefined)

  // hud：元素 + mountRootElement；只在原版 hud_screen 上落文件
  const hudDoc = loadProject({ ...SAMPLE, screenKind: 'hud' }).project
  const hud = generate(hudDoc)
  assert.ok(hud.code.includes('HudUISystem.mountRootElement('), 'hud 挂到 HUD 根面板')
  assert.ok(!hud.code.includes('SapdonFormUI'), 'hud 不出 form 屏代码')
  assert.ok(hud.code.includes('RP/ui/hud_screen.json'), 'hud 的目标文件是原版 hud_screen')
  assert.equal(uiFileName(hudDoc), 'ui/hud_screen.json')

  // 容器：ContainerUISystem + addControl；文件名按该系统的既有规则（= nm）
  const cDoc = loadProject({ ...SAMPLE, screenKind: 'container' }).project
  const box = generate(cDoc)
  assert.ok(box.code.includes('new ContainerUISystem("sapdon_ui:page1", "ui/")'), '容器走 ContainerUISystem')
  assert.ok(box.code.includes('.addControl('), '元素挂进容器面板')
  assert.ok(box.code.includes('槽位（addSlot'), '槽位换算留给项目侧（编辑器不建模）')
  assert.equal(uiFileName(cDoc), 'ui/page1.json')

  // 两类自由摆放屏：诊断只给一条 info，不报 root/内容/按钮/门控 规范问题
  for (const kind of ['hud', 'container']) {
    const doc = loadProject({ ...SAMPLE, screenKind: kind }).project
    const { items } = diagnose(doc, {})
    assert.ok(items.some((i) => i.rule === 'screen-kind-freeform'), `${kind} 要说明"自由摆放、不校验"`)
    for (const rule of ['manager-no-container', 'manager-page-no-panel', 'screen-kind-form-empty', 'ungated-page', 'root-not-referenced']) {
      assert.ok(!items.some((i) => i.rule === rule), `${kind} 不该报 form 规范规则 ${rule}`)
    }
    const all = previewAll(doc)
    assert.equal(all.freeform, true, `${kind} 不预览框架产物`)
    assert.ok(all.file && all.note, `${kind} 给出目标文件与说明`)
    assert.equal(all.elements.length, doc.elements.length - 1, '仍列出元素 JSON（管理器是非视觉对象，不列）')
  }
})

test('屏幕类型：form 缺面板时报 error（生成不出 SapdonFormUI）', () => {
  const doc = loadProject(SAMPLE).project
  doc.screen = { name: '', content: null, buttons: null }
  const { items } = diagnose(doc)
  assert.ok(items.some((i) => i.rule === 'screen-kind-form-empty' && i.severity === 'error'))
  // 屏名有缺省值（ns_screen），所以报的是"缺内容面板"；无论如何都不该生成 SapdonFormUI
  assert.ok(generate(doc).code.includes('// ⚠️ 本屏缺内容面板'))
  assert.equal((generate(doc).code.match(/new SapdonFormUI\(/g) || []).length, 0)
})

test('屏幕类型：工程存取往返保持 screenKind（旧工程缺字段 ⇒ form）', () => {
  const doc = loadProject(SAMPLE).project
  doc.screenKind = 'hud'
  const again = loadProject(serializeProject(doc)).project
  assert.equal(again.screenKind, 'hud', '存下来再读回来还是 hud')
  const legacy = loadProject({ ...SAMPLE, screenKind: undefined }).project
  assert.equal(legacy.screenKind, 'form', '旧工程没有这个字段 ⇒ form')
})

test('previewAll 的文件名取 ns_nm（框架按 UISystem.name 命名文件）', () => {
  const all = previewAll(DOC)
  assert.equal(uiFileName(DOC), 'ui/sapdon_ui_page1.json')
  assert.equal(all.uiFile.file, 'ui/sapdon_ui_page1.json')
  assert.equal(all.serverForm.file, 'ui/server_form.json')
})

test('工具箱目录自检：每个控件都有构造器名与画布模式', () => {
  for (const type of ['panel', 'stack_panel', 'grid', 'label', 'image', 'button', 'form_button_grid', 'form_button']) {
    const w = widgetFor(type)
    assert.ok(w && w.ctor && w.mode, `${type} 的目录条目不全`)
  }
})

