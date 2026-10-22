/**
 * 容器屏（ContainerUISystem）单测 —— 槽位编辑与代码生成
 *
 * 运行：`node tests/designer-container.test.mjs`
 *
 * 覆盖：
 *   · 槽位生成 `addSlot({ slot, pos, kind?, cellSize?, background? })`，pos 取元素 offset
 *   · 槽位不会退化成 `new ContainerSlot(...)`（它不是 UIElement）
 *   · 普通元素仍走 `addControl`
 *   · 诊断：重复槽号 / 非法槽号 / 出现在非容器屏
 *   · 产物预览：容器屏里槽位输出 `$call`，并写明不入 JSON
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createNode, emptyProject, loadProject, serializeProject } from '../tools/designer/src/model.js'
import { generate } from '../tools/designer/src/codegen.js'
import { diagnose } from '../tools/designer/src/diagnostics.js'
import { previewAll } from '../tools/designer/src/preview.js'

/** 造一个容器屏工程；slots 是 [{ slot, offset, ...props }] */
function containerDoc(slots = [], extra = []) {
  const doc = emptyProject('demo_chest', 'container')
  for (const spec of slots) {
    const node = createNode(doc, 'slot')
    // 锚点必须 top_left，否则 offset 不等于 pos（见 slot-anchor-not-top-left）
    node.props = { anchor_from: 'top_left', anchor_to: 'top_left', size: [18, 18], ...spec }
    doc.elements.push(node)
  }
  for (const node of extra) doc.elements.push(node)
  return doc
}

test('容器屏：每个槽位生成一条 addSlot，pos 取 offset', () => {
  const doc = containerDoc([
    { slot: 0, kind: 'input', offset: [8, 24] },
    { slot: 1, kind: 'output', offset: [34, 24] },
  ])
  const { code } = generate(doc)

  assert.match(code, /new ContainerUISystem\("demo_chest:demo_chest_screen", "ui\/"\)/)
  assert.match(code, /\.setPanel\(\{ size: \[320,\s*207\] \}\)/)
  assert.match(code, /\.addSlot\(\{ slot: 0, pos: \[8,\s*24\] \}\)/)
  assert.match(code, /\.addSlot\(\{ slot: 1, pos: \[34,\s*24\], kind: "output" \}\)/)
  assert.equal((code.match(/\.addSlot\(/g) || []).length, 2)
})

test('槽位不会生成 UIElement 构造器', () => {
  const doc = containerDoc([{ slot: 3, offset: [8, 24] }])
  const { code } = generate(doc)
  assert.ok(!code.includes('ContainerSlot'), '槽位不是控件类，不应出现 new ContainerSlot')
  assert.ok(code.includes('ContainerUISystem'), '容器屏应导入 ContainerUISystem')
})

test('可选字段：cellSize / background 只在显式填写时出现', () => {
  const plain = generate(containerDoc([{ slot: 0, offset: [0, 0] }])).code
  assert.ok(!plain.includes('cellSize'), '没填 cellSize 就不该写')
  assert.ok(!plain.includes('background'), '没填 texture 就不该写')

  const rich = generate(
    containerDoc([
      { slot: 0, offset: [0, 0], cellSize: [18, 18], texture: 'textures/ui/slot_enabled' },
    ]),
  ).code
  assert.match(rich, /cellSize: \[18,\s*18\]/)
  assert.match(rich, /background: "textures\/ui\/slot_enabled"/)
})

test('普通元素仍然走 addControl，且排在槽位之后', () => {
  const doc = emptyProject('demo_chest', 'container')
  const panel = createNode(doc, 'panel')
  panel.props = { size: ['100%', '100%'] }
  const slot = createNode(doc, 'slot')
  slot.props = { slot: 0, offset: [8, 24] }
  doc.elements.push(panel, slot)

  const { code } = generate(doc)
  assert.match(code, /\.addControl\(panel\)/)

  const slotAt = code.indexOf('.addSlot(')
  const controlAt = code.indexOf('.addControl(')
  assert.ok(slotAt > 0 && controlAt > slotAt, '先声明槽位，再挂自定义控件')
})

test('诊断：槽号重复报 error', () => {
  const doc = containerDoc([
    { slot: 0, offset: [8, 24] },
    { slot: 0, offset: [34, 24] },
  ])
  const { items } = diagnose(doc)
  const hit = items.find((i) => i.rule === 'slot-duplicate')
  assert.ok(hit, '应报 slot-duplicate')
  assert.equal(hit.severity, 'error')
})

test('诊断：槽号非法报 error', () => {
  const doc = containerDoc([{ slot: -1, offset: [8, 24] }])
  const { items } = diagnose(doc)
  const hit = items.find((i) => i.rule === 'slot-number-invalid')
  assert.ok(hit)
  assert.equal(hit.severity, 'error')
})

test('诊断：配了 offset 就不再提示缺位置', () => {
  const okDoc = containerDoc([{ slot: 0, offset: [8, 24] }])
  assert.ok(!diagnose(okDoc).items.some((i) => i.rule === 'slot-pos-missing'))

  const badDoc = containerDoc([{ slot: 1 }])
  assert.ok(diagnose(badDoc).items.some((i) => i.rule === 'slot-pos-missing'))
})

test('诊断：form 屏里的槽位提示只在容器屏生效', () => {
  const doc = emptyProject('sapdon_ui', 'form')
  const slot = createNode(doc, 'slot')
  slot.props = { slot: 0, offset: [8, 24] }
  doc.elements.push(slot)

  const { items } = diagnose(doc)
  const hit = items.find((i) => i.rule === 'slot-outside-container')
  assert.ok(hit)
  assert.equal(hit.severity, 'warn')
})

test('诊断：槽位锚点不是 top_left 会提示（pos 会整体偏半个面板）', () => {
  const doc = containerDoc([{ slot: 0, offset: [8, 24], anchor_from: 'center', anchor_to: 'center' }])
  const hit = diagnose(doc).items.find((i) => i.rule === 'slot-anchor-not-top-left')
  assert.ok(hit)
  assert.equal(hit.severity, 'warn')
})

test('载入带 UTF-8 BOM 的工程文件不报错', () => {
  const doc = containerDoc([{ slot: 0, offset: [8, 24] }])
  const text = '\uFEFF' + serializeProject(doc)
  const res = loadProject(text)
  assert.deepEqual(res.errors, [], 'BOM 不该让 JSON 解析失败')
  assert.equal(res.project.screenKind, 'container')
})

test('产物预览：容器屏的槽位以 $call 形式给出 addSlot 入参', () => {
  const doc = containerDoc([{ slot: 2, kind: 'display', offset: [60, 24], cellSize: [18, 18] }])
  const all = previewAll(doc)

  assert.equal(all.freeform, true)
  assert.equal(all.kind, 'container')

  const slot = all.elements.find((el) => el.type === 'slot')
  assert.ok(slot, '应列出槽位元素')
  assert.match(slot.json.$call, /^addSlot\(\{/)
  assert.match(slot.json.$call, /slot: 2/)
  assert.match(slot.json.$call, /pos: \[60,24\]/)
  assert.match(slot.json.$call, /kind: "display"/)
})
