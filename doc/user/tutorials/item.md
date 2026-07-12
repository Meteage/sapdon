# 物品创建教程

本教程将带领你逐步学习使用 sapdon 框架创建各种类型的物品。

## 目录

1. [基础物品](#1-基础物品)
2. [食物](#2-食物)
3. [盔甲](#3-盔甲)
4. [可附着物](#4-可附着物)
5. [翻书物品](#5-翻书物品)
6. [物品组件](#6-物品组件)
7. [format_version 设置](#7-format_version-设置)

---

## 1. 基础物品

使用 `ItemAPI.createItem()` 创建最简单的物品，需要提供标识符、分类和纹理名称。

```typescript
// main.ts — 基础物品
import { ItemAPI, registry, ItemComponent, ItemCategory } from '@sapdon/core'

// 创建一个基础物品
// 参数: (标识符, 分类, 纹理名称, 可选配置)
const myItem = ItemAPI.createItem(
    'my_mod:simple_item',   // 标识符（命名空间:物品名）
    ItemCategory.Items,      // 分类（items 类别）
    'apple',                 // 纹理名称（使用原版纹理，无需实际文件）
    {
        group: 'minecraft:itemGroup.name.ingredients',  // 创造模式物品栏分组
        max_stack_size: 16,                              // 最大堆叠数量
    }
)

// 添加显示名称组件
myItem.addComponent(
    ItemComponent.setDisplayName('§a我的自定义物品')  // 支持 Minecraft 颜色代码
)

// 提交所有注册
registry.submit()
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `identifier` | string | 是 | 物品唯一标识符，格式为 `命名空间:名称` |
| `category` | string | 是 | 创造菜单分类，推荐使用 `ItemCategory` 枚举 |
| `texture` | string | 是 | 纹理名称，对应资源包中的纹理文件 |
| `options.group` | string | 否 | 物品分组，如 `"minecraft:itemGroup.name.ingredients"` |
| `options.hide_in_command` | boolean | 否 | 是否在命令中隐藏此物品（默认 false） |
| `options.max_stack_size` | number | 否 | 最大堆叠数量（默认 64，范围 1-99） |

> **提示**：当 `hide_in_command` 为 `true` 时，`createItem` 会自动创建对应的可附着物（attachable），使物品在游戏中以 3D 模型显示。

---

## 2. 食物

使用 `ItemAPI.createFood()` 创建可食用的物品。

```typescript
// main.ts — 食物物品
import { ItemAPI, registry, ItemCategory } from '@sapdon/core'

// 创建一个食物物品
// 参数: (标识符, 分类, 纹理名称, 可选配置)
const myFood = ItemAPI.createFood(
    'my_mod:magic_apple',   // 标识符
    ItemCategory.Items,       // 分类
    'apple',                  // 纹理名称（使用原版苹果纹理）
    {
        nutrition: 6,              // 营养值（恢复的饥饿值）
        saturationModifier: 1.2,   // 饱和度修正值
        canAlwaysEat: true,        // 是否可随时食用（即使饱食度满）
        animation: 'eat',          // 使用动画（'eat' 或 'drink'）
    }
)

// 提交所有注册
registry.submit()
```

### 食物参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `nutrition` | number | 0 | 食物提供的营养值（半饥饿图标数 × 2） |
| `saturationModifier` | number | 1 | 饱和度修正值，最终饱和度 = nutrition × saturationModifier |
| `canAlwaysEat` | boolean | false | 是否允许在饱食度满时继续食用 |
| `animation` | string | 'eat' | 使用动画，可选 `'eat'` 或 `'drink'` |
| `movement` | number | 1 | 食用时的移动速度修正 |
| `useDuration` | number | 1 | 食用所需时间（秒） |

---

## 3. 盔甲

sapdon 提供了四种盔甲类型的创建方法：头盔、胸甲、护腿、靴子。每个盔甲物品会自动创建对应的物品和可附着物。

### 3.1 头盔

```typescript
// main.ts — 头盔
import { ItemAPI, registry } from '@sapdon/core'

// 创建头盔
// 参数: (标识符, 物品纹理, 纹理路径, 可选配置)
const helmet = ItemAPI.createHelmetArmor(
    'my_mod:crystal_helmet',         // 标识符
    'diamond',                       // 物品纹理名称（用于物品图标，原版钻石纹理）
    'textures/models/armor/diamond', // 纹理路径（穿戴在玩家身上时的模型纹理）
    {
        // 可选：自定义分组等
    }
)

// 提交所有注册
registry.submit()
```

### 3.2 胸甲

```typescript
// main.ts — 胸甲
import { ItemAPI, registry } from '@sapdon/core'

const chestplate = ItemAPI.createChestplateArmor(
    'my_mod:crystal_chestplate',
    'diamond',
    'textures/models/armor/diamond'
)

registry.submit()
```

### 3.3 护腿

```typescript
// main.ts — 护腿
import { ItemAPI, registry } from '@sapdon/core'

const leggings = ItemAPI.createLeggingsArmor(
    'my_mod:crystal_leggings',
    'diamond',
    'textures/models/armor/diamond'
)

registry.submit()
```

### 3.4 靴子

```typescript
// main.ts — 靴子
import { ItemAPI, registry } from '@sapdon/core'

const boots = ItemAPI.createBootArmor(
    'my_mod:crystal_boots',
    'diamond',
    'textures/models/armor/diamond'
)

registry.submit()
```

### 盔甲保护值与插槽对照

| 盔甲类型 | 创建方法 | 保护值 | 插槽 | 几何模型 |
|---------|---------|--------|------|---------|
| 头盔 | `createHelmetArmor()` | 3 | `slot.armor.head` | `geometry.player.armor.helmet` |
| 胸甲 | `createChestplateArmor()` | 5 | `slot.armor.chest` | `geometry.player.armor.chestplate` |
| 护腿 | `createLeggingsArmor()` | 6 | `slot.armor.legs` | `geometry.player.armor.leggings` |
| 靴子 | `createBootArmor()` | 4 | `slot.armor.feet` | `geometry.player.armor.boots` |

> **注意**：盔甲使用 `equipment` 分类，自动设置分组（如 `itemGroup.name.chestplate`），最大堆叠数量为 1，并自动配置可附着物实现 3D 盔甲模型渲染。

---

## 4. 可附着物

可附着物（Attachable）是 Minecraft 中用于实现手持物品 3D 模型和穿戴物品渲染的机制。使用 `ItemAPI.createAttachable()` 创建：

```typescript
// main.ts — 可附着物
import { ItemAPI, registry } from '@sapdon/core'

// 创建一个可附着物（用于手持 3D 模型）
const attachable = ItemAPI.createAttachable(
    'my_mod:special_item',           // 标识符
    'textures/items/diamond',        // 纹理路径（使用原版纹理）
    'entity_alphatest'               // 材质类型
)

// 进一步配置可附着物
attachable
    .addGeometry('default', 'geometry.special_item')  // 添加几何模型
    .addTexture('enchanted', 'textures/misc/enchanted_item_glint') // 添加附魔纹理
    .addRenderController('controller.render.special_item') // 添加渲染控制器

// 提交所有注册
registry.submit()
```

### 常用材质类型

| 材质 | 说明 |
|------|------|
| `entity_alphatest` | 标准物品材质（支持透明度） |
| `entity_alphablend` | 透明混合材质 |
| `entity_nocull` | 双面渲染材质 |
| `armor` | 盔甲材质 |
| `armor_enchanted` | 盔甲附魔材质 |

---

## 5. 翻书物品

翻书物品（FlipbookItem）是一种具有动态帧动画效果的特殊物品，类似动态纹理：

```typescript
// main.ts — 翻书物品
import { ItemAPI, registry } from '@sapdon/core'

// 创建一个翻书物品（动态纹理动画）
// 参数: (标识符, 分类, 纹理名称, 可选配置)
const flipbook = ItemAPI.createFlipbookItem(
    'my_mod:animated_block',      // 标识符
    'construction',               // 分类
    'oak_log',                    // 纹理名称（使用原版纹理）
    {
        ticks_per_frame: 4,       // 每帧持续的游戏刻数（1秒=20刻），默认8刻
        max_stack_size: 64,       // 最大堆叠数量
        group: 'minecraft:itemGroup.name.construction', // 分组
    }
)

// 提交所有注册
registry.submit()
```

### 翻书物品特性

- 自动创建对应的 `GeometryBlock` 用于 3D 显示
- 自动注册翻书纹理动画
- 物品本身带有 `minecraft:block_placer` 组件，可以放置对应的方块
- 纹理放在 `RP/textures/blocks/` 目录下
- 需要配合相应的纹理贴图动画配置文件

---

## 6. 物品组件

`ItemComponent` 提供了一系列静态方法，用于构建物品的各种功能组件。这些组件通过链式调用 `addComponent()` 添加到物品上。

### 6.1 手持方式

```typescript
// main.ts — 手持组件示例
import { ItemAPI, registry, ItemComponent, ItemCategory } from '@sapdon/core'

const tool = ItemAPI.createItem('my_mod:special_tool', ItemCategory.Items, 'diamond')
tool.addComponent(
    ItemComponent.combineComponents(
        ItemComponent.setHandEquipped(true),            // 像工具一样手持渲染
        ItemComponent.setDisplayName('§e特殊工具'),      // 显示名称
        ItemComponent.setMaxStackSize(1),                // 不可堆叠
    )
)

registry.submit()
```

### 6.2 耐久度

```typescript
// 添加耐久度组件
tool.addComponent(
    ItemComponent.setDurability(
        500,      // 最大耐久值
        10,       // 最小损坏概率（百分比）
        50        // 最大损坏概率（百分比）
    )
)
```

### 6.3 燃料

```typescript
// 添加燃料组件（可当熔炉燃料）
tool.addComponent(
    ItemComponent.setFuel(200)  // 燃烧时间（秒）
)
```

### 6.4 交互按钮

```typescript
// 添加交互按钮组件（右键点击时显示交互文本）
tool.addComponent(
    ItemComponent.setInteractButton('使用工具')  // 交互时显示的文本
)
```

### 6.5 自定义组件（V2）

```typescript
// 添加自定义脚本组件 (需要 format_version > 1.21.90 和 Scripting V2)
tool.addComponent(
    ItemComponent.setCustomComponentV2(
        'my_mod:my_custom_component',  // 组件标识符
        {                              // 自定义参数
            speed: 1.5,
            damage: 10,
        }
    )
)
```

### 6.6 合并多个组件

```typescript
// 使用 combineComponents 一次性添加多个组件
const item = ItemAPI.createItem('my_mod:complex_item', ItemCategory.Items, 'nether_star')
item.addComponent(
    ItemComponent.combineComponents(
        ItemComponent.setDisplayName('复杂物品'),
        ItemComponent.setHandEquipped(true),
        ItemComponent.setDurability(250, 5, 30),
        ItemComponent.setGlint(true),              // 附魔光效
        ItemComponent.setUseAnimation('eat'),       // 使用动画
        ItemComponent.setUseModifiers(0.5, 1.5),    // 移动速度修正, 使用时间
    )
)

registry.submit()
```

### 6.7 完整组件列表

| 方法 | 说明 |
|------|------|
| `setDisplayName(name)` | 设置物品显示名称 |
| `setIcon(texture)` | 设置物品图标纹理 |
| `setMaxStackSize(size)` | 设置最大堆叠数量 |
| `setHandEquipped(bool)` | 设置手持渲染方式（true=像工具） |
| `setDurability(max, min%, max%)` | 设置耐久度 |
| `setFoodComponent(alwaysEat, nutrition, saturation, convertTo?)` | 设置食物属性 |
| `setFuel(seconds)` | 设置燃料燃烧时间 |
| `setWearable(protection, slot)` | 设置可穿戴属性 |
| `setGlint(bool)` | 设置附魔光效 |
| `setUseAnimation(anim)` | 设置使用动画（如 'eat', 'drink'） |
| `setUseModifiers(movement, duration)` | 设置使用修饰值 |
| `setThrowable(swing, powerScale, ...)` | 设置可投掷 |
| `setProjectile(criticalPower, entity)` | 设置投射物 |
| `setInteractButton(text)` | 设置交互按钮文本 |
| `setBlockPlacer(block, replaceItem, useOn)` | 设置方块放置器 |
| `setCustomComponentV2(id, params)` | 设置自定义 V2 组件 |
| `combineComponents(...maps)` | 合并多个组件 Map |

---

## 7. format_version 设置

`format_version` 控制物品定义文件的格式版本，影响可用组件和行为。可在创建物品时通过 `options.format_version` 设置：

```typescript
// main.ts — format_version 示例
import { ItemAPI, registry, ItemComponent, ItemCategory } from '@sapdon/core'

// 指定 format_version
const item = ItemAPI.createItem(
    'my_mod:versioned_item',
    ItemCategory.Items,
    'diamond',
    {
        format_version: '1.21.40',  // 默认值
    }
)

item.addComponent(
    ItemComponent.setDisplayName('版本化物品')
)

registry.submit()
```

### 版本注意事项

| 版本 | 说明 |
|------|------|
| `1.21.40` | 默认版本，兼容大部分 addon 功能 |
| `1.21.90+` | 支持 `setCustomComponentV2()` 和 Scripting V2.0.0 |

### 完整示例：结合所有知识点

```typescript
// main.ts — 综合示例
import { ItemAPI, registry, ItemComponent, ItemCategory } from '@sapdon/core'

// 1. 基础物品
ItemAPI.createItem('my_mod:ingot', ItemCategory.Items, 'iron_ingot', {
    group: 'minecraft:itemGroup.name.ingredients',
    max_stack_size: 64,
})
.addComponent(ItemComponent.setDisplayName('§b神秘锭'))

// 2. 食物
ItemAPI.createFood('my_mod:special_food', ItemCategory.Items,     'apple', {
    nutrition: 8,
    saturationModifier: 1.5,
    canAlwaysEat: true,
    animation: 'eat',
})

// 3. 全套盔甲
ItemAPI.createHelmetArmor('my_mod:ruby_helmet', 'diamond', 'textures/models/armor/diamond')
ItemAPI.createChestplateArmor('my_mod:ruby_chestplate', 'diamond', 'textures/models/armor/diamond')
ItemAPI.createLeggingsArmor('my_mod:ruby_leggings', 'diamond', 'textures/models/armor/diamond')
ItemAPI.createBootArmor('my_mod:ruby_boots', 'diamond', 'textures/models/armor/diamond')

// 4. 高级工具（组合组件）
ItemAPI.createItem('my_mod:super_sword', ItemCategory.Equipment, 'diamond_sword', {
    format_version: '1.21.40',
})
.addComponent(
    ItemComponent.combineComponents(
        ItemComponent.setDisplayName('§6超级神剑'),
        ItemComponent.setHandEquipped(true),
        ItemComponent.setDurability(2000, 5, 15),
        ItemComponent.setGlint(true),
        ItemComponent.setInteractButton('释放技能'),
    )
)

// 提交所有注册
registry.submit()
```

---

### 下一步

- [API 参考](../api/item.md) — 完整的 Item API 文档
- [方块教程](./block.md) — 学习创建自定义方块
- [实体教程](./entity.md) — 学习创建自定义实体
