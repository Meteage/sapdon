// P0-1 验证：物品 format_version 默认值（`node tests/item-format-version.test.mjs`，需先 tsc）
//
// ⚠️ 不复用 `tests/item.test.mjs`：那个文件的 import 链会撞上**既有的**错误导入
//    （`entityComponet.js` 把 type-only 的 `RideableComponentDesc` 当值 import，
//     `doc/dev/known-pitfalls.md` §7 已记档），整个文件 import 阶段就失败。
//    这里只 import 必要的模块，绕开那条链。
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { Item } = await import('../dist/core/item/item.js')
const { ItemCategory } = await import('../dist/core/item/types.js')
const { ItemCatalog } = await import('../dist/core/item/itemCatalog.js')

test('物品 format_version 默认值是 1.21.90（1.21.40 会让自定义 catalog 组名每物品报一条 warning）', () => {
    const item = new Item('test:item', ItemCategory.Items, 'tex')
    assert.equal(item.format_version, '1.21.90')
    assert.equal(item.toObject().format_version, '1.21.90')
})

test('仍可按物品覆盖：format_version / formatVersion 两个键名都认，后者优先', () => {
    const snake = new Item('a:a', ItemCategory.Items, 'tex', { format_version: '1.20.0' })
    assert.equal(snake.format_version, '1.20.0')

    const camel = new Item('b:b', ItemCategory.Items, 'tex', { formatVersion: '1.20.1' })
    assert.equal(camel.format_version, '1.20.1')

    const both = new Item('c:c', ItemCategory.Items, 'tex', { format_version: '1.20.0', formatVersion: '1.21.99' })
    assert.equal(both.format_version, '1.21.99')
    assert.equal(both.toObject().format_version, '1.21.99')
})

test('ItemCatalog 自己的 format_version 不受影响（仍是 catalog 文件的格式版本 1.26.30）', () => {
    const catalog = new ItemCatalog()
    assert.equal(catalog.format_version, '1.26.30')
    assert.equal(new ItemCatalog('1.21.90').format_version, '1.21.90')
})
