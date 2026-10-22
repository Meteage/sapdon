# Textures

> Full Chinese original: [`doc/user/tutorials/texture.md`](../../user/tutorials/texture.md)

Where the PNG goes, how the framework learns about it, and why it is still a purple-black
square.

---

## 1. Resource layout

`resource.path` in `build.config` (default `res/`) is copied **as-is** into the resource pack
root:

```
res/                                  dev/<name>_RP/
├── textures/items/my_ingot.png   →   ├── textures/items/my_ingot.png
├── textures/blocks/my_block.png  →   ├── textures/blocks/my_block.png
├── models/blocks/cube.geo.json   →   ├── models/blocks/cube.geo.json
└── animations/*.animation.json   →   └── animations/*.animation.json
```

Paths must match the Minecraft resource pack convention: what you write under `res/` is what
lands in the pack. PNG only, square, 16×16 or a multiple of it.

## 2. Item textures

### Step 1 — put the file

```
res/textures/items/my_ingot.png
```

### Step 2 — register the short name

The third argument of `createItem()` is a **short name**, not a path. Vanilla names (`apple`,
`stick`) already exist; custom names must be registered.

```typescript
import { ItemAPI, ItemCategory, ItemTextureManager, registry } from '@sapdon/core'

ItemTextureManager.registerTexture('my_ingot', 'textures/items/my_ingot')

ItemAPI.createItem('my_mod:my_ingot', ItemCategory.Items, 'my_ingot')

registry.submit()
```

Generated output — `dev/<name>_RP/textures/item_texture.json`:

```json
{
  "resource_pack_name": "<project name>",
  "texture_data": {
    "my_ingot": { "textures": "textures/items/my_ingot" }
  }
}
```

**Nothing is auto-registered.** If the short name is missing from `item_texture.json`, the
item renders as a purple-black square regardless of whether the PNG exists.

The short name and the path may differ, but keeping them the same saves confusion. Registering
the same short name twice overwrites the first entry.

Attachables (3D held models) are a different mechanism: `createModelItem()` /
`createLargeItem()` take a texture **path** and do not touch `item_texture.json`.

## 3. Block textures

Blocks use `terrain_texture.json`, managed by `TerrainTextureManager`.

```typescript
import { BlockAPI, TerrainTextureManager, registry } from '@sapdon/core'

TerrainTextureManager.registerTexture('my_block_side', 'textures/blocks/my_block_side')
TerrainTextureManager.registerTexture('my_block_top', 'textures/blocks/my_block_top')

BlockAPI.createBasicBlock('my_mod:my_block', 'nature', [
  'my_block_side',   // down
  'my_block_top',    // up
  'my_block_side',   // north
  'my_block_side',   // south
  'my_block_side',   // west
  'my_block_side',   // east
])

registry.submit()
```

**Face order is `[down, up, north, south, west, east]`.** A wrong order produces no error —
just upside-down or mirrored faces, which is the classic bug in this area.

The name "terrain" is historical; it is simply the block texture atlas.

## 4. Flipbook (animated) textures

```typescript
import { FlipbookTextures, registry } from '@sapdon/core'

FlipbookTextures.registerFlipbookTexture(
  'my_lamp',                           // must match the terrain_texture key
  'textures/blocks/my_lamp_animated',
  4,                                   // ticks per frame
  { blend_frames: true }
)
```

The image is a vertical strip of equal-width frames. `ticks_per_frame: 20` is one second per
frame.

## 5. Missing texture checklist

| Symptom | Check first |
|---------|-------------|
| Purple-black square | Is the key present in `item_texture.json` / `terrain_texture.json`, and identical to the string passed to `createItem`? |
| Key present, still purple | Does the PNG exist at `res/textures/items/x.png` for the path `textures/items/x` (no extension)? |
| Only some faces wrong | Face order `[down, up, north, south, west, east]` |
| Image edited, game unchanged | Delete `dev/` and rebuild; resource packs are cached client-side |

Also worth knowing:

- **Case sensitivity** — Windows ignores case, Linux/macOS do not. Use lowercase with underscores
- **Missing textures usually fail silently** — purple squares, invisible models, or a block that
  simply never appears, with nothing in the build log
- **`createTileBlock` uses two texture systems** — the block side wants a terrain short name, the
  entity side wants a resource path (`textures/blocks/...`). Short names alone produce
  `Missing referenced asset`; use `options.entity_texture` for the path

## 6. Complete example

```typescript
import {
  BlockAPI, ItemAPI, ItemCategory, ItemTextureManager, TerrainTextureManager,
  ItemComponent, registry,
} from '@sapdon/core'

// item
ItemTextureManager.registerTexture('my_ingot', 'textures/items/my_ingot')
ItemAPI.createItem('my_mod:my_ingot', ItemCategory.Items, 'my_ingot')
  .addComponent(ItemComponent.setDisplayName('My Ingot'))

// block
TerrainTextureManager.registerTexture('my_block_top', 'textures/blocks/my_block_top')
TerrainTextureManager.registerTexture('my_block_side', 'textures/blocks/my_block_side')
BlockAPI.createBasicBlock('my_mod:my_block', 'nature', [
  'my_block_side', 'my_block_top', 'my_block_side',
  'my_block_side', 'my_block_side', 'my_block_side',
])

registry.submit()
```

Files:

```
res/textures/items/my_ingot.png
res/textures/blocks/my_block_top.png
res/textures/blocks/my_block_side.png
```

---

## Next

- [Items](./item.md) — icons and 3D models
- [Blocks](./block.md) — texture mapping for variants
