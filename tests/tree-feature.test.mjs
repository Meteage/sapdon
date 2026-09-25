// 树地物接口断言（`node tests/tree-feature.test.mjs`）
//
// 在 Node 里真跑一遍构建后的 prod core（`prod/core/index.js`），断言：
//   1. `FeatureAPI.createTreeFeature` 存在（防「rollup 9/9 成功但 prod 是旧的」）；
//   2. spec 的组件**原样**落到 `features/<name>.json` 的内容里（含 description.identifier）；
//   3. 不合法的 spec 一律**抛错**（缺树干 / 两个树冠 / 组件名拼错 / 方块引用形状不对 / 数值非法）；
//   4. `description` 不允许写进 spec（它与第一个参数重复）；
//   5. 规则的两个新旋钮（`setScatterChance` / `setAxisMolang`）真的进产物；
//   6. ★ 不调用新旋钮时，规则产物与历史行为**逐字段相同**（`scatter_chance` 不出现、y 仍是分布对象）。
//
// ⚠️ 不要用 `node --test`（受限环境 fork 会 EPERM），直接 `node tests/tree-feature.test.mjs`。
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { FeatureAPI, TreeFeature, FeatureRule, CoordinateDistribution } = await import('../prod/core/index.js')

const WOOD = 'fz:rubber_tree_wood'
const LEAVES = 'fz:rubber_tree_leaves'

/** 一份「像 FZ 橡胶树」的 spec：直树干 4-6 + 圆整树冠 */
const rubberTreeSpec = () => ({
    trunk: {
        trunk_height: { range_min: 4, range_max: 6 },
        trunk_block: { name: WOOD },
    },
    fancy_canopy: { height: 4, radius: 2, leaf_block: { name: LEAVES } },
    may_grow_on: [{ tags: "query.any_tag('dirt')" }],
    may_replace: ['minecraft:air', LEAVES],
})

test('createTreeFeature 存在且把 spec 原样写进产物', () => {
    assert.equal(typeof FeatureAPI.createTreeFeature, 'function', 'prod 里没有 createTreeFeature（prod 可能是旧的）')

    const feature = FeatureAPI.createTreeFeature('fz:rubber_tree', rubberTreeSpec())
    const json = feature.toObject()

    assert.equal(json.format_version, '1.13.0')
    const def = json['minecraft:tree_feature']
    assert.ok(def, '产物里必须以 minecraft:tree_feature 为键')
    assert.deepEqual(def.description, { identifier: 'fz:rubber_tree' })

    // 组件逐字段原样（不做任何加工/改名）
    assert.deepEqual(def.trunk, rubberTreeSpec().trunk)
    assert.deepEqual(def.fancy_canopy, rubberTreeSpec().fancy_canopy)
    assert.deepEqual(def.may_grow_on, [{ tags: "query.any_tag('dirt')" }])
    assert.deepEqual(def.may_replace, ['minecraft:air', LEAVES])

    // 顶层键集合 = description + spec 的键（不多不少）
    assert.deepEqual(Object.keys(def).sort(), ['description', 'fancy_canopy', 'may_grow_on', 'may_replace', 'trunk'])
})

test('直接 new TreeFeature（不注册）产出同一份 JSON', () => {
    const a = new TreeFeature('fz:rubber_tree', rubberTreeSpec()).toObject()
    const b = FeatureAPI.createTreeFeature('fz:rubber_tree', rubberTreeSpec()).toObject()
    assert.deepEqual(a, b)
})

test('非法 spec 一律抛错', () => {
    const cases = [
        ['缺树干', 'fz:no_trunk', { fancy_canopy: { height: 4, radius: 2 } }],
        ['两个树干', 'fz:two_trunks', { trunk: { trunk_block: { name: WOOD } }, fancy_trunk: { trunk_width: 1 } }],
        ['两个树冠', 'fz:two_canopies', { trunk: { trunk_block: { name: WOOD } }, fancy_canopy: { height: 4, radius: 2 }, canopy: { leaf_block: { name: LEAVES } } }],
        ['组件名拼错（顶层 trunk_height）', 'fz:bad_key', { trunk: { trunk_block: { name: WOOD } }, trunk_height: { base: 4 } }],
        ['组件名拼错（maygrowon）', 'fz:bad_key2', { trunk: { trunk_block: { name: WOOD } }, maygrowon: ['minecraft:dirt'] }],
        ['description 写进 spec', 'fz:with_desc', { description: { identifier: 'x:y' }, trunk: { trunk_block: { name: WOOD } } }],
        ['trunk_block 是裸字符串', 'fz:bare_ref', { trunk: { trunk_block: WOOD } }],
        ['trunk_block 缺命名空间', 'fz:no_ns', { trunk: { trunk_block: { name: 'rubber_tree_wood' } } }],
        ['range_min > range_max', 'fz:bad_range', { trunk: { trunk_block: { name: WOOD }, trunk_height: { range_min: 6, range_max: 4 } } }],
        ['fancy_canopy.height = 0', 'fz:zero_height', { trunk: { trunk_block: { name: WOOD } }, fancy_canopy: { height: 0, radius: 2 } }],
        ['canopy_offset.min > max', 'fz:bad_offset', { trunk: { trunk_block: { name: WOOD } }, canopy: { leaf_block: { name: LEAVES }, canopy_offset: { min: 1, max: -3 } } }],
        ['may_grow_on 空数组', 'fz:empty_grow_on', { trunk: { trunk_block: { name: WOOD } }, may_grow_on: [] }],
        ['identifier 不是 ns:name', 'fz_rubber_tree', { trunk: { trunk_block: { name: WOOD } } }],
    ]

    for (const [label, identifier, spec] of cases) {
        assert.throws(() => new TreeFeature(identifier, spec), /\[sapdon\] tree_feature/, `${label} 应当抛错`)
    }
})

test('树冠组件本阶段不做内容校验的类型也不炸（原样透传）', () => {
    // `roofed_canopy` / `mega_canopy` 等只校验「名字合法」，字段原样交给引擎
    const json = new TreeFeature('fz:exotic', {
        trunk: { trunk_block: { name: WOOD } },
        roofed_canopy: { canopy_height: 3, core_width: 1, inner_radius: 2, outer_radius: 3, leaf_block: { name: LEAVES } },
    }).toObject()
    assert.equal(json['minecraft:tree_feature'].roofed_canopy.canopy_height, 3)
})

test('规则：scatter_chance 与 Molang 轴进产物', () => {
    const rule = FeatureAPI.createFeatureRules('fz:rubber_tree_rule', 'fz:rubber_tree')
    rule.setIterations(2)
    rule.setAxisDistribution('x', new CoordinateDistribution('uniform', [0, 16]))
    rule.setAxisMolang('y', 'query.heightmap(variable.worldx, variable.worldz)')
    rule.setAxisDistribution('z', new CoordinateDistribution('uniform', [0, 16]))
    rule.setScatterChance(1, 4)

    const json = rule.toObject()['minecraft:feature_rules']
    assert.equal(json.description.identifier, 'fz:rubber_tree_rule')
    assert.equal(json.description.places_feature, 'fz:rubber_tree')
    assert.deepEqual(json.distribution.scatter_chance, { numerator: 1, denominator: 4 })
    assert.equal(json.distribution.y, 'query.heightmap(variable.worldx, variable.worldz)')
    assert.deepEqual(json.distribution.x, { distribution: 'uniform', extent: [0, 16] })
    assert.equal(json.distribution.iterations, 2)
})

test('规则：不调用新旋钮时产物与历史行为逐字段相同', () => {
    const plain = FeatureAPI.createFeatureRules('fz:plain_rule', 'fz:plain').toObject()['minecraft:feature_rules']

    assert.equal(Object.hasOwn(plain.distribution, 'scatter_chance'), false, '默认不该写 scatter_chance')
    assert.deepEqual(plain.distribution.y, { distribution: 'uniform', extent: [0, 16] }, '默认 y 仍必须是分布对象')
    assert.deepEqual(Object.keys(plain.distribution).sort(), ['coordinate_eval_order', 'iterations', 'x', 'y', 'z'])
    assert.deepEqual(plain.conditions, { placement_pass: 'underground_pass', 'minecraft:biome_filter': [] })
})

test('规则：新旋钮的参数非法时抛错', () => {
    const rule = new FeatureRule('fz:bad_rule', 'fz:bad')
    assert.throws(() => rule.setScatterChance(1, 0), /scatter_chance 分母/)
    assert.throws(() => rule.setScatterChance(-1, 2), /scatter_chance 分子/)
    assert.throws(() => rule.setAxisMolang('y', ''), /Molang/)
    assert.throws(() => rule.setAxisMolang('y', null), /Molang/)
})
