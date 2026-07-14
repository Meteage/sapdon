# 方块系统 API 参考

---

## BlockAPI

工厂函数集合，用于创建各类方块并自动注册到游戏系统。

```typescript
import { BlockAPI, registry } from '@sapdon/core'
```

---

### createBasicBlock

创建基础六面方块。

```typescript
BlockAPI.createBasicBlock(
  identifier: string,
  category: string,
  textures_arr: string[],
  options?: BasicBlockOptions
): BasicBlock
```

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `identifier` | `string` | 方块唯一标识符，格式 `命名空间:名称` |
| `category` | `string` | 创造栏分类：`construction` / `nature` / `equipment` / `items` / `none` |
| `textures_arr` | `string[]` | 6 纹理数组，顺序 `[down, up, north, south, west, east]` |
| `options.group` | `string` | 分组，默认 `"construction"` |
| `options.hide_in_command` | `boolean` | 是否在命令中隐藏，默认 `false` |

**示例**

```typescript
const block = BlockAPI.createBasicBlock('demo:stone', 'nature', [
  'stone_down', 'stone_up', 'stone_north', 'stone_south', 'stone_west', 'stone_east'
])
```

---

### createBlock

创建含变体状态的标准方块。

```typescript
BlockAPI.createBlock(
  identifier: string,
  category: string,
  variantDatas: VariantData[],
  options?: BlockOptions
): Block
```

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `identifier` | `string` | 方块唯一标识符 |
| `category` | `string` | 创造栏分类 |
| `variantDatas` | `VariantData[]` | 变体数据数组 |
| `options.group` | `string` | 分组，默认 `"construction"` |
| `options.hide_in_command` | `boolean` | 是否在命令中隐藏，默认 `false` |
| `options.ambient_occlusion` | `boolean` | 环境光遮蔽，默认 `false` |
| `options.face_dimming` | `boolean` | 面亮度衰减，默认 `false` |
| `options.render_method` | `string` | 渲染模式：`opaque` / `blend` / `alpha_test` |

**VariantData**

```typescript
interface VariantData {
  stateTag: number       // 状态标签值 (0-15)
  textures: string[]     // 6 纹理数组
}
```

**示例**

```typescript
const block = BlockAPI.createBlock('demo:varied', 'nature', [
  { stateTag: 0, textures: ['tex_0', 'tex_0', 'tex_0', 'tex_0', 'tex_0', 'tex_0'] },
  { stateTag: 1, textures: ['tex_1', 'tex_1', 'tex_1', 'tex_1', 'tex_1', 'tex_1'] }
])
```

---

### createRotatableBlock

创建可旋转方块。

```typescript
BlockAPI.createRotatableBlock(
  identifier: string,
  category: string,
  textures_arr: string[],
  options?: RotatableBlockOptions
): RotatableBlock
```

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `identifier` | `string` | 方块唯一标识符 |
| `category` | `string` | 创造栏分类 |
| `textures_arr` | `string[]` | 6 纹理数组 |
| `options.group` | `string` | 分组，默认 `"construction"` |
| `options.hide_in_command` | `boolean` | 是否在命令中隐藏，默认 `false` |
| `options.rotationType` | `RotationTypes` | 旋转类型，默认 `RotationTypes.CARDINAL` |
| `options.yRotationOffset` | `number` | Y轴旋转偏移，默认 `180` |

**示例**

```typescript
const block = BlockAPI.createRotatableBlock('demo:facing', 'construction',
  ['top', 'bottom', 'front', 'back', 'left', 'right'],
  { rotationType: RotationTypes.FACING }
)
```

---

### createGeometryBlock

创建自定义几何模型的方块。

```typescript
BlockAPI.createGeometryBlock(
  identifier: string,
  category: string,
  geometry: string,
  material_instances: Record<string, MaterialInstance>,
  options?: GeometryBlockOptions
): GeometryBlock
```

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `identifier` | `string` | 方块唯一标识符 |
| `category` | `string` | 创造栏分类 |
| `geometry` | `string` | 几何模型标识符，如 `"geometry.chair"` |
| `material_instances` | `object` | 材质实例配置 |
| `options.group` | `string` | 分组，默认 `"construction"` |
| `options.hide_in_command` | `boolean` | 是否在命令中隐藏，默认 `false` |

**MaterialInstance**

```typescript
interface MaterialInstance {
  texture: string
  render_method?: 'opaque' | 'double_sided' | 'blend' | 'alpha_test' | 'alpha_test_single_sided'
  ambient_occlusion?: boolean | number
  face_dimming?: boolean
}
```

**示例**

```typescript
const block = BlockAPI.createGeometryBlock('demo:chair', 'construction',
  'geometry.chair',
  { '*': { texture: 'chair_tex', render_method: 'opaque' } }
)
```

---

### createCropBlock

创建作物方块。

```typescript
BlockAPI.createCropBlock(
  identifier: string,
  category: string,
  variantDatas: VariantData[],
  options?: CropBlockOptions
): CropBlock
```

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `identifier` | `string` | 方块唯一标识符 |
| `category` | `string` | 创造栏分类 |
| `variantDatas` | `VariantData[]` | 生长阶段变体数据 |
| `options.group` | `string` | 分组，默认 `"construction"` |
| `options.hide_in_command` | `boolean` | 是否在命令中隐藏，默认 `false` |
| `options.ambient_occlusion` | `boolean` | 环境光遮蔽，默认 `false` |
| `options.face_dimming` | `boolean` | 面亮度衰减，默认 `false` |
| `options.render_method` | `string` | 渲染模式，默认 `"alpha_test"` |

**自动添加的组件**
- `minecraft:collision_box` → `false`
- `minecraft:geometry` → `geometry.crop`
- `minecraft:placement_filter` → 仅允许放置在耕地上方
- 每个生长阶段自动调整选择框高度

**运行时依赖**

作物方块的生长、骨粉交互等行为需要注册框架内置的运行时组件。在 `scripts/index.ts` 中添加：

```typescript
import { registerBuiltinComponents } from '@sapdon/runtime'
registerBuiltinComponents()
```

**示例**

```typescript
import { BlockAPI, registry } from '@sapdon/core'

const crop = BlockAPI.createCropBlock('demo:tomato', 'nature', [
  { stateTag: 0, textures: ['stage_0', 'stage_0', 'stage_0', 'stage_0', 'stage_0', 'stage_0'] },
  { stateTag: 1, textures: ['stage_1', 'stage_1', 'stage_1', 'stage_1', 'stage_1', 'stage_1'] },
  { stateTag: 2, textures: ['stage_2', 'stage_2', 'stage_2', 'stage_2', 'stage_2', 'stage_2'] },
  { stateTag: 3, textures: ['stage_3', 'stage_3', 'stage_3', 'stage_3', 'stage_3', 'stage_3'] }
])

registry.submit()
```

---

### createOreBlock

创建矿物方块（自动生成方块 + 矿脉特征 + 特征规则）。

```typescript
BlockAPI.createOreBlock(
  identifier: string,
  category: string,
  textures_arr: string[],
  options?: OreBlockOptions
): OreBlock
```

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `identifier` | `string` | 方块唯一标识符 |
| `category` | `string` | 创造栏分类 |
| `textures_arr` | `string[]` | 6 纹理数组 |
| `options.group` | `string` | 分组，默认 `"construction"` |
| `options.hide_in_command` | `boolean` | 是否在命令中隐藏，默认 `false` |

**OreBlock 属性**

| 属性 | 类型 | 说明 |
|------|------|------|
| `.block` | `BasicBlock` | 矿物方块实例 |
| `.feature` | `OreFeature` | 矿脉特征实例 |
| `.feature_rules` | `FeatureRule` | 特征规则实例（Y 0-64，10 次/区块） |

**示例**

```typescript
const ore = BlockAPI.createOreBlock('demo:ruby_ore', 'nature',
  ['ruby_ore', 'ruby_ore', 'ruby_ore', 'ruby_ore', 'ruby_ore', 'ruby_ore']
)
// ore.block — 方块
// ore.feature — 矿脉特征
// ore.feature_rules — 特征规则
```

---

## BasicBlock

所有方块类型的基类。

```typescript
import { BasicBlock, BlockComponent } from '@sapdon/core'
```

### 构造函数

```typescript
new BasicBlock(
  identifier: string,
  category: string,
  textures_arr: string[],
  options?: {
    group?: string
    hide_in_command?: boolean
    format_version?: string
  }
)
```

构造函数自动调用 `BlockComponent.setMaterialInstances()` 设置 6 面纹理。

### 方法

#### `addComponent(componentMap): this`

添加组件。

```typescript
block.addComponent(BlockComponent.setDisplayName('名称'))
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `componentMap` | `Map<string, any>` | 组件 Map，使用 `BlockComponent` 静态方法生成 |

#### `removeComponent(key): this`

移除组件。

```typescript
block.removeComponent('minecraft:display_name')
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `key` | `string` | 组件名称 |

#### `addPermutation(condition, componentMap): this`

添加方块变体。

```typescript
block.addPermutation(
  "q.block_state('minecraft:cardinal_direction') == 'north'",
  BlockComponent.setTransformation([0, 0, 0], [1, 1, 1], [0, 0, 0], [0, 0, 0])
)
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `condition` | `string` | MoLang 条件表达式 |
| `componentMap` | `Map<string, any>` | 该变体下的组件集合 |

#### `registerTrait(key, value): this`

注册方块 trait。

```typescript
block.registerTrait('minecraft:placement_direction', {
  enabled_states: ['minecraft:cardinal_direction'],
  y_rotation_offset: 180
})
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `key` | `string` | Trait 名称 |
| `value` | `any` | Trait 配置 |

#### `registerState(key, value): this`

注册方块状态。

```typescript
block.registerState('sapdon:block_variant_tag', { values: { min: 0, max: 3 } })
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `key` | `string` | 状态名称 |
| `value` | `any` | 状态定义（对象或数组） |

#### `getId(): string`

返回方块标识符。

```typescript
const id = block.getId()  // "demo:stone"
```

#### `toObject(): object`

将方块转换为 JSON 格式对象（由 `@Serializer` 装饰器标记，框架自动调用）。

---

## Block

继承自 `BasicBlock`，支持变体状态。

```typescript
import { Block } from '@sapdon/core'
```

### 构造函数

```typescript
new Block(
  identifier: string,
  category: string,
  variantDatas: VariantData[],
  options?: BlockOptions
)
```

额外注册状态 `sapdon:block_variant_tag`，为每个变体创建 `material_instances` permutation。

### 方法

#### `addVariantComponent(variantIndex, componentMap): this`

为指定变体添加组件。

```typescript
block.addVariantComponent(0, BlockComponent.setLightEmission(10))
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `variantIndex` | `number` | 变体索引（从 0 开始） |
| `componentMap` | `Map` | 组件 Map |

内部自动生成条件 `q.block_state('sapdon:block_variant_tag') == {index}`。

---

## RotatableBlock

继承自 `BasicBlock`，支持方向旋转。

```typescript
import { RotatableBlock, RotationTypes } from '@sapdon/core'
```

### 构造函数

```typescript
new RotatableBlock(
  identifier: string,
  category: string,
  textures_arr: string[],
  options?: {
    group?: string
    hide_in_command?: boolean
    rotationType?: RotationTypes
    yRotationOffset?: number
  }
)
```

### RotationTypes

```typescript
enum RotationTypes {
  CARDINAL   = 'cardinal',    // 北、南、东、西 (placement_direction)
  FACING     = 'facing',      // 上、下、北、南、东、西 (placement_direction)
  BLOCK_FACE = 'block_face',  // 上、下、北、南、东、西 (placement_position)
  LOG        = 'log'          // X/Y/Z 轴对齐原木旋转 (placement_position)
}
```

| 类型 | 注册的 Trait | 状态值 | 方向数 |
|------|-------------|--------|--------|
| `CARDINAL` | `minecraft:placement_direction` | `minecraft:cardinal_direction` | 4 |
| `FACING` | `minecraft:placement_direction` | `minecraft:facing_direction` | 6 |
| `BLOCK_FACE` | `minecraft:placement_position` | `minecraft:block_face` | 6 |
| `LOG` | `minecraft:placement_position` | `minecraft:block_face` | 3 轴 |

---

## CropBlock

继承自 `Block`，用于作物/植物方块。

```typescript
import { CropBlock } from '@sapdon/core'
```

### 构造函数

```typescript
new CropBlock(
  identifier: string,
  category: string,
  variantDatas: VariantData[],
  options?: CropBlockOptions
)
```

构造函数自动添加：
- `minecraft:collision_box` → `false`
- `minecraft:geometry` → `geometry.crop`
- `minecraft:placement_filter` → 仅限耕地上方
- 每生长阶段设置自定义选择框高度

**运行时依赖：** 需调用 `registerBuiltinComponents()` 注册内置的生长脚本组件。

---

## GeometryBlock

继承自 `BasicBlock`，使用自定义几何模型。

```typescript
import { GeometryBlock } from '@sapdon/core'
```

### 构造函数

```typescript
new GeometryBlock(
  identifier: string,
  category: string,
  geometry: string,
  material_instances: Record<string, MaterialInstance>,
  options?: GeometryBlockOptions
)
```

自动添加 `minecraft:geometry` 和 `minecraft:material_instances` 组件。

---

## OreBlock

创建矿物方块及其世界生成规则。

```typescript
import { OreBlock } from '@sapdon/core'
```

### 构造函数

```typescript
new OreBlock(
  identifier: string,
  category: string,
  textures_arr: string[],
  options?: OreBlockOptions
)
```

### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `block` | `BasicBlock` | 矿方块实例 |
| `feature` | `OreFeature` | 矿脉特征 |
| `feature_rules` | `FeatureRule` | 特征规则（默认 Y 0-64，10次/区块，主世界群系） |

---

## TileBlock

方块与实体的组合，实现方块实体功能。

```typescript
import { TileBlock } from '@sapdon/core'
```

### 构造函数

```typescript
new TileBlock(
  identifier: string,
  category: string,
  textures_arr: string[],
  options?: TileBlockOptions
)
```

### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `block` | `BasicBlock` | 方块实例（带有 `sapdon:block_or_entity` 状态） |
| `entity` | `Entity` | 实体实例（含容器、无敌、不可推动等组件） |

### 方法

#### `setGeometry(geometry): void`

同时设置方块和实体的几何模型。

```typescript
tileBlock.setGeometry('geometry.chest')
```

#### `addAnimation(name, animation): void`

为客户端实体添加动画。

```typescript
tileBlock.addAnimation('open', 'animation.chest.open')
```

#### `setScript(key, value): void`

为客户端实体设置脚本属性。

```typescript
tileBlock.setScript('animate', 'open')
```

---

## BlockComponent

静态工具方法集合，用于生成组件 Map。每个方法返回 `Map<string, any>`。

```typescript
import { BlockComponent } from '@sapdon/core'
```

### setMaterialInstances

```typescript
static setMaterialInstances(instances: object): Map
```

设置材质实例。

```typescript
BlockComponent.setMaterialInstances({
  '*': { texture: 'tex', render_method: 'opaque' },
  'up': { texture: 'tex_top' }
})
```

### setGeometry

```typescript
static setGeometry(identifier: string, bone_visibility?: object): Map
```

设置几何模型。

```typescript
BlockComponent.setGeometry('geometry.cube', { bone1: true })
```

### setCollisionBoxEnabled

```typescript
static setCollisionBoxEnabled(enabled: boolean): Map
```

启用/禁用碰撞箱。

### setCollisionBoxCustom

```typescript
static setCollisionBoxCustom(origin: number[], size: number[]): Map
```

设置自定义碰撞箱。origin 范围：`(-8, 0, -8)` ~ `(8, 16, 8)`。

### setSelectionBoxEnabled

```typescript
static setSelectionBoxEnabled(enabled: boolean): Map
```

启用/禁用选择框。

### setSelectionBoxCustom

```typescript
static setSelectionBoxCustom(origin: number[], size: number[]): Map
```

设置自定义选择框。origin 范围：`(-8, 0, -8)` ~ `(8, 16, 8)`。

### setDestructibleByExplosionEnabled

```typescript
static setDestructibleByExplosionEnabled(enabled: boolean): Map
```

启用/禁用爆炸破坏。

### setDestructibleByExplosionCustom

```typescript
static setDestructibleByExplosionCustom(explosionResistance: number): Map
```

设置自定义爆炸抗性。

### setDestructibleByMiningEnabled

```typescript
static setDestructibleByMiningEnabled(enabled: boolean): Map
```

启用/禁用挖掘破坏。

### setDestructibleByMiningCustom

```typescript
static setDestructibleByMiningCustom(
  secondsToDestroy: number,
  itemSpecificSpeeds?: Array<{ item: string; destroy_speed: number }>
): Map
```

设置自定义挖掘时间及工具速度。

### setDisplayName

```typescript
static setDisplayName(displayName: string): Map
```

设置显示名称。

### setFlammableEnabled

```typescript
static setFlammableEnabled(enabled: boolean): Map
```

启用/禁用燃烧。

### setFlammableCustom

```typescript
static setFlammableCustom(catchChanceModifier: number, destroyChanceModifier: number): Map
```

设置自定义燃烧概率（≥ 0）。

### setFriction

```typescript
static setFriction(value: number): Map
```

设置摩擦力（0.0 ~ 0.9）。

### setLightDampening

```typescript
static setLightDampening(value: number): Map
```

设置遮光值（0 ~ 15）。

### setLightEmission

```typescript
static setLightEmission(value: number): Map
```

设置发光值（0 ~ 15）。

### setLoot

```typescript
static setLoot(path: string): Map
```

设置战利品表路径（最大 256 字符）。

### setMapColor

```typescript
static setMapColor(value: string | number[]): Map
```

设置地图颜色。支持十六进制字符串 `"#RRGGBB"` 或 RGB 数组 `[255, 0, 0]`。

### setTransformation

```typescript
static setTransformation(
  translation?: number[],    // 默认 [0, 0, 0]
  scale?: number[],          // 默认 [1, 1, 1]
  scale_pivot?: number[],    // 默认 [0, 0, 0]
  rotation?: number[],       // 默认 [0, 0, 0]（角度）
  rotation_pivot?: number[]  // 默认 [0, 0, 0]
): Map
```

设置方块变换（平移、缩放、旋转）。

### setPlacementFilter

```typescript
static setPlacementFilter(conditions: PlacementCondition[]): Map
```

设置放置过滤条件（1 ~ 64 条）。

```typescript
interface PlacementCondition {
  allowed_faces?: ('up' | 'down' | 'north' | 'south' | 'east' | 'west' | 'side' | 'all')[]
  block_filter?: (string | BlockDescriptor)[]
}
interface BlockDescriptor {
  name?: string
  tags?: string
  states?: object
}
```

### setRedstoneConductivity

```typescript
static setRedstoneConductivity(allowsWireToStepDown: boolean, redstoneConductor: boolean): Map
```

设置红石导电性。

### setCraftingTable

```typescript
static setCraftingTable(craftingTags: string[], tableName?: string): Map
```

设置合成台属性（最多 64 个标签）。

### setTick

```typescript
static setTick(interval_range: number[], looping: boolean): Map
```

设置 Tick 间隔。

### setCustomComponents

```typescript
static setCustomComponents(custom_components: string[]): Map
```

设置自定义组件（需要 Script API）。

### setCustomComponentV2

```typescript
static setCustomComponentV2(component_id: string, params: object): Map
```

设置自定义组件 V2（需要 Script API V2.0.0+）。

### setDestructionParticles

```typescript
static setDestructionParticles(texture: string, tint_method?: string): Map
```

设置破坏粒子纹理。

### setItemVisual

```typescript
static setItemVisual(geometry: string, materialInstances: object): Map
```

设置物品栏中的视觉属性。

### setLiquidDetection

```typescript
static setLiquidDetection(
  canContainLiquid: boolean,
  liquidType?: 'water',
  onLiquidTouches?: 'blocking' | 'broken' | 'popped' | 'no_reaction',
  stopsLiquidFlowingFromDirection?: ('up' | 'down' | 'north' | 'south' | 'east' | 'west')[]
): Map
```

设置液体检测属性。

### setBreathability

```typescript
static setBreathability(value: 'solid' | 'air'): Map
```

设置呼吸性。

### combineComponents

```typescript
static combineComponents(...componentMaps: Map[]): Map
```

合并多个组件 Map。

```typescript
BlockComponent.combineComponents(
  BlockComponent.setDisplayName('测试'),
  BlockComponent.setLightEmission(5)
)
```

### toJSON

```typescript
static toJSON(components: Map): object
```

将组件 Map 转换为普通 JSON 对象。

---

## Permutation

方块变体，由条件和组件集合组成。

```typescript
interface Permutation {
  condition: string
  components: Record<string, any>
}
```

通过 `basicBlock.addPermutation(condition, componentMap)` 创建。

**condition** — MoLang 表达式，如：

```
"q.block_state('minecraft:cardinal_direction') == 'north'"
"q.block_state('sapdon:block_variant_tag') == 0"
```

**componentMap** — `Map<string, any>`，由 `BlockComponent` 方法生成。

---

## 类型汇总

```typescript
// 方块工厂
BlockAPI.createBasicBlock(identifier, category, textures_arr, options?)
BlockAPI.createBlock(identifier, category, variantDatas, options?)
BlockAPI.createRotatableBlock(identifier, category, textures_arr, options?)
BlockAPI.createGeometryBlock(identifier, category, geometry, material_instances, options?)
BlockAPI.createCropBlock(identifier, category, variantDatas, options?)
BlockAPI.createOreBlock(identifier, category, textures_arr, options?)

// 类
class BasicBlock { ... }
class Block extends BasicBlock { ... }
class RotatableBlock extends BasicBlock { ... }
class GeometryBlock extends BasicBlock { ... }
class CropBlock extends Block { ... }
class OreBlock { block, feature, feature_rules }
class TileBlock { block, entity }

// 枚举
RotationTypes = { CARDINAL, FACING, BLOCK_FACE, LOG }

// 工具类
BlockComponent = { setMaterialInstances, setGeometry, ... }
```
