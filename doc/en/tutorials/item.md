# Items

> Full Chinese original: [`doc/user/tutorials/item.md`](../../user/tutorials/item.md)

Every item follows the same shape: `ItemAPI.createX(...)` returns an object, you add
components, and the file ends with `registry.submit()`.

```typescript
import { ItemAPI, ItemCategory, ItemComponent, registry } from '@sapdon/core'
```

---

## 1. Basic item

```typescript
const myItem = ItemAPI.createItem(
  'my_mod:simple_item',   // identifier (namespace:name)
  ItemCategory.Items,     // creative category
  'apple',                // texture short name — vanilla names work as-is
  {
    group: 'minecraft:itemGroup.name.ingredients',
    max_stack_size: 16,
  }
)

myItem.addComponent(ItemComponent.setDisplayName('§aMy Item'))

registry.submit()
```

| Option | Type | Notes |
|--------|------|-------|
| `group` | string | Creative inventory group |
| `hide_in_command` | boolean | When `true`, an attachable is also generated so the item renders as a 3D model |
| `max_stack_size` | number | 1–99, default 64 |
| `format_version` | string | Default `1.21.40` |

Custom texture short names must be registered first; see [Add textures](../guides/textures.md).

## 2. Food

```typescript
const myFood = ItemAPI.createFood(
  'my_mod:magic_apple',
  ItemCategory.Items,
  'apple',
  {
    nutrition: 6,              // hunger points restored
    saturationModifier: 1.2,   // final saturation = nutrition × modifier
    canAlwaysEat: true,
    animation: 'eat',          // 'eat' | 'drink'
  }
)
```

Other options: `movement` (movement speed modifier, default 1), `useDuration` (seconds).

## 3. Armor

Four factory functions. Argument order is `(identifier, iconTexture, modelTexturePath, options?)`.

```typescript
ItemAPI.createHelmetArmor('my_mod:crystal_helmet', 'diamond', 'textures/models/armor/diamond')
ItemAPI.createChestplateArmor('my_mod:crystal_chestplate', 'diamond', 'textures/models/armor/diamond')
ItemAPI.createLeggingsArmor('my_mod:crystal_leggings', 'diamond', 'textures/models/armor/diamond')
ItemAPI.createBootArmor('my_mod:crystal_boots', 'diamond', 'textures/models/armor/diamond')

registry.submit()
```

| Piece | Method | Protection | Slot | Geometry |
|-------|--------|-----------|------|----------|
| Helmet | `createHelmetArmor` | 3 | `slot.armor.head` | `geometry.player.armor.helmet` |
| Chestplate | `createChestplateArmor` | 5 | `slot.armor.chest` | `geometry.player.armor.chestplate` |
| Leggings | `createLeggingsArmor` | 6 | `slot.armor.legs` | `geometry.player.armor.leggings` |
| Boots | `createBootArmor` | 4 | `slot.armor.feet` | `geometry.player.armor.boots` |

Armor is created in the `equipment` category, gets an automatic item group, stack size 1,
and an attachable for 3D rendering.

## 4. Attachables

Attachables drive held-item 3D models and worn-item rendering.

```typescript
const attachable = ItemAPI.createAttachable(
  'my_mod:special_item',
  'textures/items/diamond',
  'entity_alphatest'
)

attachable
  .addGeometry('default', 'geometry.special_item')
  .addTexture('enchanted', 'textures/misc/enchanted_item_glint')
  .addRenderController('controller.render.special_item')
```

| Material | Use |
|----------|-----|
| `entity_alphatest` | Standard item (alpha cutout) |
| `entity_alphablend` | Alpha blending |
| `entity_nocull` | Double-sided |
| `armor` | Armor |
| `armor_enchanted` | Armor with glint |

## 5. Flipbook items

```typescript
const flipbook = ItemAPI.createFlipbookItem(
  'my_mod:animated_block',
  ItemCategory.Construction,
  'oak_log',
  {
    ticks_per_frame: 4,   // default 8; 20 ticks = 1 second
    max_stack_size: 64,
  }
)
```

A flipbook item automatically creates a `GeometryBlock` for 3D display, registers the
animated texture, and carries a `minecraft:block_placer` component. Frames go in
`RP/textures/blocks/`, stacked vertically.

## 6. Components

```typescript
import { ItemComponent } from '@sapdon/core'

tool.addComponent(
  ItemComponent.combineComponents(
    ItemComponent.setDisplayName('§eSpecial Tool'),
    ItemComponent.setHandEquipped(true),
    ItemComponent.setMaxStackSize(1),
    ItemComponent.setDurability(500, 10, 50),   // max, min damage %, max damage %
    ItemComponent.setFuel(200),                 // burn seconds
    ItemComponent.setInteractButton('Use tool'),
    ItemComponent.setGlint(true),
  )
)
```

`setInteractButton` is not cosmetic: **an item needs `minecraft:interact_button` before its
scripted `onUse` handler can fire.** Without it, right-click does nothing.

### Full list

| Method | Purpose |
|--------|---------|
| `setDisplayName(name)` | Display name |
| `setIcon(texture)` | Icon texture |
| `setMaxStackSize(size)` | Stack size |
| `setHandEquipped(bool)` | Tool-style hand rendering |
| `setDurability(max, min%, max%)` | Durability |
| `setFoodComponent(options)` | Food properties |
| `setFuel(seconds)` | Furnace fuel |
| `setWearable(protection, slot)` | Wearable |
| `setGlint(bool)` | Enchantment glint |
| `setUseAnimation(anim)` | `'eat'`, `'drink'` |
| `setUseModifiers(movement, duration)` | Use modifiers |
| `setThrowable(...)` | Throwable |
| `setProjectile(...)` | Projectile |
| `setInteractButton(text)` | Interaction text |
| `setBlockPlacer(block, ...)` | Places a block |
| `setCustomComponentV2(id, params)` | Custom component (scripting v2) |
| `combineComponents(...maps)` | Merge component maps |

## 7. format_version

Set per item; it decides which components are valid.

```typescript
const item = ItemAPI.createItem('my_mod:versioned_item', ItemCategory.Items, 'diamond', {
  format_version: '1.21.40',
})
```

Raising it without raising `min_engine_version` produces packs that older clients refuse to
load. Keep the two in sync.

Custom icons and texture registration are covered in [Add textures](../guides/textures.md). To make the item do something on use, see [Make a script run](../guides/scripts.md).
