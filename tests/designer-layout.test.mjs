/**
 * 版面引擎单测（Sapdon UI Designer）
 *
 * 运行：`node tests/designer-layout.test.mjs`（不需要先 tsc —— 这些模块零依赖）
 * 覆盖：doc/dev/ui-designer.md §5 的锚点自检三例、流式/格位排布、form 格盘的"槽位 vs 目标格"、
 *       拖动/缩放反解（保持原单位）、命中测试。
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  ANCHOR_NAMES,
  ENGINE_DEFAULT_ANCHOR,
  anchorNorm,
  resolveLength,
  normalizeSize,
  measure,
  containerMode,
  layoutTree,
  paintOrder,
  layerOf,
  hitTest,
  offsetFromDrag,
  sizeFromPixels,
  gridDimensions,
} from '../tools/designer/src/layout.js'

// ---------------------------------------------------------------------------
// 取值解算
// ---------------------------------------------------------------------------

test('resolveLength：数字/百分比/fill/default 的语义', () => {
  assert.equal(resolveLength(24, 320), 24)
  assert.equal(resolveLength('50%', 320), 160)
  assert.equal(resolveLength('100%', 320), 320)
  assert.equal(resolveLength('fill', 320), 320)
  assert.equal(resolveLength('default', 320), null, 'default = 未声明，画布走"跨距"分支')
  assert.equal(resolveLength(undefined, 320), null)
  assert.equal(resolveLength('12.5%', 320), 40)
  assert.equal(resolveLength('abc', 320), null, '认不出来的串不猜')
})

test('normalizeSize：标量视为两轴同值', () => {
  assert.deepEqual(normalizeSize(['100%', '30%']), ['100%', '30%'])
  assert.deepEqual(normalizeSize(24), [24, 24])
  assert.deepEqual(normalizeSize(['100%']), ['100%', '100%'])
  assert.equal(normalizeSize(undefined), null)
})

test('anchorNorm：9 锚点齐全，未知名字按引擎缺省 center 处理', () => {
  assert.equal(ANCHOR_NAMES.length, 9)
  assert.deepEqual(anchorNorm('bottom_right'), [1, 1])
  assert.deepEqual(anchorNorm('center'), [0.5, 0.5])
  assert.deepEqual(anchorNorm('不存在的锚点'), [0.5, 0.5], '引擎缺省是 center（2026-09 由真机截图反证）')
})

// ---------------------------------------------------------------------------
// §5.1 锚点模型自检三例（设计文档里锁死的判据）
// ---------------------------------------------------------------------------

const frame = { x: 0, y: 0, w: 320, h: 207 }

test('锚点自检 1：size[48,24] + top_right/top_right → 盒子右上角贴父右上角', () => {
  const r = measure({ props: { size: [48, 24], anchor_from: 'top_right', anchor_to: 'top_right' } }, frame)
  assert.deepEqual(r, { x: 320 - 48, y: 0, w: 48, h: 24 })
})

test('锚点自检 2：size[48,24] + center/center → 盒子居中', () => {
  const r = measure({ props: { size: [48, 24], anchor_from: 'center', anchor_to: 'center' } }, frame)
  assert.deepEqual(r, { x: 160 - 24, y: 103.5 - 12, w: 48, h: 24 })
})

test('锚点自检 3：无 size + top_left/bottom_right → 拉伸铺满父容器', () => {
  const r = measure({ props: { anchor_from: 'top_left', anchor_to: 'bottom_right' } }, frame)
  assert.deepEqual(r, { x: 0, y: 0, w: 320, h: 207 })
})

test('★ 引擎缺省锚点 = center（不是 top_left）—— 2026-09 真机截图反证', () => {
  // 证据：SapdonGuideBook 的 cover_title 只写 anchor_to:'center'，真机里文字端正落在缎带内；
  // 若缺省是 top_left，盒子会偏移半个自身尺寸、一半跑到缎带外
  assert.equal(ENGINE_DEFAULT_ANCHOR, 'center')
  const r = measure({ props: { size: [10, 10] } }, frame)
  assert.deepEqual(r, { x: 155, y: 98.5, w: 10, h: 10 }, '未声明锚点 + 有尺寸 ⇒ 居中')
})

test('★ 未声明 size = 铺满父级（原版 book_background 就是这么撑满整本书的）', () => {
  const fill = measure({ props: {} }, frame)
  assert.deepEqual(fill, { x: 0, y: 0, w: 320, h: 207 })
  // 显式 'default' 与"不写"同义
  assert.deepEqual(measure({ props: { size: ['default', 'default'] } }, frame), fill)
  // 偏移仍然生效
  assert.deepEqual(measure({ props: { offset: [5, 6] } }, frame), { x: 5, y: 6, w: 320, h: 207 })
})

test('未声明 size + 两锚点不同 ⇒ 取跨距（跨锚点 = 区域用法）', () => {
  const half = measure({ props: { anchor_from: 'top_left', anchor_to: 'top_right' } }, frame)
  assert.deepEqual(half, { x: 0, y: 0, w: 320, h: 207 }, '左右锚点 ⇒ 横向铺满')
  const quarter = measure({ props: { anchor_from: 'top_left', anchor_to: 'center' } }, frame)
  assert.deepEqual(quarter, { x: 0, y: 0, w: 160, h: 103.5 })
})

test('offset 是像素加法；百分比 offset 相对父尺寸', () => {
  const topLeft = { size: [10, 10], anchor_from: 'top_left', anchor_to: 'top_left' }
  assert.deepEqual(measure({ props: { ...topLeft, offset: [5, 6] } }, frame), { x: 5, y: 6, w: 10, h: 10 })
  const pct = measure({ props: { ...topLeft, offset: ['50%', '0%'] } }, frame)
  assert.equal(pct.x, 160)
})

test('use_anchored_offset：offset 在对齐之后再加（不并进 base）', () => {
  const anchored = measure({ props: { size: [10, 10], anchor_from: 'center', anchor_to: 'center', use_anchored_offset: true, offset: [5, 0] } }, frame)
  assert.equal(anchored.x, 160 - 5 + 5)
  const plain = measure({ props: { size: [10, 10], anchor_from: 'center', anchor_to: 'center', offset: [5, 0] } }, frame)
  assert.equal(plain.x, 160 + 5 - 5)
})

// ---------------------------------------------------------------------------
// 容器排布
// ---------------------------------------------------------------------------

test('containerMode：四种容器各归各的模式', () => {
  assert.equal(containerMode({ type: 'panel' }), 'anchored')
  assert.equal(containerMode({ type: 'collection_panel' }), 'anchored')
  assert.equal(containerMode({ type: 'stack_panel' }), 'flow')
  assert.equal(containerMode({ type: 'grid' }), 'grid')
  assert.equal(containerMode({ type: 'form_button_grid' }), 'form-grid')
})

test('gridDimensions：grid_dimensions 与组合件 dimensions 都认，缺省 [1,1]', () => {
  assert.deepEqual(gridDimensions({ grid_dimensions: [4, 2] }), [4, 2])
  assert.deepEqual(gridDimensions({ dimensions: [3, 1] }), [3, 1])
  assert.deepEqual(gridDimensions({}), [1, 1])
  assert.deepEqual(gridDimensions({ grid_dimensions: [0, 0] }), [1, 1], '非法值兜到 1，不产生除零')
})

test('stack_panel 流式：子项沿主轴累加（30% + 70%）', () => {
  const tree = [
    {
      id: 'sp',
      type: 'stack_panel',
      props: { size: ['100%', '100%'], orientation: 'vertical' },
      controls: [
        { id: 'a', type: 'panel', props: { size: ['100%', '30%'] }, controls: [] },
        { id: 'b', type: 'panel', props: { size: ['100%', '70%'] }, controls: [] },
      ],
    },
  ]
  const { byId } = layoutTree(tree, frame)
  assert.deepEqual(byId.get('a').rect, { x: 0, y: 0, w: 320, h: 62.1 })
  assert.deepEqual(byId.get('b').rect, { x: 0, y: 62.1, w: 320, h: 144.9 })
  assert.equal(byId.get('a').placement, 'flow')
  assert.equal(byId.get('sp').container, 'flow')
})

test('stack_panel 横向：主轴换成 x', () => {
  const tree = [{ id: 'sp', type: 'stack_panel', props: { size: ['100%', '100%'], orientation: 'horizontal' }, controls: [{ id: 'a', type: 'panel', props: { size: ['50%', '100%'] }, controls: [] }, { id: 'b', type: 'panel', props: { size: ['50%', '100%'] }, controls: [] }] }]
  const { byId } = layoutTree(tree, frame)
  assert.equal(byId.get('a').rect.x, 0)
  assert.equal(byId.get('b').rect.x, 160)
})

test('流式子项的 offset 不参与排布：只记 note，不位移', () => {
  const tree = [{ id: 'sp', type: 'stack_panel', props: { size: ['100%', '100%'] }, controls: [{ id: 'a', type: 'panel', props: { size: ['100%', '30%'], offset: [40, 40] }, controls: [] }] }]
  const { byId } = layoutTree(tree, frame)
  assert.deepEqual(byId.get('a').rect, { x: 0, y: 0, w: 320, h: 62.1 })
  assert.deepEqual(byId.get('a').notes, ['flow-offset-ignored'])
})

test('流式子项缺主轴尺寸：零高度 + note（不假装知道）', () => {
  const tree = [{ id: 'sp', type: 'stack_panel', props: { size: ['100%', '100%'] }, controls: [{ id: 'a', type: 'panel', props: {}, controls: [] }] }]
  const { byId } = layoutTree(tree, frame)
  assert.equal(byId.get('a').rect.h, 0)
  assert.ok(byId.get('a').notes.includes('flow-main-size-missing'))
})

test('grid：子项按 grid_position 落格，未声明尺寸铺满格位', () => {
  const tree = [
    {
      id: 'g',
      type: 'grid',
      // 显式左上锚点：这一条测的是格位换算，不该受"缺省居中"影响
      props: { size: [200, 100], grid_dimensions: [2, 2], anchor_from: 'top_left', anchor_to: 'top_left' },
      controls: [
        { id: 'c0', type: 'panel', props: {}, gridPosition: [0, 0], controls: [] },
        { id: 'c1', type: 'panel', props: {}, gridPosition: [1, 1], controls: [] },
      ],
    },
  ]
  const { byId } = layoutTree(tree, frame)
  assert.deepEqual(byId.get('c0').rect, { x: 0, y: 0, w: 100, h: 50 })
  assert.deepEqual(byId.get('c1').rect, { x: 100, y: 50, w: 100, h: 50 })
  assert.equal(byId.get('c0').placement, 'grid-cell')
  assert.equal(byId.get('g').container, 'grid')
})

test('grid：子项带 offset 只记 note（格内 offset 无效）', () => {
  const tree = [{ id: 'g', type: 'grid', props: { size: [200, 100], grid_dimensions: [1, 1] }, controls: [{ id: 'c0', type: 'panel', props: { offset: [10, 10] }, gridPosition: [0, 0], controls: [] }] }]
  const { byId } = layoutTree(tree, frame)
  assert.deepEqual(byId.get('c0').notes, ['grid-offset-ignored'])
  assert.deepEqual(byId.get('c0').ghostOffset, [10, 10])
})

// ---------------------------------------------------------------------------
// FormButtonGrid：槽位 ≠ 视觉格（依据 more-golem 产物的 nav_grid）
// ---------------------------------------------------------------------------

test('form 格盘：基准格由 slot 决定，视觉格由 pos 决定', () => {
  const tree = [
    {
      id: 'nav_grid',
      type: 'form_button_grid',
      props: { dimensions: [3, 1], size: [300, 60], anchor_from: 'top_left', anchor_to: 'top_left' },
      controls: [
        { id: 'prev', type: 'form_button', props: { size: [24, 24], anchor: 'bottom_left' }, slot: 0, pos: [0, 0] },
        { id: 'home', type: 'form_button', props: { size: [24, 24], anchor: 'bottom_middle' }, slot: 1, pos: [1, 0] },
        { id: 'next', type: 'form_button', props: { size: [24, 24], anchor: 'bottom_right' }, slot: 2, pos: [2, 0] },
      ],
    },
  ]
  const { byId } = layoutTree(tree, frame)
  // 三个按钮各在自己的格子（slot == pos ⇒ offset 全 0%，与 more-golem 产物逐字对上）；
  // 锚点是在**自己那一格内**解算的（bottom_middle = 本格水平居中，不是整盘的中间）
  assert.equal(byId.get('prev').rect.x, 0, 'bottom_left → 本格左边缘')
  assert.equal(byId.get('home').rect.x, 138, 'bottom_middle → 本格水平居中 (100 + 50 − 12)')
  assert.equal(byId.get('next').rect.x, 276, 'bottom_right → 本格右边缘 (300 − 24)')
  for (const id of ['prev', 'home', 'next']) {
    assert.deepEqual(byId.get(id).notes, [], `${id} 的 slot 与 pos 重合，无补偿`)
    assert.equal(byId.get(id).placement, 'form-grid-cell')
    assert.equal(byId.get(id).rect.y, 60 - 24, 'anchor bottom_* 贴底')
  }
})

test('form 格盘：slot 与 pos 不同时标出"靠 offset 补偿"（槽位不是视觉序号）', () => {
  const tree = [
    {
      id: 'book_grid',
      type: 'form_button_grid',
      props: { dimensions: [3, 1], size: [300, 60], anchor_from: 'top_left', anchor_to: 'top_left' },
      controls: [{ id: 'card0', type: 'form_button', props: { size: [24, 24], anchor: 'top_left' }, slot: 3, pos: [0, 0] }],
    },
  ]
  const box = layoutTree(tree, frame).byId.get('card0')
  assert.equal(box.rect.x, 0, '视觉格 = pos = 第 0 格')
  assert.ok(box.notes.includes('form-grid-offset-compensated'))
  assert.deepEqual(box.ghostOffset, { slot: 3, baseCol: 0, baseRow: 1, col: 0, row: 0 })
})

// ---------------------------------------------------------------------------
// 命中测试 / 拖动反解
// ---------------------------------------------------------------------------

test('★ paintOrder：同级按 layer 稳定排序（layer 只改 z-order，不改版面位置）', () => {
  const tree = [
    {
      id: 'p',
      type: 'panel',
      props: { size: [100, 100], anchor_from: 'top_left', anchor_to: 'top_left' },
      controls: [
        { id: 'a', type: 'panel', props: { size: [10, 10], anchor_from: 'top_left', anchor_to: 'top_left', layer: 5 }, controls: [] },
        { id: 'b', type: 'panel', props: { size: [10, 10], anchor_from: 'top_left', anchor_to: 'top_left' }, controls: [] },
        { id: 'c', type: 'panel', props: { size: [10, 10], anchor_from: 'top_left', anchor_to: 'top_left', layer: 2 }, controls: [] },
      ],
    },
  ]
  const layout = layoutTree(tree, frame)
  assert.deepEqual(layout.list.map((b) => b.id), ['p', 'a', 'b', 'c'], '版面仍是文档序')
  assert.deepEqual(paintOrder(layout).map((b) => b.id), ['p', 'b', 'c', 'a'], '绘制：layer 小的先画（b=0, c=2, a=5）')
  // 位置不受 layer 影响
  assert.deepEqual(layout.byId.get('a').rect, layout.byId.get('b').rect)
})

test('paintOrder：stack_panel 的主轴顺序不被 layer 打乱（位置由文档序决定）', () => {
  const tree = [
    {
      id: 'sp',
      type: 'stack_panel',
      props: { size: ['100%', '100%'], anchor_from: 'top_left', anchor_to: 'top_left' },
      controls: [
        { id: 'first', type: 'panel', props: { size: ['100%', '30%'], layer: 9 }, controls: [] },
        { id: 'second', type: 'panel', props: { size: ['100%', '70%'] }, controls: [] },
      ],
    },
  ]
  const layout = layoutTree(tree, frame)
  assert.equal(layout.byId.get('first').rect.y, 0, 'first 仍在最上面（文档序决定主轴位置）')
  assert.equal(layout.byId.get('second').rect.y, 62.1)
  assert.deepEqual(paintOrder(layout).map((b) => b.id), ['sp', 'second', 'first'], '但绘制顺序按 layer：second 先画')
})

test('layerOf：非法/缺省都算 0', () => {
  assert.equal(layerOf({ props: {} }), 0)
  assert.equal(layerOf({ props: { layer: 3 } }), 3)
  assert.equal(layerOf({ props: { layer: 'x' } }), 0)
})

test('hitTest：取绘制顺序最后（最上层）的那个', () => {
  const tree = [
    {
      id: 'p',
      type: 'panel',
      props: { size: [100, 100], anchor_from: 'top_left', anchor_to: 'top_left' },
      controls: [{ id: 'c', type: 'panel', props: { size: [50, 50], anchor_from: 'top_left', anchor_to: 'top_left' }, controls: [] }],
    },
  ]
  const layout = layoutTree(tree, frame)
  assert.equal(hitTest(layout, 10, 10).id, 'c', '子项覆盖在父上')
  assert.equal(hitTest(layout, 80, 80).id, 'p')
  assert.equal(hitTest(layout, 500, 500), null)
})

test('offsetFromDrag：偏移 1:1 线性（锚点不动，位置才不漂）', () => {
  assert.deepEqual(offsetFromDrag([0, 0], 10, -5, { w: 320, h: 207 }), [10, -5])
  assert.deepEqual(offsetFromDrag([4, 4], 10, 10, { w: 320, h: 207 }), [14, 14])
  assert.deepEqual(offsetFromDrag(['0%', '0%'], 160, 0, { w: 320, h: 207 }), ['50%', '0%'], '原单位是百分比就还写百分比')
})

test('sizeFromPixels：沿用原单位（%↔px 换算）', () => {
  assert.deepEqual(sizeFromPixels([24, 24], 48, 12, { w: 320, h: 207 }), [48, 12])
  assert.deepEqual(sizeFromPixels(['50%', '30%'], 160, 62.1, { w: 320, h: 207 }), ['50%', '30%'])
  assert.deepEqual(sizeFromPixels(['100%', '50%'], 64, 103.5, { w: 320, h: 207 }), ['20%', '50%'])
})
