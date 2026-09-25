/**
 * 绘制模型单测（Sapdon UI Designer）
 *
 * 运行：`node tests/designer-paint.test.mjs`（纯逻辑，零依赖）
 *
 * 这一份盯的是**从真机/原版资源反推出来的渲染规则**（都是看真产物与截图定出来的，不是猜的）：
 *   · 纹理定义侧车 `textures/ui/book_back.json {nineslice_size:14}` 自动生效
 *   · 九宫格"源带退化"时按贴边 1px 拉伸（28×28 + slice 14 ⇒ 只有四角，仍要画出木框）
 *   · 空纹理 ≠ 缺纹理（`setTexture('', hover, '')` 是手册索引卡的真实写法）
 *   · 未解析的原版模板给占位 op，不假装画出来
 * 外加：示例工程 `samples/guidebook.js` 的绘制结果自检。
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { paintNode, paintTree, ninePieces, textOps, FONT_SCALE, BASE_FONT_PX } from '../tools/designer/src/paint.js'
import { layoutTree } from '../tools/designer/src/layout.js'
import { buildTextureIndex } from '../tools/designer/src/textures.js'
import { parseGate, evaluateVisibility, pageTag } from '../tools/designer/src/gate.js'
import { loadProject, gateTags } from '../tools/designer/src/model.js'
import { SAMPLE } from '../tools/designer/samples/guidebook.js'

const RECT = { x: 0, y: 0, w: 320, h: 207 }

/** 索引：book_back 28×28 带九宫格侧车、一个缺纹理、一个 tga；其余命中 */
const index = buildTextureIndex(
  ['textures/ui/book_back', 'textures/ui/book_pageleft_default', 'textures/ui/promotion_slot', 'textures/ui/legacy'],
  ['textures/ui/legacy'],
  {
    'textures/ui/book_back': { nineslice_size: 14, base_size: [28, 28], size: [28, 28] },
    'textures/ui/promotion_slot': { nineslice_size: 1, base_size: [14, 14], size: [14, 14] },
    'textures/ui/book_pageleft_default': { size: [24, 24] },
  },
)
const ctx = { textures: index }

// ---------------------------------------------------------------------------
// 九宫格
// ---------------------------------------------------------------------------

test('ninePieces：普通切片（16×16 + slice 4）四角按源像素、边/中拉伸', () => {
  const nine = ninePieces(4, [16, 16], { x: 0, y: 0, w: 100, h: 50 })
  assert.equal(nine.pieces.length, 9)
  const corner = nine.pieces.find((p) => p.row === 0 && p.col === 0)
  assert.deepEqual(corner.src, [0, 0, 4, 4])
  assert.deepEqual(corner.dst, [0, 0, 4, 4], '四角按源像素尺寸（14 → 14，不随框缩放）')
  const middle = nine.pieces.find((p) => p.row === 1 && p.col === 1)
  assert.deepEqual(middle.src, [4, 4, 8, 8])
  assert.deepEqual(middle.dst, [4, 4, 92, 42], '中间块吃掉剩余空间')
})

test('★ ninePieces：源带退化时取贴边 1px（book_back 28×28 + slice 14 就是这么画出木框的）', () => {
  const nine = ninePieces(14, [28, 28], { x: 0, y: 0, w: 320, h: 207 })
  assert.equal(nine.pieces.length, 9)
  const middle = nine.pieces.find((p) => p.row === 1 && p.col === 1)
  assert.deepEqual(middle.src, [14, 14, 1, 1], '中间块源 = 四角拼图最靠内的那 1 个像素（落在米色内页上）')
  assert.deepEqual(middle.dst, [14, 14, 320 - 28, 207 - 28])
  const topEdge = nine.pieces.find((p) => p.row === 0 && p.col === 1)
  assert.deepEqual(topEdge.src, [14, 0, 1, 14], '上边 = 1px 宽的源列拉伸成木条')
  const leftEdge = nine.pieces.find((p) => p.row === 1 && p.col === 0)
  assert.deepEqual(leftEdge.src, [0, 14, 14, 1])
})

test('ninePieces：支持 [左,上,右,下] 数组切片（saleribbon 是 [5,5,6,8]）', () => {
  const nine = ninePieces([5, 5, 6, 8], [15, 15], { x: 0, y: 0, w: 152, h: 37 })
  assert.deepEqual(nine.slice, [5, 5, 6, 8])
  const topRight = nine.pieces.find((p) => p.row === 0 && p.col === 2)
  assert.deepEqual(topRight.src, [9, 0, 6, 5])
  assert.deepEqual(topRight.dst, [152 - 6, 0, 6, 5])
  const bottomMiddle = nine.pieces.find((p) => p.row === 2 && p.col === 1)
  assert.deepEqual(bottomMiddle.dst[3], 8, '底边保留 8px（缎带的缺口）')
})

// ---------------------------------------------------------------------------
// 纹理定义侧车 / 缺纹理 / 空纹理
// ---------------------------------------------------------------------------

test('★ 纹理定义侧车自动生效：节点不写 nineslice_size 也按九宫格画', () => {
  const ops = paintNode({ id: 'bg', type: 'image', props: { texture: 'textures/ui/book_back' } }, RECT, ctx)
  assert.equal(ops.length, 1)
  assert.equal(ops[0].kind, 'image')
  assert.equal(ops[0].nine.from, 'texture-def')
  assert.ok(ops[0].nine.pieces.pieces.length >= 4)
})

test('节点自己写的 nineslice_size 优先于侧车', () => {
  const ops = paintNode({ id: 'bg', type: 'image', props: { texture: 'textures/ui/book_back', nineslice_size: 4 } }, RECT, ctx)
  assert.equal(ops[0].nine.from, 'node')
  assert.deepEqual(ops[0].nine.slice, 4)
})

test('拿不到源像素尺寸时给 nine 但不给 pieces ⇒ 渲染端退回近似（border-image / 整图缩放）', () => {
  const noSize = buildTextureIndex(['textures/ui/some_frame'], [], { 'textures/ui/some_frame': { nineslice_size: 6 } })
  const ops = paintNode({ id: 'f', type: 'image', props: { texture: 'textures/ui/some_frame' } }, RECT, { textures: noSize })
  assert.equal(ops[0].nine.from, 'texture-def')
  assert.equal(ops[0].nine.pieces, null)
  assert.equal(ops[0].nine.size, null)
})

test('没有资源包索引时连侧车都拿不到 ⇒ 按普通图处理（不猜九宫格）', () => {
  const ops = paintNode({ id: 'bg', type: 'image', props: { texture: 'textures/ui/book_back' } }, RECT, { textures: null })
  assert.equal(ops[0].nine, undefined)
  assert.ok(ops[0].kind === 'image')
})

test('★ 空纹理不是缺纹理：`texture: ""` 直接不出图（手册索引卡的真实写法）', () => {
  assert.deepEqual(paintNode({ id: 'x', type: 'image', props: { texture: '' } }, RECT, ctx), [])
})

test('缺纹理 / .tga 各自给不同 reason 的占位', () => {
  const missing = paintNode({ id: 'a', type: 'image', props: { texture: 'textures/ui/nope' } }, RECT, ctx)
  assert.deepEqual([missing[0].kind, missing[0].reason], ['placeholder', 'missing'])
  const tga = paintNode({ id: 'b', type: 'image', props: { texture: 'textures/ui/legacy' } }, RECT, ctx)
  assert.deepEqual([tga[0].kind, tga[0].reason], ['placeholder', 'tga'])
})

test('keep_ratio:false ⇒ 拉伸；默认 contain；tiled ⇒ repeat', () => {
  const base = { id: 'i', type: 'image', props: { texture: 'textures/ui/book_pageleft_default' } }
  assert.equal(paintNode(base, RECT, ctx)[0].fit, 'contain')
  assert.equal(paintNode({ ...base, props: { ...base.props, keep_ratio: false } }, RECT, ctx)[0].fit, 'stretch')
  assert.equal(paintNode({ ...base, props: { ...base.props, tiled: true } }, RECT, ctx)[0].repeat, 'repeat')
  assert.equal(paintNode({ ...base, props: { ...base.props, tiled: 'x' } }, RECT, ctx)[0].repeat, 'repeat-x')
})

test('clip_direction + clip_ratio < 1 ⇒ 裁切指令（框架进度槽的用法）', () => {
  const ops = paintNode({ id: 'p', type: 'image', props: { texture: 'textures/ui/book_pageleft_default', clip_direction: 'left', clip_ratio: 0.4 } }, RECT, ctx)
  assert.deepEqual(ops[0].clip, { dir: 'left', ratio: 0.4 })
})

test('uv/uv_size 未模拟：给整图 + 一条提示 op', () => {
  const ops = paintNode({ id: 'i', type: 'image', props: { texture: 'textures/ui/book_pageleft_default', uv: [0, 0], uv_size: [8, 8] } }, RECT, ctx)
  assert.equal(ops.length, 2)
  assert.equal(ops[1].reason, 'uv')
})

// ---------------------------------------------------------------------------
// 按钮三态 / 文本 / 模板占位
// ---------------------------------------------------------------------------

test('form_button：三态各一层；空态跳过；state 标在 op 上', () => {
  const ops = paintNode(
    { id: 'btn', type: 'form_button', props: { texture_default: 'textures/ui/book_pageleft_default', texture_hover: 'textures/ui/promotion_slot', texture_pressed: '' } },
    RECT,
    ctx,
  )
  assert.deepEqual(ops.map((o) => o.state), ['default', 'hover'], 'pressed 是空串 ⇒ 不画')
})

test('label：字号按 font_size × font_scale_factor 放大；state=null（常显层）', () => {
  const ops = textOps({ text: '第一章', color: [0, 0, 0], font_size: 'large' }, RECT)
  assert.equal(ops[0].kind, 'text')
  assert.equal(ops[0].state, null)
  assert.equal(ops[0].fontSize, BASE_FONT_PX * FONT_SCALE.large)
  assert.ok(BASE_FONT_PX < 9, '基础字号要略小于 9，近似引擎的窄位图字体（否则本该系统放得下的一行会折行）')
  assert.deepEqual(ops[0].color, [0, 0, 0], '颜色原样带出（渲染端按 0..1 → rgba，长度 3 时 alpha=1）')
  assert.equal(ops[0].alpha, 1)
  assert.deepEqual(textOps({ text: '' }, RECT), [])
})

test('未解析的原版模板给 template 占位 op（手册的分隔线/关闭键）', () => {
  const ops = paintNode({ id: 'div', type: 'panel', template: 'settings_common.option_group_section_divider', props: {} }, RECT, ctx)
  assert.deepEqual([ops[0].kind, ops[0].template], ['template', 'settings_common.option_group_section_divider'])
})

test('paintTree：按版面顺序摊平，带 id/depth', () => {
  const doc = loadProject(SAMPLE).project
  const layout = layoutTree(doc.elements, { x: 0, y: 0, w: 320, h: 207 })
  const ops = paintTree(doc, layout, ctx)
  assert.ok(ops.length > 10)
  assert.equal(ops[0].id, 'book_background', '背景在最底层（先画）')
  assert.ok(ops.every((op) => typeof op.id === 'string' && typeof op.depth === 'number'))
  assert.ok(ops.findIndex((o) => o.id === 'book_background') < ops.findIndex((o) => o.id === 'cat_title'), '背景先于前景')
})

// ---------------------------------------------------------------------------
// 门控：手册的前缀式（$gtag）+ 页面标签
// ---------------------------------------------------------------------------

test('★ parseGate：认出手册的 `not((#form_text - $gtag) = #form_text)` 前缀式', () => {
  const gate = parseGate('(not( (#form_text - $gtag) = #form_text))')
  assert.deepEqual(gate, { kind: 'prefix', channel: '#form_text', varName: 'gtag' })
  assert.equal(parseGate('(not( (#form_text - $gtag) = #title_text))'), null, '通道不一致就不认')
})

test('★ evaluateVisibility：前缀式门控按"页面标签前缀匹配"判可见', () => {
  const node = { vars: { gtag: 'INDEX' }, bindings: [{ type: 'view', source: '(not( (#form_text - $gtag) = #form_text))', target: '#visible' }] }
  assert.equal(evaluateVisibility(node, { body: 'INDEX' }), true)
  assert.equal(evaluateVisibility(node, { body: 'IDX|p1' }), false)
  assert.equal(evaluateVisibility(node, { body: 'CAT:intro|p0' }), false)
  assert.equal(evaluateVisibility(node, { body: 'INDEX|extra' }), true, '包含前缀即命中（引擎是"减得掉"判定）')
  assert.equal(evaluateVisibility(node, {}), null, '没给模拟值 ⇒ 未知')

  const cat = { vars: { gtag: 'CAT:intro|p0' }, bindings: node.bindings }
  assert.equal(evaluateVisibility(cat, { body: 'CAT:intro|p0' }), true)
  assert.equal(evaluateVisibility(cat, { body: 'CAT:pages|p0' }), false)
})

test('pageTag：页面 tag 缺省回落到 name', () => {
  assert.equal(pageTag({ name: 'book', tag: 'INDEX' }), 'INDEX')
  assert.equal(pageTag({ name: 'book' }), 'book')
  assert.equal(pageTag(null), '')
})

test('示例工程：门控 $gtag 都在门控 tag 表里（否则那一页什么都看不到）', () => {
  const doc = loadProject(SAMPLE).project
  const tags = new Set(gateTags(doc))
  assert.ok(tags.has('INDEX'), '工程里的门控 tag（来自元素绑定/多页管理器）')
  const gtags = new Set()
  const walk = (nodes) => {
    for (const n of nodes) {
      if (n.vars && n.vars.gtag) gtags.add(n.vars.gtag)
      walk(n.controls || [])
    }
  }
  walk(doc.elements)
  for (const g of gtags) assert.ok([...tags].some((t) => t.startsWith(g)), `门控标签 ${g} 没有任何页面会 emit`)
})
