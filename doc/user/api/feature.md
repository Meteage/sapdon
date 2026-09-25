# 世界生成（地物）API 参考

---

## FeatureAPI

用**原版地物**（feature / feature_rules）做世界生成。注册器是构建期的副作用：调用即产出
`<proj>_BP/features/<name>.json` 与 `<proj>_BP/feature_rules/<name>.json`。

```typescript
import { FeatureAPI, CoordinateDistribution, BiomeFilter } from '@sapdon/core'
```

**命名要求**：identifier 必须是 `namespace:name`，且**冒号后的名字就是产物文件名**
（`fz:rubber_tree` → `features/rubber_tree.json`）。

⚠️ 地物必须**挂到生物群系**上才会生成（`FeatureRule.setBiomeFilter()`）；
判定与坑见 `doc/dev/known-pitfalls.md` §9。

---

### createOreFeature

```typescript
FeatureAPI.createOreFeature(
  identifier: string,
  count: number,                       // 一条矿脉放几块
  replace_rules: { places_block: string; may_replace: string[] }[]
): OreFeature
```

**示例**

```typescript
FeatureAPI.createOreFeature('fz:copper_ore_feature', 14, [
  { places_block: 'fz:copper_ore', may_replace: ['minecraft:stone'] },
])
```

---

### createTreeFeature

```typescript
FeatureAPI.createTreeFeature(
  identifier: string,
  spec: TreeFeatureSpec               // 组件表，键名与引擎逐字相同
): TreeFeature
```

`spec` = `minecraft:tree_feature` 的**组件表**（不写 `description`，它由 `identifier` 决定）：

| 键 | 说明 |
|---|---|
| `trunk` | 直立单宽树干：`{ trunk_height: { range_min, range_max }, trunk_block: { name } }` |
| `fancy_trunk` / `acacia_trunk` / `mega_trunk` / `fallen_trunk` / … | 其它树干（字段原样交给引擎） |
| `canopy` | 橡树式树冠：`{ leaf_block, canopy_offset, variation_chance, min_width, canopy_slope }` |
| `fancy_canopy` | 「层数 + 半径」的圆整树冠：`{ height, radius, leaf_block? }` |
| `random_spread_canopy` | 在「高度 × 半径」柱体内随机撒叶：`{ leaf_blocks, leaf_placement_attempts?, canopy_height?, canopy_radius? }` |
| `mega_canopy` / `roofed_canopy` / `pine_canopy` / … | 其它树冠（字段原样交给引擎） |
| `may_grow_on` / `may_grow_through` | 能长在 / 能穿过什么：方块 id 或 `{ tags: "query.any_tag('dirt')" }` |
| `may_replace` | 树叶可以替换掉什么（一般要含 `minecraft:air` 与本包树叶） |
| `base_block` / `base_cluster` / `mangrove_roots` | 树根与根部替换 |

**必须恰好一个**树干组件（`*_trunk`），**最多一个**树冠组件（`*_canopy`）。
下列情况**直接抛错**（不静默产出会被引擎丢掉的地物）：
缺树干 / 两个树干 / 两个树冠 / 组件名拼错 / `trunk_block` 不是 `{ name: "ns:block" }` /
`range_min > range_max` / `fancy_canopy.height` 非正整数 / `may_grow_on` 是空数组 / identifier 不合规。

**示例**

```typescript
FeatureAPI.createTreeFeature('fz:rubber_tree', {
  trunk: { trunk_height: { range_min: 4, range_max: 6 }, trunk_block: { name: 'fz:rubber_tree_wood' } },
  fancy_canopy: { height: 4, radius: 2, leaf_block: { name: 'fz:rubber_tree_leaves' } },
  may_grow_on: [{ tags: "query.any_tag('dirt')" }],
  may_replace: ['minecraft:air', 'fz:rubber_tree_leaves'],
})
```

也可以 `new TreeFeature(identifier, spec)` 只做题与序列化（不注册）；单测走这条路。

---

### createFeatureRules

```typescript
FeatureAPI.createFeatureRules(
  identifier: string,
  places_feature: string              // 地物的 identifier
): FeatureRule
```

链式方法：

| 方法 | 作用 |
|---|---|
| `setPlacementPass(pass)` | 生成阶段（地表地物 = `"surface_pass"`，地下 = `"underground_pass"`） |
| `setBiomeFilter(biomeFilter)` | `new BiomeFilter()`，决定挂在哪些生物群系上 |
| `setIterations(n)` | 每区块散植几次 |
| `setAxisDistribution('x'\|'y'\|'z', new CoordinateDistribution('uniform', [min, max]))` | 某个轴的分布 |
| `setAxisMolang('x'\|'y'\|'z', molang)` | 某个轴用 Molang 表达式（**地表地物的 y 必须用它**，见坑清单 §9.1） |
| `setScatterChance(numerator, denominator?)` | 每区块整体触发几率（不调用 = 引擎默认必触发） |

**示例（地表树：贴地表 + 每区块约 0.5 棵）**

```typescript
const rule = FeatureAPI.createFeatureRules('fz:rubber_tree_rule', 'fz:rubber_tree')
rule.setPlacementPass('surface_pass')
rule.setIterations(2)
rule.setAxisDistribution('x', new CoordinateDistribution('uniform', [0, 16]))
rule.setAxisMolang('y', 'query.heightmap(variable.worldx, variable.worldz)')
rule.setAxisDistribution('z', new CoordinateDistribution('uniform', [0, 16]))
rule.setScatterChance(1, 4)
rule.setBiomeFilter(new BiomeFilter().addLogicGroup('any_of', [
  { test: 'has_biome_tag', operator: '==', value: 'forest' },
  { test: 'has_biome_tag', operator: '==', value: 'jungle' },
]))
```

**示例（地下矿脉）**

```typescript
const rule = FeatureAPI.createFeatureRules('fz:copper_ore_feature_rule', 'fz:copper_ore_feature')
rule.setIterations(12)
rule.setAxisDistribution('y', new CoordinateDistribution('uniform', [8, 60]))
```
