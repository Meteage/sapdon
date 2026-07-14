# 方块创建教程

本文档介绍如何使用 sapdon 框架创建各类 Minecraft 方块。

> 开始前请确保已完成[快速入门](../quick-start.md)中的环境搭建。

## 导入

所有方块相关 API 均从 `@sapdon/core` 导入：

```typescript
import { BlockAPI, registry, BlockComponent, RotationTypes, Permutation } from '@sapdon/core'
```

完成后调用 `registry.submit()` 提交所有注册数据。

---

## 1. 基础方块

`BlockAPI.createBasicBlock()` 创建具有 6 个面纹理的基础方块。

```typescript
import { BlockAPI, registry } from '@sapdon/core'

const myBlock = BlockAPI.createBasicBlock(
  'sapdon:my_basic_block',
  'nature',
  [
    'stone',   // down
    'stone',   // up
    'stone',   // north
    'stone',   // south
    'stone',   // west
    'stone'    // east
  ],
  {
    group: 'construction',
    hide_in_command: false
  }
)

registry.submit()
```

### 关于 material_instances

`createBasicBlock` 内部自动将 6 个纹理映射为 `minecraft:material_instances` 组件：

```typescript
// 等效的手动写法
BlockComponent.setMaterialInstances({
  down:  { texture: 'stone_down' },
  up:    { texture: 'stone_up' },
  north: { texture: 'stone_north' },
  south: { texture: 'stone_south' },
  west:  { texture: 'stone_west' },
  east:  { texture: 'stone_east' }
})
```

每个材质实例可以额外指定渲染属性：

```typescript
BlockComponent.setMaterialInstances({
  '*': {
    texture: 'my_texture',
    ambient_occlusion: true,
    face_dimming: true,
    render_method: 'opaque'  // opaque | blend | alpha_test | double_sided | alpha_test_single_sided
  }
})
```

---

## 2. 多变体方块

`BlockAPI.createBlock()` 创建带有多个变体的方块，每个变体对应一个 `sapdon:block_variant_tag` 状态值。

```typescript
import { BlockAPI, registry, BlockComponent } from '@sapdon/core'

const multiBlock = BlockAPI.createBlock(
  'sapdon:multi_block',
  'nature',
  [
    {
      stateTag: 0,
      textures: ['stone', 'stone', 'stone', 'stone', 'stone', 'stone']
    },
    {
      stateTag: 1,
      textures: ['cobblestone', 'cobblestone', 'cobblestone', 'cobblestone', 'cobblestone', 'cobblestone']
    },
    {
      stateTag: 2,
      textures: ['mossy_cobblestone', 'mossy_cobblestone', 'mossy_cobblestone', 'mossy_cobblestone', 'mossy_cobblestone', 'mossy_cobblestone']
    }
  ],
  {
    group: 'nature',
    ambient_occlusion: false,
    face_dimming: false,
    render_method: 'alpha_test'
  }
)

registry.submit()
```

### 变体工作原理

框架自动注册状态 `sapdon:block_variant_tag`（值为 0 到变体数-1），并为每个变体生成 permutation：

```typescript
// 每个变体对应条件
condition: "q.block_state('sapdon:block_variant_tag') == 0"
condition: "q.block_state('sapdon:block_variant_tag') == 1"
// ...
```

### 为特定变体添加额外组件

```typescript
// 为变体 2 添加自定义组件
multiBlock.addVariantComponent(2, BlockComponent.setLightEmission(15))
```

---

## 3. 可旋转方块

`BlockAPI.createRotatableBlock()` 创建支持多方向放置的方块。

```typescript
import { BlockAPI, registry, RotationTypes } from '@sapdon/core'

// CARDINAL — 北/南/东/西 四个方向
const pillar = BlockAPI.createRotatableBlock(
  'sapdon:pillar',
  'construction',
  ['oak_log_top', 'oak_log_top', 'oak_log', 'oak_log', 'oak_log', 'oak_log'],
  {
    rotationType: RotationTypes.CARDINAL,
    yRotationOffset: 180
  }
)

// FACING — 上/下/北/南/东/西 六个方向
const machine = BlockAPI.createRotatableBlock(
  'sapdon:machine',
  'construction',
  ['stone', 'stone', 'furnace_front', 'stone', 'stone', 'stone'],
  {
    rotationType: RotationTypes.FACING
  }
)

// LOG — 原木式旋转（X/Y/Z 轴）
const customLog = BlockAPI.createRotatableBlock(
  'sapdon:custom_log',
  'nature',
  ['oak_log_top', 'oak_log_top', 'oak_log', 'oak_log', 'oak_log', 'oak_log'],
  {
    rotationType: RotationTypes.LOG
  }
)

registry.submit()
```

### RotationTypes 说明

| 类型 | 方向 | 适用场景 |
|------|------|----------|
| `CARDINAL` | 北、南、东、西 | 柱子、竖纹方块 |
| `FACING` | 上、下、北、南、东、西 | 熔炉、发射器类 |
| `BLOCK_FACE` | 上、下、北、南、东、西 | 附着型方块 |
| `LOG` | X/Y/Z 轴对齐 | 原木、横纹方块 |

---

## 4. 几何方块

`BlockAPI.createGeometryBlock()` 创建使用自定义几何模型的方块。

```typescript
import { BlockAPI, registry } from '@sapdon/core'

const chair = BlockAPI.createGeometryBlock(
  'sapdon:chair',
  'construction',
  'geometry.chair',
  {
    '*': {
      texture: 'oak_planks',
      render_method: 'opaque'
    }
  }
)

registry.submit()
```

多材质实例示例：

```typescript
const table = BlockAPI.createGeometryBlock(
  'sapdon:table',
  'construction',
  'geometry.table',
  {
    'wood': {
      texture: 'oak_planks',
      render_method: 'opaque'
    },
    'metal': {
      texture: 'iron_block',
      render_method: 'opaque'
    }
  }
)

registry.submit()
```

---

## 5. 作物方块

`BlockAPI.createCropBlock()` 创建具有生长阶段的作物方块。

```typescript
import { BlockAPI, registry } from '@sapdon/core'

const tomato = BlockAPI.createCropBlock(
  'sapdon:tomato',
  'nature',
  [
    { stateTag: 0, textures: ['wheat_stage_0', 'wheat_stage_0', 'wheat_stage_0', 'wheat_stage_0', 'wheat_stage_0', 'wheat_stage_0'] },
    { stateTag: 1, textures: ['wheat_stage_1', 'wheat_stage_1', 'wheat_stage_1', 'wheat_stage_1', 'wheat_stage_1', 'wheat_stage_1'] },
    { stateTag: 2, textures: ['wheat_stage_2', 'wheat_stage_2', 'wheat_stage_2', 'wheat_stage_2', 'wheat_stage_2', 'wheat_stage_2'] },
    { stateTag: 3, textures: ['wheat_stage_3', 'wheat_stage_3', 'wheat_stage_3', 'wheat_stage_3', 'wheat_stage_3', 'wheat_stage_3'] }
  ],
  {
    group: 'nature',
    render_method: 'alpha_test'
  }
)

registry.submit()
```

### 自动添加的组件

作物方块会自动设置：
- **碰撞箱禁用** — `minecraft:collision_box` 设为 `false`
- **几何模型** — 使用 `geometry.crop`
- **放置过滤** — 只能放置在耕地上方
- **选择框** — 每阶段自动调整高度

### 运行时组件

作物方块的生长和骨粉交互需要注册框架内置的脚本组件。在 `scripts/index.ts` 中：

```typescript
import { registerBuiltinComponents } from '@sapdon/runtime'
registerBuiltinComponents()
```

这样就自动注册了 `sapdon:sapdon:crop_growth` 组件，作物才能正常生长和响应骨粉。

---

## 6. 矿物方块

`BlockAPI.createOreBlock()` 自动创建方块 + 矿脉特征 + 特征规则。

```typescript
import { BlockAPI, registry } from '@sapdon/core'

const rubyOre = BlockAPI.createOreBlock(
  'sapdon:ruby_ore',
  'nature',
  ['diamond_ore', 'diamond_ore', 'diamond_ore', 'diamond_ore', 'diamond_ore', 'diamond_ore'],
  {
    group: 'nature'
  }
)

registry.submit()
```

### 自动生成的内容

| 内容 | 标识符 |
|------|--------|
| 方块 (BasicBlock) | `sapdon:ruby_ore` |
| 矿脉特征 (OreFeature) | `sapdon:ruby_ore_ore_feature` |
| 特征规则 (FeatureRule) | `sapdon:ruby_ore_orefeatre_rule` |

生成的矿石会在 Y 0-64 层之间以 10 次/区块的频率生成，替换石头。

---

## 7. 方块组件

使用 `BlockComponent` 的静态方法为方块添加各种行为。

```typescript
import { BlockAPI, registry, BlockComponent } from '@sapdon/core'

const componentBlock = BlockAPI.createBasicBlock(
  'sapdon:component_demo',
  'construction',
  ['stone', 'stone', 'stone', 'stone', 'stone', 'stone']
)

// 材质实例
componentBlock.addComponent(
  BlockComponent.setMaterialInstances({
    '*': { texture: 'demo', render_method: 'opaque' }
  })
)

// 几何模型
componentBlock.addComponent(
  BlockComponent.setGeometry('geometry.demo', { 'bone1': true })
)

// 碰撞箱 — 启用/禁用
componentBlock.addComponent(BlockComponent.setCollisionBoxEnabled(true))
// 碰撞箱 — 自定义尺寸
componentBlock.addComponent(BlockComponent.setCollisionBoxCustom([-8, 0, -8], [16, 16, 16]))

// 选择框 — 启用/禁用
componentBlock.addComponent(BlockComponent.setSelectionBoxEnabled(true))
// 选择框 — 自定义尺寸
componentBlock.addComponent(BlockComponent.setSelectionBoxCustom([-8, 0, -8], [16, 16, 16]))

// 爆炸抗性 — 启用/禁用
componentBlock.addComponent(BlockComponent.setDestructibleByExplosionEnabled(true))
// 爆炸抗性 — 自定义值
componentBlock.addComponent(BlockComponent.setDestructibleByExplosionCustom(5.0))

// 挖掘抗性 — 启用/禁用
componentBlock.addComponent(BlockComponent.setDestructibleByMiningEnabled(true))
// 挖掘抗性 — 自定义值（带工具速度）
componentBlock.addComponent(
  BlockComponent.setDestructibleByMiningCustom(2.0, [
    { item: 'minecraft:diamond_pickaxe', destroy_speed: 0.5 }
  ])
)

// 显示名称
componentBlock.addComponent(BlockComponent.setDisplayName('组件演示方块'))

// 易燃性
componentBlock.addComponent(BlockComponent.setFlammableEnabled(true))
componentBlock.addComponent(BlockComponent.setFlammableCustom(0.5, 0.3))

// 摩擦力
componentBlock.addComponent(BlockComponent.setFriction(0.6))

// 遮光值
componentBlock.addComponent(BlockComponent.setLightDampening(15))
// 发光值
componentBlock.addComponent(BlockComponent.setLightEmission(0))

// 战利品表
componentBlock.addComponent(BlockComponent.setLoot('loot_tables/demo.json'))

// 地图颜色
componentBlock.addComponent(BlockComponent.setMapColor('#FF0000'))
// 或 RGB 数组
componentBlock.addComponent(BlockComponent.setMapColor([255, 0, 0]))

// 变换
componentBlock.addComponent(
  BlockComponent.setTransformation([0, 0, 0], [1, 1, 1], [0, 0, 0], [0, 0, 0], [0, 0, 0])
)

// 放置过滤
componentBlock.addComponent(
  BlockComponent.setPlacementFilter([
    { allowed_faces: ['up'], block_filter: ['minecraft:grass'] }
  ])
)

// 红石导电性
componentBlock.addComponent(
  BlockComponent.setRedstoneConductivity(false, true)
)

// 合成台
componentBlock.addComponent(
  BlockComponent.setCraftingTable(['crafting_table'], '演示工作台')
)

// Tick
componentBlock.addComponent(BlockComponent.setTick([10, 20], true))

// 自定义组件 (Script API)
componentBlock.addComponent(BlockComponent.setCustomComponents(['sapdon:custom_component']))
// 自定义组件 V2
componentBlock.addComponent(
  BlockComponent.setCustomComponentV2('sapdon:custom_v2', { enabled: true })
)

// 破坏粒子
componentBlock.addComponent(BlockComponent.setDestructionParticles('particle_texture', 'none'))

// 物品视觉
componentBlock.addComponent(
  BlockComponent.setItemVisual('geometry.item', { '*': { texture: 'item_tex', render_method: 'opaque' } })
)

// 液体检测
componentBlock.addComponent(
  BlockComponent.setLiquidDetection(true, 'water', 'blocking', ['down'])
)

// 呼吸性
componentBlock.addComponent(BlockComponent.setBreathability('solid'))

registry.submit()
```

### 合并多个组件

```typescript
componentBlock.addComponent(
  BlockComponent.combineComponents(
    BlockComponent.setDisplayName('合并示例'),
    BlockComponent.setLightEmission(10),
    BlockComponent.setFriction(0.5)
  )
)
```

---

## 8. TileBlock

`TileBlock` 将方块与实体结合，实现方块实体效果。

```typescript
import { TileBlock, registry } from '@sapdon/core'

const chestBlock = new TileBlock(
  'sapdon:tile_chest',
  'construction',
  ['stone', 'stone', 'stone', 'stone', 'stone', 'stone']
)

// 自定义几何模型
chestBlock.setGeometry('geometry.chest')

// 添加动画
chestBlock.addAnimation('open', 'animation.chest.open')

// 自定义脚本属性
chestBlock.setScript('animate', 'open')

registry.submit()
```

### TileBlock 工作原理

1. 创建 `BasicBlock`（带有 `sapdon:block_or_entity` 状态）
2. 创建 `Entity`（带有容器、无敌、不可推动等组件）
3. 方块状态为 0 时显示普通方块，状态为 1 时通过 tick 切换为实体容器
4. 实体使用 `block_sensor` 监听方块破坏事件以触发消失
