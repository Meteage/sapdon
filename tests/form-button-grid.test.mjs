// FormButtonGrid / FormButton 的产物契约（先 `npx tsc && npx tsc-alias`，再 `node tests/form-button-grid.test.mjs`）
//
// 来历：本文件原来是 `tests/ui-buttonpanel.test.mjs`，import 的是**早已删除**的
// `dist/core/ui/systems/sapdon/sapdonButtonPanel.js`（`0682ccb`「introduce FormButton/FormButtonGrid,
// drop legacy text buttons」之后就不在 `src/` 里，见 `doc/dev/known-pitfalls.md` §7）。
// 现在的等价物是 **`FormButtonGrid`（几何 + 绑定注入）+ `FormButton`（样式）**。
//
// ⚠️ 这里断言的语义与 `tests/designer-codegen.test.mjs` 的镜像交叉验证**不重复**：
//    那条比的是「真实类 vs 编辑器镜像」（两边一起写错就查不出来），
//    这里改用**独立算出的期望值**钉住最要命的那条硬约束 ——
//    `addButton(index, btn, pos)` 的 `index` 是**运行期 form 里的槽位序号**，
//    只决定按钮绑哪一格（`grid_position`），画在哪由 `pos` 决定（`offset` 补偿）。
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { FormButtonGrid } from '../dist/core/ui/systems/sapdon/formButtonGrid.js'
import { FormButton } from '../dist/core/ui/systems/sapdon/formButton.js'
import { UIElement } from '../dist/core/ui/elements/index.js'

/** 格盘 Grid 的 JSON（`build()` 返回元素本体；`serialize()` 以元素 id 为顶层键） */
function gridJson(grid) {
    return grid.build().serialize()
}

/** 取 Grid 里每个格子的「包裹面板 id → grid_position + 其内容按钮的 JSON 片段」 */
function placed(grid) {
    const out = []
    const root = Object.values(gridJson(grid))[0] // { <grid id>: { type: 'grid', controls: [...] } }
    for (const wrapper of root.controls || []) {
        const [id, node] = Object.entries(wrapper)[0]
        const [, inner] = Object.entries(node.controls[0])[0]
        out.push({ id, gridPosition: node.grid_position, inner })
    }
    return out
}

function btn(name) {
    return new UIElement(name, 'button')
}

/** 断产物前先过一遍 JSON 往返：`bindings` 里放的是 DataBindingObject 实例，deepEqual 会按类名比 */
const jsonNormalize = (value) => JSON.parse(JSON.stringify(value))

test('格盘本体：集合名 form_buttons + grid_dimensions + size 与构造参数一致', () => {
    const json = gridJson(new FormButtonGrid('bar', { dimensions: [16, 17], size: ['100%', '100%'] }))

    assert.deepEqual(Object.keys(json), ['bar'])
    assert.equal(json.bar.type, 'grid')
    assert.equal(json.bar.collection_name, 'form_buttons')
    assert.deepEqual(json.bar.grid_dimensions, [16, 17])
    assert.deepEqual(json.bar.size, ['100%', '100%'])
})

test('★ index 是槽位序号：grid_position 走行优先基准格（col = index%cols, row = index/cols）', () => {
    const grid = new FormButtonGrid('bar', { dimensions: [16, 17], size: ['100%', '100%'] })
    grid.addButton(0, btn('s0'))
    grid.addButton(3, btn('s3'))
    grid.addButton(17, btn('s17'))

    const items = placed(grid)
    assert.deepEqual(items.map((i) => i.id), ['grid_item_000', 'grid_item_003', 'grid_item_017'])
    assert.deepEqual(items.map((i) => i.gridPosition), [[0, 0], [3, 0], [1, 1]])
})

test('★ 槽位序号 ≠ 视觉序号：pos 才是落点，offset = (pos - 基准格) × 100%', () => {
    const grid = new FormButtonGrid('bar', { dimensions: [16, 1], size: ['100%', '100%'] })
    grid.addButton(3, btn('card'), [0, 0])      // 槽 3 的卡片画在左起第 0 格
    grid.addButton(0, btn('nav'), [15, 0])      // 槽 0 的导航画在最右一格
    grid.addButton(16, btn('second_row'))       // 无 pos：原地

    const items = placed(grid)
    assert.deepEqual(items.map((i) => i.inner.offset), [['-300%', '0%'], ['1500%', '0%'], ['0%', '-100%']])
})

test('包裹面板 id 用槽位序号三位补零（grid_item_<index>）', () => {
    const grid = new FormButtonGrid('bar', { dimensions: [16, 17], size: ['100%', '100%'] })
    grid.addButton(256, btn('far'))

    assert.deepEqual(placed(grid).map((i) => i.id), ['grid_item_256'])
})

test('FormButton 进格盘 → 注入三件套绑定（collection_details / collection #form_button_text / view 门控）', () => {
    const grid = new FormButtonGrid('bar', { dimensions: [16, 1], size: ['100%', '100%'] })
    grid.addButton(0, new FormButton('nav').setBinding('prev_button'))

    const inner = placed(grid)[0].inner
    assert.equal(inner.$binding_button_text, 'prev_button', '门控键来自 FormButton.setBinding')
    assert.equal(inner.$pressed_button_name, 'button.form_button_click', '构造 FormButton 即带点击回调名')
    assert.deepEqual(jsonNormalize(inner.bindings), [
        { binding_type: 'collection_details', binding_collection_name: 'form_buttons' },
        { binding_type: 'collection', binding_collection_name: 'form_buttons', binding_name: '#form_button_text' },
        {
            binding_type: 'view',
            source_property_name: '($binding_button_text = #form_button_text)',
            target_property_name: '#visible',
        },
    ])
})

test('非 FormButton 的普通元素进格盘：照样定位，但**不**注入集合/门控绑定', () => {
    const grid = new FormButtonGrid('bar', { dimensions: [8, 1], size: ['100%', '100%'] })
    grid.addButton(7, btn('plain'))

    const inner = placed(grid)[0].inner
    assert.deepEqual(inner.offset, ['-700%', '0%'])
    assert.equal(inner.bindings, undefined, '普通 UIElement 不该被当成 FormButton 处理')
    assert.equal(inner['$pressed_button_name'], undefined)
})

test('FormButton 样式面：三态纹理按 default/hover/pressed 顺序生成，尺寸与锚点落在 layout', () => {
    const json = new FormButton('t')
        .setTexture('tex/default', 'tex/hover', 'tex/pressed')
        .setAnchor('top_left')
        .setSize(20, 18)
        .serialize()

    const node = json['t@common.button']
    assert.equal(node.type, 'button')
    assert.equal(node.anchor_from, 'top_left')
    assert.equal(node.anchor_to, 'top_left')
    assert.deepEqual(node.size, [20, 18])
    assert.deepEqual(node.controls, [
        { default: { type: 'image', texture: 'tex/default' } },
        { hover: { type: 'image', texture: 'tex/hover' } },
        { pressed: { type: 'image', texture: 'tex/pressed' } },
    ])
})

test('未进格盘的游离 FormButton：没有集合/门控绑定（绑定由 Grid 注入，不是按钮自带）', () => {
    const json = new FormButton('loose').setBinding('home_button').serialize()

    const node = json['loose@common.button']
    assert.equal(node.bindings, undefined)
    assert.equal(node.$binding_button_text, 'home_button')
    assert.equal(node.$pressed_button_name, 'button.form_button_click')
})
