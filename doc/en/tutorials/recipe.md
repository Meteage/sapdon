# Recipes

> Full Chinese original: [`doc/user/tutorials/recipe.md`](../../user/tutorials/recipe.md)

```typescript
import { RecipeAPI, RecipeTags, registry } from '@sapdon/core'
```

Every recipe has two styles: a **short form** (`registerSimpleX`) and a **chained form**
(`registerX` returning a builder). They produce identical JSON — pick by taste.

---

## 1. Shaped, short form

```typescript
RecipeAPI.registerSimpleShaped(
  'my_mod:diamond_sword',
  'minecraft:diamond_sword',
  [' X ', ' X ', ' Y '],
  {
    X: { item: 'minecraft:diamond' },
    Y: { item: 'minecraft:stick' },
  }
).tags(['crafting_table'])

registry.submit()
```

| Parameter | Meaning |
|-----------|---------|
| `identifier` | Recipe id, `namespace:name` |
| `output` | Output item id |
| `pattern` | Up to three rows, three characters each |
| `key` | Character → ingredient |

The method sets the `crafting_table` tag automatically; `.tags()` replaces it.

## 2. Shaped, chained

```typescript
RecipeAPI.registerShaped('my_mod:custom_block')
  .key({
    A: { item: 'minecraft:diamond' },
    B: { item: 'minecraft:iron_ingot' },
  })
  .pattern(['AAA', 'ABA', 'AAA'])
  .output({ item: 'my_mod:custom_block', count: 4 })
  .priority(0)
  .tags(['crafting_table'])
```

| Method | Effect |
|--------|--------|
| `.key(map)` | Character → ingredient |
| `.pattern(rows)` | Pattern rows |
| `.output(item)` | String, or `{ item, count }` |
| `.priority(n)` | Lower number wins when recipes collide |
| `.assumeSymmetry()` | Treat mirrored patterns as equal |
| `.tags(tags[])` | Recipe tags |

## 3. Shapeless, short form

```typescript
RecipeAPI.registerSimpleShapeless(
  'my_mod:custom_ingot',
  'my_mod:custom_ingot',
  [
    { item: 'minecraft:iron_ingot' },
    { item: 'minecraft:gold_ingot' },
  ]
).tags(['crafting_table'])
```

## 4. Shapeless, chained

```typescript
RecipeAPI.registerShapeless('my_mod:mixed_ingot')
  .ingredients([
    { item: 'minecraft:iron_ingot' },
    { item: 'minecraft:gold_ingot' },
    { item: 'minecraft:diamond' },
  ])
  .output({ item: 'my_mod:mixed_ingot', count: 3 })
  .tags(['crafting_table'])
```

Ingredients may be item tags instead of concrete items:

```typescript
RecipeAPI.registerShapeless('my_mod:wooden_rod')
  .ingredients([{ tag: 'minecraft:planks' }, { tag: 'minecraft:planks' }])
  .output('my_mod:wooden_rod')
```

## 5. Furnace, short form

```typescript
RecipeAPI.registerSimpleFurnace(
  'my_mod:cooked_ruby',
  'my_mod:ruby',       // output
  'my_mod:raw_ruby'    // input
).tags(['furnace'])
```

## 6. Furnace, chained

```typescript
RecipeAPI.registerFurnace('my_mod:smelt_ruby')
  .input('my_mod:raw_ruby')
  .output('my_mod:ruby')
  .tags(['furnace'])
```

`.input(item, data?, count?)` also accepts a data value:

```typescript
RecipeAPI.registerFurnace('my_mod:smelt_ore')
  .input('minecraft:iron_ore', 0, 1)
  .output('minecraft:iron_ingot')
  .tags(['furnace', 'blast_furnace'])
```

## 7. Tags

Tags decide which blocks can run the recipe.

| Tag | Block |
|-----|-------|
| `crafting_table` | Crafting table |
| `furnace` | Furnace |
| `smoker` | Smoker |
| `blast_furnace` | Blast furnace |
| `campfire` | Campfire |
| `soul_campfire` | Soul campfire |

`RecipeTags` constants exist, but watch the casing — `smoker` is lowercase, everything else is
capitalised:

```typescript
RecipeAPI.registerSimpleFurnace('my_mod:cooked_beef', 'minecraft:cooked_beef', 'minecraft:beef')
  .tags([RecipeTags.Furnace, RecipeTags.smoker])
```

> A recipe that never appears in-game is almost always a missing or wrong tag, not a wrong
> pattern.

---

## Next

- [Items](./item.md) — recipe outputs
- [Blocks](./block.md) — recipe inputs
- [Build & publish](./publish.md) — confirm recipes landed in `dev/`
