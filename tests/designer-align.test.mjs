/**
 * 对齐 / 分布 / 等尺寸 单测（Sapdon UI Designer）
 *
 * 运行：`node tests/designer-align.test.mjs`
 *
 * 这一层是纯几何：给一组矩形 → 每个盒子该写回什么 offset。对齐必须**可预测**，
 * 所以这里把 Qt alignment toolbar 的每种操作都钉死（含"两端不动"的分布语义）。
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { alignOps, distributeOps, sameSizeOps, canAlign, canDistribute, ALIGN_MODES } from '../tools/designer/src/align.js'

const box = (id, x, y, w, h, offset = [0, 0]) => ({ id, rect: { x, y, w, h }, offset })

test('对齐：左/右/水平居中（以整组包围盒为基准，Qt 同款）', () => {
  const boxes = [box('a', 10, 0, 20, 10), box('b', 50, 0, 30, 10), box('c', 100, 0, 10, 10)]
  // 包围盒 x: 10..110
  assert.deepEqual(alignOps(boxes, 'left').map((o) => o.offset), [[0, 0], [-40, 0], [-90, 0]])
  // 右对齐：各自右边界对齐到 110
  assert.deepEqual(alignOps(boxes, 'right').map((o) => o.offset), [[80, 0], [30, 0], [0, 0]])
  // 水平居中：**中心**对齐到 60（a 中心 20 ⇒ +40；b 中心 65 ⇒ −5；c 中心 105 ⇒ −45）
  assert.deepEqual(alignOps(boxes, 'hcenter').map((o) => o.offset), [[40, 0], [-5, 0], [-45, 0]])
})

test('对齐：顶/底/垂直居中', () => {
  const boxes = [box('a', 0, 0, 10, 10), box('b', 0, 40, 10, 20)]
  assert.deepEqual(alignOps(boxes, 'top').map((o) => o.offset), [[0, 0], [0, -40]])
  // 包围盒 y: 0..60
  assert.deepEqual(alignOps(boxes, 'bottom').map((o) => o.offset), [[0, 50], [0, 0]])
  // 垂直居中：中心对齐到 30（a 中心 5 ⇒ +25；b 中心 50 ⇒ −20）
  assert.deepEqual(alignOps(boxes, 'vcenter').map((o) => o.offset), [[0, 25], [0, -20]])
})

test('对齐：叠在已有 offset 上（不覆盖原来的位移）', () => {
  const boxes = [box('a', 10, 0, 10, 10, [4, 6]), box('b', 30, 0, 10, 10, [-2, 1])]
  const ops = alignOps(boxes, 'left')
  assert.deepEqual(ops[0].offset, [4, 6], '本来就在最左 ⇒ 只加 0')
  assert.deepEqual(ops[1].offset, [-22, 1], '-2 + (-20)')
})

test('对齐：少于 2 个不出操作（Qt 里按钮是灰的）', () => {
  assert.deepEqual(alignOps([box('a', 0, 0, 1, 1)], 'left'), [])
  assert.equal(canAlign([box('a', 0, 0, 1, 1)]), false)
  assert.equal(canAlign([box('a', 0, 0, 1, 1), box('b', 9, 0, 1, 1)]), true)
})

test('分布：两端不动、中间等间距（水平）', () => {
  // 三个 10 宽的盒子：0-10 / 50-60 / 200-210 ⇒ 中间那个挪到 100
  const boxes = [box('a', 0, 0, 10, 5), box('b', 50, 0, 10, 5), box('c', 200, 0, 10, 5)]
  const ops = distributeOps(boxes, 'h')
  const byId = Object.fromEntries(ops.map((o) => [o.id, o.offset[0]]))
  assert.equal(byId.a, 0, '第一个不动')
  assert.equal(byId.c, 0, '最后一个不动')
  assert.equal(byId.b, 50, '中间挪到等间距位置（可用 200 − 30 = 170，两段各 85 ⇒ 100）')
  // 本来就等间距 ⇒ 谁都不动
  const even = distributeOps([box('a', 0, 0, 10, 5), box('b', 100, 0, 10, 5), box('c', 200, 0, 10, 5)], 'h')
  assert.deepEqual(even.map((o) => o.offset), [[0, 0], [0, 0], [0, 0]])
})

test('分布：顺序无关（按坐标排序），垂直同理', () => {
  const boxes = [box('c', 0, 200, 5, 10), box('a', 0, 0, 5, 10), box('b', 0, 50, 5, 10)]
  const ops = distributeOps(boxes, 'v')
  const byId = Object.fromEntries(ops.map((o) => [o.id, o.offset[1]]))
  assert.equal(byId.a, 0)
  assert.equal(byId.c, 0)
  assert.equal(byId.b, 50)
  assert.deepEqual(distributeOps([box('a', 0, 0, 1, 1), box('b', 5, 0, 1, 1)], 'h'), [], '两个不构成分布')
  assert.equal(canDistribute([box('a', 0, 0, 1, 1), box('b', 5, 0, 1, 1), box('c', 9, 0, 1, 1)]), true)
})

test('等尺寸：以主选（第一个）为基准', () => {
  const boxes = [box('a', 0, 0, 40, 20), box('b', 50, 0, 10, 30)]
  assert.deepEqual(sameSizeOps(boxes, 'both'), [{ id: 'b', size: [40, 20] }])
  assert.deepEqual(sameSizeOps(boxes, 'h'), [{ id: 'b', size: [40, 30] }], '只等高')
  assert.deepEqual(sameSizeOps(boxes, 'v'), [{ id: 'b', size: [10, 20] }], '只等宽')
})

test('每条模式都有中文标签（菜单/按钮直接用）', () => {
  for (const key of ['left', 'hcenter', 'right', 'top', 'vcenter', 'bottom']) {
    assert.equal(typeof ALIGN_MODES[key], 'string')
    assert.ok(ALIGN_MODES[key].length > 0)
  }
})
