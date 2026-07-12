# 配方创建教程

本文档介绍如何使用 sapdon 框架创建各类 Minecraft 配方。

> 开始前请确保已完成[快速入门](../quick-start.md)中的环境搭建。

## 导入

所有配方 API 均从 `@sapdon/core` 导入：

```typescript
import { RecipeAPI, registry } from '@sapdon/core'
```

完成后调用 `registry.submit()` 提交所有注册数据。

---

## 1. 有序配方 — 简写

`RecipeAPI.registerSimpleShaped()` 通过 pattern（图案）、key（键映射）和 output（输出）快速创建有序配方。

```typescript
import { RecipeAPI, registry } from '@sapdon/core'

RecipeAPI.registerSimpleShaped(
  'sapdon:diamond_sword',
  'minecraft:diamond_sword',
  [' X ', ' X ', ' Y '],
  {
    X: { item: 'minecraft:diamond' },
    Y: { item: 'minecraft:stick' }
  }
).tags(['crafting_table'])

registry.submit()
```

**参数说明**

| 参数 | 类型 | 说明 |
|------|------|------|
| `identifier` | `string` | 配方唯一标识符，格式 `命名空间:名称` |
| `output` | `string` | 输出物品 ID |
| `pattern` | `string[]` | 3 行图案，每行 3 字符 |
| `key` | `object` | 字符到物品的映射 |

方法自动设置 `crafting_table` 标签。`.tags()` 链式调用可覆盖或追加标签。

---

## 2. 有序配方 — 链式

`RecipeAPI.registerShaped()` 返回 `AddonRecipeShaped` 实例，支持完整的链式调用。

```typescript
import { RecipeAPI, registry } from '@sapdon/core'

RecipeAPI.registerShaped('sapdon:custom_helmet')
  .key({
    X: { item: 'minecraft:iron_ingot' }
  })
  .pattern(['XXX', 'X X', '   '])
  .output('sapdon:custom_helmet')
  .tags(['crafting_table'])

registry.submit()
```

**可用链式方法**

| 方法 | 说明 |
|------|------|
| `.key(map)` | 设置字符到物品的键映射 |
| `.pattern(rows)` | 设置 3 行图案数组 |
| `.output(item)` | 设置输出物品，支持 `string` 或 `{ item, count }` 对象 |
| `.priority(num)` | 设置优先级（数值越小优先级越高） |
| `.assumeSymmetry()` | 启用对称假设 |
| `.tags(tags[])` | 设置配方标签数组 |

```typescript
// 带数量和优先级的完整示例
RecipeAPI.registerShaped('sapdon:custom_block')
  .key({
    A: { item: 'minecraft:diamond' },
    B: { item: 'minecraft:iron_ingot' }
  })
  .pattern(['AAA', 'ABA', 'AAA'])
  .output({ item: 'sapdon:custom_block', count: 4 })
  .priority(0)
  .tags(['crafting_table'])
```

---

## 3. 无序配方 — 简写

`RecipeAPI.registerSimpleShapeless()` 通过 ingredients 数组快速创建无序配方。

```typescript
import { RecipeAPI, registry } from '@sapdon/core'

RecipeAPI.registerSimpleShapeless(
  'sapdon:custom_ingot',
  'sapdon:custom_ingot',
  [
    { item: 'minecraft:iron_ingot' },
    { item: 'minecraft:gold_ingot' }
  ]
).tags(['crafting_table'])

registry.submit()
```

**参数说明**

| 参数 | 类型 | 说明 |
|------|------|------|
| `identifier` | `string` | 配方唯一标识符 |
| `output` | `string` | 输出物品 ID |
| `ingredients` | `object[]` | 原料数组，无需顺序 |

原料支持标签引用实现宽匹配：

```typescript
RecipeAPI.registerSimpleShapeless(
  'sapdon:leather_helmet',
  'minecraft:leather_helmet',
  [
    { item: 'minecraft:leather' },
    { item: 'minecraft:leather' },
    { item: 'minecraft:leather' },
    { item: 'minecraft:leather' },
    { item: 'minecraft:leather' }
  ]
).tags(['crafting_table'])
```

---

## 4. 无序配方 — 链式

`RecipeAPI.registerShapeless()` 返回 `AddonRecipeShapeless` 实例，支持链式调用。

```typescript
import { RecipeAPI, registry } from '@sapdon/core'

RecipeAPI.registerShapeless('sapdon:mixed_ingot')
  .ingredients([
    { item: 'minecraft:iron_ingot' },
    { item: 'minecraft:gold_ingot' },
    { item: 'minecraft:diamond' }
  ])
  .output({ item: 'sapdon:mixed_ingot', count: 3 })
  .tags(['crafting_table'])

registry.submit()
```

**可用链式方法**

| 方法 | 说明 |
|------|------|
| `.ingredients(items[])` | 设置原料数组 |
| `.output(item)` | 设置输出物品 |
| `.priority(num)` | 设置优先级 |
| `.tags(tags[])` | 设置配方标签数组 |

使用物品标签作为原料：

```typescript
RecipeAPI.registerShapeless('sapdon:wooden_rod')
  .ingredients([
    { tag: 'minecraft:planks' },
    { tag: 'minecraft:planks' }
  ])
  .output('sapdon:wooden_rod')
  .tags(['crafting_table'])
```

---

## 5. 熔炉配方 — 简写

`RecipeAPI.registerSimpleFurnace()` 快速创建熔炉配方。

```typescript
import { RecipeAPI, registry } from '@sapdon/core'

RecipeAPI.registerSimpleFurnace(
  'sapdon:cooked_ruby',
  'sapdon:ruby',
  'sapdon:raw_ruby'
).tags(['furnace'])

registry.submit()
```

**参数说明**

| 参数 | 类型 | 说明 |
|------|------|------|
| `identifier` | `string` | 配方唯一标识符 |
| `output` | `string` | 烧炼输出物品 ID |
| `input` | `string` | 烧炼输入物品 ID |

方法自动设置 `furnace` 标签。

---

## 6. 熔炉配方 — 链式

`RecipeAPI.registerFurnace()` 返回 `AddonRecipeFurnace` 实例，支持链式调用。

```typescript
import { RecipeAPI, registry } from '@sapdon/core'

RecipeAPI.registerFurnace('sapdon:smelt_ruby')
  .input('sapdon:raw_ruby')
  .output('sapdon:ruby')
  .tags(['furnace'])

registry.submit()
```

**可用链式方法**

| 方法 | 说明 |
|------|------|
| `.input(item, data?, count?)` | 设置输入物品，可选 data 和 count |
| `.output(item)` | 设置输出物品 |
| `.tags(tags[])` | 设置配方标签数组 |

```typescript
// 带 data 值的熔炉配方
RecipeAPI.registerFurnace('sapdon:smelt_ore')
  .input('minecraft:iron_ore', 0, 1)
  .output('minecraft:iron_ingot')
  .tags(['furnace', 'blast_furnace'])
```

---

## 7. 配方标签

配方标签决定配方可在哪些方块中使用。通过 `.tags()` 方法设置：

```typescript
RecipeAPI.registerShaped('sapdon:example')
  .pattern(['A', 'A', 'A'])
  .key({ A: { item: 'minecraft:iron_ingot' } })
  .output('sapdon:example')
  .tags(['crafting_table'])
```

### 可用标签值

| 标签 | 适用方块 | 说明 |
|------|----------|------|
| `furnace` | 熔炉 | 标准熔炉烧炼配方 |
| `smoker` | 烟熏炉 | 食物烧炼配方 |
| `campfire` | 篝火 | 篝火烹饪配方 |
| `soul_campfire` | 灵魂篝火 | 灵魂篝火烹饪配方 |
| `crafting_table` | 工作台 | 工作台合成配方 |

可通过 `RecipeTags` 常量引用：

```typescript
import { RecipeAPI, registry, RecipeTags } from '@sapdon/core'

RecipeAPI.registerSimpleFurnace(
  'sapdon:cooked_beef',
  'minecraft:cooked_beef',
  'minecraft:beef'
).tags([RecipeTags.Furnace, RecipeTags.smoker])
```

> 注：`RecipeTags.smoker` 首字母小写，其余常量均为大写首字母。
