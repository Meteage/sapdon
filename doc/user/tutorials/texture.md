# 纹理教程

贴图放哪、怎么让框架认识它、为什么不显示 —— 这三件事一次讲完。

> 前置：[快速入门](../quick-start.md)。参考文档：[纹理 API](../api/texture.md)、[物品 API](../api/item.md)。

---

## 1. 资源目录约定

`build.config` 里的 `resource.path` 指向资源根目录（模板是 `res/`），构建时**整份拷进资源包根目录**：

```
res/                                  dev/<name>_RP/
├── textures/items/my_ingot.png   →   ├── textures/items/my_ingot.png
├── textures/blocks/my_block.png  →   ├── textures/blocks/my_block.png
├── models/blocks/cube.geo.json   →   ├── models/blocks/cube.geo.json
├── animations/*.animation.json   →   ├── animations/*.animation.json
└── sounds/...                    →   └── sounds/...
```

所以路径**必须**与 Minecraft 资源包规范一致：`res/` 下写什么，包里就是什么。
`res/textures/` 下多套一层自定义目录（比如 `res/textures/my_mod/`）也能用，但引用时路径要写全。

图片要求：PNG、正方形（物品 16×16 或 32×32，方块 16×16 的整数倍），**不要**用 JPG。

---

## 2. 物品纹理

### 2.1 放文件

```
res/textures/items/my_ingot.png
```

### 2.2 注册短名

`createItem()` 的第三个参数是**纹理短名**，不是路径。原版短名（`apple`、`stick`）自带，自定义短名必须注册：

```typescript
// main.ts
import { ItemAPI, ItemCategory, ItemTextureManager, registry } from '@sapdon/core'

// 短名 my_ingot → textures/items/my_ingot
ItemTextureManager.registerTexture('my_ingot', 'textures/items/my_ingot')

ItemAPI.createItem('my_mod:my_ingot', ItemCategory.Items, 'my_ingot')

registry.submit()
```

构建后会生成 `dev/<name>_RP/textures/item_texture.json`：

```json
{
  "resource_pack_name": "<项目名>",
  "texture_data": {
    "my_ingot": { "textures": "textures/items/my_ingot" }
  }
}
```

### 2.3 短名与路径的区别

- `texture` 参数 = `item_texture.json` 里的**键**（短名）
- `registerTexture(name, path)` = 键 → 真实路径的映射
- 两者名字可以不同，但保持一致最省心；**同一个短名注册两次会互相覆盖**

物品的 3D 模型（attachable）走的是另一条路：`createModelItem()` / `createLargeItem()` 直接传贴图路径，
不进 `item_texture.json`。

---

## 3. 方块纹理

方块走 `terrain_texture.json`，管理器是 `TerrainTextureManager`：

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

**六面顺序固定为 `[down, up, north, south, west, east]`**，传错不会报错，只会静默贴错面 ——
上下颠倒、前后接反是这里的经典事故。

> 名字叫「terrain」是历史原因，它就是方块纹理表，与地形生成无关。

---

## 4. 翻书纹理（逐帧动画）

```typescript
import { FlipbookTextures, registry } from '@sapdon/core'

FlipbookTextures.registerFlipbookTexture(
  'my_lamp',                          // 与 terrain_texture 里的键对应
  'textures/blocks/my_lamp_animated', // 竖排的帧图
  4,                                  // 每帧停 4 tick
  { blend_frames: true }
)

registry.submit()
```

帧图是**竖着排列**的多帧长条（每帧等宽），`ticks_per_frame = 20` 约等于每秒换一帧。

---

## 5. 贴图不显示怎么查

按这个顺序排，八成在前两步：

| 现象 | 先查 |
|------|------|
| 物品/方块是紫黑格 | `item_texture.json` / `terrain_texture.json` 里有没有这个键；键名与 `createItem` 传的是否完全一致 |
| JSON 里有键，但还是紫黑格 | PNG 实际路径对不对：`res/textures/items/x.png` ↔ `textures/items/x`（**路径不带 `.png`**） |
| 只有某些面不对 | 六面顺序 `[down, up, north, south, west, east]` |
| 改了图但游戏里没变 | 删 `dev/` 重新构建；客户端资源包有缓存，退出世界再进 |
| 方块贴图生效但音效/破坏行为怪 | 看 `_RP/blocks.json`（方块定义表，属资源包） |

补充两条：

- **大小写敏感**：Windows 上路径不区分大小写，Linux/macOS 会，文件名一律小写下划线
- **缺贴图通常不报错**：表现为紫黑格、模型不显示、或方块整体不出现，构建日志里往往什么都没有
- **`createTileBlock` 的贴图是两套**：方块侧要 terrain 短名，承载实体侧要资源路径（`textures/blocks/...`），
  只给短名会报 `Missing referenced asset`，用 `options.entity_texture` 单独指定

---

## 6. 完整示例

```typescript
// main.ts
import {
  BlockAPI, ItemAPI, ItemCategory, ItemTextureManager, TerrainTextureManager,
  ItemComponent, registry,
} from '@sapdon/core'

// —— 物品
ItemTextureManager.registerTexture('my_ingot', 'textures/items/my_ingot')
ItemAPI.createItem('my_mod:my_ingot', ItemCategory.Items, 'my_ingot')
  .addComponent(ItemComponent.setDisplayName('我的锭'))

// —— 方块
TerrainTextureManager.registerTexture('my_block_top', 'textures/blocks/my_block_top')
TerrainTextureManager.registerTexture('my_block_side', 'textures/blocks/my_block_side')
BlockAPI.createBasicBlock('my_mod:my_block', 'nature', [
  'my_block_side', 'my_block_top', 'my_block_side',
  'my_block_side', 'my_block_side', 'my_block_side',
])

registry.submit()
```

配套文件：

```
res/textures/items/my_ingot.png
res/textures/blocks/my_block_top.png
res/textures/blocks/my_block_side.png
```

---

## 下一步

- [纹理 API](../api/texture.md) — 三个管理器的完整签名
- [物品教程](./item.md) — 物品图标与 3D 模型
- [方块教程](./block.md) — 多变体方块的纹理映射
