# 纹理系统 API 参考

本文档涵盖 Sapdon 框架的纹理系统 API，包括物品纹理、方块纹理和翻书纹理（Flipbook Textures）。

---

## ItemTextureManager

物品纹理管理器，用于注册和管理物品纹理。所有方法均为静态方法。

### 方法

#### `ItemTextureManager.registerTexture(name, path)`

注册一个物品纹理。

| 参数 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | 纹理名称，如 `"masterball"` |
| `path` | `string` | 纹理路径，如 `"textures/items/masterball"` |

```javascript
import { ItemTextureManager } from "@sapdon/core";

ItemTextureManager.registerTexture("masterball", "textures/items/masterball");
ItemTextureManager.registerTexture("ruby_sword", "textures/items/ruby_sword");
```

#### `ItemTextureManager.registerTextureData(name, data)`

注册一个带有完整数据结构的物品纹理，允许传入包含 `textures` 字段的对象。

| 参数 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | 纹理名称 |
| `data` | `object` | 纹理数据对象，至少包含 `{ textures: string \| string[] }` |

```javascript
ItemTextureManager.registerTextureData("ruby_ingot", {
  textures: "textures/items/ruby_ingot"
});
```

#### `ItemTextureManager.getItemTextures()`

返回所有已注册的物品纹理的键值对对象。等价于 `Object.fromEntries(item_texture_sets)`。

```javascript
const textures = ItemTextureManager.getItemTextures();
// 输出: { masterball: { textures: "textures/items/masterball" }, ... }
```

#### `ItemTextureManager.toObject()`

与 `getItemTextures()` 行为相同，返回当前所有已注册纹理的纯对象表示。

```javascript
const obj = ItemTextureManager.toObject();
```

### 自动注册

每次调用 `registerTexture` 或 `registerTextureData` 时，会自动调用 `GRegistry.register("item_texture", "resource", "textures/", this)`，将当前管理器注册到全局注册表中。当执行 `registry.submit()` 时，框架会调用 `toObject()` 获取最终数据并生成 JSON 文件。

---

## TerrainTextureManager

方块纹理管理器，用于注册和管理方块（地形）纹理。API 与 `ItemTextureManager` 完全一致。

### 方法

#### `TerrainTextureManager.registerTexture(name, path)`

注册一个方块纹理。

```javascript
import { TerrainTextureManager } from "@sapdon/core";

TerrainTextureManager.registerTexture("ruby_block", "textures/blocks/ruby_block");
TerrainTextureManager.registerTexture("ruby_ore", "textures/blocks/ruby_ore");
```

#### `TerrainTextureManager.registerTextureData(name, data)`

注册一个带有完整数据结构的方块纹理。

```javascript
TerrainTextureManager.registerTextureData("sapdon_stone", {
  textures: "textures/blocks/sapdon_stone"
});
```

#### `TerrainTextureManager.getTerrainTextures()`

返回所有已注册的方块纹理键值对对象。

#### `TerrainTextureManager.toObject()`

返回当前所有已注册方块纹理的纯对象表示。

---

## FlipbookTextures

翻书纹理管理器，用于注册动画纹理（逐帧切换的纹理）。它是一个纯对象，不是类。

### 方法

#### `FlipbookTextures.registerFlipbookTexture(atlas_tile, texture, ticks_per_frame, options)`

注册一个翻书纹理。

| 参数 | 类型 | 说明 |
|------|------|------|
| `atlas_tile` | `string` | 对应的图块名称，与方块纹理名称对应 |
| `texture` | `string` | 翻书纹理路径 |
| `ticks_per_frame` | `number` | 每帧持续的 tick 数（20 ticks = 1 秒） |
| `options` | `object` | 可选参数，会被合并到纹理对象中 |

可选参数 `options` 包含的字段（对应 Minecraft 的 `flipbook_textures.json`）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `atlas_index` | `number` | 纹理图集中的索引 |
| `atlas_tile_variant` | `number` | 图块变体 |
| `replicate` | `number` | 复制次数 |
| `blend_frames` | `boolean` | 是否混合帧过渡 |

```javascript
import { FlipbookTextures } from "@sapdon/core";

FlipbookTextures.registerFlipbookTexture(
  "sapdon_lamp",
  "textures/blocks/sapdon_lamp_animated",
  4,
  { blend_frames: true }
);
```

#### `FlipbookTextures.toObject()`

返回翻书纹理数组。

```javascript
const flipbookData = FlipbookTextures.toObject();
// 输出: [ { atlas_tile: "sapdon_lamp", flipbook_texture: "textures/blocks/sapdon_lamp_animated", ticks_per_frame: 4, blend_frames: true } ]
```

---

## 与 GRegistry 的集成

所有纹理管理器在调用注册方法时，会自动调用 `GRegistry.register()` 注册自身。构建时调用 `registry.submit()` 后，框架会遍历注册数据，调用每个管理器的 `toObject()` 方法获取最终 JSON 结构，然后写入对应的资源包文件。

典型流程：

```javascript
import { ItemTextureManager, TerrainTextureManager, FlipbookTextures } from "@sapdon/core";
import { registry } from "@sapdon/core";

// 注册纹理
ItemTextureManager.registerTexture("ruby_ingot", "textures/items/ruby_ingot");
TerrainTextureManager.registerTexture("ruby_block", "textures/blocks/ruby_block");
FlipbookTextures.registerFlipbookTexture("ruby_lamp", "textures/blocks/ruby_lamp_anim", 2);

// 提交注册数据，触发 JSON 生成
registry.submit();
```

---

## 生成的 JSON 文件

构建完成后，框架会根据注册数据自动生成以下文件到资源包目录：

| 文件名 | 来源 | 示例 |
|--------|------|------|
| `textures/item_texture.json` | `ItemTextureManager` | `{ "resource_pack_name": "...", "texture_data": { "ruby_ingot": { "textures": "textures/items/ruby_ingot" } } }` |
| `textures/terrain_texture.json` | `TerrainTextureManager` | `{ "resource_pack_name": "...", "texture_data": { "ruby_block": { "textures": "textures/blocks/ruby_block" } } }` |
| `textures/flipbook_textures.json` | `FlipbookTextures` | `[ { "atlas_tile": "ruby_lamp", "flipbook_texture": "textures/blocks/ruby_lamp_anim", "ticks_per_frame": 2 } ]` |
