import { test } from 'node:test'
import assert from 'node:assert/strict'

import { UIElement, Panel, Button, Image, Label, Grid, StackPanel, ScrollingPanel } from '../dist/core/ui/elements/index.js'
import { Control, Layout, Text, Sprite, Input } from '../dist/core/ui/properties/index.js'

// 行为锁：严格 TS 迁移前后，UI 元素序列化输出必须逐字一致。
// 关键不变量 —— 未赋值（可选）属性绝不泄漏进 JSON（for...in 只拷已被赋值字段）。

test('空 Panel 仅输出 type', () => {
  assert.deepEqual(new Panel('p').serialize(), { p: { type: 'panel' } })
})

test('Panel 设置 layout 后可并入 size，且未赋值属性不泄漏', () => {
  const out = new Panel('p').setLayout(new Layout().setSize([320, 207])).serialize()
  assert.deepEqual(out, { p: { type: 'panel', size: [320, 207] } })
  assert.equal('anchor_from' in out.p, false)
  assert.equal('anchor_to' in out.p, false)
  assert.equal('visible' in out.p, false)
})

test('Button 合并 layout 与 default_control', () => {
  const b = new Button('b')
    .setDefaultControl('default')
    .setLayout(new Layout().setSize([14, 14]).setAnchorFrom('top_right').setAnchorTo('top_right'))
  assert.deepEqual(b.serialize(), {
    b: { type: 'button', default_control: 'default', size: [14, 14], anchor_from: 'top_right', anchor_to: 'top_right' },
  })
})

test('Button setInput 合并 button_mappings', () => {
  const b = new Button('b').setInput(new Input().setButtonMappings([{ from_button_id: 'x', to_button_id: 'y', mapping_type: 'pressed' }]))
  assert.deepEqual(b.serialize(), {
    b: { type: 'button', button_mappings: [{ from_button_id: 'x', to_button_id: 'y', mapping_type: 'pressed' }] },
  })
})

test('Image 合并 sprite', () => {
  assert.deepEqual(
    new Image('img').setSprite(new Sprite().setTexture('textures/ui/White')).serialize(),
    { img: { type: 'image', texture: 'textures/ui/White' } },
  )
})

test('Label 合并 text', () => {
  assert.deepEqual(
    new Label('l').setText(new Text().setText('hello').setColor([0, 0, 0])).serialize(),
    { l: { type: 'label', text: 'hello', color: [0, 0, 0] } },
  )
})

test('Grid 默认输出 type grid', () => {
  assert.deepEqual(new Grid('g').serialize(), { g: { type: 'grid' } })
})

test('StackPanel 输出 type/orientation/size', () => {
  assert.deepEqual(new StackPanel('sp').serialize(), {
    sp: { type: 'stack_panel', orientation: 'vertical', size: ['100%', '100%'] },
  })
})

test('ScrollingPanel 默认输出 type scroll_view', () => {
  assert.deepEqual(new ScrollingPanel('sp').serialize(), { sp: { type: 'scroll_view' } })
})

test('UIElement 模板化 id 使用 name@template，type 缺省为 undefined', () => {
  const el = new UIElement('child', undefined, 'common.button')
  assert.equal(el.id, 'child@common.button')
  const out = el.serialize()
  assert.deepEqual(Object.keys(out), ['child@common.button'])
  assert.equal('type' in out['child@common.button'], true)
  assert.equal(out['child@common.button'].type, undefined)
})

test('UIElement addVariable 以 $ 前缀并入变量', () => {
  const el = new UIElement('e', undefined, 'server_form.form_button').addVariable('binding_button_text', 'prev_button')
  const out = el.serialize()
  assert.equal(out['e@server_form.form_button'].$binding_button_text, 'prev_button')
})

test('Control setter 设置可见性/层级/透明/裁剪', () => {
  const c = new Control().setVisible(false).setLayer(5).setAlpha(0.5).setClipsChildren(true)
  // 通过 Panel.control 注入并校验
  const p = new Panel('p')
  p.setControl(c)
  const out = p.serialize()
  assert.equal(out.p.visible, false)
  assert.equal(out.p.layer, 5)
  assert.equal(out.p.alpha, 0.5)
  assert.equal(out.p.clips_children, true)
})

test('Panel.addControl 以控件 id 作为子节点 key', () => {
  const p = new Panel('p').addControl(new Image('child').setSprite(new Sprite().setTexture('tex')))
  const out = p.serialize()
  // controls 数组里是 child 的序列化（id 作子节点 key）
  const controls = out.p.controls
  assert.ok(Array.isArray(controls))
  assert.ok(controls.some((ctrl) => ctrl && ctrl.child && ctrl.child.type === 'image'))
})