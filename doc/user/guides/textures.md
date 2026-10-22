# 给物品和方块加贴图

目标：构建之后，创造菜单里的物品显示你自己的图标，放下去的方块六个面贴对图。

判断成了没有：打开 `dev/<项目名>_RP/textures/item_texture.json`（物品）或 `terrain_texture.json`（方块），里面有你注册的键；进游戏看图标不是紫黑格。

## 1. 图片放哪

`build.config` 的 `resource.path` 指向资源根目录，模板里是 `res/`。构建时这个目录会整份拷进资源包根目录，所以你在 `res/` 下写的路径，就是资源包里的路径：

```
res/textures/items/my_ingot.png   →   dev/<项目名>_RP/textures/items/my_ingot.png
res/textures/blocks/my_block.png  →   dev/<项目名>_RP/textures/blocks/my_block.png
```

文件名用小写下划线。Windows 上大小写写错看不出来，玩家在 Linux、macOS 或手机上装包时就会变成紫黑格。图片用 PNG，物品 16×16 或 32×32，方块边长是 16 的整数倍。JPG 不行。

## 2. 物品：注册短名，再把它给 `createItem`

`createItem()` 的第三个参数是 `item_texture.json` 里的**键**，不是文件路径。原版键（`apple`、`stick`）框架已经带了，自定义的得自己注册：

```typescript
// main.ts
import { ItemAPI, ItemCategory, ItemTextureManager, registry } from '@sapdon/core'

ItemTextureManager.registerTexture('my_ingot', 'textures/items/my_ingot')
ItemAPI.createItem('my_mod:my_ingot', ItemCategory.Items, 'my_ingot')

registry.submit()
```

构建后 `item_texture.json` 里会多一条 `"my_ingot": { "textures": "textures/items/my_ingot" }`。路径不带 `.png`，带上就是找不到。

短名和路径可以不一样，但同一个短名注册两次，后一次会盖掉前一次，而且不会提示。

带 3D 模型的物品（`createModelItem()`、`createLargeItem()`）不走这张表，直接传贴图路径。

## 3. 方块：往 `terrain_texture.json` 注册六面

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

数组顺序是 `[上, 下, 东, 西, 南, 北]`，即 `[up, down, east, west, south, north]`。这是 `BasicBlock` 构造函数里的映射顺序，和 JSON 里 `material_instances` 的字段顺序无关。写反不会报错，只会静默贴错面，上下颠倒和前后接反是这里最常见的事故。

文件名叫 terrain_texture 是历史原因，它就是方块贴图表，和地形生成没关系。

用 `createTileBlock` 做带实体的方块时，方块这边要的是 terrain 短名，实体那边要的是资源路径 `textures/blocks/...`。只给短名，客户端实体会报 `Missing referenced asset`，得用 `options.entity_texture` 单独指定。

## 4. 翻书纹理（逐帧动画）

```typescript
import { FlipbookTextures, registry } from '@sapdon/core'

FlipbookTextures.registerFlipbookTexture(
  'my_lamp',                          // terrain_texture 里的键
  'textures/blocks/my_lamp_animated', // 竖排的帧图
  4,                                  // 每帧 4 tick
  { blend_frames: true }
)

registry.submit()
```

帧图是竖着排的长条，每帧等宽。`ticks_per_frame` 写 20 大约是一秒一帧。

## 5. 显示成紫黑格，按这个顺序查

| 现象 | 先查什么 |
|---|---|
| 物品或方块是紫黑格 | `dev/<项目名>_RP/textures/item_texture.json` 里有没有这个键，键名与 `createItem` 传的是不是完全一样 |
| 表里有键，还是紫黑格 | 图片实际位置对不对：`res/textures/items/x.png` 对应 `textures/items/x`，路径里不要出现 `.png` |
| 只有某几个面不对 | 六个面的顺序 `[up, down, east, west, south, north]` |
| 换了图，游戏里没变 | 删掉 `dev/` 重新构建；客户端有缓存，退出世界再进 |
| 贴图正常，声音和破坏行为不对 | 看 `_RP/blocks.json`，方块的声音表在资源包，不在行为包 |

缺贴图通常不报错，构建日志也可能是干净的。所以改完图，先去看生成的 `item_texture.json`、`terrain_texture.json`，再进游戏。

## 相关

三个管理器的方法签名在 [纹理 API](../api/texture.md)。物品怎么带图标、怎么做 3D 模型，见 [物品教程](../tutorials/item.md)。
