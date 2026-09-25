/**
 * `SapdonFormUI`（一个 UI 文件 = 一条路由）单测
 *
 * 运行：`npx tsc && npx tsc-alias && node tests/sapdon-formui.test.mjs`（跑 dist 产物）
 *
 * 盯的是：**`new SapdonFormUI("ns:nm", 内容面板, 按键面板)` 一句话，
 * 内容面板/按键面板/根面板 root/路由注册全齐**，调用方不该再手写
 * `ServerFormUI.createPageRoot()` / `registerPage()`，也不该把 name/panelId/引用写第二遍。
 * UI 文件与 namespace = `ns_nm`（`sapdon_ui:apple` → `ui/sapdon_ui_apple.json`）。
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'

import { SapdonFormUI } from '../dist/core/ui/systems/sapdon/sapdonFormUI.js'
import { ServerFormUI } from '../dist/core/ui/systems/sapdon/serverFormUI.js'
import { Panel } from '../dist/core/ui/elements/panel.js'
import { Label } from '../dist/core/ui/elements/label.js'
import { Layout } from '../dist/core/ui/properties/layout.js'

const OK = existsSync(new URL('../dist/core/ui/systems/sapdon/sapdonFormUI.js', import.meta.url))
const skip = OK ? false : '缺少 dist（先跑 npx tsc && npx tsc-alias）'

/** 造一个内容面板 + 按键面板 */
function makePanels(name) {
  const content = new Panel(`${name}_content_panel`).setLayout(new Layout().setSize([320, 207]))
  content.addControl(new Label('title').setLayout(new Layout().setSize(['100%', '20%'])))
  const buttons = new Panel(`${name}_buttons_panel`).setLayout(new Layout().setSize(['100%', '100%']))
  return { content, buttons }
}

test('构造一句话：content/buttons/根面板 root/路由注册全办齐', { skip }, () => {
  const ns = `formui_basic_${Date.now()}`
  const { content, buttons } = makePanels('basic')
  const form = new SapdonFormUI(`${ns}:basic`, content, buttons)
  const obj = form.getSystem().toObject()

  const uiNs = `${ns}_basic`
  assert.equal(obj.namespace, uiNs, 'UI 文件的 namespace = ns_nm')
  assert.ok(obj.basic_content_panel, '内容面板进了本文件')
  assert.ok(obj.basic_buttons_panel, '按键面板进了本文件')

  // 屏幕根面板：元素 id 固定 root，门控 + 两个引用（都不用调用方手写）
  const root = obj.root
  assert.ok(root, '根面板元素 id 固定 root（ServerFormUI.ROOT）')
  assert.equal(ServerFormUI.ROOT, 'root')
  assert.equal(root.$panel_id, 'sapdon_ui:basic', 'panelId = sapdon_ui:<nm>')
  const refs = JSON.stringify(root.controls)
  assert.ok(refs.includes(`content@${uiNs}.basic_content_panel`), 'root 引用了内容面板（前缀 = ns_nm）')
  assert.ok(refs.includes(`buttons@${uiNs}.basic_buttons_panel`), 'root 引用了按键面板')
  assert.ok(JSON.stringify(root.bindings).includes('#title_text'), '前缀门控绑在 root 上')
  assert.deepEqual(Object.keys(obj), ['namespace', 'basic_content_panel', 'basic_buttons_panel', 'root'], '一个文件只有一个根')
})

test('文件名与 namespace 都取 ns_nm（UISystemRegistry 拼 ui/<name>.json）', { skip }, () => {
  const ns = `formui_file_${Date.now()}`
  const { content, buttons } = makePanels('file')
  const system = new SapdonFormUI(`${ns}:mybook`, content, buttons).getSystem()
  assert.equal(system.namespace, `${ns}_mybook`, 'namespace = ns_nm')
  assert.equal(system.name, `${ns}_mybook`, '文件名 = ns_nm')
  assert.equal(`${system.path}${system.name}.json`, `ui/${ns}_mybook.json`)
})

test('注册的路由在 server_form 里生成了 gated factory（long_form 指向 @<ns_nm>.root）', { skip }, () => {
  const ns = `formui_route_${Date.now()}`
  const { content, buttons } = makePanels('route')
  new SapdonFormUI(`${ns}:route`, content, buttons)

  const dump = JSON.stringify(ServerFormUI.getSystem().toObject())
  assert.ok(dump.includes('sapdon_form_factory_route'), 'server_form 里出现本屏的 factory')
  assert.ok(dump.includes(`"@${ns}_route.root"`), 'factory 的 long_form 固定指向本文件的 root')
})

test('getSystem() 拿到本文件，可继续 addElement（框架之外自己加东西）', { skip }, () => {
  const ns = `formui_extra_${Date.now()}`
  const { content, buttons } = makePanels('extra')
  const form = new SapdonFormUI(`${ns}:extra`, content, buttons)
  form.getSystem().addElement(new Panel('extra_cell_template'))
  assert.ok(form.getSystem().toObject().extra_cell_template, '额外元素进了同一个 UI 文件')
})

test('标识串不合规直接抛错（避免 undefined 静默进产物）', { skip }, () => {
  const { content, buttons } = makePanels('bad')
  assert.throws(() => new SapdonFormUI('no_colon', content, buttons), /ns:nm/)
  assert.throws(() => new SapdonFormUI('ns:', content, buttons), /ns:nm/)
  assert.throws(() => new SapdonFormUI(':nm', content, buttons), /ns:nm/)
})

test('两个面板必须是 UI 元素', { skip }, () => {
  const { content, buttons } = makePanels('typed')
  assert.throws(() => new SapdonFormUI('typed:a', undefined, buttons), /内容面板/)
  assert.throws(() => new SapdonFormUI('typed:b', content, undefined), /按键面板/)
})

test('同一个 ns_nm 建两次 = 同一个文件被覆盖（一个屏只 new 一次）', { skip }, () => {
  const ns = `formui_dup_${Date.now()}`
  const a = makePanels('dup_a')
  const b = makePanels('dup_b')
  new SapdonFormUI(`${ns}:dup`, a.content, a.buttons)
  const second = new SapdonFormUI(`${ns}:dup`, b.content, b.buttons).getSystem().toObject()
  assert.ok(second.dup_b_content_panel, '第二个实例的内容面板')
  assert.ok(!second.dup_a_content_panel, '第一个实例的元素不在第二个文件里（各自独立的 UISystem 实例）')
})

test('低层接口仍在，但根面板只有一个：再挂一个 root 会覆盖（多页面请在内容面板里做）', { skip }, () => {
  const ns = `formui_low_${Date.now()}`
  const { content, buttons } = makePanels('low')
  const form = new SapdonFormUI(`${ns}:main`, content, buttons)

  // 低层接口仍是公开的（registerPage 可单独调），但 createPageRoot 的元素 id 固定 root
  const system = form.getSystem()
  const second = ServerFormUI.createPageRoot({
    panelId: 'sapdon_ui:second',
    contentRef: `${ns}.low_content_panel`,
    buttonsRef: `${ns}.low_buttons_panel`,
  })
  assert.equal(second.id, 'root', 'createPageRoot 的 id 固定 root')

  // 再挂一个 root = 覆盖前一个（UISystem 按 id 存）—— 这正是"一个文件一个根"的硬约束
  system.addElement(second)
  const obj = system.toObject()
  assert.equal(Object.keys(obj).filter((k) => k === 'root').length, 1, '文件里仍然只有一个 root')
  assert.equal(obj.root.$panel_id, 'sapdon_ui:second', '后挂的赢了：前一个根（sapdon_ui:main）被覆盖')
})
