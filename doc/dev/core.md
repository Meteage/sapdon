# Core 模块文档

`src/core/` 是 Sapdon 的核心库，提供 Minecraft Addon 的所有数据定义、业务逻辑、工厂 API 和注册系统。

---

## 1. 架构总览

核心库采用 **三层架构**：

```
┌─────────────────────────────────────────────────────┐
│  工厂/API 层  src/core/factory/                      │
│  ItemAPI, EntityAPI, BlockAPI, RecipeAPI...          │
│  用户直接调用的静态 API，创建实例并调用 GRegistry 注册  │
├─────────────────────────────────────────────────────┤
│  业务逻辑层  src/core/{item,entity,block,biome,...}/  │
│  Item, Entity, Block, Biome, Feature...              │
│  封装组件操作，内部使用 addon/ 的 DTO 生成 JSON        │
├─────────────────────────────────────────────────────┤
│  DTO 层  src/core/addon/                             │
│  AddonItem, AddonEntity, AddonBlock, AddonRecipe...   │
│  纯数据类，1:1 映射 Minecraft JSON Schema             │
│  每个类有 @Serializer 装饰的 toObject() 方法           │
└─────────────────────────────────────────────────────┘
```

外加：

| 模块 | 职责 |
|------|------|
| `registry.ts` | 客户端注册系统，通过 `transport/` 模块向 CLI dev server 提交数据 |
| `texture.js` | 纹理管理器（ItemTextureManager、TerrainTextureManager、FlipbookTextures） |
| `ui/` | Minecraft JSON UI 系统生成器 |
| `extra/` | 附加功能（客户端实体外观、载具基类） |
| `type.ts` | 共享 TypeScript 类型定义 |

---

## 2. 目录结构

```
src/core/
├── index.js                     # 包入口，聚合导出所有模块
├── registry.ts                  # 注册系统 (GRegistry / registry.submit)
├── transport/
│   └── client.ts                # HTTP POST 客户端，向 CLI dev server 提交数据
├── texture.js                   # 纹理管理器
├── type.ts                      # 共享类型 (MaterialDesc, RideableComponent 等)
│
├── addon/                       # ── DTO 层 ──
│   ├── index.ts                 #   聚合导出
│   ├── biome.ts                 #   AddonBiome, AddonBiomeDescription, AddonBiomeDefinition
│   ├── manifest.ts              #   AddonManifest, Header, Module, Dependency, Metadata
│   ├── menuCategory.ts          #   AddonMenuCategory
│   ├── featureRule.ts           #   AddonFeatureRule, Definition, Description
│   ├── block/block.ts           #   AddonBlock, AddonBlockDefinition, AddonBlockDescription
│   ├── entity/entity.ts         #   AddonEntity, AddonEntityDefinition, AddonEntityDescription
│   ├── entity/clientEntity.ts   #   AddonClientEntity, Definition, Description
│   ├── item/item.ts             #   AddonItem, AddonItemDefinition, AddonItemDescription
│   ├── item/attachable.ts       #   AddonAttachable, Definition, Description
│   ├── feature/oreFeature.ts    #   AddonOreFeature, Description, Definition
│   ├── controllers/             #   动画控制器 + 渲染控制器 DTO
│   └── recipe/                  #   配方 DTO (baseRecipe, shaped, shapeless, furnace, data)
│
├── item/                        # ── 业务逻辑层 ──
│   ├── index.ts
│   ├── item.js                  #   Item 基类
│   ├── itemComponents.js        #   ItemComponent 静态工厂 (~20 个组件方法)
│   ├── food.js                  #   Food extends Item
│   ├── flipbookItem.ts          #   FlipbookItem (动画纹理物品)
│   ├── attachable.js            #   Attachable extends AddonAttachableDescription
│   └── armor.js                 #   Armor / Chestplate / Boot / Leggings / Helmet
│
├── entity/                      # ── 业务逻辑层 ──
│   ├── index.ts
│   ├── entity.js                #   Entity (组合 BasicEntity + ClientEntity)
│   ├── basicEntity.js           #   BasicEntity (行为包实体)
│   ├── clientEntity.js          #   ClientEntity (资源包实体, extends AddonClientEntityDescription)
│   ├── dummyEntity.js           #   DummyEntity (无物理实体)
│   ├── nativeEntity.js          #   NativeEntity (基于原版实体)
│   ├── projectile.js            #   Projectile (抛射物)
│   ├── componets/               #   实体组件工厂
│   ├── behavior/                #   AI 行为类 (tempt, randomStroll, pickupItem...)
│   ├── bundles/                 #   组件包 (BasicMovementBundle)
│   ├── navigation/              #   导航组件
│   └── data/                    #   原版实体数据 (nativeEntityData)
│
├── block/                       # ── 业务逻辑层 ──
│   ├── index.ts
│   ├── basicBlock.js            #   BasicBlock 基类
│   ├── block.js                 #   Block (多变体方块)
│   ├── cropBlock.js             #   CropBlock (作物方块)
│   ├── geometryBlock.js         #   GeometryBlock (几何方块)
│   ├── rotatableBlock.js        #   RotatableBlock (可旋转方块)
│   ├── oreBlock.js              #   OreBlock (矿物 + 特征 + 特征规则组合)
│   ├── tileBlock.js             #   TileBlock (方块 + 实体组合)
│   └── blockComponent.js        #   BlockComponent 静态工厂 (~35 个组件方法)
│
├── biome/                       # ── 业务逻辑层 ──
│   ├── index.ts
│   ├── biome.js                 #   Biome 类
│   └── biomeComponent.js        #   BiomeComponent 静态工厂
│
├── feature/                     # ── 业务逻辑层 ──
│   ├── index.ts
│   └── oreFeature.js            #   OreFeature 类
│
├── feature-rule/                # ── 业务逻辑层 ──
│   ├── index.ts
│   ├── featureRule.js           #   FeatureRule 类
│   ├── condition/               #   特征放置条件 (biomeFilter, featureConditions)
│   └── distribution/            #   特征分布 (featureDistribution, coordinateDistribution)
│
├── factory/                     # ── 工厂/API 层 ──
│   ├── index.ts
│   ├── itemFactory.js           #   ItemAPI
│   ├── entityFactory.js         #   EntityAPI
│   ├── blockFactory.js          #   BlockAPI
│   ├── biomeFactory.js          #   BiomeAPI
│   ├── recipeFactory.js         #   RecipeAPI
│   ├── featureFactory.js        #   FeatureAPI
│   ├── uiFactory.js             #   UiAPI
│   └── itemExtra.ts             #   ItemCategory 枚举
│
├── ui/                          # ── UI 系统 ──
│   ├── index.ts
│   ├── export.js                #   聚合导出所有 UI 组件
│   ├── buttonMapping.js         #   ButtonMapping 类
│   ├── dataBindingObject.js     #   DataBindingObject 类
│   ├── elements/                #   UI 元素 (UIElement, Panel, Button, Image, Label, Grid...)
│   ├── properties/              #   UI 属性 (Control, Layout, DataBinding, Sprite, Text...)
│   └── systems/                 #   UI 系统 (UISystem, Chest, ServerForm, Guidebook, HUD, NeoGuidebook...)
│
└── extra/                       # ── 附加模块 ──
    ├── apperance.ts             #   ClientEntityApperance (实体外观管理)
    └── vehicle.ts               #   BaseVehicle (载具基类)
```

---

## 3. DTO 层 (`addon/`)

DTO (Data Transfer Object) 是框架的最底层，每个类对应一个 Minecraft JSON Schema。所有 DTO 类都有一个 `@Serializer` 装饰的 `toObject()` 方法，输出标准的 Minecraft JSON 格式。

### 3.1 通用结构

```typescript
class AddonXXX {
  @Serializer
  toObject() {
    return {
      format_version: "1.XX.0",
      "minecraft:xxx": {        // Schema 标识符
        description: { ... },
        components: { ... }
      }
    }
  }
}
```

### 3.2 完整 DTO 列表

| 文件 | 类 | 输出 JSON Schema |
|------|---|-----------------|
| `item/item.ts` | `AddonItem`, `AddonItemDefinition`, `AddonItemDescription` | `minecraft:item` |
| `item/attachable.ts` | `AddonAttachable`, `AddonAttachableDefinition`, `AddonAttachableDescription` | `minecraft:attachable` |
| `entity/entity.ts` | `AddonEntity`, `AddonEntityDefinition`, `AddonEntityDescription` | `minecraft:entity` |
| `entity/clientEntity.ts` | `AddonClientEntity`, `AddonClientEntityDefinition`, `AddonClientEntityDescription` | `minecraft:client_entity` |
| `block/block.ts` | `AddonBlock`, `AddonBlockDefinition`, `AddonBlockDescription` | `minecraft:block` |
| `biome.ts` | `AddonBiome`, `AddonBiomeDescription`, `AddonBiomeDefinition` | `minecraft:biome` |
| `featureRule.ts` | `AddonFeatureRule`, `AddonFeatureRuleDenifition`, `AddonFeatureRuleDecription` | `minecraft:feature_rules` |
| `feature/oreFeature.ts` | `AddonOreFeature`, `AddonOreFeatureDescription`, `AddonOreFeatureDefinition` | `minecraft:ore_feature` |
| `controllers/animationController.ts` | `AddonAnimationController`, `AddonAnimationStateMachine` | `animation_controllers` |
| `controllers/render_controllers.ts` | `AddonRenderControllerGroup`, `AddonRenderController` | `render_controllers` |
| `recipe/baseRecipe.ts` | `AddonRecipe` (基类) | 各类配方 |
| `recipe/shaped.ts` | `AddonRecipeShaped` 及版本变体 | `minecraft:recipe_shaped` |
| `recipe/shapeless.ts` | `AddonRecipeShapeless` 及版本变体 | `minecraft:recipe_shapeless` |
| `recipe/furnace.ts` | `AddonRecipeFurnace` 及版本变体 | `minecraft:recipe_furnace` |
| `manifest.ts` | `AddonManifest`, `AddonManifestHeader`, `AddonManifestModule` | `manifest.json` |
| `menuCategory.ts` | `AddonMenuCategory` | 菜单分类 |

### 3.3 序列化机制

序列化系统定义在 `src/utils/serializable.ts`：

- `@Serializer` — 方法装饰器，标记 `toObject()` 为序列化方法
- `serialize(instance)` — 查找实例的序列化器并调用
- 序列化器存储在 `WeakMap<Constructor, ISerializer>` 中

DTO 层是生产方，业务逻辑层的 `toObject()` 委托给 DTO 的 `@Serializer`：

```typescript
// 业务逻辑层 (Item)
class Item {
  @Serializer
  toObject() {
    const dto = new AddonItem(this.identifier, ...)
    return serialize(dto)  // → 调用 AddonItem 的 @Serializer
  }
}
```

### 3.4 配方数据常量 (`recipe/data.ts`)

| 导出 | 说明 |
|------|------|
| `RecipeInputTags` | 52 个物品标签映射 (e.g. `Armor: "minecraft:is_armor"`) |
| `RecipeTags` | 配方站标识 (Furnace, smoker, Campfire, CraftingTable) |
| `RecipeTypes` | 配方类型标识 (Furnace, Shaped, Shapeless) |

---

## 4. 业务逻辑层

### 4.1 Item 体系

```
Item
├── Food           (食物物品)
├── FlipbookItem   (动画纹理物品)
└── Armor          (盔甲)
    ├── Chestplate
    ├── Boot
    ├── Leggings
    └── Helmet

Attachable (extends AddonAttachableDescription，独立体系)
```

#### `Item` (`item/item.js`)

| 方法 | 说明 |
|------|------|
| `constructor(identifier, category, texture, options)` | 创建物品，默认添加 icon + max_stack_size 组件 |
| `addComponent(componentMap)` | 添加组件 Map |
| `removeComponent(key)` | 移除组件 |
| `toObject()` | 序列化为 `AddonItem` |

**options**: `{ group, hide_in_command, max_stack_size, format_version }`

#### `ItemComponent` (`item/itemComponents.js`)

静态工厂方法，每个返回 `Map<string, any>`：

| 方法 | 对应 Minecraft 组件 |
|------|-------------------|
| `setIcon(texture)` | `minecraft:icon` |
| `setMaxStackSize(size)` | `minecraft:max_stack_size` |
| `setDisplayName(name)` | `minecraft:display_name` |
| `setFoodComponent(nutrition, saturation)` | `minecraft:food` |
| `setWearable(slot)` | `minecraft:wearable` |
| `setFuel(duration)` | `minecraft:fuel` |
| `setGlint(bool)` | `minecraft:glint` |
| `setHandEquipped(bool)` | `minecraft:hand_equipped` |
| `setThrowable(launchPower)` | `minecraft:throwable` |
| `setProjectile(projectile)` | `minecraft:projectile` |
| `setUseModifiers(movement, duration)` | `minecraft:use_modifiers` |
| `setUseAnimation(animation)` | `minecraft:use_animation` |
| `setDurability(maxDurability)` | `minecraft:durability` |
| `setInteractButton(text)` | `minecraft:interact_button` |
| `setBlockPlacer(block)` | `minecraft:block_placer` |
| `setCustomComponentV2(id, data)` | `minecraft:custom_components` |
| `combineComponents(...maps)` | 合并多个组件 Map |

#### `Food` (`item/food.js`)

extends `Item`。自动添加 `use_modifiers` (0.35 移动, 32 持续)、`food` (4 营养, 0.6 饱和) 和 `use_animation` ("eat") 组件。

#### `Armor` (`item/armor.js`)

组合 `Item` + `Attachable`。每个盔甲类型预设不同插槽和保护值：

| 类型 | 插槽 | 保护 |
|------|------|------|
| `Helmet` | `slot.armor.head` | 3 |
| `Chestplate` | `slot.armor.chest` | 5 |
| `Leggings` | `slot.armor.legs` | 6 |
| `Boot` | `slot.armor.feet` | 4 |

#### `Attachable` (`item/attachable.js`)

extends `AddonAttachableDescription`。管理可附着物品的材质、纹理、几何和渲染控制器。

#### `FlipbookItem` (`item/flipbookItem.ts`)

extends `Item`。动画纹理物品，内部创建 `GeometryBlock` 用于 3D 展示，并通过 `FlipbookTextures` 注册翻书纹理动画。

---

### 4.2 Entity 体系

```
BasicEntity (行为包实体)
ClientEntity (资源包实体, extends AddonClientEntityDescription)

Entity (组合 BasicEntity + ClientEntity)
├── DummyEntity (无物理实体)

NativeEntity (基于原版实体)
└── Projectile (抛射物)
```

#### `BasicEntity` (`entity/basicEntity.js`)

行为包实体核心类：

| 方法 | 说明 |
|------|------|
| `constructor(identifier, options, data)` | 创建实体，含 `properties`, `components`, `component_groups`, `events` 四个 Map |
| `addComponent(map)` / `removeComponent(key)` / `clearComponents()` | 组件操作 |
| `addProperty(id, obj)` / `removeProperty(id)` | 属性操作 |
| `addComponentGroup(id)` / `removeComponentGroup(id)` | 组件组操作 |
| `addEvent(id, obj)` / `removeEvent(id)` | 事件操作 |
| `toObject()` | 序列化为 `AddonEntity` |

#### `ClientEntity` (`entity/clientEntity.js`)

extends `AddonClientEntityDescription`。资源包实体，管理材质、纹理、几何、动画、渲染控制器等。

#### `Entity` (`entity/entity.js`)

组合 `BasicEntity` + `ClientEntity`，提供统一的 `entity.behavior` 和 `entity.resource` 访问。

#### `DummyEntity` (`entity/dummyEntity.js`)

extends `Entity`。预设无物理碰撞的虚拟实体。

#### `NativeEntity` (`entity/nativeEntity.js`)

克隆原版实体行为。使用 `NativeEntityData` 中的原版 JSON 数据设定 `runtime_identifier`。

#### `Projectile` (`entity/projectile.js`)

extends `NativeEntity`。基于 `minecraft:snowball` 的抛射物实体。

#### `EntityComponent` (`entity/componets/entityComponet.js`)

静态工厂方法 (~30 个)：

| 方法 | 组件 |
|------|------|
| `setHealth(value, max)` | `minecraft:health` |
| `setPhysics()` | `minecraft:physics` |
| `setCollisionBox(width, height)` | `minecraft:collision_box` |
| `setScale(value)` | `minecraft:scale` |
| `setPushable(isPushable, isPushableByPiston)` | `minecraft:pushable` |
| `setMovement(value)` | `minecraft:movement` |
| `setTypeFamily(families)` | `minecraft:type_family` |
| `setNavigationWalk(options)` | `minecraft:navigation.walk` |
| `setRideable(options)` | `minecraft:rideable` |
| `setEquipment(equipment)` | `minecraft:equipment` |
| `setInventoryProperties(options)` | `minecraft:inventory` |
| `combineComponents(...maps)` | 合并多个组件 Map |

#### AI Behavior 类 (`entity/behavior/`)

| 类 | 组件 |
|----|------|
| `TemptBehavior` | `minecraft:behavior.tempt` |
| `RandomStrollBehavior` | `minecraft:behavior.random_stroll` |
| `PickupItemsBehavior` | `minecraft:behavior.pickup_items` |
| `NearestAttackableTargetBehavor` | `minecraft:behavior.nearest_attackable_target` |
| `FollowParentBehavior` | `minecraft:behavior.follow_parent` |
| `FollowMobBehavior` | `minecraft:behavior.follow_mob` |

#### Component Bundles (`entity/bundles/`)

| 导出 | 说明 |
|------|------|
| `BasicBundle` | 组件集合类，可批量应用 |
| `BasicMovementBundle` | 预置包：`setMovement(0.2)` + `setMovementBasic()` |

---

### 4.3 Block 体系

```
BasicBlock (基础方块)
├── Block (多变体方块)
│   └── CropBlock (作物方块)
├── GeometryBlock (自定义几何方块)
└── RotatableBlock (可旋转方块)
    └── ROTATION_TYPES: CARDINAL, FACING, BLOCK_FACE, LOG

OreBlock (矿物 — 组合 BasicBlock + OreFeature + FeatureRule)
TileBlock (方块+实体 — 组合 BasicBlock + Entity)
```

#### `BasicBlock` (`block/basicBlock.js`)

| 方法 | 说明 |
|------|------|
| `constructor(identifier, category, textures_arr[6], options)` | 6 纹理方块 (down, up, north, south, west, east) |
| `addComponent(map)` / `removeComponent(key)` | 组件操作 |
| `addPermutation(condition, componentMap)` | 添加 permutation |
| `registerTrait(key, value)` / `registerState(key, value)` | 注册 trait / state |
| `toObject()` | 序列化为 `AddonBlock` |

#### `Block` (`block/block.js`)

extends `BasicBlock`。多变体方块，根据 `variantDatas` 创建 permutations。注册 `sapdon:block_variant_tag` state。

#### `RotatableBlock` (`block/rotatableBlock.js`)

extends `BasicBlock`。支持 4 种旋转方式：

```typescript
RotationTypes.CARDINAL  // minecraft:cardinal_direction (4向)
RotationTypes.FACING    // minecraft:facing_direction (6向)
RotationTypes.BLOCK_FACE // minecraft:block_face (6向)
RotationTypes.LOG        // minecraft:pillar_axis (轴向旋转)
```

#### `BlockComponent` (`block/blockComponent.js`)

静态工厂方法 (~35 个)，涵盖所有 Minecraft 方块组件。

#### `OreBlock` (`block/oreBlock.js`)

组合模式：创建一个 `BasicBlock` + `OreFeature` + `FeatureRule`，同时注册三个产物。

#### `TileBlock` (`block/tileBlock.js`)

组合模式：创建 `BasicBlock` + `Entity` 对，通过 `sapdon:block_or_entity` state 切换。

---

### 4.4 Biome 体系

| 文件 | 类/导出 | 说明 |
|------|---------|------|
| `biome/biome.js` | `Biome` | 生物群系业务类，`addComponent()` + `toObject()` |
| `biome/biomeComponent.js` | `BiomeComponent` | 静态工厂：`setClimate()`, `setOverworldHeight()`, `setSurfaceParameters()`, `setOverworldGenerationRules()` |

---

### 4.5 Feature & Feature-Rule 体系

| 文件 | 类/导出 | 说明 |
|------|---------|------|
| `feature/oreFeature.js` | `OreFeature` | 矿物特征，指定 count + replace_rules |
| `feature-rule/featureRule.js` | `FeatureRule` | 特征放置规则，含 condition + distribution |
| `feature-rule/condition/biomeFilter.js` | `BiomeFilter` | 生物群系过滤条件 |
| `feature-rule/condition/featureConditions.js` | `FeatureConditions` | 放置条件 (placement_pass) |
| `feature-rule/distribution/coordinateDistribution.js` | `CoordinateDistribution` | 坐标分布 (uniform, triangle 等) |
| `feature-rule/distribution/featureDistribution.js` | `FeatureDistribution` | 特征分布 (iterations, axis 分布) |

---

## 5. 工厂/API 层 (`factory/`)

工厂层是用户直接调用的入口。每个工厂方法创建业务逻辑对象并调用 `GRegistry.register()` 注册。

### 5.1 ItemAPI (`factory/itemFactory.js`)

| 方法 | 说明 |
|------|------|
| `createItem(identifier, category, texture, options)` | 创建普通物品并注册 |
| `createFood(identifier, category, texture, options)` | 创建食物物品并注册 |
| `createAttachable(identifier, texture, material, options)` | 创建可附着物并注册 |
| `createChestplateArmor(id, itemTex, texPath, options)` | 创建胸甲 (Item+Attachable) |
| `createHelmetArmor(id, itemTex, texPath, options)` | 创建头盔 |
| `createBootArmor(id, itemTex, texPath, options)` | 创建靴子 |
| `createLeggingsArmor(id, itemTex, texPath, options)` | 创建护腿 |
| `createFlipbookItem(id, category, tex, options)` | 创建翻书动画物品 |

**内部注册流程：**

```javascript
function registerItem(itemData, attachableData) {
  GRegistry.register(itemData.name, 'behavior', 'items/', itemData)
  if (attachableData) {
    GRegistry.register(attachableData.name, 'resource', 'attachables/', attachableData)
  }
}
```

### 5.2 EntityAPI (`factory/entityFactory.js`)

| 方法 | 说明 |
|------|------|
| `createEntity(identifier, texture, options, behData, resData)` | 创建实体并注册 behavior + resource |
| `createNativeEntity(identifier, proto_id, options)` | 基于原版原型创建实体 |
| `createProjectile(identifier, texture, options)` | 创建抛射物 |
| `createDummyEntity(identifier, texture, options)` | 创建虚拟实体 |

**内部注册：**

```javascript
function registerEntity(behData, resData) {
  GRegistry.register(name, 'behavior', 'entities/', behData)
  GRegistry.register(name, 'resource', 'entity/', resData)
}
```

### 5.3 BlockAPI (`factory/blockFactory.js`)

| 方法 | 说明 |
|------|------|
| `createBasicBlock(identifier, category, textures, options)` | 基础 6 面纹理方块 |
| `createBlock(identifier, category, variantDatas, options)` | 多变体方块 |
| `createRotatableBlock(identifier, category, textures, options)` | 可旋转方块 |
| `createGeometryBlock(identifier, category, geometry, materialInstances, options)` | 几何方块 |
| `createOreBlock(identifier, category, textures, options)` | 矿物方块 (含 feature) |
| `createCropBlock(identifier, category, variantDatas, options)` | 作物方块 |

### 5.4 RecipeAPI (`factory/recipeFactory.js`)

| 方法 | 说明 |
|------|------|
| `registerSimpleFurnace(identifier, output, input)` | 快捷熔炉配方 |
| `registerFurnace(identifier)` | 返回 `AddonRecipeFurnace_1_17` 链式构建器 |
| `registerSimpleShaped(identifier, output, pattern, key)` | 快捷有序配方 |
| `registerShaped(identifier)` | 返回 `AddonRecipeShaped_1_20` 链式构建器 |
| `registerSimpleShapeless(identifier, output, ingredients)` | 快捷无序配方 |
| `registerShapeless(identifier)` | 返回 `AddonRecipeShapeless_1_17` 链式构建器 |

### 5.5 其他 API

| API | 方法 | 注册位置 |
|-----|------|---------|
| `BiomeAPI` | `createBiome(identifier)` | `behavior/biomes/` |
| `FeatureAPI` | `createOreFeature(id, count, rules)` | `behavior/features/` |
| `FeatureAPI` | `createFeatureRules(id, placesFeature)` | `behavior/feature_rules/` |
| `UiAPI` | `createUISystem(id, path)` | 自动注册到 `UISystemRegistry` |
| `UiAPI` | `createUIElement(id, type, template)` | 创建 UI 元素 |

### 5.6 ItemCategory 枚举

定义在 `factory/itemExtra.ts`：

```typescript
enum ItemCategory {
  Commands = 'commands',
  Construction = 'construction',
  Equipment = 'equipment',
  Nature = 'nature',
  Items = 'items',
  None = 'none'
}
```

---

## 6. 注册系统 (`registry.ts`)

### 6.1 架构

```
用户代码 (main.ts)                    CLI 进程
                                      ┌──────────────────────┐
  GRegistry.register(name,root,path,data)
    → clientRegistryData.push({...})  │                      │
                                      │  dev server           │
  registry.submit()                   │  /submit              │
    → transportPost('submit', data) ──→│  handler              │
      (core/transport/client.ts)      │  → GRegistryServer    │
                                      │    .dataList          │
                                      │  → generateAddon()    │
                                      └──────────────────────┘
```

### 6.2 GRegistry (客户端，位于 core)

```typescript
class GRegistry {
  static register(name: string, root: string, path: string, data: object)
  // 推入 clientRegistryData 数组

  static submit()
  // 调用 data.toObject() 后通过 transportPost 发送 HTTP POST
}
```

### 6.3 GRegistryServer (服务端，位于 CLI)

`GRegistryServer` 位于 `src/cli/registryServer.ts`，直接引用 CLI 的 `DevelopmentServer` 和 `remoteLogger`：

```typescript
class GRegistryServer {
  static dataList: any[]
  // 存储 { name, root, path, data } 数组

  static getDataList(): any[]
  // 返回 dataList 的拷贝

  static startServer()
  // 注册 submitGregistry 和 remote-logger handler
}
```

### 6.4 registry.submit() (用户入口)

```typescript
import { transportPost } from './transport/client.js'

export namespace registry {
  export function submit() {
    const data = clientRegistryData.map(item => {
      if (typeof item.data.toObject === 'function') {
        item.data = item.data.toObject()
      }
      return item
    })
    transportPost('submit', data)
  }
}
```

---

## 7. UI 系统 (`ui/`)

UI 模块用于生成 Minecraft Bedrock JSON UI 文件。

### 7.1 UI 元素类体系

```
UIElement (基类: name, type, template, control, layout, properties)
├── Button        (交互按钮)
├── Image         (图片显示)
├── Label         (文本标签)
├── Panel         (容器面板)
│   └── StackPanel (堆叠面板)
├── CollectionPanel (集合面板)
│   └── Grid      (网格布局)
└── ScrollingPanel (滚动面板)
```

### 7.2 UI 属性类

| 类 | 说明 |
|---|------|
| `Control` | 可见性、层级、透明度、剪裁、动画 |
| `Layout` | 尺寸、锚点、偏移、拖拽 |
| `DataBinding` | 数据绑定管理 |
| `Sprite` | 纹理、UV、九宫格、平铺 |
| `Text` | 文字、颜色、阴影、字体 |
| `Input` | 按钮映射、模态、手柄/触摸/手势 |
| `Factory` | 模板工厂控制 |
| `Sound` | 按钮音效 |
| `ScrollView` | 滚动条属性 |
| `GridProp` | 网格布局属性 |

### 7.3 UI 系统

| 系统 | 文件 | 说明 |
|------|------|------|
| `UISystem` | `systems/system.js` | 核心 UI 文件系统，管理 elements + animations |
| `ServerFormSystem` | `systems/serverForm.js` | 预置服务器表单 UI |
| `ChestUISystem` | `systems/chest.js` | 容器 UI 系统 |
| `ContainerUISystem` | `systems/containerUISystem.js` | 自定义容器 UI |
| `Guidebook` | `systems/guidebook.js` | 指南书 UI |
| `NeoGuidebook` | `systems/neoGuibook/book.ts` | 新版指南书 UI |
| `HudUISystem` | `systems/hud/hud.ts` | HUD 系统 |
| `HudStatePanel` | `systems/hud/hudElement.ts` | HUD 状态面板 |

---

## 8. 纹理系统 (`texture.js`)

| 类 | 说明 |
|---|------|
| `ItemTextureManager` | 管理 `item_texture.json` 数据，`registerTexture(name, path)` 注册纹理，`toObject()` 输出 JSON |
| `TerrainTextureManager` | 管理 `terrain_texture.json` 数据，同上 |
| `FlipbookTextures` | 管理 `flipbook_textures.json` 数据，`registerFlipbookTexture(atlas, texture, ticksPerFrame, options)` 注册动画纹理 |

所有管理器自动调用 `GRegistry.register()` 将数据提交到构建管道。

---

## 9. 附加模块 (`extra/`)

| 文件 | 导出 | 说明 |
|------|------|------|
| `apperance.ts` | `ClientEntityApperance` | 管理客户端实体的纹理、材质、渲染控制器。提供 `decorate(entityId)` 方法应用到 `ClientEntity`。使用共享的 `AddonRenderControllerGroup` 单例。 |
| `vehicle.ts` | `BaseVehicle` | 载具基类，管理 seats 数组、collisionBox、riderControlled、autoStep。 |

---

## 10. 类型定义 (`type.ts`)

| 导出 | 说明 |
|------|------|
| `MaterialDesc<Parts>` | `Record<Parts | '*', \`material.${string}\`>` — 材质描述类型 |
| `RideableComponent` | 可骑乘组件的完整接口 |
| `RideableComponentDesc` | `Partial<RideableComponent>` |
| `RideableSeat` | 座位接口 (position, rotation, lock_rider_rotation 等) |

---

## 11. 包入口 (`index.js`)

`src/core/index.js` 聚合导出所有模块：

```javascript
export * from './addon/index.js'       // 所有 DTO
export * from './biome/index.js'        // Biome, BiomeComponent
export * from './block/index.js'        // 所有 Block 类 + BlockComponent
export * from './entity/index.js'       // 所有 Entity 类 + EntityComponent + behaviors
export * from './factory/index.js'      // 所有 API (ItemAPI, EntityAPI...)
export * from './feature/index.js'      // OreFeature
export * from './feature-rule/index.js' // FeatureRule
export * from './item/index.js'         // Item, Food, Armor, Attachable...
export * from './ui/index.js'           // UI 系统
export * from './ui/export.js'          // UI 聚合导出
export * from './texture.js'            // 纹理管理器
export { registry } from './registry.js' // 注册系统
```

用户使用：

```typescript
import { ItemAPI, EntityAPI, registry, ItemComponent } from '@sapdon/core'
```
