/**
 * `PagePanelManage`（一屏之内多页面的构建期管理器）单测
 *
 * 运行：`npx tsc && npx tsc-alias && node tests/page-panel.test.mjs`（跑 dist 产物）
 *
 * 盯的是：门控表达式与真产物一致（手册那套 `$gtag` 前缀匹配），两种构造形态等价，
 * 挂载顺序与登记顺序一致，旧写法不受影响。
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'

import { PagePanelManage } from '../dist/core/ui/systems/sapdon/pagePanelManage.js'
import { Panel } from '../dist/core/ui/elements/panel.js'

const OK = existsSync(new URL('../dist/core/ui/systems/sapdon/pagePanelManage.js', import.meta.url))
const skip = OK ? false : '缺少 dist（先跑 npx tsc && npx tsc-alias）'

const mkPanel = (id) => new Panel(id)
/** 框架把 DataBindingObject **实例**塞进 bindings（原型 ≠ 普通对象）⇒ 比对前先按落盘 JSON 归一 */
const norm = (v) => JSON.parse(JSON.stringify(v))

test('prefix 模式：门控表达式与手册真产物逐字一致（$gtag + 前缀匹配）', { skip }, () => {
  const container = mkPanel('book_content_panel')
  new PagePanelManage(container).addPage(mkPanel('index_panel'), 'INDEX').build()

  const obj = container.serialize().book_content_panel
  assert.equal(obj.controls.length, 1, '面板已挂进容器')
  const page = obj.controls[0].index_panel
  assert.equal(page.$gtag, 'INDEX', 'tag 写成 $gtag 变量')
  assert.deepEqual(norm(page.bindings), [
    {
      binding_type: 'view',
      source_property_name: '(not( (#form_text - $gtag) = #form_text))',
      target_property_name: '#visible',
    },
  ], '与 sapdonGuideBook.ts 里手写的门控表达式一字不差')
})

test('eq 模式：$binding_text + 全等判定（SymGatedBook 那套），变量名可覆盖', { skip }, () => {
  const container = mkPanel('content_panel')
  new PagePanelManage({ container, mode: 'eq' })
    .addPage(mkPanel('page_a'), 'page1')
    .addPage(mkPanel('page_b'), 'page2')
    .build()

  const obj = container.serialize().content_panel
  assert.equal(obj.controls.length, 2, '两页都进容器')
  assert.equal(obj.controls[0].page_a.$binding_text, 'page1')

  // 显式切到全等模式 + 自定义变量名
  const c2 = mkPanel('c2')
  new PagePanelManage({ container: c2, mode: 'eq' })
    .addPage(mkPanel('p'), 'TXT|')
    .addPage(mkPanel('q'), 'TXT|p1', 'my_tag')
  const o2 = c2.serialize().c2
  assert.equal(o2.controls.length, 2)
  assert.deepEqual(norm(o2.controls[0].p.bindings), [
    { binding_type: 'view', source_property_name: '($binding_text = #form_text)', target_property_name: '#visible' },
  ])
  assert.equal(o2.controls[1].q.$my_tag, 'TXT|p1', '逐页可覆盖变量名')
  assert.equal(o2.controls[1].q.bindings[0].source_property_name, '($my_tag = #form_text)')
})

test('两种构造形态等价（container + 链式 / { container, pages }）', { skip }, () => {
  const a = mkPanel('a_container')
  new PagePanelManage(a).addPage(mkPanel('p1'), 'T1').addPage(mkPanel('p2'), 'T2').build()

  const b = mkPanel('b_container')
  new PagePanelManage({ container: b, pages: [{ panel: mkPanel('p1'), tag: 'T1' }, { panel: mkPanel('p2'), tag: 'T2' }] }).build()

  const norm = (json) => JSON.parse(JSON.stringify(json).replace(/a_container|b_container/g, 'X'))
  assert.deepEqual(norm(a.serialize()), norm(b.serialize()), '两种写法产物应当一致')
})

test('tag 缺省用面板 id；list() 给出 tag↔面板对照（运行期脚本据此对齐）', { skip }, () => {
  const container = mkPanel('c')
  const pager = new PagePanelManage(container).addPage(mkPanel('intro_panel')).addPage(mkPanel('text_panel'), 'TXT|')
  assert.deepEqual(pager.list(), [{ tag: 'intro_panel', id: 'intro_panel' }, { tag: 'TXT|', id: 'text_panel' }])
  assert.equal(container.serialize().c.controls[0].intro_panel.$gtag, 'intro_panel')
})

test('挂载顺序 = 登记顺序（引擎按数组序绘制，门控命中即显示）', { skip }, () => {
  const container = mkPanel('c')
  new PagePanelManage(container).addPage(mkPanel('first'), 'A').addPage(mkPanel('second'), 'B').build()
  assert.deepEqual(container.serialize().c.controls.map((x) => Object.keys(x)[0]), ['first', 'second'])
})

test('build() 返回容器且幂等；isMounted() 可查', { skip }, () => {
  const container = mkPanel('c')
  const pager = new PagePanelManage(container).addPage(mkPanel('p'), 'A')
  assert.equal(pager.isMounted(), false)
  assert.equal(pager.build(), container)
  assert.equal(pager.build(), container, '重复 build 不重复挂载')
  assert.equal(container.serialize().c.controls.length, 1)
  assert.equal(pager.isMounted(), true)
})

test('入参与面板类型校验（防止 undefined 静默进产物）', { skip }, () => {
  assert.throws(() => new PagePanelManage(undefined), /门控容器面板/)
  assert.throws(() => new PagePanelManage({}), /门控容器面板/)
  assert.throws(() => new PagePanelManage(mkPanel('c')).addPage(undefined, 'A'), /页面板/)
})

test('旧写法不受影响（自己写变量 + 绑定依旧成立，本类只是收拢样板）', { skip }, () => {
  const container = mkPanel('c')
  const legacy = mkPanel('legacy_page')
  legacy.addVariable('gtag', 'OLD')
  container.addControl(legacy)
  const obj = container.serialize().c
  assert.equal(obj.controls.length, 1)
  assert.equal(obj.controls[0].legacy_page.$gtag, 'OLD')
})
