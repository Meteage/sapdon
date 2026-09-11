# Sapdon 架构概览

Sapdon 是一个面向 Minecraft Bedrock 版 Addon 开发的 Node.js 工具链。它将 Minecraft 的 JSON 定义 (entity、item、block、recipe 等) 抽象为 TypeScript 类，提供类型安全、可组合的 API，并自动生成最终的 JSON 包体。

---

## 1. 项目结构

```
sapdon/
├── src/
│   ├── cli/           # CLI 应用：命令、构建管道、开发服务器、热更新
│   ├── core/          # 核心库：DTO 定义、业务逻辑 API、工厂/注册层
│   ├── oc/            # OC 运行时：ECS 游戏框架（运行时，用于 Script API）
│   ├── templates/     # 项目模板 (js_sapdon, ts_sapdon)
│   └── utils/         # 通用工具：序列化系统、类型、缓存
├── prod/              # 构建产物（发布到 npm）
│   ├── cli/           # CLI 入口 (start.js, index.js)
│   ├── core/          # 核心库
│   ├── oc/            # OC 运行时
│   └── utils/         # 工具库
├── scripts/           # 框架自身的构建脚本
├── examples/          # 示例项目
└── doc/               # 文档
```

**包入口**:

| 包名 | 源文件 | 产物 |
|------|--------|------|
| `@sapdon/core` | `src/core/index.js` | `prod/core/index.js` |
| `@sapdon/cli` | `src/cli/index.js` | `prod/cli/index.js` |
| `@sapdon/runtime` | `src/oc/index.ts` | `prod/oc/index.js` |
| `@sapdon/utils` | `src/utils/index.ts` | `prod/utils/index.js` |

`sapdon` CLI 二进制入口: `prod/cli/start.js`（`package.json` 中 `bin` 字段指定）。

---

## 2. 三层核心架构 (`src/core/`)

核心库采用 **三层架构**，自底向上：

```
┌──────────────────────────────────────────────────┐
│  Layer 3: factory/ (工厂/注册层)                   │
│  ItemAPI, EntityAPI, BlockAPI, RecipeAPI...       │
│  用户直接调用的静态 API，创建实例并注册              │
├──────────────────────────────────────────────────┤
│  Layer 2: item/, entity/, block/, biome/...       │
│  (业务逻辑/API 层)                                 │
│  Item, Food, Entity, Block, Biome 等高级类         │
│  封装组件操作方法，内部使用 Layer 1 的 DTO 生成      │
├──────────────────────────────────────────────────┤
│  Layer 1: addon/ (DTO 层)                         │
│  AddonItem, AddonEntity, AddonBlock...             │
│  纯数据类，1:1 映射 Minecraft JSON Schema           │
│  每个类有 @Serializer 装饰的 toObject() 方法        │
└──────────────────────────────────────────────────┘
```

### 2.1 DTO 层 (`addon/`)

DTO 类位于 `src/core/addon/`，直接对应 Minecraft JSON 格式。每个 DTO 类有一个 `toObject()` 方法，用 `@Serializer` 装饰器标记：

```
src/core/addon/
├── item/
│   ├── item.ts         →  AddonItem, AddonItemDefinition, AddonItemDescription
│   └── attachable.ts   →  AddonAttachable
├── entity/
│   ├── entity.ts       →  AddonEntity, AddonEntityDefinition, AddonEntityDescription
│   └── clientEntity.ts →  AddonClientEntity, AddonClientEntityDescription
├── block/block.ts      →  AddonBlock, AddonBlockDefinition, AddonBlockDescription
├── biome.ts            →  AddonBiome
├── recipe/
│   ├── shaped.ts       →  AddonRecipeShaped
│   ├── shapeless.ts    →  AddonRecipeShapeless
│   ├── furnace.ts      →  AddonRecipeFurnace
│   └── baseRecipe.ts   →  AddonRecipe (基类)
├── controllers/
│   ├── animationController.ts
│   └── render_controllers.ts
├── feature/
│   └── oreFeature.ts   →  AddonOreFeature
├── featureRule.ts      →  AddonFeatureRule
├── manifest.ts         →  AddonManifest, AddonManifestHeader, AddonManifestModule
└── menuCategory.ts     →  AddonMenuCategory
```

### 2.2 业务逻辑层 (`item/`, `entity/`, `block/` 等)

这一层是用户直接操作的类，提供高层次的组件操作方法：

- **Item** (`src/core/item/item.js`) — `addComponent()`、`removeComponent()`、`toObject()`
- **Entity** (`src/core/entity/entity.js`) — 组合 `BasicEntity`（行为包）+ `ClientEntity`（资源包）
- **Block** (`src/core/block/block.js`) — 多变体、几何、旋转等
- **ItemComponent / EntityComponent / BlockComponent** — 静态工厂方法，返回 `Map` 对象

### 2.3 工厂层 (`factory/`)

静态 API 入口，用户直接调用：

| API | 位置 | 主要方法 |
|-----|------|---------|
| `ItemAPI` | `factory/itemFactory.js` | `createItem()`, `createFood()`, `createAttachable()`, armor 系列 |
| `EntityAPI` | `factory/entityFactory.js` | `createEntity()`, `createDummyEntity()`, `createProjectile()` |
| `BlockAPI` | `factory/blockFactory.js` | 共 12 个工厂方法：`createBasicBlock()`, `createBlock()`, `createRotatableBlock()`, `createGeometryBlock()`, **`createTileBlock()`**（带实体方块）, `createHeadBlock()`, `createGlassBlock()`, `createFenceBlock()`, `createStairBlock()`, `createTrapdoorBlock()`, `createCropBlock()` |
| `RecipeAPI` | `factory/recipeFactory.js` | `registerSimpleShaped()`, `registerSimpleShapeless()`, `registerSimpleFurnace()` |
| `BiomeAPI` | `factory/biomeFactory.js` | `createBiome()` |
| `FeatureAPI` | `factory/featureFactory.js` | `createOreFeature()`, `createFeatureRules()` |
| `UiAPI` | `factory/uiFactory.js` | `createUISystem()`, `createPanel()`, `createImage()`, `createLabel()` |

---

## 3. 序列化系统 (`src/utils/serializable.ts`)

框架使用装饰器实现自定义序列化：

- **`@Serializer`** — 方法装饰器，标记 `toObject()` 为序列化方法。序列化器存储在 `WeakMap<Constructor, ISerializer>` 中
- **`@Serializable`** — 类装饰器，通过 `Symbol.metadata` 注册序列化器（备选方案）
- **`serialize(instance)`** — 查找实例的序列化器并调用
- **`encode(value)` / `decode(value)`** — 用于 HTTP 传输（JSON.stringify + jsonEncoderReplacer）
- **`jsonEncoderReplacer`** — 保留原始 JSON 类型（number/boolean 以 `JSON.rawJSON` 形式输出）

典型用法：

```typescript
class AddonItem {
  @Serializer
  toObject() {
    return { format_version: "1.21.40", "minecraft:item": { ... } }
  }
}

class Item {
  @Serializer
  toObject() {
    const dto = new AddonItem(this.identifier, ...)
    return serialize(dto)  // 委托给 DTO 的 @Serializer
  }
}
```

---

## 4. 数据流：从用户代码到 JSON 文件

```
用户代码 (main.ts)
    │
    │  ItemAPI.createItem('my:item', ItemCategory.Items, 'tex')
    │  EntityAPI.createEntity('my:entity', 'tex')
    │  registry.submit()
    ▼
┌──────────────────────────────────────────────────────┐
│ 1. 注册阶段（构建时，在子进程中执行）                    │
│                                                        │
│ ItemAPI.createItem()                                   │
│   → 创建 Item 实例                                     │
│   → GRegistry.register('my_item', 'behavior',          │
│                         'items/', item)                │
│   → 推入 { name, root, path, data } 到 clientRegistry  │
│                                                        │
│ registry.submit()                                      │
│   → 遍历 clientRegistry[]                              │
│   → 调用每个 data 的 toObject() 获取最终 JSON 数据      │
│   → transportPost('submit', data)                      │
│     (src/core/transport/client.ts, HTTP POST fallback) │
└───────────────────────┬──────────────────────────────┘
                        │ HTTP POST
                        ▼
┌──────────────────────────────────────────────────────┐
│ 2. 处理阶段（CLI 进程中）                               │
│                                                        │
│ server.handle('submit', (data) => {                    │
│   GRegistryServer.dataList = data                      │
│   generateAddon(modPath, buildPath, projectName)       │
│ })                                                     │
│                                                        │
│ generateAddon():                                       │
│   for each { name, root, path, data } in dataList:     │
│     if root == "behavior":                             │
│       → dev/<name>_BP/<path>/<name>.json               │
│     if root == "resource":                             │
│       → dev/<name>_RP/<path>/<name>.json               │
│   特殊处理: item_texture, terrain_texture,              │
│            flipbook_textures                           │
└───────────────────────┬──────────────────────────────┘
                        │ writeFileSync
                        ▼
┌──────────────────────────────────────────────────────┐
│ 3. 输出阶段                                           │
│                                                        │
│ dev/<name>_BP/                                        │
│   ├── manifest.json                                    │
│   ├── items/*.json                                     │
│   ├── entities/*.json                                  │
│   ├── blocks/*.json                                    │
│   ├── biomes/*.json                                    │
│   ├── recipes/*.json                                   │
│   ├── scripts/index.js    ← Script API 打包输出        │
│                                                        │
│ dev/<name>_RP/                                        │
│   ├── manifest.json                                    │
│   ├── entity/*.json                                    │
│   ├── textures/item_texture.json                       │
│   ├── textures/terrain_texture.json                    │
│   └── ...                                              │
└───────────────────────┬──────────────────────────────┘
                        │ syncDevFilesServer()
                        ▼
┌──────────────────────────────────────────────────────┐
│ 4. 同步到 Minecraft 目录                               │
│                                                        │
│ development_behavior_packs/<name>_BP/                  │
│ development_resource_packs/<name>_RP/                  │
└──────────────────────────────────────────────────────┘
```

---

## 5. 注册系统

注册系统采用 **客户端-服务端** 架构，分为两个部分：

### 客户端 (`src/core/registry.ts` + `src/core/transport/client.ts`)

位于 core 模块，供用户代码在子进程中调用。依赖通用的 HTTP 客户端，不引入 CLI 代码：

| 组件 | 位置 | 说明 |
|------|------|------|
| `GRegistry` | `src/core/registry.ts` | 累加注册数据的客户端注册表 |
| `GRegistry.register(name, root, path, data)` | `registry.ts` | 注册一个条目：文件名、根目录(behavior/resource)、子路径、数据实例 |
| `GRegistry.submit()` | `registry.ts` | 调用所有 data 的 `toObject()`，然后 HTTP POST 到 dev server |
| `registry.submit()` | `registry.ts` | 命名空间下的便捷入口 |
| `transportPost()` | `src/core/transport/client.ts` | 通用 HTTP POST 客户端，端口可被 `SAPDON_DEV_SERVER_PORT` 环境变量覆盖 |

### 服务端 (`src/cli/registryServer.ts`)

位于 CLI 模块，直接引用 `dev-server/server.ts` 和 `remoteLogger`。在 CLI 主进程中运行，不对外暴露：

| 组件 | 说明 |
|------|------|
| `GRegistryServer` | 服务端注册表，接收并存储数据 |
| `GRegistryServer.dataList` | 存储 `{ name, root, path, data }` 数组 |
| `GRegistryServer.startServer()` | 注册 `submitGregistry` 和 `remote-logger` 的 HTTP handler |

### 数据提交逻辑

```typescript
import { transportPost } from './transport/client.js'

export function submit() {
    const data = clientRegistryData.map(item => {
        if (typeof item.data.toObject === 'function') {
            item.data = item.data.toObject()
        }
        return item
    })
    transportPost('submit', data)
}
```

---

## 6. CLI 构建管道

### 6.1 命令

| 命令 | 说明 |
|------|------|
| `sapdon build <name>` | 完整构建 + 启动热更新 |
| `sapdon compile` | 构建当前目录项目（不带 HMR） |
| `sapdon pack` | 将构建产物打包为 `.mcaddon` 文件 |
| `sapdon create <name>` | 从模板脚手架新项目 |
| `sapdon init` | 为已有项目添加 sapdon 配置 |
| `sapdon lib` | 复制库文件到 `node_modules/@sapdon/` |
| `sapdon res` | 生成资源提示文件 `res.hint.ts` |

### 6.2 构建步骤 (`buildProject()`)

```
1. projectCanBuild()        →  验证项目目录和 build.config
2. initResourceDir()        →  扫描 res/ 目录，生成 res.hint.ts
                               ⚠️ 只在 `sapdon build` 命令里调用（start.js:117）；`sapdon compile` 不调用
3. 生成 manifest.json       →  behavior pack + resource pack 清单
                               ⚠️ 仅当 dev server 尚未监听、且 manifest 文件不存在时
4. 复制 pack_icon.png
5. 复制资源文件 res/ → RP
6. 启动开发服务器            →  startDevServer() + GRegistryServer.startServer()
                               端口取 SAPDON_DEV_SERVER_PORT（默认 49037）
7. runScript(main.ts)       →  rollup 编译 → cp.spawn(process.execPath, [file]) 执行
                                 子进程中用户代码执行并注册数据
                                 HTTP POST 提交数据到 dev server
                                 generateAddon() 生成 JSON 文件
                               ★ 检查子进程退出码，非 0 直接抛错
8. bundleScripts()          →  rollup 打包 scripts/main.ts → scripts/index.js（await）
9. syncDevFilesServer()     →  复制 BP/RP 到 Minecraft 开发包目录
10. 收尾                    →  keepServer 为真：保持服务器常开
                               为假（默认）：process.exit(0) 自动退出
```

**失败必须非 0 退出**：历史行为是构建脚本失败被吞掉、CLI 照样打印「构建完成」并 `exit 0`，于是 `dev/` 里留下的是旧产物。现在 `runOnChild()` 检查退出码、`scriptBundler` 打包失败即抛、CLI 顶层 catch `process.exit(1)`。⇒ **「构建成功」不可信**，成功的判据是**退出码 0** + 日志里出现 `处理数据: <name> <root> <path>`（`src/cli/load.js:210`）。

⚠️ **不要用 `cp.fork`**：`fork` 一定会建立 IPC **命名管道**（受限环境下 `spawn EPERM`），而框架传输层走 **HTTP**（`src/core/transport/client.ts` → localhost），**从不使用 IPC**；`spawn(process.execPath, [file], { stdio: 'inherit' })` 是等价且更少依赖的写法（`src/cli/build.js:191-200`）。

### 6.3 关键文件职责

| 文件 | 作用 |
|------|------|
| `src/cli/start.js` | CLI 入口，定义所有 commander 命令 |
| `src/cli/build.js` | 构建编排器：`scriptBundler`、`buildProject()`、`runScript()` |
| `src/cli/load.js` | `generateAddon()` — 遍历 dataList 写入 JSON 文件，生成纹理 JSON；陈旧产物清单清理；自定义组件注册索引合并 |
| `src/cli/init.js` | 项目初始化：脚手架生成、路径辅助（`getBuildDirBp/Rp` 固定大写 `_BP`/`_RP`） |
| `src/cli/pack.js` | `packProject()` — 把 `dev/<proj>_BP`、`dev/<proj>_RP` 打包为 `.mcaddon` |
| `src/cli/utils.ts` | `saveFile`、`readFile`、`copyFileSync` 等文件 I/O 工具 |
| `src/cli/registryServer.ts` | `GRegistryServer` — 服务端注册表，注册 `submitGregistry` / `remote-logger` handler |
| `src/cli/dev-server/server.ts` | `DevelopmentServer` — 构建时进程间通信的 HTTP 服务（**不是 IPC**） |
| `src/cli/dev-server/client.js` | `cliRequest()` / `post()` — CLI 内部使用的 HTTP 客户端（remoteLogger 等） |
| `src/cli/dev-server/hmr.js` | `hmr()` — 文件监听器，热更新触发重建 |
| `src/cli/dev-server/syncFiles.js` | `syncDevFilesServer()` — 同步到 Minecraft 目录；`writeLib()` — 复制库文件 |

---

## 7. 开发服务器

- **端口**: 49037（可通过环境变量 `SAPDON_DEV_SERVER_PORT` 覆盖）
- **实现**: 原生 Node.js `http.createServer()`
- **传输**: HTTP POST + JSON body
- **通信模式**:
  - 客户端（子进程中用户代码）：`transportPost(path, ...params)`（来自 `src/core/transport/client.ts`）
  - 服务端（CLI 进程）：`server.handle(url, handler)`（来自 `src/cli/dev-server/server.ts`）
  - 编码/解码：`encode()`/`decode()`（基于 `JSON.stringify` + `jsonEncoderReplacer`）
- **架构原则**: core 模块只包含通用 HTTP 客户端，不引用 CLI 代码。服务端逻辑全部位于 CLI 内部。

### Handler 列表

| Handler | 注册位置 | 用途 |
|---------|---------|------|
| `submitGregistry` | `registryServer.ts:12` | 接收注册数据、存入 `GRegistryServer.dataList`（由 `GRegistry.submit()` 提交，`core/registry.ts:52`） |
| `submit` | `build.js:308` | 接收数据并触发 `generateAddon()` 写 JSON（由 `registry.submit()` 提交，`core/registry.ts:87`）；`buildMode === 'debug'` 时跳过生成 |
| `remote-logger` | `registryServer.ts:16` | 游戏内 Script API 通过此 handler 发送日志到 CLI |

⚠️ `GRegistry.submit()` 与 `registry.submit()` 是**两个不同入口、POST 到两个不同 handler**：前者只上传数据（供 dev server 侧的注册表使用），后者才触发 `generateAddon()` 落盘。用户项目里通常调用 `registry.submit()`。

---

## 8. 热更新 (HMR)

- **触发**: `sapdon build` 命令自动启动 HMR（`build.config` 中 `useHMR: true`）
- **机制**: `fs.watch` 递归监听项目目录，1 秒防抖
- **监听文件**: `.js`、`.ts`、`build.config`、`mod.info`
- **排除**: 点文件、构建输出目录 (`dev/`)、`.tmp` 文件
- **处理流程**: 文件变更 → `buildProject()` 重新构建 → `syncDevFilesServer()` 同步到 Minecraft
- **资源热更新**: 监听 `res/` 目录，3 秒防抖，变更时运行 `sapdon res`

---

## 9. OC 运行时 (`src/oc/`)

OC (Object-Component) 是一个 ECS 风格的游戏框架，用于 Minecraft Script API 运行时：

### 核心架构

| 组件 | 说明 |
|------|------|
| `Component<Actor>` | 组件接口：`onTick(dt)`、`onAttach()`、`onDetach()` |
| `BasicComponent<Actor>` | 带有 onAttach/onDetach 生命周期钩子的抽象基类 |
| `ComponentManager<Actor>` | 管理实体的组件附加和 tick 循环 |
| `Level<Actor>` | 抽象关卡：`addEntity()`、`removeEntity()`、通过 `Scheduler` 驱动 |
| `Scheduler<Actor>` | 调度器，使用 `system.runInterval()` 驱动 tick |
| `MinecraftTickingScheduler` | `Scheduler` 的 Minecraft 实现 |
| `Optional<T>` | Monadic Option 类型 |

### 装饰器

- `@MinecraftMain` — 标记主游戏类，自动绑定玩家/实体生成事件
- `@PlayerSpawned` / `@EntitySpawned` / `@ActorSpawned` — 实体生成时自动附加组件
- `@SpawnFilter` — 过滤哪些实体附加组件
- `RequireComponents(...)` — ⚠️ 它不是装饰器，而是 `src/oc/core.ts:221` 的 **mixin 工厂函数**（返回一个带依赖的组件类）；用法见 [OC 运行时文档](oc.md) 第 2.5 节

---

## 10. 框架自身的构建流程 (`scripts/build.cjs`)

Sapdon 框架自身的构建使用四步管道：

```
tsc (TypeScript 编译)
  │  src/ → dist/
  │  编译 .ts 到 .js，保留路径结构
  ▼
tsc-alias (路径别名解析)
  │  @sapdon/* → 正确的相对路径
  ▼
rollup (打包)
  │  dist/ → prod/
  │  9 个 bundle:
  │    start, CLI, Core, OC, Utils
  │    + 各自的 .d.ts 声明文件
  │  插件: node-resolve, commonjs, json, terser
  │  外部化: rollup, typescript, @sapdon/*, @minecraft/*
  ▼
收尾 (scripts/build.cjs)
  │  拷贝 src/templates → prod/templates
  └─ 删除 dist/（除非 `node scripts/build.cjs keep`）
```

> 这 4 步由 `scripts/build.cjs` 串起来（`npm run build`）。⚠️ 在受限环境里需要**拆开直跑**这 4 步，并注意「漏 `tsc-alias`」与「rollup 全绿 ≠ prod 是新的」两个坑，详见 [开发工作流](workflow.md) 第 2 节。

> **开发工作流**：修改 `src/` 后运行 `npm run build` 重建 `prod/`，在项目侧通过 `npm i`（触发 `postinstall` → `sapdon lib`）或直接运行 `sapdon lib` 将新库同步到 `node_modules/@sapdon/`，然后使用 `sapdon compile` / `npm run build`。详见 [开发工作流](workflow.md)。

---

## 11. 目录输出路径

构建产物输出规则：

| 数据类型 | root | dataPath | 输出路径 |
|---------|------|----------|---------|
| 物品 | `behavior` | `items/` | `dev/<proj>_BP/items/<name>.json` |
| 实体 (行为) | `behavior` | `entities/` | `dev/<proj>_BP/entities/<name>.json` |
| 方块 | `behavior` | `blocks/` | `dev/<proj>_BP/blocks/<name>.json` |
| 配方 | `behavior` | `recipes/` | `dev/<proj>_BP/recipes/<name>.json` |
| 生物群系 | `behavior` | `biomes/` | `dev/<proj>_BP/biomes/<name>.json` |
| 特征 | `behavior` | `features/` | `dev/<proj>_BP/features/<name>.json` |
| 特征规则 | `behavior` | `feature_rules/` | `dev/<proj>_BP/feature_rules/<name>.json` |
| **方块贴图/音效表** `blocks.json` | `resource` | (空) | **`dev/<proj>_RP/blocks.json`** |
| 实体 (资源) | `resource` | `entity/` | `dev/<proj>_RP/entity/<name>.json` |
| 附着物 | `resource` | `attachables/` | `dev/<proj>_RP/attachables/<name>.json` |
| 渲染控制器 | `resource` | `render_controllers/` | `dev/<proj>_RP/render_controllers/<name>.json` |
| 物品贴图图集 | — | — | `dev/<proj>_RP/textures/item_texture.json` |
| 方块贴图图集 | — | — | `dev/<proj>_RP/textures/terrain_texture.json` |
| 翻书贴图 | — | — | `dev/<proj>_RP/textures/flipbook_textures.json` |

说明：

- 路径里的 `<proj>` 是**项目名**（目录 basename），`<name>` 是**注册项的数据名**，两者是两个不同的值。
- `_BP` / `_RP` 必须**大写**（`src/cli/init.js:105-114`）。历史版本曾用小写 `_bp`/`_rp`，Windows 大小写不敏感掩盖了它，Linux/macOS 下会分叉成两个目录（构建写 A、打包读 B → 空包）。
- **`blocks.json` 属资源包（RP）**，不是行为包。依据：[Bedrock Wiki · Pack Folder Structure](https://wiki.bedrock.dev/documentation/pack-structure) 把 `blocks.json` 列在 **RP** 根目录（BP 侧无此文件）；[Bedrock Wiki · Block Sounds](https://wiki.bedrock.dev/blocks/block-sounds) 的示例标题即 `RP/blocks.json`。
  它的**键必须是完整标识符** `ns:name`（如 `"wiki:chestnut_log"`），**不是** `ns_name`——`ns_name` 是「文件名安全名」（`:` 在 Windows 文件名里非法）被误复用成 JSON 键的产物；键不含 `:` 时框架会 `console.warn`（`blockFactory.js:26-34`）。
  ⚠️ 游戏内音效/贴图是否正常**未验证**（本项目无法启动 Minecraft），只验证到位置与键格式符合 wiki 规范（`blockFactory.js:71-77`）。

最终同步到 Minecraft 目录（`versionType` 决定路径）：

- **release**: `%USERPROFILE%\AppData\Roaming\Minecraft Bedrock\Users\Shared\games\com.mojang\development_<behavior|resource>_packs\<name>_<BP|RP>\`
- **beta**: `%USERPROFILE%\AppData\Local\Packages\Microsoft.MinecraftWindowsBeta_8wekyb3d8bbwe\LocalState\games\com.mojang\development_<behavior|resource>_packs\<name>_<BP|RP>\`

可通过环境变量 `MC_PATH` 或 `MC_BETA_PATH` 覆盖。
