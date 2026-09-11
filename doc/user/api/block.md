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
| `options.yRotationOffset` | `number` | Y轴旋转偏移，默认 `0` |

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
  tint_method?: string       // 生物群系染色方法，如 "grass"
  alpha_masked_tint?: boolean // 是否基于 alpha 通道应用染色
  isotropic?: boolean         // 是否随机旋转 UV
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

### createTileBlock

创建**带实体的方块**（方块 + 承载它的实体），用于**可动模型 / 容器类方块**：外观是一个方块，行为由一个配套实体承担（箱子、机器外壳这类"看起来是方块、实际靠实体驱动"的东西）。

```typescript
BlockAPI.createTileBlock(
  identifier: string,
  category: string,
  textures_arr: string[],
  options?: Object
): TileBlock
```

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `identifier` | `string` | 方块唯一标识符，格式 `命名空间:名称` |
| `category` | `string` | 创造栏分类 |
| `textures_arr` | `string[]` | 6 纹理数组，顺序 `[down, up, north, south, west, east]` |
| `options` | `object` | 透传给内部 `BasicBlock`（如 `group` / `hide_in_command`），另加下面三个**实体容器**参数 |
| `options.inventory_size` | `number` | **实体容器**槽位数（正整数），默认 `27` |
| `options.container_type` | `string` | 容器音效/行为类型，默认 `"minecart_chest"`。官方文档列出的取值：`horse` / `minecart_chest` / `chest_boat` / `minecart_hopper` / `inventory` / `container` / `hopper` |
| `options.can_be_siphoned_from` | `boolean` | 能否用漏斗抽取，默认 `true` |

缺 `identifier` / `category` / `textures_arr` 任一项时抛错；`inventory_size` 非正整数、`container_type` 非空字符串、
`can_be_siphoned_from` 非布尔时抛错。

> ★ **这是当前引擎版本下唯一可用的方块容器路线**：容器挂在**实体**上（实体组件 `minecraft:inventory`）。
> 不传那三个参数时产物与历史版本**逐字节一致**（默认 27 槽 / `minecart_chest` / 可抽取），
> 且每次都按**实例**拷贝，改一个方块不会污染另一个。
> `inventory_size` 的**上限**官方文档**没给**（实体组件那页只写 "Number of slots the container has"）——
> **不要**套用方块路线的 `[1,54]`；本环境只校验正整数，**上限「未验证」**。
> 依据：[Microsoft Learn · Entity Documentation - minecraft:inventory](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/entityreference/examples/entitycomponents/minecraftcomponent_inventory)。

**它会注册三份数据**

| # | 内容 | 包（root） | 路径 |
|---|---|---|---|
| 1 | 方块本体 | `behavior` | `blocks/` |
| 2 | 方块实体**行为** | `behavior` | `entities/`（容器就写在这里的实体组件里） |
| 3 | 方块实体**资源** | `resource` | `entity/` |

> ⚠️ `blocks.json`（RP 根目录）**自 2026-09 起不再被写入任何方块条目**（只留 `format_version`）。
> 曾经写进去的 `textures` 会让引擎对**每个自定义方块**报
> `trying to override the Geometry component with blocks.json settings for a custom block`。
> 官方文档把 `blocks.json` 定位成 "just a sound configuration system"：
> [Microsoft Learn · blocks.json File Reference](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/blocksjsonfilestructure)。
> 自定义方块的贴图由 `minecraft:material_instances` + `terrain_texture.json` 提供。

**实体 identifier 自动为 `${identifier}_entity`**

例如 `demo:machine` → 实体 `demo:machine_entity`，不需要自己起名。

**返回值 `TileBlock`**

| 属性 | 类型 | 说明 |
|------|------|------|
| `.block` | `BasicBlock` | 方块本体（已带 `sapdon:block_or_entity` 状态与 `sapdon:block_with_entity` 自定义组件） |
| `.entity` | `Entity` | 实体（含容器、`minecraft:block_sensor`、无敌 / 不可推动等组件） |

> ⚠️ **`TileBlock` 本身只是包装器**：它只有 `{ block, entity }`，**没有** `identifier` / `textures`，
> 也没有继承 `BasicBlock`。所以**不能**把它拿去调 `createBasicBlock` 那一套（`addComponent` / `addPermutation` /
> `registerState` / `registerTrait` 都不在它身上）——需要这些能力时改调 `.block`（行为侧改 `.entity.behavior`，
> 外观侧改 `.entity.resource`）。
> 这也正是 `createTileBlock` 在 `blockFactory.js` 里必须被特殊处理的原因：它注册的是内部的 `block` 与 `entity`
> 这两个对象，而不是 `TileBlock` 自己。

**示例**

```typescript
import { BlockAPI, BlockComponent, registry } from '@sapdon/core'

const machine = BlockAPI.createTileBlock('demo:machine', 'construction', [
  'machine_down', 'machine_up', 'machine_north', 'machine_south', 'machine_west', 'machine_east'
])

// 同时设置方块模型与实体模型（TileBlock 自带的便捷方法）
machine.setGeometry('geometry.machine')

// 继续配方块本体时必须走 .block
machine.block.addComponent(BlockComponent.setLightEmission(5))

registry.submit()
```

**容器类方块用哪条路？**

| 路线 | 写法 | 引擎现状 |
|---|---|---|
| ★ **实体（唯一可用）** | `BlockAPI.createTileBlock(id, cat, textures, { inventory_size, container_type, can_be_siphoned_from })`；等价地：`tile.entity.behavior.addComponent(EntityComponent.setInventoryProperties({...}))` | **可用**（实体组件 `minecraft:inventory`） |
| 方块·规范 | `BlockComponent.setBlockEntity(true, { container: { slot_count } })` → `minecraft:block_entity.container` | **当前引擎版本拒绝**：`-> minecraft:block_entity -> container: … is not present in the Schema`（1.26.30 / 1.26.40 实测同样报错） |
| 方块·历史 | `BlockComponent.setInventory({...})` → 方块 `components` 里的 `minecraft:inventory` | **必然被拒**（那是**实体**组件）：`-> components -> minecraft:inventory: … not present in the Schema`。该 API **已废弃**（产物不变 + 构建期 warn） |

```typescript
// 推荐：容器挂实体，槽位数按需给（官方文档对实体容器**没有**上限约束）
const machine = BlockAPI.createTileBlock('demo:machine', 'construction', textures, {
  inventory_size: 56,
  container_type: 'minecart_chest',
  can_be_siphoned_from: true,
})
```

> ⚠️ **游戏内行为「未验证」**（本环境无法启动 Minecraft）。真机请确认：右键能打开容器、能存取、
> 漏斗抽取行为符合预期，以及大槽位（如 56）是否被引擎接受。

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
// ore (OreBlock extends BasicBlock) — 方块本身
// ore.feature — 矿脉特征
// ore.feature_rules — 特征规则
```

---

---

### createGlassBlock

创建透明玻璃方块。

```typescript
BlockAPI.createGlassBlock(
  identifier: string,
  category: string,
  texture: string,
  options?: GlassBlockOptions
): GlassBlock
```

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `identifier` | `string` | 方块唯一标识符 |
| `category` | `string` | 创造栏分类 |
| `texture` | `string` | 纹理短名（6 面复用） |
| `options.group` | `string` | 分组，默认 `"construction"` |
| `options.hide_in_command` | `boolean` | 是否在命令中隐藏，默认 `false` |
| `options.geometry` | `string` | 自定义几何模型标识符，如 `"geometry.custom_glass"` |
| `options.culling` | `string` | 裁剪规则标识符，如 `"wiki:culling.custom_glass"` |

**自动添加的组件**
- `minecraft:material_instances` → 6 面材质实例，`render_method: "blend"`
- `minecraft:light_dampening` → `0`
- `minecraft:destructible_by_mining` → `{ seconds_to_destroy: 0.3 }`
- `minecraft:destructible_by_explosion` → `{ explosion_resistance: 0.3 }`
- 可选 `minecraft:geometry`（设 `geometry` 参数时自动添加）

**示例**

```typescript
const glass = BlockAPI.createGlassBlock('wiki:glass', 'construction', 'glass_tex')
```

---

### createFenceBlock

创建栅栏方块。

```typescript
BlockAPI.createFenceBlock(
  identifier: string,
  category: string,
  textures_arr: string[],
  options?: FenceBlockOptions
): FenceBlock
```

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `identifier` | `string` | 方块唯一标识符 |
| `category` | `string` | 创造栏分类 |
| `textures_arr` | `string[]` | 6 纹理数组 |
| `options.group` | `string` | 分组，默认 `"construction"` |
| `options.hide_in_command` | `boolean` | 是否在命令中隐藏，默认 `false` |
| `options.leashable` | `boolean` | 是否可被拴绳拴住，默认 `false` |

**自动添加的组件**
- `minecraft:collision_box` → 自定义栅栏柱碰撞箱
- `minecraft:selection_box` → 同上
- `minecraft:support` → `{ shape: "fence" }`
- `minecraft:connection_rule` → 接受所有方向连接
- 可选 `minecraft:leashable`（设 `leashable` 参数时自动添加）

**示例**

```typescript
const fence = BlockAPI.createFenceBlock('wiki:fence', 'construction',
  ['fence_tex', 'fence_tex', 'fence_tex', 'fence_tex', 'fence_tex', 'fence_tex']
)
```

---

### createStairBlock

创建楼梯方块（8 个 permutation：4 方向 × 2 上下）。

```typescript
BlockAPI.createStairBlock(
  identifier: string,
  category: string,
  textures_arr: string[],
  options?: StairBlockOptions
): StairBlock
```

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `identifier` | `string` | 方块唯一标识符 |
| `category` | `string` | 创造栏分类 |
| `textures_arr` | `string[]` | 6 纹理数组 |
| `options.group` | `string` | 分组，默认 `"construction"` |
| `options.hide_in_command` | `boolean` | 是否在命令中隐藏，默认 `false` |

**自动添加的组件**
- `minecraft:destructible_by_mining` / `minecraft:destructible_by_explosion`
- `minecraft:support` → `{ shape: "stair" }`

**自动注册的 Traits**
- `minecraft:placement_direction` → 控制 `minecraft:cardinal_direction` 状态
- `minecraft:placement_position` → 控制 `minecraft:vertical_half` 状态

**自动生成的 Permutations（8 个）**

底部 4 方向 + 顶部 4 方向，每个 permutation 设置碰撞箱、选择框和旋转变换。

**示例**

```typescript
const stair = BlockAPI.createStairBlock('wiki:stair', 'construction',
  ['stair_tex', 'stair_tex', 'stair_tex', 'stair_tex', 'stair_tex', 'stair_tex']
)
```

---

### createTrapdoorBlock

创建活板门方块（16 个 permutation：4 方向 × 2 上下 × 2 开闭）。

```typescript
BlockAPI.createTrapdoorBlock(
  identifier: string,
  category: string,
  texture: string,
  options?: TrapdoorBlockOptions
): TrapdoorBlock
```

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `identifier` | `string` | 方块唯一标识符 |
| `category` | `string` | 创造栏分类 |
| `texture` | `string` | 纹理短名（6 面复用） |
| `options.group` | `string` | 分组，默认 `"construction"` |
| `options.hide_in_command` | `boolean` | 是否在命令中隐藏，默认 `false` |

**自动添加的组件**
- `minecraft:material_instances` → 6 面材质实例，`render_method: "blend"`
- `minecraft:destructible_by_mining` / `minecraft:destructible_by_explosion`

**自动注册的 Traits**
- `minecraft:placement_direction` → 控制 `minecraft:cardinal_direction` 状态
- `minecraft:placement_position` → 控制 `minecraft:vertical_half` 状态

**自动生成的 Permutations（16 个）**

每个 permutation 根据方向、上下半、开闭状态设置碰撞箱。

**示例**

```typescript
const trapdoor = BlockAPI.createTrapdoorBlock('wiki:trapdoor', 'construction', 'trapdoor_tex')
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
  y_rotation_offset: 0
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

### 属性（继承自 BasicBlock 之外的额外属性）

| 属性 | 类型 | 说明 |
|------|------|------|
| `feature` | `OreFeature` | 矿脉特征 |
| `feature_rules` | `FeatureRule` | 特征规则（默认 Y 0-64，10次/区块，主世界群系） |

---

## GlassBlock

继承自 `BasicBlock`，透明玻璃方块。

```typescript
import { GlassBlock } from '@sapdon/core'
```

### 构造函数

```typescript
new GlassBlock(
  identifier: string,
  category: string,
  texture: string,
  options?: {
    group?: string
    hide_in_command?: boolean
    geometry?: string
    culling?: string
  }
)
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `texture` | `string` | 单纹理短名，6 面复用 |

构造函数自动添加 `light_dampening: 0`、`render_method: "blend"` 材质实例、挖掘/爆炸抗性。可选 `geometry` + `culling` 支持相邻面剔除。

---

## FenceBlock

继承自 `BasicBlock`，栅栏方块。

```typescript
import { FenceBlock } from '@sapdon/core'
```

### 构造函数

```typescript
new FenceBlock(
  identifier: string,
  category: string,
  textures_arr: string[],
  options?: {
    group?: string
    hide_in_command?: boolean
    leashable?: boolean
  }
)
```

构造函数自动添加自定义碰撞箱、`support: "fence"`、`connection_rule: "all"`。

---

## StairBlock

继承自 `BasicBlock`，楼梯方块。

```typescript
import { StairBlock } from '@sapdon/core'
```

### 构造函数

```typescript
new StairBlock(
  identifier: string,
  category: string,
  textures_arr: string[],
  options?: {
    group?: string
    hide_in_command?: boolean
  }
)
```

构造函数自动注册 `minecraft:cardinal_direction` 和 `minecraft:vertical_half` 状态，通过 `placement_direction` 和 `placement_position` trait 控制玩家放置朝向，生成 8 个 permutation（含半砖碰撞箱 + 方向旋转变换）。

---

## TrapdoorBlock

继承自 `BasicBlock`，活板门方块。

```typescript
import { TrapdoorBlock } from '@sapdon/core'
```

### 构造函数

```typescript
new TrapdoorBlock(
  identifier: string,
  category: string,
  texture: string,
  options?: {
    group?: string
    hide_in_command?: boolean
  }
)
```

构造函数自动注册 `minecraft:cardinal_direction`、`minecraft:vertical_half`、`minecraft:open` 三个状态，生成 16 个 permutation。活板门关闭时为薄板碰撞箱（下半或上半），打开时根据方向生成竖立薄板碰撞箱。

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

**`options` 里的容器参数**（★ 实体容器的唯一可用路线）：

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `options.inventory_size` | `number` | `27` | 实体容器槽位数（正整数，非正整数抛错）。官方文档**未给上限** |
| `options.container_type` | `string` | `"minecart_chest"` | 容器音效/行为类型（非空字符串，否则抛错） |
| `options.can_be_siphoned_from` | `boolean` | `true` | 能否用漏斗抽取（非布尔抛错） |

> 不传这三个参数时，`<id>_entity` 的行为产物与历史版本**逐字节一致**；
> 每个实例都会**拷贝**一份容器数据，改一个方块不会污染另一个（已用 `tests/block-api.test.mjs` 断言）。

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
static setFlammableCustom(
  catchChanceModifier: number,
  destroyChanceModifier: number,
  lava_flammable?: 'always' | 'never'
): Map
```

设置自定义燃烧概率（≥ 0）。可选 `lava_flammable` 参数控制岩浆能否点燃该方块，默认 `"never"`。

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
static setMapColor(value: string | number[] | { color: string | number[], tint_method?: string }): Map
```

设置地图颜色。支持：
- 十六进制字符串 `"#RRGGBB"`
- RGB 数组 `[255, 0, 0]`
- 对象格式 `{ color: "#RRGGBB", tint_method: "grass" }` — 带生物群系染色

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

### setBlockEntity

```typescript
static setBlockEntity(dynamic_properties?: boolean | Object, options?: {
  dynamic_properties?: boolean
  container?: { slot_count: number } | { inventory_size: number } | number
}): Map
```

创建**方块实体**（Block Entity）。`dynamic_properties` 控制是否启用方块实体的动态属性存储，默认 `false`。

三种写法（第一、二种产物与历史**逐字节一致**）：

```typescript
BlockComponent.setBlockEntity()                       // → { dynamic_properties: false }
BlockComponent.setBlockEntity(true)                   // → { dynamic_properties: true }
BlockComponent.setBlockEntity(true, { container: { slot_count: 27 } })
BlockComponent.setBlockEntity({ container: 54 })      // 只给容器时可省掉第一个参数
```

**`container` 参数**（★ 方块容器的**规范**写法）

| 参数 | 类型 | 说明 |
|------|------|------|
| `container.slot_count` | `number` | 槽位数。官方文档：`Value must be >= 1. Value must be <= 54.` —— **超限抛错** |
| `container.inventory_size` | `number` | `slot_count` 的别名（框架其它容器 API 用这个名字）；两者同时给出且不一致时抛错 |
| `container` | `number` | 直接给槽位数（等价于 `{ slot_count: n }`） |

依据：[Microsoft Learn · Block Components - minecraft:block_entity](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/blockcomponents/minecraftblock_block_entity)
（`container.slot_count` 与 `dynamic_properties` 两个成员都在该页）。

> ⚠️ **当前引擎版本会拒绝 `container` 成员**：实测报
> `-> minecraft:block_entity -> container: this component was found in the input, but is not present in the Schema`
> （`format_version` 1.26.30 / 1.26.40 报同样的错）。
> ⇒ 这个 API 产出的是**规范正确、但引擎暂时不认**的 JSON；**要现在就能用的容器，请走实体路线**
> （[`createTileBlock` 的 `inventory_size`](#createtileblock)）。
> 真机行为**「未验证」**：等引擎支持后应可直接使用。

> ⚠️ `combineComponents` 是「后者覆盖前者」：要同时给 `dynamic_properties` 与 `container`，
> 请**一次调用写完**（上面第 3、4 种写法）；把两个 `setBlockEntity(...)` 合并会让先出现的那个被整份丢掉。

> ⚠️ 源码 JSDoc 标注该组件为**实验性**，需开启 `Upcoming Creator Features` 实验开关。
> Bedrock Wiki 的 [Block Components](https://wiki.bedrock.dev/blocks/block-components) 页**没有**该条目 ——
> 引用请用上面的 Microsoft Learn 链接。

### setInventory

> ⚠️ **已废弃（deprecated）**，且**当前引擎版本必然拒绝**它产出的组件。新项目**不要**用它。
> 保留签名只为不破坏既有项目：**产物一个字节都不变**，但每次调用会打一条构建期 `console.warn`。

设置方块容器 —— 它产出的是方块 `components` 里的 `minecraft:inventory`。
但 `minecraft:inventory` 是**实体**组件（官方文档列在 Entity Components 下），
**不是**方块组件 —— 写在方块里**在任何版本上都不成立**（不是"版本太旧"），真机报：

```
-> components -> minecraft:inventory: this component was found in the input, but is not present in the Schema
```

**现在应该怎么做**

| 目标 | 用什么 |
|---|---|
| **要一个能用的容器**（唯一可用路线） | `BlockAPI.createTileBlock(id, cat, textures, { inventory_size, container_type, can_be_siphoned_from })` —— 容器挂在承载**实体**上。见 [`createTileBlock`](#createtileblock) |
| 已在用 `TileBlock`，想改槽位 | `tile.entity.behavior.addComponent(EntityComponent.setInventoryProperties({ inventorySize: 56, ... }))`（注意是**实体**组件 API，参数是 camelCase） |
| **要规范的方块容器 JSON** | `BlockComponent.setBlockEntity(true, { container: { slot_count } })`（`[1,54]`）；当前引擎版本同样会拒该成员，但 JSON 与官方文档一致 |

```typescript
static setInventory(options?: {
  inventory_size: number
  private?: boolean
  container_type?: string
  can_be_siphoned_from?: boolean
  additional_slots_per_strength?: number
  restrict_to_owner?: boolean
}): Map
```

**参数**

| 参数 | 类型 | 可选性 | 校验 / 说明 |
|------|------|--------|-------------|
| `inventory_size` | `number` | **必填** | 槽位数。必须满足 `Number.isInteger(x) && x >= 1`，否则抛错。**上限未验证**（实体组件文档没给上限，见下） |
| `private` | `boolean` | 可选 | 是否仅所有者可访问。非布尔抛错 |
| `container_type` | `string` | 可选 | 容器音效 / 行为类型。必须是非空字符串。官方文档（实体 `minecraft:inventory`）列出的取值：`horse` / `minecart_chest` / `chest_boat` / `minecart_hopper` / `inventory` / `container` / `hopper`。框架**不做白名单**（避免写死过窄），所以拼错不会在构建期报错 |
| `can_be_siphoned_from` | `boolean` | 可选 | 能否用漏斗抽取 |
| `additional_slots_per_strength` | `number` | 可选 | 每级强度的额外槽位。必须是非负整数，否则抛错 |
| `restrict_to_owner` | `boolean` | 可选 | 是否限制为所有者可打开 |

**没有隐式默认值**：只写入你**显式赋值**的字段，未赋值的字段不会出现在产物 JSON 里（`inventory_size` 除外，它必填）。框架**不会**替你补 `container_type` / `can_be_siphoned_from` 之类的"常见默认值"。

> ⚠️ **`inventory_size` 的上限「未验证」**：官方文档（实体 `minecraft:inventory`）只写
> "Number of slots the container has"、**未给上限**；方块路线的 `[1,54]` **不适用**于实体容器。
> 框架只校验正整数。需要几十槽的大容器时请自行在真机确认。

#### 自检（`BasicBlock.validate()`）

提交前（`registry.submit()`）框架会检查两件事，**只 warn、不改产物**：

1. 方块 components 里出现 `minecraft:inventory` → 提示"它是实体组件、必然被拒"，并给出上面两条替代路线。
   ```
   [sapdon] 方块 "demo:crate" 的 components 里写了 minecraft:inventory —— 它是**实体**组件（官方文档列在 Entity Components 下），
   方块组件表里没有它，引擎会报 "-> components -> minecraft:inventory: this component was found in the input,
   but is not present in the Schema"。可用的容器请走实体路线：BlockAPI.createTileBlock(...)；
   要方块侧的规范写法用 BlockComponent.setBlockEntity(true, { container: { slot_count } })（当前引擎版本同样会拒该成员）。
   ```
   这条能兜住**手写裸 Map** 的写法（项目侧曾经就是那样绕过框架的）。
2. `minecraft:block_entity.container.slot_count` 不在 `[1,54]` → warn（兜住手写组件对象 / 裸 Map 的写法）。

> 检查点在 `src/core/block/basicBlock.js` 的 `BasicBlock.validate()`，由 `src/core/registry.ts` 的 `runValidators()` 调用。
> ⚠️ 它**不在** `blockFactory.registerBlock`（旧 JSDoc 曾那样写，是错的：`blockFactory.js` 里 `block_entity` 命中数为 0）。

#### 历史写法（不再推荐，且产出会被引擎拒绝）

```typescript
// ❌ 不要再用：minecraft:inventory 是实体组件，写在方块里必然被拒
crate.addComponent(BlockComponent.combineComponents(
  BlockComponent.setBlockEntity(false),
  BlockComponent.setInventory({ inventory_size: 27, container_type: 'minecart_chest' })
))
```

#### 可用写法

```typescript
import { BlockAPI, EntityComponent, registry } from '@sapdon/core'

// ★ 唯一可用：方块 + 承载实体，容器挂实体
const crate = BlockAPI.createTileBlock('demo:crate', 'construction', [
  'crate_down', 'crate_up', 'crate_north', 'crate_south', 'crate_west', 'crate_east'
], { inventory_size: 27, container_type: 'minecart_chest', can_be_siphoned_from: true })

// 或者构造后再改（实体组件 API，camelCase）
crate.entity.behavior.addComponent(EntityComponent.setInventoryProperties({
  inventorySize: 56, containerType: 'minecart_chest', canBeSiphonedFrom: true
}))

registry.submit()
```
> ⚠️ 上例的**游戏内表现（右键能否打开、能否存取）未验证**——本环境无法启动 Minecraft。

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
static setDestructionParticles(
  texture: string,
  options?: {
    particle_count?: number   // 粒子数量 0-255，默认 100
    tint_method?: string      // 染色方法，如 "grass"
  }
): Map
```

设置破坏粒子纹理。可选 `particle_count` 控制粒子数量（0-255，默认 100）。

### setItemVisual

```typescript
static setItemVisual(geometry: string, materialInstances: object): Map
```

设置物品栏中的视觉属性。

### setLiquidDetection

```typescript
// 选项对象格式（推荐，支持多检测规则）
static setLiquidDetection(options: {
  detection_rules?: {
    liquid_type: string
    can_contain_liquid: boolean
    on_liquid_touches?: 'blocking' | 'broken' | 'popped' | 'no_reaction'
    stops_liquid_flowing_from_direction?: string[]
    use_liquid_clipping?: boolean
  }[]
  use_liquid_clipping?: boolean
}): Map

// 旧版单规则格式（向后兼容）
static setLiquidDetection(
  canContainLiquid: boolean,
  liquidType?: 'water',
  onLiquidTouches?: 'blocking' | 'broken' | 'popped' | 'no_reaction',
  stopsLiquidFlowingFromDirection?: string[]
): Map
```

设置液体检测属性。使用对象参数时可设置 `detection_rules` 数组（支持水淹等行为）和 `use_liquid_clipping`。

```typescript
// 示例：水淹方块
BlockComponent.setLiquidDetection({
  detection_rules: [{
    liquid_type: "water",
    can_contain_liquid: true,
    on_liquid_touches: "no_reaction"
  }]
})
```

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

## BlockCustomComponentBuilder

块自定义组件构建器，提供 TypeScript 类型安全的流式 API 定义块事件处理器，并可生成脚本端注册代码。

```typescript
import { BlockCustomComponentBuilder } from '@sapdon/core'
```

### 构造函数

```typescript
new BlockCustomComponentBuilder(componentId: string)
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `componentId` | `string` | 自定义组件标识符，格式 `"命名空间:组件名"` |

### 方法

#### 事件绑定（均返回 `this`，可链式调用）

| 方法 | 对应事件 | Wiki 说明 |
|------|---------|-----------|
| `beforeOnPlayerPlace(handler)` | `beforeOnPlayerPlace` | 玩家放置前触发 |
| `onBlockStateChange(handler)` | `onBlockStateChange` | 块状态改变时触发 |
| `onBreak(handler)` | `onBreak` | 块被破坏时触发 |
| `onEntity(handler)` | `onEntity` | 实体在块上执行事件时触发 |
| `onEntityFallOn(handler)` | `onEntityFallOn` | 实体坠落在块上时触发 |
| `onPlace(handler)` | `onPlace` | 块被放置时触发 |
| `onPlayerBreak(handler)` | `onPlayerBreak` | 玩家破坏块时触发 |
| `onPlayerInteract(handler)` | `onPlayerInteract` | 玩家与块交互时触发 |
| `onRandomTick(handler)` | `onRandomTick` | 随机刻触发 |
| `onRedstoneUpdate(handler)` | `onRedstoneUpdate` | 红石信号更新时触发 |
| `onStepOff(handler)` | `onStepOff` | 实体离开块时触发 |
| `onStepOn(handler)` | `onStepOn` | 实体踏上块时触发 |
| `onTick(handler)` | `onTick` | 块计划刻触发 |

#### `id(): string`

返回组件标识符，用于 `BlockComponent.setCustomComponents()`。

#### `build(): BlockCustomComponentHandlers`

构建处理器对象，可用于 runtime 的 `registerCustomComponent`。

#### `handlerCount(): number`

返回已注册的事件处理器数量。

### 事件参数类型

| 接口名 | 属性 |
|--------|------|
| `BeforeOnPlayerPlaceEvent` | `block`, `cancel`, `dimension`, `face`, `permutationToPlace`, `player?` |
| `OnBlockStateChangeEvent` | `block`, `dimension`, `previousPermutation` |
| `OnBreakEvent` | `block`, `dimension`, `blockDestructionSource?`, `brokenBlockPermutation`, `entitySource?` |
| `OnEntityEvent` | `block`, `blockPermutation`, `dimension`, `entitySource`, `name` |
| `OnEntityFallOnEvent` | `block`, `dimension`, `entity?`, `fallDistance` |
| `OnPlaceEvent` | `block`, `dimension`, `previousBlock` |
| `OnPlayerBreakEvent` | `block`, `brokenBlockPermutation`, `dimension`, `player?` |
| `OnPlayerInteractEvent` | `block`, `dimension`, `face`, `faceLocation`, `player?` |
| `OnRandomTickEvent` | `block`, `dimension` |
| `OnRedstoneUpdateEvent` | `block`, `dimension`, `power` |
| `OnStepOffEvent` | `block`, `dimension`, `entity?` |
| `OnStepOnEvent` | `block`, `dimension`, `entity?` |
| `OnTickEvent` | `block`, `dimension` |

### 示例

```typescript
import { BlockAPI, BlockComponent, BlockCustomComponentBuilder, registry } from '@sapdon/core'

// 定义块自定义组件事件处理器（构建时）
const growComponent = new BlockCustomComponentBuilder('wiki:crop_grow')
  .onRandomTick(({ block }) => {
    const stage = block.permutation.getState('sapdon:block_variant_tag') as number
    if (stage < 3) {
      block.setPermutation(
        block.permutation.withState('sapdon:block_variant_tag', stage + 1)
      )
    }
  })
  .onPlayerInteract(({ block, player }) => {
    if (player?.getGameMode() === 'creative') {
      block.setPermutation(
        block.permutation.withState('sapdon:block_variant_tag', 3)
      )
    }
  })

// 创建方块并关联组件 ID
const crop = BlockAPI.createCropBlock('wiki:tomato', 'nature', [
  { stateTag: 0, textures: ['stage_0', 'stage_0', 'stage_0', 'stage_0', 'stage_0', 'stage_0'] },
  { stateTag: 1, textures: ['stage_1', 'stage_1', 'stage_1', 'stage_1', 'stage_1', 'stage_1'] },
  { stateTag: 2, textures: ['stage_2', 'stage_2', 'stage_2', 'stage_2', 'stage_2', 'stage_2'] },
  { stateTag: 3, textures: ['stage_3', 'stage_3', 'stage_3', 'stage_3', 'stage_3', 'stage_3'] }
])
crop.addComponent(BlockComponent.setCustomComponents([growComponent.id()]))

registry.submit()
```

### 运行时脚本自动生成

`registry.submit()` 会自动收集所有 `BlockCustomComponentBuilder` 实例，并在构建时通过 `load.js` 生成对应的运行时脚本文件：

- **脚本文件** → `scripts/custom_components/{componentId}.js`（以 `:` 替换为 `_` 命名）
- **索引文件** → `scripts/custom_components/index.js`（以正确 ID 注册所有组件）
- 文件已存在时**跳过**，不会覆盖用户修改

需要在项目入口文件 `scripts/index.js`（或 `scripts/index.ts`）中添加导入：

```typescript
import './custom_components/index.js'
```

这样 `load.js` 生成的注册代码即可自动执行。

内置 OC 运行时组件（如 `sapdon:head_rotation`）注册只需调用：

```typescript
import { registerBuiltinComponents } from '@sapdon/runtime'
registerBuiltinComponents()
```

### 两条路线的分工（★ 本轮结论）

自定义组件有**两条**合法路线，**都要保留**：

| | **路线 A**：`BlockCustomComponentBuilder`（本节） | **路线 B**：运行期注册（**推荐**） |
|---|---|---|
| 声明位置 | **构建期**（`main.ts`） | **运行期**（`scripts/*`，随脚本打包） |
| handler 形态 | 被 `handler.toString()` **序列化成源码**，写进 `scripts/custom_components/<name>.js` | **普通闭包**（你自己模块里的函数） |
| 能否 import 共享模块 | ❌ **不能**（见下） | ✅ 能 |
| 注册时机 | CLI 生成的 `scripts/custom_components/index.js` 在 `system.beforeEvents.startup` 里注册 | 框架内建 `system.beforeEvents.startup` |
| 兼容性 | `build()` / `generateRuntimeCode()` 签名**不变**，`examples/block_demo` 在用 | 本轮新增，见 [`@sapdon/runtime`](./runtime.md) |

**★ 为什么必须保留路线 B：A 做不了「共享基类」的系统**

A 的 handler 会被 `toString()` 序列化进生成的脚本文件，而生成的源码里**只有调用、没有定义也没有 import** ⇒ handler 内**不能引用跨模块的变量**，否则运行期报 `ReferenceError: x is not defined`。

所以 A 路线**做不了需要共享模块的系统** —— 典型是「20 台机器共用一个 `MachineBase`」：20 个 handler 都得 import 同一份基类 / 工具函数，A 路线写不出来。B 路线的 handler 是**普通闭包**，与 `MachineBase` 处在同一个 bundle 里，直接 `import` 即可。**这是保留 B 的唯一决定性理由。**

**时机红线：只有上面这两条路**

- ✅ 路线 A：`BlockCustomComponentBuilder` + CLI 生成的 `scripts/custom_components/index.js`
- ✅ 路线 B：运行期 `registerBlockComponent` / `registerItemComponent`
- ❌ `world.beforeEvents.worldInitialize`：**太晚**。症状是启动时方块报
  `this component was found in the input, but is not present in the Schema`
  （方块 JSON 里写了 `"ns:xxx": {}`，但脚本没在正确时机注册）

**路线 A 的其它现状**（详述见 [doc/dev/known-pitfalls.md](../../dev/known-pitfalls.md) §2）：

- **源码已支持（依据 `prod/cli/start.js` 的索引合并分支；未端到端实跑路线 A）**：
  `scripts/custom_components/index.js` 已改为**标记块合并** —— 文件存在但没有标记块时在**末尾追加**自动注册块（原内容保留），有标记块时每次构建**替换标记块区间**（幂等）。历史上"只在文件不存在时才生成 / 增量新增组件时索引不更新"的问题已由这次改动覆盖。
- **设计如此（不是缺陷）**：`scripts/custom_components/<name>.js` 是「**生成一次、之后归用户**」（存在即跳过、不覆盖），所以改完 handler 后该文件不会自动跟着更新 —— 覆盖会毁掉用户手写的实现。
- **未修（结构性限制）**：`handler.toString()` 丢失跨模块引用，即上面那条"必须保留 B"的理由。

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

---

## TintMethod

生物群系染色方法常量，用于 `BlockComponent.setMaterialInstances()` 和 `BlockComponent.setMapColor()` 的 `tint_method` 参数。

```typescript
import { TintMethod } from '@sapdon/core'
```

```typescript
const TintMethod = {
  GRASS: 'grass',                   // 草地色
  WATER: 'water',                   // 水色
  DEFAULT_FOLIAGE: 'default_foliage',     // 默认 foliage 色
  EVERGREEN_FOLIAGE: 'evergreen_foliage', // 常绿 foliage 色
  DRY_FOLIAGE: 'dry_foliage',            // 干 foliage 色
  BIRCH_FOLIAGE: 'birch_foliage',        // 白桦 foliage 色
} as const
```

**示例**

```typescript
BlockComponent.setMaterialInstances({
  '*': { texture: 'grass_tex', render_method: 'opaque', tint_method: TintMethod.GRASS }
})
```

---

## FlipbookTextureConfig

翻转书纹理配置构建器，用于生成资源包 `flipbook_textures.json`。

```typescript
import { FlipbookTextureConfig } from '@sapdon/core'
```

### 方法

| 方法 | 说明 |
|------|------|
| `addEntry(entry: FlipbookEntry)` | 添加一个翻转书纹理条目 |
| `addEntries(entries: FlipbookEntry[])` | 批量添加多个条目 |
| `toObject()` | 生成 `{ flipbook_textures: [...] }` 对象，可直接注册到资源包 |

**FlipbookEntry**

```typescript
interface FlipbookEntry {
  flipbook_texture: string   // 纹理短名
  atlas_tile?: string        // 图集 tile 名称（默认同 flipbook_texture）
  ticks_per_frame?: number   // 每帧停留 tick 数（默认 2）
  blend_frames?: boolean     // 是否混合帧（默认 false）
  replicate?: number         // 复制次数（默认 1）
}
```

**示例**

```typescript
const flipbook = new FlipbookTextureConfig()
  .addEntry({ flipbook_texture: 'water_flow', ticks_per_frame: 3 })
  .addEntry({ flipbook_texture: 'lava_flow', ticks_per_frame: 2, blend_frames: true })
```

---

## TextureVariationConfig

纹理变体配置构建器，用于生成资源包 `terrain_texture.json`。

```typescript
import { TextureVariationConfig } from '@sapdon/core'
```

### 方法

| 方法 | 说明 |
|------|------|
| `addTexture(name, path)` | 添加单纹理映射：短名 → 图片路径 |
| `addTextureWithVariations(name, variations)` | 添加带权重的多变体纹理 |
| `toObject()` | 生成 `{ texture_data: {...} }` 对象，可直接注册到资源包 |

**TextureVariation**

```typescript
interface TextureVariation {
  path: string    // 纹理图片路径
  weight?: number // 随机权重（默认 1）
}
```

**示例**

```typescript
const tex = new TextureVariationConfig()
  .addTexture('stone', 'textures/blocks/stone')
  .addTextureWithVariations('grass', [
    { path: 'textures/blocks/grass_1', weight: 3 },
    { path: 'textures/blocks/grass_2', weight: 1 }
  ])
```

---

## 类型汇总

```typescript
// 方块工厂
BlockAPI.createBasicBlock(identifier, category, textures_arr, options?)
BlockAPI.createBlock(identifier, category, variantDatas, options?)
BlockAPI.createRotatableBlock(identifier, category, textures_arr, options?)
BlockAPI.createGeometryBlock(identifier, category, geometry, material_instances, options?)
BlockAPI.createTileBlock(identifier, category, textures_arr, options?)
BlockAPI.createCropBlock(identifier, category, variantDatas, options?)
BlockAPI.createOreBlock(identifier, category, textures_arr, options?)
BlockAPI.createGlassBlock(identifier, category, texture, options?)
BlockAPI.createFenceBlock(identifier, category, textures_arr, options?)
BlockAPI.createStairBlock(identifier, category, textures_arr, options?)
BlockAPI.createTrapdoorBlock(identifier, category, texture, options?)

// 类
class BasicBlock { ... }
class Block extends BasicBlock { ... }
class RotatableBlock extends BasicBlock { ... }
class GeometryBlock extends BasicBlock { ... }
class CropBlock extends Block { ... }
class OreBlock extends BasicBlock { feature, feature_rules }
class GlassBlock extends BasicBlock { ... }
class FenceBlock extends BasicBlock { ... }
class StairBlock extends BasicBlock { ... }
class TrapdoorBlock extends BasicBlock { ... }
class TileBlock { block, entity }

// 枚举
RotationTypes = { CARDINAL, FACING, BLOCK_FACE, LOG }
TintMethod = { GRASS, WATER, DEFAULT_FOLIAGE, EVERGREEN_FOLIAGE, DRY_FOLIAGE, BIRCH_FOLIAGE }

// 工具类
BlockComponent = { setMaterialInstances, setGeometry, ... }
class FlipbookTextureConfig { addEntry, addEntries, toObject }
class TextureVariationConfig { addTexture, addTextureWithVariations, toObject }

// 块自定义组件构建器
class BlockCustomComponentBuilder { constructor(componentId), id(), build(), handlerCount(), onTick(), ... }
```
