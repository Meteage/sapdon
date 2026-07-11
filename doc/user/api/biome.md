# 生物群系与特征系统 API 参考

---

## BiomeAPI

工厂函数，用于创建生物群系并自动注册到游戏系统。

```typescript
import { BiomeAPI, registry } from '@sapdon/core'
```

---

### createBiome

创建生物群系实例。

```typescript
BiomeAPI.createBiome(identifier: string): Biome
```

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `identifier` | `string` | 生物群系唯一标识符，格式 `命名空间:名称` |

**示例**

```typescript
const biome = BiomeAPI.createBiome('sapdon:mystic_forest')
registry.submit()
```

返回的 `Biome` 实例通过 `.addComponent()` 链式添加组件。

---

## Biome

生物群系类，通过 `addComponent()` 添加组件后提交。

```typescript
import { Biome, BiomeComponent } from '@sapdon/core'
```

### addComponent

```typescript
biome.addComponent(componentMap: Map): this
```

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `componentMap` | `Map<string, any>` | 由 `BiomeComponent` 静态方法生成的组件 Map |

**示例**

```typescript
const biome = BiomeAPI.createBiome('sapdon:mystic_forest')

biome.addComponent(
  BiomeComponent.setClimate(0.5, 0.1, 0.8)
)
biome.addComponent(
  BiomeComponent.setOverworldHeight([0.1, 0.2])
)

registry.submit()
```

### 合并多个组件

```typescript
biome.addComponent(
  BiomeComponent.combineComponents(
    BiomeComponent.setClimate(0.5, 0.3, 0.7),
    BiomeComponent.setOverworldHeight([0.1, 0.2])
  )
)
```

---

## BiomeComponent

静态工具方法集合，用于生成生物群系组件 Map。每个方法返回 `Map<string, any>`。

```typescript
import { BiomeComponent } from '@sapdon/core'
```

### setClimate

设置生物群系的气候参数。

```typescript
static setClimate(
  downfall: number,
  snow_accumulation: number,
  temperature: number
): Map
```

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `downfall` | `number` | 降水量，范围通常 0 ~ 1 |
| `snow_accumulation` | `number` | 积雪量，范围通常 0 ~ 1 |
| `temperature` | `number` | 温度，范围通常 0 ~ 1 |

**示例**

```typescript
BiomeComponent.setClimate(0.4, 0.0, 0.9)  // 温暖干燥
BiomeComponent.setClimate(0.9, 0.5, 0.0)  // 寒冷多雪
```

### setOverworldHeight

设置生物群系的世界高度参数，控制地形生成。

```typescript
static setOverworldHeight(noise_params: object): Map
```

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `noise_params` | `Array<number>` | 噪声参数，如 `[0.1, 0.2]` |

**示例**

```typescript
// 平坦地形
BiomeComponent.setOverworldHeight([0.05, 0.05])

// 起伏山地
BiomeComponent.setOverworldHeight([0.2, 0.4])
```

### setSurfaceParameters

设置生物群系的表面方块参数。

```typescript
static setSurfaceParameters(params: {
  sea_floor_depth: number
  sea_floor_material: string
  foundation_material: string
  mid_material: string
  top_material: string
  sea_material: string
}): Map
```

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `sea_floor_depth` | `number` | 海底深度 |
| `sea_floor_material` | `string` | 海底材料，如 `"minecraft:sand"` |
| `foundation_material` | `string` | 基础材料，如 `"minecraft:stone"` |
| `mid_material` | `string` | 中间层材料，如 `"minecraft:dirt"` |
| `top_material` | `string` | 顶层材料，如 `"minecraft:grass_block"` |
| `sea_material` | `string` | 海洋材料，如 `"minecraft:water"` |

**示例**

```typescript
BiomeComponent.setSurfaceParameters({
  sea_floor_depth: 7,
  sea_floor_material: 'minecraft:gravel',
  foundation_material: 'minecraft:stone',
  mid_material: 'minecraft:dirt',
  top_material: 'minecraft:grass_block',
  sea_material: 'minecraft:water'
})
```

### setOverworldGenerationRules

设置生物群系在主世界生成时的气候权重。

```typescript
static setOverworldGenerationRules(
  medium_weight: number,
  warm_weight: number,
  cold_weight: number
): Map
```

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `medium_weight` | `number` | 中等气候权重 |
| `warm_weight` | `number` | 温暖气候权重 |
| `cold_weight` | `number` | 寒冷气候权重 |

**示例**

```typescript
// 仅生成于温暖气候
BiomeComponent.setOverworldGenerationRules(0, 100, 0)

// 均匀分布于所有气候
BiomeComponent.setOverworldGenerationRules(100, 100, 100)
```

### combineComponents

合并多个组件 Map。

```typescript
static combineComponents(...componentMaps: Map[]): Map
```

**示例**

```typescript
BiomeComponent.combineComponents(
  BiomeComponent.setClimate(0.5, 0.3, 0.7),
  BiomeComponent.setOverworldHeight([0.1, 0.2]),
  BiomeComponent.setSurfaceParameters({
    sea_floor_depth: 7,
    sea_floor_material: 'minecraft:sand',
    foundation_material: 'minecraft:stone',
    mid_material: 'minecraft:dirt',
    top_material: 'minecraft:grass_block',
    sea_material: 'minecraft:water'
  })
)
```

### 完整示例

```typescript
import { BiomeAPI, registry, BiomeComponent } from '@sapdon/core'

const biome = BiomeAPI.createBiome('sapdon:crystal_plains')

biome.addComponent(
  BiomeComponent.combineComponents(
    BiomeComponent.setClimate(0.3, 0.0, 0.6),
    BiomeComponent.setOverworldHeight([0.05, 0.1]),
    BiomeComponent.setSurfaceParameters({
      sea_floor_depth: 5,
      sea_floor_material: 'minecraft:sand',
      foundation_material: 'minecraft:stone',
      mid_material: 'minecraft:dirt',
      top_material: 'minecraft:grass_block',
      sea_material: 'minecraft:water'
    }),
    BiomeComponent.setOverworldGenerationRules(50, 100, 30)
  )
)

registry.submit()
```

---

## FeatureAPI

工厂函数，用于创建特征（如矿脉）和特征规则。

```typescript
import { FeatureAPI, registry } from '@sapdon/core'
```

---

### createOreFeature

创建矿脉特征。

```typescript
FeatureAPI.createOreFeature(
  identifier: string,
  count: number,
  replace_rules: any[]
): OreFeature
```

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `identifier` | `string` | 特征唯一标识符 |
| `count` | `number` | 每区块矿石团块数量 |
| `replace_rules` | `object[]` | 替换规则数组 |

**示例**

```typescript
FeatureAPI.createOreFeature(
  'sapdon:ruby_ore_feature',
  8,
  [
    {
      places_block: 'sapdon:ruby_ore',
      may_replace: [{ name: 'minecraft:stone' }]
    }
  ]
)

registry.submit()
```

### createFeatureRules

创建特征规则，控制特征如何在世界中生成。

```typescript
FeatureAPI.createFeatureRules(
  identifier: string,
  places_feature: string
): FeatureRule
```

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `identifier` | `string` | 特征规则唯一标识符 |
| `places_feature` | `string` | 要放置的特征标识符 |

**示例**

```typescript
const rule = FeatureAPI.createFeatureRules(
  'sapdon:ruby_ore_rule',
  'sapdon:ruby_ore_feature'
)

rule.setPlacementPass('underground_pass')
rule.setIterations(10)

registry.submit()
```

---

## FeatureRule

特征规则类，控制特征的生成条件和分布方式。

```typescript
import { FeatureRule, BiomeFilter, CoordinateDistribution } from '@sapdon/core'
```

### setPlacementPass

设置生成阶段。

```typescript
featureRule.setPlacementPass(pass: string): void
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `pass` | `string` | 生成阶段标识符，如 `"underground_pass"`、`"surface_pass"` |

### setBiomeFilter

设置生物群系过滤条件。

```typescript
featureRule.setBiomeFilter(biomeFilter: BiomeFilter): void
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `biomeFilter` | `BiomeFilter` | 生物群系过滤条件实例 |

### setIterations

设置每区块放置尝试次数。

```typescript
featureRule.setIterations(iterations: number): void
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `iterations` | `number` | 放置尝试次数 |

### setAxisDistribution

设置指定坐标轴的分布规则。

```typescript
featureRule.setAxisDistribution(
  axis: 'x' | 'y' | 'z',
  config: CoordinateDistribution
): void
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `axis` | `string` | 坐标轴 `"x"` / `"y"` / `"z"` |
| `config` | `CoordinateDistribution` | 分布配置 |

### 完整示例

```typescript
import { FeatureAPI, registry, BiomeFilter, CoordinateDistribution } from '@sapdon/core'

// 1. 创建矿脉特征
FeatureAPI.createOreFeature(
  'sapdon:ruby_ore_feature',
  10,
  [
    {
      places_block: 'sapdon:ruby_ore',
      may_replace: [{ name: 'minecraft:stone' }]
    }
  ]
)

// 2. 创建特征规则
const rule = FeatureAPI.createFeatureRules(
  'sapdon:ruby_ore_rule',
  'sapdon:ruby_ore_feature'
)

// 3. 配置生成条件
rule.setPlacementPass('underground_pass')

// 4. 设置生物群系过滤 — 仅主世界群系
const biomeFilter = new BiomeFilter()
biomeFilter.addSimpleCondition('has_biome_tag', '==', 'overworld')
rule.setBiomeFilter(biomeFilter)

// 5. 设置放置尝试次数
rule.setIterations(10)

// 6. 设置 Y 轴分布范围 (5 ~ 40 层)
rule.setAxisDistribution('y', new CoordinateDistribution('uniform', [5, 40]))
// X/Z 轴默认范围为 [0, 16]（单个区块范围）
rule.setAxisDistribution('x', new CoordinateDistribution('uniform', [0, 16]))
rule.setAxisDistribution('z', new CoordinateDistribution('uniform', [0, 16]))

registry.submit()
```

---

## BiomeFilter

生物群系过滤条件类，用于指定特征在哪些群系中生成。

```typescript
import { BiomeFilter } from '@sapdon/core'
```

### 方法

| 方法 | 返回 | 说明 |
|------|------|------|
| `addSimpleCondition(test, operator, value)` | `this` | 添加简单条件 |
| `addLogicGroup(logicType, conditions)` | `this` | 添加逻辑组（`any_of` / `all_of`） |

**示例**

```typescript
const filter = new BiomeFilter()

// 仅主世界群系
filter.addSimpleCondition('has_biome_tag', '==', 'overworld')

// 排除特定群系
filter.addLogicGroup('any_of', [
  { test: 'has_biome_tag', operator: '!=', value: 'ocean' },
  { test: 'has_biome_tag', operator: '!=', value: 'river' }
])
```

---

## CoordinateDistribution

坐标轴分布规则类，控制特征在 X / Y / Z 轴上的分布范围。

```typescript
import { CoordinateDistribution } from '@sapdon/core'
```

### 构造函数

```typescript
new CoordinateDistribution(
  distribution: 'uniform' | 'triangle' = 'uniform',
  extent: [number, number] = [0, 16]
)
```

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `distribution` | `string` | 分布类型：`"uniform"`（均匀）、`"triangle"`（三角） |
| `extent` | `[number, number]` | 范围，如 `[0, 16]`、`[5, 40]` |

**示例**

```typescript
// Y 轴 5-40 层均匀分布
new CoordinateDistribution('uniform', [5, 40])

// X 轴整区块均匀分布
new CoordinateDistribution('uniform', [0, 16])

// Y 轴三角分布（中间值附近概率更高）
new CoordinateDistribution('triangle', [0, 64])
```

---

## 类型汇总

```typescript
// 生物群系
BiomeAPI.createBiome(identifier): Biome

class Biome
  addComponent(componentMap): this

class BiomeComponent
  static setClimate(downfall, snow, temp): Map
  static setOverworldHeight(noise_params): Map
  static setSurfaceParameters(params): Map
  static setOverworldGenerationRules(medium, warm, cold): Map
  static combineComponents(...maps): Map

// 特征
FeatureAPI.createOreFeature(id, count, replace_rules): OreFeature
FeatureAPI.createFeatureRules(id, places_feature): FeatureRule

class FeatureRule
  setPlacementPass(pass): void
  setBiomeFilter(filter): void
  setIterations(count): void
  setAxisDistribution(axis, config): void

class BiomeFilter
  addSimpleCondition(test, operator, value): this
  addLogicGroup(type, conditions): this

class CoordinateDistribution
  constructor(distribution, extent)
```
