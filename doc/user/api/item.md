# 物品系统 API 参考

本文档提供 sapdon 框架中物品系统的完整 API 参考。

---

## 目录

1. [ItemAPI](#1-itemapi)
2. [Item 类](#2-item-类)
3. [ItemComponent](#3-itemcomponent)
4. [Armor 子类](#4-armor-子类)
5. [Food 类](#5-food-类)
6. [ItemCategory 枚举](#6-itemcategory-枚举)
7. [Attachable 类](#7-attachable-类)
8. [注册流程](#8-注册流程)

---

## 1. ItemAPI

`ItemAPI` 是一个工厂对象，提供创建各种类型物品的静态方法。所有创建方法会自动调用 `GRegistry.register()` 注册物品到游戏。

### createItem()

创建普通物品。

```typescript
import { ItemAPI, ItemCategory } from '@sapdon/core'

const item = ItemAPI.createItem(
    'my_mod:simple_item',    // identifier: string — 唯一标识符（命名空间:名称）
    ItemCategory.Items,       // category: string — 创造菜单分类
    'my_texture',             // texture: string — 纹理名称
    {                         // options?: object — 可选配置
        group: 'minecraft:itemGroup.name.ingredients',
        hide_in_command: false,   // 是否在命令中隐藏
        max_stack_size: 64,       // 最大堆叠数量
        format_version: '1.21.40', // 格式版本
    }
)
```

**参数：**

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `identifier` | string | 是 | 物品唯一标识符，格式 `namespace:name` |
| `category` | string | 是 | 创造模式物品栏分类 |
| `texture` | string | 是 | 纹理名称 |
| `options.group` | string | 否 | 物品分组 |
| `options.hide_in_command` | boolean | 否 | 是否在命令自动补全中隐藏（默认 false）。为 true 时自动创建附加物。 |
| `options.max_stack_size` | number | 否 | 最大堆叠数量（默认 64，范围 1-99） |
| `options.format_version` | string | 否 | 格式版本（默认 `'1.21.40'`） |

**返回值：** `Item` — 创建的物品实例。

---

### createFood()

创建食物物品。

```typescript
import { ItemAPI, ItemCategory } from '@sapdon/core'

const food = ItemAPI.createFood(
    'my_mod:magic_apple',    // identifier: string
    ItemCategory.Items,       // category: string
    'magic_apple',            // texture: string
    {
        group: 'minecraft:itemGroup.name.food',
        hide_in_command: false,
        animation: 'eat',            // 使用动画（'eat' | 'drink'）
        canAlwaysEat: false,         // 是否可随时食用
        nutrition: 6,                // 营养值
        saturationModifier: 1.2,     // 饱和度修正值
        movement: 1,                 // 移动速度修正
        useDuration: 1,              // 使用时间（秒）
    }
)
```

**参数：**

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `identifier` | string | — | 唯一标识符 |
| `category` | string | — | 创造菜单分类 |
| `texture` | string | — | 纹理名称 |
| `options.group` | string | `undefined` | 物品分组 |
| `options.hide_in_command` | boolean | `false` | 是否在命令中隐藏 |
| `options.animation` | string | `'eat'` | 食用动画 |
| `options.canAlwaysEat` | boolean | `false` | 是否可随时食用 |
| `options.nutrition` | number | `0` | 营养值（非负） |
| `options.saturationModifier` | number | `1` | 饱和度修正（正数） |
| `options.movement` | number | `1` | 食用时移动速度缩放 |
| `options.useDuration` | number | `1` | 食用所需时间（秒） |

**返回值：** `Food` — 创建的食物物品实例。

---

### createAttachable()

创建可附着物（用于手持 3D 模型或穿戴物品）。

```typescript
import { ItemAPI } from '@sapdon/core'

const attachable = ItemAPI.createAttachable(
    'my_mod:special_item',          // identifier: string
    'textures/items/special_item',  // texture: string — 纹理路径
    'entity_alphatest',              // material: string — 材质类型
    // options?: object — 当前未使用额外选项
)

// 进一步配置
attachable
    .addGeometry('default', 'geometry.special_item')
    .addTexture('enchanted', 'textures/misc/enchanted_item_glint')
    .addRenderController('controller.render.special_item')
```

**参数：**

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `identifier` | string | 是 | 唯一标识符 |
| `texture` | string | 是 | 纹理路径（如 `'textures/items/my_item'`） |
| `material` | string | 是 | 材质类型（如 `'entity_alphatest'`、`'armor'`） |
| `options` | object | 否 | 预留扩展参数 |

**返回值：** `Attachable` — 可附着物实例。

---

### createChestplateArmor()

创建胸甲盔甲。

```typescript
import { ItemAPI } from '@sapdon/core'

const chestplate = ItemAPI.createChestplateArmor(
    'my_mod:ruby_chestplate',       // identifier: string
    'ruby_chestplate',               // item_texture: string — 物品图标纹理
    'textures/models/armor/ruby',   // texture_path: string — 模型纹理路径
    {                                // options?: object
        // 可传入标准选项
    }
)
```

**返回值：** `Chestplate` — 胸甲实例。

---

### createHelmetArmor()

创建头盔盔甲。

```typescript
const helmet = ItemAPI.createHelmetArmor(
    'my_mod:ruby_helmet',
    'ruby_helmet',
    'textures/models/armor/ruby'
)
```

**返回值：** `Helmet` — 头盔实例。

---

### createBootArmor()

创建靴子盔甲。

```typescript
const boots = ItemAPI.createBootArmor(
    'my_mod:ruby_boots',
    'ruby_boots',
    'textures/models/armor/ruby'
)
```

**返回值：** `Boot` — 靴子实例。

---

### createLeggingsArmor()

创建护腿盔甲。

```typescript
const leggings = ItemAPI.createLeggingsArmor(
    'my_mod:ruby_leggings',
    'ruby_leggings',
    'textures/models/armor/ruby'
)
```

**返回值：** `Leggings` — 护腿实例。

---

### createFlipbookItem()

创建翻书物品（动态帧动画物品）。

```typescript
import { ItemAPI } from '@sapdon/core'

const flipbook = ItemAPI.createFlipbookItem(
    'my_mod:animated_block',     // identifier: string
    'construction',               // category: string
    'my_flipbook_tex',            // texture: string — 纹理名称
    {
        group: 'minecraft:itemGroup.name.construction',
        hide_in_command: false,
        ticks_per_frame: 8,       // 每帧持续刻数（默认 8，1秒=20刻）
        max_stack_size: 64,
        format_version: '1.21.40',
    }
)
```

**参数：**

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `identifier` | string | — | 唯一标识符 |
| `category` | string | — | 创造菜单分类 |
| `texture` | string | — | 纹理名称（位于 `textures/blocks/` 目录） |
| `options.group` | string | `undefined` | 物品分组 |
| `options.hide_in_command` | boolean | `false` | 是否在命令中隐藏 |
| `options.ticks_per_frame` | number | `8` | 每帧持续刻数 |
| `options.max_stack_size` | number | `64` | 最大堆叠数量 |
| `options.format_version` | string | `'1.21.40'` | 格式版本 |

**返回值：** `FlipbookItem` — 翻书物品实例。可通过 `.block` 属性访问关联的 `GeometryBlock`。

---

## 2. Item 类

`Item` 是所有物品类型的基类，提供组件管理和序列化功能。

### 构造函数

```typescript
import { Item } from '@sapdon/core'

const item = new Item(
    'my_mod:custom_item',   // identifier: string — 唯一标识符
    'items',                 // category: string — 创造菜单分类
    'custom_texture',        // texture: string — 纹理名称
    {                        // options?: object
        group: '...',
        hide_in_command: false,
        max_stack_size: 64,
        format_version: '1.21.40',
    }
)
```

**参数：**

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `identifier` | string | — | 唯一标识符 |
| `category` | string | — | 创造菜单分类 |
| `texture` | string | — | 纹理名称 |
| `options.group` | string | `undefined` | 分组 |
| `options.hide_in_command` | boolean | `false` | 是否在命令中隐藏 |
| `options.max_stack_size` | number | `64` | 最大堆叠数量 |
| `options.format_version` | string | `'1.21.40'` | 格式版本 |

构造函数自动添加 `minecraft:icon` 和 `minecraft:max_stack_size` 组件。

### 方法

#### addComponent(componentMap)

添加一个或多个组件到物品。

```typescript
item.addComponent(
    ItemComponent.setDisplayName('自定义物品')
)

// 或合并多个组件
item.addComponent(
    ItemComponent.combineComponents(
        ItemComponent.setHandEquipped(true),
        ItemComponent.setDurability(100),
    )
)
```

| 参数 | 类型 | 描述 |
|------|------|------|
| `componentMap` | Map | 组件 Map 对象 |

**返回值：** `this` — 支持链式调用。

---

#### removeComponent(key)

移除指定组件。

```typescript
item.removeComponent('minecraft:icon')  // 移除图标组件
```

| 参数 | 类型 | 描述 |
|------|------|------|
| `key` | string | 要移除的组件名称 |

**返回值：** `this` — 支持链式调用。

---

#### toObject()

将物品转换为 JSON 对象（使用 `@Serializer` 装饰器），用于生成物品定义文件。

```typescript
const json = item.toObject()
// 输出格式：
// {
//   format_version: '1.21.40',
//   'minecraft:item': {
//     description: { identifier, menu_category },
//     components: { ... }
//   }
// }
```

**返回值：** `object` — 序列化后的物品定义对象。

---

## 3. ItemComponent

`ItemComponent` 提供静态方法，用于构建 `minecraft:item` 的组件 Map。每个方法返回一个 `Map<string, any>`。

### setIcon(texture)

设置物品图标纹理。

```typescript
ItemComponent.setIcon('my_texture')
// → Map { 'minecraft:icon' => 'my_texture' }
```

| 参数 | 类型 | 描述 |
|------|------|------|
| `texture` | string | 纹理名称 |

---

### setMaxStackSize(size)

设置最大堆叠数量。

```typescript
ItemComponent.setMaxStackSize(16)
// → Map { 'minecraft:max_stack_size' => 16 }
```

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `size` | number | `64` | 最大堆叠数量（正整数） |

---

### setDisplayName(name)

设置物品显示名称。

```typescript
ItemComponent.setDisplayName('§c传奇之剑')
// → Map { 'minecraft:display_name' => { value: '§c传奇之剑' } }
```

| 参数 | 类型 | 描述 |
|------|------|------|
| `name` | string | 显示名称（支持 § 颜色代码） |

---

### setFoodComponent(nutrition, saturation, canAlwaysEat?, usingConvertsTo?)

设置食物属性组件。

```typescript
ItemComponent.setFoodComponent(true, 6, 1.2)
// → Map { 'minecraft:food' => { can_always_eat: true, nutrition: 6, saturation_modifier: 1.2 } }
```

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `canAlwaysEat` | boolean | — | 是否可随时食用 |
| `nutrition` | number | `0` | 营养值 |
| `saturationModifier` | number | `0.6` | 饱和度修正值 |
| `usingConvertsTo` | string | `undefined` | 食用后转换的目标物品 ID |

---

### setWearable(slot, protection)

设置可穿戴组件。

```typescript
// 头盔
ItemComponent.setWearable(3, 'slot.armor.head')
// 胸甲
ItemComponent.setWearable(5, 'slot.armor.chest')
// 护腿
ItemComponent.setWearable(6, 'slot.armor.legs')
// 靴子
ItemComponent.setWearable(4, 'slot.armor.feet')
// → Map { 'minecraft:wearable' => { protection: 3, slot: 'slot.armor.head' } }
```

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `protection` | number | `0` | 保护值 |
| `slot` | string | `undefined` | 装备槽位（如 `'slot.armor.head'`） |

---

### setFuel(duration)

设置燃料组件，使物品可在熔炉中作为燃料使用。

```typescript
ItemComponent.setFuel(200)
// → Map { 'minecraft:fuel' => { duration: 200 } }
```

| 参数 | 类型 | 描述 |
|------|------|------|
| `duration` | number | 燃烧持续时间（秒），最小值 0.05 |

---

### setGlint(hasGlint)

设置附魔光效。

```typescript
ItemComponent.setGlint(true)
// → Map { 'minecraft:glint' => true }
```

| 参数 | 类型 | 描述 |
|------|------|------|
| `hasGlint` | boolean | 是否显示附魔光效 |

---

### setHandEquipped(isHandEquipped)

设置手持渲染方式。

```typescript
ItemComponent.setHandEquipped(true)  // 像工具一样手持
ItemComponent.setHandEquipped(false) // 像物品一样手持
// → Map { 'minecraft:hand_equipped' => true }
```

| 参数 | 类型 | 描述 |
|------|------|------|
| `isHandEquipped` | boolean | 是否像工具一样渲染 |

---

### setThrowable(doSwingAnimation?, launchPowerScale?, maxDrawDuration?, maxLaunchPower?, minDrawDuration?, scalePowerByDrawDuration?)

设置可投掷组件。

```typescript
ItemComponent.setThrowable(true, 1.5, 0, 2.0, 0, true)
// → Map { 'minecraft:throwable' => { do_swing_animation: true, launch_power_scale: 1.5, ... } }
```

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `doSwingAnimation` | boolean | `false` | 是否使用挥动动画 |
| `launchPowerScale` | number | `1.0` | 投掷力量缩放 |
| `maxDrawDuration` | number | `0.0` | 最大蓄力时间 |
| `maxLaunchPower` | number | `1.0` | 最大投掷力量 |
| `minDrawDuration` | number | `0.0` | 最小蓄力时间 |
| `scalePowerByDrawDuration` | boolean | `false` | 力量是否随蓄力增加 |

---

### setProjectile(minimumCriticalPower?, projectileEntity?)

设置投射物组件。

```typescript
ItemComponent.setProjectile(0.5, 'minecraft:snowball')
// → Map { 'minecraft:projectile' => { minimum_critical_power: 0.5, projectile_entity: 'minecraft:snowball' } }
```

| 参数 | 类型 | 描述 |
|------|------|------|
| `minimumCriticalPower` | number | 暴击所需的最小蓄力值 |
| `projectileEntity` | string | 发射的投射物实体 ID |

---

### setUseModifiers(movementModifier?, useDuration?)

设置使用修饰组件。

```typescript
ItemComponent.setUseModifiers(0.5, 1.5)
// → Map { 'minecraft:use_modifiers' => { movement_modifier: 0.5, use_duration: 1.5 } }
```

| 参数 | 类型 | 描述 |
|------|------|------|
| `movementModifier` | number | 使用物品时玩家移动速度缩放值 |
| `useDuration` | number | 物品使用所需时间（秒） |

---

### setUseAnimation(animation)

设置使用动画。

```typescript
ItemComponent.setUseAnimation('eat')
ItemComponent.setUseAnimation('drink')
// → Map { 'minecraft:use_animation' => 'eat' }
```

| 参数 | 类型 | 描述 |
|------|------|------|
| `animation` | string | 动画类型（如 `'eat'`、`'drink'`） |

---

### setDurability(maxDurability, damageChanceMin?, damageChanceMax?)

设置耐久度组件。

```typescript
ItemComponent.setDurability(500, 10, 50)
// → Map { 'minecraft:durability' => { max_durability: 500, damage_chance: { min: 10, max: 50 } } }
```

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `maxDurability` | number | — | 最大耐久值 |
| `damageChanceMin` | number | `0` | 最小损坏概率（百分比） |
| `damageChanceMax` | number | `100` | 最大损坏概率（百分比） |

---

### setInteractButton(text)

设置交互按钮文本。

```typescript
ItemComponent.setInteractButton('打开')
// → Map { 'minecraft:interact_button' => '打开' }
```

| 参数 | 类型 | 描述 |
|------|------|------|
| `text` | string | 交互时显示的文本 |

---

### setBlockPlacer(block, replaceBlockItem?, useOn?)

设置方块放置器组件。

```typescript
ItemComponent.setBlockPlacer(
    'my_mod:custom_block',    // 要放置的方块 ID
    false,                    // 是否替换方块物品
    ['my_mod:custom_block']  // 可以使用的方块列表
)
// → Map { 'minecraft:block_placer' => { block: '...', replace_block_item: false, use_on: [...] } }
```

| 参数 | 类型 | 描述 |
|------|------|------|
| `block` | string | 要放置的方块标识符 |
| `replaceBlockItem` | boolean | 是否替换方块物品 |
| `useOn` | string[] | 可使用此物品的方块列表 |

---

### setCustomComponentV2(componentId, params)

设置自定义 V2 组件（需要 format_version > 1.21.90 和 Scripting V2）。

```typescript
ItemComponent.setCustomComponentV2(
    'my_mod:my_component',
    { speed: 1.5, damage: 10 }
)
// → Map { 'my_mod:my_component' => { speed: 1.5, damage: 10 } }
```

| 参数 | 类型 | 描述 |
|------|------|------|
| `componentId` | string | 组件标识符 |
| `params` | object | 自定义参数对象 |

---

### combineComponents(...maps)

将多个组件 Map 合并为一个。

```typescript
const combined = ItemComponent.combineComponents(
    ItemComponent.setDisplayName('神剑'),
    ItemComponent.setHandEquipped(true),
    ItemComponent.setDurability(1000),
)
// → Map { 'minecraft:display_name': ..., 'minecraft:hand_equipped': ..., 'minecraft:durability': ... }
```

| 参数 | 类型 | 描述 |
|------|------|------|
| `...componentMaps` | Map[] | 多个组件 Map |

**返回值：** `Map` — 合并后的组件集合。

---

### toJSON(components)

将组件 Map 转换为普通 JSON 对象。

```typescript
const map = ItemComponent.setDisplayName('测试')
const json = ItemComponent.toJSON(map)
// → { 'minecraft:display_name': { value: '测试' } }
```

| 参数 | 类型 | 描述 |
|------|------|------|
| `components` | Map | 组件集合 |

**返回值：** `object` — JSON 对象。

---

### setCustomComponents(customComponents)

设置自定义组件数组。

```typescript
ItemComponent.setCustomComponents(['my_mod:my_component'])
// → Map { 'minecraft:custom_components' => ['my_mod:my_component'] }
```

| 参数 | 类型 | 描述 |
|------|------|------|
| `customComponents` | string[] | 自定义组件标识符数组 |

---

## 4. Armor 子类

盔甲系统包含四个子类，分别对应四种盔甲类型。它们继承自 `Armor` 基类，内部创建 `Item` 和 `Attachable` 实例。

### Armor 基类

```typescript
// 基类构造函数（不直接使用）
new Armor(identifier, category, item_texture, texture_path, options?)
```

| 属性/方法 | 类型 | 描述 |
|-----------|------|------|
| `item` | Item | 关联的物品实例 |
| `attachable` | Attachable | 关联的可附着物实例 |
| `setArrachableGeometry(key, geometry)` | this | 设置可附着物几何模型 |

### 子类对照表

| 类 | 创建方法 | 保护值 | 插槽 | 几何模型 | 脚本 |
|----|---------|--------|------|---------|------|
| **Helmet** | `ItemAPI.createHelmetArmor()` | 3 | `slot.armor.head` | `geometry.player.armor.helmet` | `v.helmet_layer_visible = 0.0;` |
| **Chestplate** | `ItemAPI.createChestplateArmor()` | 5 | `slot.armor.chest` | `geometry.player.armor.chestplate` | `v.chest_layer_visible = 0.0;` |
| **Leggings** | `ItemAPI.createLeggingsArmor()` | 6 | `slot.armor.legs` | `geometry.player.armor.leggings` | `v.leg_layer_visible = 0.0;` |
| **Boot** | `ItemAPI.createBootArmor()` | 4 | `slot.armor.feet` | `geometry.player.armor.boots` | `v.boot_layer_visible = 0.0;` |

### 默认配置

所有盔甲子类自动配置以下属性：

- 分类：`'equipment'`
- 分组：对应的 `itemGroup.name.*`
- 最大堆叠数量：`1`
- 显示名称：各类型的默认名称
- 纹理：通过 `texture_path` 参数指定
- 材质：`'armor'`（默认）和 `'armor_enchanted'`（附魔）
- 渲染控制器：`'controller.render.armor'`

```typescript
// 自定义盔甲几何模型示例
ItemAPI.createHelmetArmor('my_mod:custom_helmet', 'custom_helmet', 'textures/models/armor/custom')
    .setArrachableGeometry('default', 'geometry.custom.helmet')
```

---

## 5. Food 类

`Food` 继承自 `Item`，自动添加食物相关组件。

```typescript
class Food extends Item {
    constructor(identifier, category, texture, options?)
}
```

### 构造函数自动添加的组件

| 组件 | 来源 |
|------|------|
| `minecraft:icon` | 父类构造 |
| `minecraft:max_stack_size` | 父类构造 |
| `minecraft:use_modifiers` | Food 构造 |
| `minecraft:food` | Food 构造 |
| `minecraft:use_animation` | Food 构造 |

```typescript
import { Food } from '@sapdon/core'

const food = new Food('my_mod:apple', 'items', 'apple', {
    nutrition: 8,
    saturationModifier: 1.5,
    canAlwaysEat: true,
    animation: 'eat',
    movement: 0.8,
    useDuration: 1.5,
})
```

---

## 6. ItemCategory 枚举

`ItemCategory` 提供标准的创造模式物品栏分类。

```typescript
enum ItemCategory {
    Commands     = 'commands',      // 命令分类
    Construction = 'construction',  // 建筑分类
    Equipment    = 'equipment',     // 装备分类
    Nature       = 'nature',        // 自然分类
    Items        = 'items',         // 物品分类
    None         = 'none',          // 无分类
}
```

### 使用示例

```typescript
import { ItemAPI, ItemCategory } from '@sapdon/core'

// 使用枚举值
ItemAPI.createItem('test:item', ItemCategory.Construction, 'tex')
// 等价于
ItemAPI.createItem('test:item', 'construction', 'tex')
```

---

## 7. Attachable 类

`Attachable` 用于创建可附着物（attachables），实现手持 3D 模型或穿戴物品渲染。继承自 `AddonAttachableDescription`。

### 构造函数

```typescript
import { Attachable } from '@sapdon/core'

const att = new Attachable('my_mod:my_attachable')
```

### 方法

| 方法 | 描述 |
|------|------|
| `addMaterial(name, material)` | 添加材质（如 `'default'`, `'entity_alphatest'`） |
| `addTexture(name, texture)` | 添加纹理路径 |
| `addGeometry(name, geometry)` | 添加几何模型标识符 |
| `addAnimation(name, animation)` | 添加动画 |
| `addAnimationController(name, controller)` | 添加动画控制器 |
| `addRenderController(controller)` | 添加渲染控制器 |
| `addLocator(name, locator)` | 添加定位器 |
| `setScript(key, value)` | 设置脚本变量 |
| `getId()` | 获取标识符 |
| `toObject()` | 序列化为 JSON |

### 完整示例

```typescript
const att = new Attachable('my_mod:custom_armor')
att
    .addMaterial('default', 'armor')
    .addMaterial('enchanted', 'armor_enchanted')
    .addTexture('default', 'textures/models/armor/custom_main')
    .addTexture('enchanted', 'textures/misc/enchanted_actor_glint')
    .addGeometry('default', 'geometry.player.armor.chestplate')
    .addRenderController('controller.render.armor')
    .setScript('parent_setup', 'v.chest_layer_visible = 0.0;')
```

---

## 8. 注册流程

所有通过 `ItemAPI` 创建的对象会自动注册到游戏。但如果你手动创建 `Item` 或需要提交注册数据，需要调用 `registry.submit()`。

### 基本流程

```typescript
import { ItemAPI, registry, ItemComponent, ItemCategory } from '@sapdon/core'

// 1. 创建物品（自动注册到全局注册表）
ItemAPI.createItem('my_mod:sword', ItemCategory.Equipment, 'sword')

// 2. 提交所有注册数据到游戏引擎
//    必须在所有物品创建完成后调用
registry.submit()
```

### 手动注册

```typescript
import { GRegistry } from '@sapdon/core'

// 手动注册物品数据
GRegistry.register(
    'my_item',            // name: string — 文件名（不含扩展名）
    'behavior',           // root: string — 根目录（'behavior' / 'resource'）
    'items/',             // path: string — 子目录
    itemDataObject        // data: object — 数据对象（需有 toObject 方法）
)

// 提交
GRegistry.submit()
```

### registry 命名空间

```typescript
import { registry } from '@sapdon/core'

// 提交所有注册数据
registry.submit()
```

### 完整工作流

```typescript
// main.ts
import { ItemAPI, registry, ItemComponent, ItemCategory } from '@sapdon/core'

// === 定义所有物品 ===

// 基础物品
ItemAPI.createItem('my_mod:materials', ItemCategory.Items, 'materials')
    .addComponent(ItemComponent.setDisplayName('§b基础材料'))

// 食物
ItemAPI.createFood('my_mod:food', ItemCategory.Items, 'food', {
    nutrition: 8,
    saturationModifier: 1.5,
})

// 盔甲
ItemAPI.createHelmetArmor('my_mod:helmet', 'helmet', 'textures/models/armor/set')
ItemAPI.createChestplateArmor('my_mod:chestplate', 'chestplate', 'textures/models/armor/set')

// === 提交注册 ===
registry.submit()
```

> **重要**：`registry.submit()` 必须在所有物品创建完成后调用一次，且通常在文件末尾执行。
