# Add textures to items and blocks

Goal: after a build, your item shows your own icon in the creative menu, and the block you place has the right image on all six faces.

How to tell it worked: `dev/<project>_RP/textures/item_texture.json` (items) or `terrain_texture.json` (blocks) contains the key you registered, and the game shows your image instead of a purple-black square.

> Chinese original: [`doc/user/guides/textures.md`](../../user/guides/textures.md)

## 1. Where the PNG goes

`resource.path` in `build.config` (default `res/`) is copied as-is into the resource pack root, so a path under `res/` is the path inside the pack:

```
res/textures/items/my_ingot.png   →   dev/<project>_RP/textures/items/my_ingot.png
res/textures/blocks/my_block.png  →   dev/<project>_RP/textures/blocks/my_block.png
```

Use lowercase names with underscores. Windows ignores case, phones and macOS do not, which is why a Windows-only build can ship purple squares. PNG only: items 16×16 or 32×32, blocks a multiple of 16. JPG will not work.

## 2. Items: register a short name, then pass it to `createItem`

The third argument of `createItem()` is a key in `item_texture.json`, not a file path. Vanilla keys such as `apple` and `stick` already exist. Custom keys must be registered:

```typescript
// main.ts
import { ItemAPI, ItemCategory, ItemTextureManager, registry } from '@sapdon/core'

ItemTextureManager.registerTexture('my_ingot', 'textures/items/my_ingot')
ItemAPI.createItem('my_mod:my_ingot', ItemCategory.Items, 'my_ingot')

registry.submit()
```

After the build, `item_texture.json` contains `"my_ingot": { "textures": "textures/items/my_ingot" }`. The path has no `.png`; adding the extension makes the texture unfindable.

Short name and path may differ, but registering the same short name twice silently keeps the last one.

Items with 3D models (`createModelItem()`, `createLargeItem()`) skip this table and take a texture path directly.

## 3. Blocks: register six faces in `terrain_texture.json`

```typescript
import { BlockAPI, TerrainTextureManager, registry } from '@sapdon/core'

TerrainTextureManager.registerTexture('my_block_side', 'textures/blocks/my_block_side')
TerrainTextureManager.registerTexture('my_block_top', 'textures/blocks/my_block_top')

BlockAPI.createBasicBlock('my_mod:my_block', 'nature', [
  'my_block_top',    // up
  'my_block_side',   // down
  'my_block_side',   // east
  'my_block_side',   // west
  'my_block_side',   // south
  'my_block_side',   // north
])

registry.submit()
```

The array order is `[up, down, east, west, south, north]`. That is the mapping inside the `BasicBlock` constructor and has nothing to do with the field order in `material_instances`. A wrong order raises no error; it just puts the images on the wrong faces, which is the most common mistake here.

The name "terrain" is historical. It is the block texture table and has nothing to do with terrain generation.

`createTileBlock` uses two texture systems: the block side takes a terrain short name, while the client entity takes a resource path such as `textures/blocks/...`. Short names alone produce `Missing referenced asset`; pass `options.entity_texture` for the entity side.

## 4. Flipbook (animated) textures

```typescript
import { FlipbookTextures, registry } from '@sapdon/core'

FlipbookTextures.registerFlipbookTexture(
  'my_lamp',                          // key in terrain_texture
  'textures/blocks/my_lamp_animated', // vertical frame strip
  4,                                  // ticks per frame
  { blend_frames: true }
)

registry.submit()
```

The image is a vertical strip of equal-width frames. `ticks_per_frame: 20` is roughly one second per frame.

## 5. Purple-black square: check in this order

| Symptom | Check first |
|---|---|
| Item or block is purple-black | Is the key in `dev/<project>_RP/textures/item_texture.json`, spelled exactly like the argument you passed? |
| Key exists, still purple | Does the PNG exist at `res/textures/items/x.png` for the path `textures/items/x`? The path never includes `.png` |
| Only some faces are wrong | Face order `[up, down, east, west, south, north]` |
| Image changed, game unchanged | Delete `dev/` and rebuild. The client caches resource packs, so leave the world and rejoin |
| Textures fine, sounds or breaking behaviour odd | Look at `_RP/blocks.json`; the block sound table lives in the resource pack |

Missing textures usually fail silently and the build log stays clean. After changing an image, open the generated `item_texture.json` or `terrain_texture.json` before launching the game.

## Related

Method signatures are in `doc/user/api/texture.md` (Chinese). Icons and 3D models for items are covered in [Items](../tutorials/item.md).
