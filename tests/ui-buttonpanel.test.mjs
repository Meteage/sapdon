import { test } from 'node:test'
import assert from 'node:assert/strict'

import { SapdonButtonPanel } from '../dist/core/ui/systems/sapdon/sapdonButtonPanel.js'
import { UIElement } from '../dist/core/ui/elements/index.js'

function btn(name) {
  return new UIElement(name, 'button')
}

function placedIds(grid) {
  const ids = []
  for (const c of grid.control.controls || []) {
    ids.push(Object.keys(c)[0])
  }
  return ids.sort()
}

test('addButtons 批量顺排 + addButtonAt 显式靠后，格子序号=运行时顺序', () => {
  const bar = new SapdonButtonPanel('bar')
    .setDimensions([16, 17])
    .setCollection('form_buttons')
    .setSize(['100%', '100%'])
    .addButtons([btn('b0'), btn('b1'), btn('b2')])
    .addButtonAt([16, 15], btn('restart'))

  const ids = placedIds(bar.build())
  // 顺排占 0,1,2；显式 [16,15] → id=15*16+16=256
  assert.deepEqual(ids, ['grid_item_000', 'grid_item_001', 'grid_item_002', 'grid_item_256'])
})

test('addButtonAt 撞已占用格抛错', () => {
  const bar = new SapdonButtonPanel('bar').setDimensions([3, 2]).addButtons([btn('a'), btn('b'), btn('c')])
  assert.throws(() => bar.addButtonAt([0, 0], btn('dup')), /已被占用/)
})

test('addButtonAt 超出网格界抛错', () => {
  const bar = new SapdonButtonPanel('bar').setDimensions([3, 2])
  assert.throws(() => bar.addButtonAt([5, 5], btn('far')), /超出网格/)
})

test('addButtons 超网格界抛错', () => {
  const bar = new SapdonButtonPanel('bar').setDimensions([2, 1]) // 仅 2 格
  assert.throws(() => bar.addButtons([btn('a'), btn('b'), btn('c')]), /超出网格/)
})

test('addButtonAt 后 addButtons 从其后继续顺排', () => {
  const bar = new SapdonButtonPanel('bar')
    .setDimensions([2, 5])
    .addButtonAt([1, 2], btn('far')) // id = 2*2+1 = 5
    .addButtons([btn('a'), btn('b')]) // 从 nextIndex=6 开始 → id 6,7
  const ids = placedIds(bar.build())
  assert.deepEqual(ids, ['grid_item_005', 'grid_item_006', 'grid_item_007'])
})

test('place 保持旧行为（显式摆位，命名 grid_item_<id>）', () => {
  const bar = new SapdonButtonPanel('bar').setDimensions([2, 2])
  bar.place([1, 1], btn('legacy')) // id = 1*2+1 = 3
  const ids = placedIds(bar.build())
  assert.deepEqual(ids, ['grid_item_003'])
})