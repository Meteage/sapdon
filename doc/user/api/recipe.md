# 配方系统 API 参考

---

## RecipeAPI

工厂函数集合，用于创建各类配方并自动注册到游戏系统。

```typescript
import { RecipeAPI, registry } from '@sapdon/core'
```

所有注册器方法均返回配方实例，支持链式调用。完成后调用 `registry.submit()` 提交数据。

---

### registerSimpleFurnace

快速创建熔炉配方（自动设置 `furnace` 标签）。

```typescript
RecipeAPI.registerSimpleFurnace(
  identifier: string,
  output: string,
  input: string
): AddonRecipeFurnace
```

**示例**

```typescript
RecipeAPI.registerSimpleFurnace('sapdon:smelt_ore', 'minecraft:iron_ingot', 'minecraft:iron_ore')
```

---

### registerFurnace

创建熔炉配方实例，返回 `AddonRecipeFurnace` 用于链式配置。

```typescript
RecipeAPI.registerFurnace(identifier: string): AddonRecipeFurnace
```

**示例**

```typescript
RecipeAPI.registerFurnace('sapdon:smelt_gold')
  .input('minecraft:gold_ore', 0, 1)
  .output('minecraft:gold_ingot')
  .tags(['furnace'])
```

---

### registerSimpleShaped

快速创建有序工作台配方（自动设置 `crafting_table` 标签）。

```typescript
RecipeAPI.registerSimpleShaped(
  identifier: string,
  output: string,
  pattern: string[],
  key: Record<string, any>
): AddonRecipeShaped
```

**示例**

```typescript
RecipeAPI.registerSimpleShaped(
  'sapdon:sword',
  'sapdon:sword',
  [' X ', ' X ', ' Y '],
  { X: { item: 'minecraft:iron_ingot' }, Y: { item: 'minecraft:stick' } }
)
```

---

### registerShaped

创建有序配方实例，返回 `AddonRecipeShaped` 用于链式配置。

```typescript
RecipeAPI.registerShaped(identifier: string): AddonRecipeShaped
```

**示例**

```typescript
RecipeAPI.registerShaped('sapdon:armor')
  .key({ X: { item: 'minecraft:diamond' } })
  .pattern(['XXX', 'X X', '   '])
  .output({ item: 'sapdon:armor', count: 1 })
  .tags(['crafting_table'])
```

---

### registerSimpleShapeless

快速创建无序工作台配方（自动设置 `crafting_table` 标签）。

```typescript
RecipeAPI.registerSimpleShapeless(
  identifier: string,
  output: string,
  ingredients: any[]
): AddonRecipeShapeless
```

**示例**

```typescript
RecipeAPI.registerSimpleShapeless(
  'sapdon:alloy',
  'sapdon:alloy_ingot',
  [{ item: 'minecraft:iron_ingot' }, { item: 'minecraft:gold_ingot' }]
)
```

---

### registerShapeless

创建无序配方实例，返回 `AddonRecipeShapeless` 用于链式配置。

```typescript
RecipeAPI.registerShapeless(identifier: string): AddonRecipeShapeless
```

**示例**

```typescript
RecipeAPI.registerShapeless('sapdon:mixture')
  .ingredients([{ item: 'minecraft:diamond' }, { item: 'minecraft:emerald' }])
  .output({ item: 'sapdon:mixture', count: 2 })
  .tags(['crafting_table'])
```

---

## AddonRecipe 基类

所有配方类型继承自 `AddonRecipe`。

```typescript
import { AddonRecipe } from '@sapdon/core'
```

### 方法

| 方法 | 返回 | 说明 |
|------|------|------|
| `identifier(id: string)` | `this` | 设置配方标识符 |
| `tags(tags: string[])` | `this` | 设置配方标签数组（覆盖） |
| `getId(): string` | `string` | 获取配方标识符 |

---

## AddonRecipeShaped

有序配方类，继承自 `AddonRecipe`。

```typescript
import { AddonRecipeShaped } from '@sapdon/core'
```

### 方法

| 方法 | 返回 | 说明 |
|------|------|------|
| `assumeSymmetry(): void` | 无 | 启用对称假设，未定义键的字符自动视为相同 |
| `key(key: Record<string, any>)` | `this` | 设置字符到物品的键映射 |
| `pattern(pattern: string[])` | `this` | 设置 3 行图案数组 |
| `priority(priority: number)` | `this` | 设置优先级（数值越小优先级越高） |
| `output(item: string \| object)` | `this` | 设置输出，支持字符串或 `{ item, count }` |
| `tags(tags: string[])` | `this` | 继承自 `AddonRecipe`，设置配方标签 |

**示例**

```typescript
const recipe = new AddonRecipeShaped_1_20()
recipe
  .identifier('sapdon:example')
  .key({ A: { item: 'minecraft:iron_ingot' } })
  .pattern(['AAA', 'A A', 'AAA'])
  .output({ item: 'sapdon:example', count: 8 })
  .assumeSymmetry()
  .tags(['crafting_table'])
```

### 版本化类

| 类 | format_version |
|------|------|
| `AddonRecipeShaped_1_12` | `1.12` |
| `AddonRecipeShaped_1_17` | `1.17` |
| `AddonRecipeShaped_1_19` | `1.19` |
| `AddonRecipeShaped_1_20` | `1.20` |

---

## AddonRecipeShapeless

无序配方类，继承自 `AddonRecipe`。

```typescript
import { AddonRecipeShapeless } from '@sapdon/core'
```

### 方法

| 方法 | 返回 | 说明 |
|------|------|------|
| `static create(ver, def)` | `AddonRecipeShapeless` | 静态工厂方法 |
| `priority(priority: number)` | `this` | 设置优先级 |
| `ingredients(ingredients: any[])` | `this` | 设置原料数组 |
| `output(item: string \| object)` | `this` | 设置输出，支持字符串或 `{ item, count }` |
| `tags(tags: string[])` | `this` | 继承自 `AddonRecipe`，设置配方标签 |

**示例**

```typescript
const recipe = new AddonRecipeShapeless_1_17()
recipe
  .identifier('sapdon:example')
  .ingredients([
    { item: 'minecraft:iron_ingot' },
    { tag: 'minecraft:planks' }
  ])
  .output({ item: 'sapdon:example', count: 4 })
  .tags(['crafting_table'])
```

### 版本化类

| 类 | format_version |
|------|------|
| `AddonRecipeShapeless_1_12` | `1.12` |
| `AddonRecipeShapeless_1_17` | `1.17` |

---

## AddonRecipeFurnace

熔炉配方类，继承自 `AddonRecipe`。

```typescript
import { AddonRecipeFurnace } from '@sapdon/core'
```

### 方法

| 方法 | 返回 | 说明 |
|------|------|------|
| `static create(ver, def)` | `AddonRecipeFurnace` | 静态工厂方法 |
| `input(item: string, data?, count?)` | `this` | 设置输入物品，可选副损伤值(data)和数量 |
| `output(item: string)` | `this` | 设置输出物品 |
| `tags(tags: string[])` | `this` | 继承自 `AddonRecipe`，设置配方标签 |

**示例**

```typescript
const recipe = new AddonRecipeFurnace_1_17()
recipe
  .identifier('sapdon:smelt_ore')
  .input('minecraft:iron_ore', 0)
  .output('minecraft:iron_ingot')
  .tags(['furnace'])
```

### 版本化类

| 类 | format_version |
|------|------|
| `AddonRecipeFurnace_1_12` | `1.12` |
| `AddonRecipeFurnace_1_17` | `1.17` |

---

## RecipeTags

配方标签常量，用于指定配方适用的方块。

```typescript
import { RecipeTags } from '@sapdon/core'
```

| 常量 | 值 | 说明 |
|------|-----|------|
| `RecipeTags.Furnace` | `"furnace"` | 熔炉配方 |
| `RecipeTags.smoker` | `"smoker"` | 烟熏炉配方 |
| `RecipeTags.Campfire` | `"campfire"` | 篝火烹饪配方 |
| `RecipeTags.SoulCampfire` | `"soul_campfire"` | 灵魂篝火烹饪配方 |
| `RecipeTags.CraftingTable` | `"crafting_table"` | 工作台合成配方 |

> 注意：`RecipeTags.smoker` 首字母小写，与其余常量命名不一致。

**示例**

```typescript
// 同时适用于熔炉和烟熏炉
recipe.tags([RecipeTags.Furnace, RecipeTags.smoker])
```

---

## RecipeInputTags

物品输入标签常量，用于原料的 `tag` 字段实现宽匹配。

```typescript
import { RecipeInputTags } from '@sapdon/core'
```

| 常量 | 值 | 说明 |
|------|-----|------|
| `RecipeInputTags.Armor` | `"minecraft:is_armor"` | 盔甲类物品 |
| `RecipeInputTags.Arrows` | `"minecraft:arrow"` | 箭 |
| `RecipeInputTags.Banners` | `"minecraft:banner"` | 旗帜 |
| `RecipeInputTags.Boats` | `"minecraft:boats"` | 船 |
| `RecipeInputTags.BookshelfBooks` | `"minecraft:bookshelf_books"` | 书架用书 |
| `RecipeInputTags.ChainmailTier` | `"minecraft:chainmail_tier"` | 锁链级装备 |
| `RecipeInputTags.ChestBoat` | `"minecraft:chest_boat"` | 带箱子的船 |
| `RecipeInputTags.Coals` | `"minecraft:coals"` | 煤炭类 |
| `RecipeInputTags.Cooked` | `"minecraft:is_cooked"` | 已烹饪食物 |
| `RecipeInputTags.CrimsonStems` | `"minecraft:crimson_stems"` | 绯红菌柄 |
| `RecipeInputTags.DiamondTier` | `"minecraft:diamond_tier"` | 钻石级装备 |
| `RecipeInputTags.Digger` | `"minecraft:digger"` | 挖掘工具 |
| `RecipeInputTags.Door` | `"minecraft:door"` | 门 |
| `RecipeInputTags.Fish` | `"minecraft:is_fish"` | 鱼类 |
| `RecipeInputTags.Food` | `"minecraft:is_food"` | 食物类 |
| `RecipeInputTags.GoldenTier` | `"minecraft:golden_tier"` | 金质装备 |
| `RecipeInputTags.HangingActor` | `"minecraft:hanging_actor"` | 悬挂实体 |
| `RecipeInputTags.HangingSign` | `"minecraft:hanging_sign"` | 悬挂告示牌 |
| `RecipeInputTags.Hatchet` | `"minecraft:is_axe"` | 斧 |
| `RecipeInputTags.Hoe` | `"minecraft:is_hoe"` | 锄 |
| `RecipeInputTags.HorseArmor` | `"minecraft:horse_armor"` | 马铠 |
| `RecipeInputTags.IronTier` | `"minecraft:iron_tier"` | 铁质装备 |
| `RecipeInputTags.LeatherTier` | `"minecraft:leather_tier"` | 皮革装备 |
| `RecipeInputTags.LecternBooks` | `"minecraft:lectern_books"` | 讲台用书 |
| `RecipeInputTags.Logs` | `"minecraft:logs"` | 原木类 |
| `RecipeInputTags.LogsThatBurn` | `"minecraft:logs_that_burn"` | 可燃原木 |
| `RecipeInputTags.MangroveLogs` | `"minecraft:mangrove_logs"` | 红树木 |
| `RecipeInputTags.Meat` | `"minecraft:is_meat"` | 肉类 |
| `RecipeInputTags.Minecart` | `"minecraft:is_minecart"` | 矿车 |
| `RecipeInputTags.MusicDiscs` | `"minecraft:music_disc"` | 唱片 |
| `RecipeInputTags.NetheriteTier` | `"minecraft:netherite_tier"` | 下界合金级装备 |
| `RecipeInputTags.Pickaxe` | `"minecraft:is_pickaxe"` | 镐 |
| `RecipeInputTags.PiglinLoved` | `"minecraft:piglin_loved"` | 猪灵喜爱物品 |
| `RecipeInputTags.PiglinRepellents` | `"minecraft:piglin_repellents"` | 猪灵驱退物品 |
| `RecipeInputTags.Planks` | `"minecraft:planks"` | 木板 |
| `RecipeInputTags.Sand` | `"minecraft:sand"` | 沙子 |
| `RecipeInputTags.Shovel` | `"minecraft:is_shovel"` | 锹 |
| `RecipeInputTags.Sign` | `"minecraft:sign"` | 告示牌 |
| `RecipeInputTags.SoulFireBaseBlocks` | `"minecraft:soul_fire_base_blocks"` | 灵魂火基底 |
| `RecipeInputTags.SpawnEgg` | `"minecraft:spawn_egg"` | 刷怪蛋 |
| `RecipeInputTags.StoneBricks` | `"minecraft:stone_bricks"` | 石砖 |
| `RecipeInputTags.StoneCraftingMaterials` | `"minecraft:stone_crafting_materials"` | 石质合成材料 |
| `RecipeInputTags.StoneTier` | `"minecraft:stone_tier"` | 石质装备 |
| `RecipeInputTags.StoneToolMaterials` | `"minecraft:stone_tool_materials"` | 石质工具材料 |
| `RecipeInputTags.Sword` | `"minecraft:is_sword"` | 剑 |
| `RecipeInputTags.Tool` | `"minecraft:is_tool"` | 工具 |
| `RecipeInputTags.VibrationDamper` | `"minecraft:vibration_damper"` | 振动阻尼 |
| `RecipeInputTags.WarpedStems` | `"minecraft:warped_stems"` | 诡异菌柄 |
| `RecipeInputTags.WoodenSlabs` | `"minecraft:wooden_slabs"` | 木台阶 |
| `RecipeInputTags.WoodenTier` | `"minecraft:wooden_tier"` | 木质装备 |
| `RecipeInputTags.Wool` | `"minecraft:wool"` | 羊毛 |

**示例**

```typescript
import { RecipeAPI, registry, RecipeInputTags } from '@sapdon/core'

// 使用标签匹配所有木板
RecipeAPI.registerShapeless('sapdon:framed_plank')
  .ingredients([
    { tag: RecipeInputTags.Planks },
    { tag: RecipeInputTags.Planks },
    { tag: RecipeInputTags.Planks }
  ])
  .output('sapdon:framed_plank')
  .tags(['crafting_table'])
```

---

## 类型汇总

```typescript
// 工厂
RecipeAPI.registerSimpleFurnace(id, output, input)
RecipeAPI.registerFurnace(id)
RecipeAPI.registerSimpleShaped(id, output, pattern, key)
RecipeAPI.registerShaped(id)
RecipeAPI.registerSimpleShapeless(id, output, ingredients)
RecipeAPI.registerShapeless(id)

// 有序配方
class AddonRecipeShaped extends AddonRecipe
  assumeSymmetry(): void
  key(map): this
  pattern(rows): this
  priority(num): this
  output(item): this
  tags(tags[]): this  // 继承

// 无序配方
class AddonRecipeShapeless extends AddonRecipe
  priority(num): this
  ingredients(items): this
  output(item): this
  tags(tags[]): this  // 继承

// 熔炉配方
class AddonRecipeFurnace extends AddonRecipe
  input(item, data?, count?): this
  output(item): this
  tags(tags[]): this  // 继承

// 标签常量
RecipeTags = { Furnace, smoker, Campfire, SoulCampfire, CraftingTable }
RecipeInputTags = { Armor, Food, Logs, Planks, ... }
```
