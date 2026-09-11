# Sapdon

Minecraft Bedrock 版 Addon 开发框架，将 JSON 配置抽象为 TypeScript 类，提供类型安全的 API 和自动化构建工具。

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0-blue)](https://nodejs.org/)
[![npm Version](https://img.shields.io/npm/v/sapdon)](https://www.npmjs.com/package/sapdon)
[![QQ Group](https://img.shields.io/badge/QQ%E7%BE%A4-810904181-green)](https://qm.qq.com/q/2HrXHcKq9j)

---

## 特性

- **TypeScript / JavaScript 驱动** — 用代码定义物品、实体、方块、配方等，自动生成 JSON
- **三层架构** — DTO 层映射 Minecraft Schema，业务逻辑层封装组件操作，工厂层提供简洁 API
- **30+ 核心 API** — ItemAPI、EntityAPI、BlockAPI、RecipeAPI、BiomeAPI、FeatureAPI、UiAPI
- **序列化系统** — 装饰器驱动，`@Serializer` 自动将类实例转为标准 Minecraft JSON
- **即时代码注册** — 通过 HTTP 与开发服务器通信，无需手动管理 JSON 文件
- **热更新 (HMR)** — 文件变更自动触发热更新，即时同步到 Minecraft
- **OC 运行时** — ECS 游戏框架，用于 Minecraft Script API 环境，支持组件、调度器、输入处理

---

## 快速开始

### 环境要求

- Node.js 18+
- npm

### 安装

把 `sapdon` 作为当前项目的本地开发依赖安装（不写入全局 PATH）：

```bash
npm install -D sapdon
```

### 创建项目

通过 `npx` 调用本地安装的 `sapdon`：

```bash
npx sapdon create my_addon
```

根据提示输入项目信息，选择 TypeScript 或 JavaScript 模板。

### 项目结构

```
my_addon/
├── main.ts              # 构建入口（定义物品、实体等）
├── build.config         # 构建配置
├── mod.info             # 模组元数据
├── tsconfig.json        # TypeScript 配置
├── pack_icon.png        # 模组图标
├── res/                 # 资源文件（纹理、模型、音效）
└── scripts/
    └── main.ts          # Script API 入口（游戏内运行时）
```

### 编写代码

```typescript
// main.ts
import { ItemAPI, ItemCategory, EntityAPI, registry, ItemComponent } from '@sapdon/core'

// 创建一个物品
ItemAPI.createItem('my_addon:magic_ingot', ItemCategory.Items, 'magic_ingot')
  .addComponent(ItemComponent.setDisplayName('魔法锭'))

// 提交注册
registry.submit()
```

### 构建

```bash
# 在项目目录中
sapdon build .
```

构建输出在 `dev/` 目录：
- `dev/my_addon_BP/` — 行为包（entities/, items/, blocks/, scripts/...）
- `dev/my_addon_RP/` — 资源包（entity/, textures/, animations/, ui/...）

构建完成后自动同步到 Minecraft 开发包目录。

---

## 核心 API 示例

### 物品

```typescript
import { ItemAPI, ItemCategory } from '@sapdon/core'

// 基础物品
ItemAPI.createItem('my:item', ItemCategory.Items, 'texture')

// 食物
ItemAPI.createFood('my:food', ItemCategory.Items, 'apple')
  .addComponent(ItemComponent.setFoodComponent({ nutrition: 4, saturationModifier: 0.6 }))

// 带自定义组件的物品
ItemAPI.createItem('my:tool', ItemCategory.Items, 'tool_tex')
  .addComponent(ItemComponent.setHandEquipped(true))
  .addComponent(ItemComponent.setDurability(250))
  .format_version = '1.21.90'
```

### 实体

```typescript
// 创建实体（自动注册 behavior + resource）
const golem = EntityAPI.createEntity('my:golem', 'textures/entity/golem', {
  is_spawnable: true,
  is_summonable: true
})

// 行为包组件
golem.behavior.addComponent(
  EntityComponent.combineComponents(
    EntityComponent.setHealth(50, 50),
    EntityComponent.setMovement(0.25),
    EntityComponent.setCollisionBox(1, 1.5)
  )
)

// 资源包配置
golem.resource.addGeometry('default', 'geometry.golem')
golem.resource.addMaterial('default', 'entity_alphatest')
golem.resource.addTexture('default', 'textures/entity/golem')
```

### 方块

```typescript
// 基础方块（6面纹理）
BlockAPI.createBasicBlock('my:block', 'nature',
  ['down', 'up', 'north', 'south', 'west', 'east'])

// 可旋转方块
BlockAPI.createRotatableBlock('my:log', 'nature',
  ['log_top', 'log_top', 'log_side', 'log_side', 'log_side', 'log_side'],
  { rotationType: RotationTypes.LOG })
```

### 配方

```typescript
// 有序配方
RecipeAPI.registerSimpleShaped('my:item', ['my:item'],
  ['ABA', 'BCB', 'ABA'], {
    A: 'minecraft:iron_ingot',
    B: 'minecraft:gold_ingot',
    C: 'minecraft:diamond'
  }
).tags('crafting_table')

// 熔炉配方
RecipeAPI.registerSimpleFurnace('my:smelted', 'my:ore')
```

---

## 架构概览

### 三层核心架构

```
┌──────────────────────────────────────────────┐
│  工厂/API 层                                  │
│  ItemAPI, EntityAPI, BlockAPI, RecipeAPI...    │
│  用户直接调用，创建实例并注册                    │
├──────────────────────────────────────────────┤
│  业务逻辑层                                    │
│  Item, Entity, Block, Biome...                │
│  封装组件操作方法                               │
├──────────────────────────────────────────────┤
│  DTO 层                                       │
│  AddonItem, AddonEntity, AddonBlock...         │
│  1:1 映射 Minecraft JSON Schema               │
└──────────────────────────────────────────────┘
```

### 数据流

```
用户代码 (main.ts)         CLI 进程              构建输出
    │                        │                     │
    │── registry.submit() ──→│  HTTP POST           │
    │                        │  generateAddon()     │
    │                        │  → entities/*.json   │
    │                        │  → items/*.json      │
    │                        │  → blocks/*.json     │
    │                        │  → scripts/index.js  │
    │                        │                     │
    │                        │── syncDevFilesServer │
    │                        │  → Minecraft 目录   │
```

详见 [doc/dev/architecture.md](./doc/dev/architecture.md)。

---

## 文档

| 文档 | 说明 |
|------|------|
| [快速入门](./doc/user/quick-start.md) | 安装、创建、构建 |
| [物品教程](./doc/user/tutorials/item.md) | 基础物品 → 食物 → 盔甲 |
| [实体教程](./doc/user/tutorials/entity.md) | 创建实体 → 组件 → AI 行为 |
| [方块教程](./doc/user/tutorials/block.md) | 基础方块 → 旋转 → 作物 |
| [配方教程](./doc/user/tutorials/recipe.md) | 有序/无序/熔炉配方 |
| [UI 教程](./doc/user/tutorials/sapdon-ui.md) | 自定义 Server Form 页面壳（含完整示例） |
| [物品 API](./doc/user/api/item.md) | ItemAPI、Item、ItemComponent |
| [实体 API](./doc/user/api/entity.md) | EntityAPI、EntityComponent、AI |
| [方块 API](./doc/user/api/block.md) | BlockAPI、BlockComponent、TileBlock、自定义组件两条路线 |
| [运行期 API](./doc/user/api/runtime.md) | `@sapdon/runtime`：自定义组件注册、分块持久化 |
| [UI API](./doc/user/api/sapdon-ui.md) | Sapdon UI 页面壳、FormButton / FormButtonGrid |
| [配方 API](./doc/user/api/recipe.md) | RecipeAPI、配方类 |
| [生物群系 & 特征 API](./doc/user/api/biome.md) | BiomeAPI、FeatureAPI |
| [纹理 API](./doc/user/api/texture.md) | 纹理管理器 |
| [扩展模块 API](./doc/user/api/extra.md) | ClientEntityApperance、BaseVehicle |
| [手册（Guidebook）](./doc/guidebook.md) | SapdonGuideBook：三层手册、页类型、路由协议、多语言 |
| [build.config](./doc/user/config/build-config.md) | 构建配置字段 |
| [mod.info](./doc/user/config/mod-info.md) | 模组元数据 |
| [常见问题](./doc/user/faq.md) | FAQ |
| [架构概览](./doc/dev/architecture.md) | 整体架构（源码开发者） |
| [Core 模块](./doc/dev/core.md) | 三层架构详解（源码开发者） |
| [CLI 模块](./doc/dev/cli.md) | 构建管道（源码开发者） |
| [OC 运行时](./doc/dev/oc.md) | ECS 框架（源码开发者） |
| [开发工作流](./doc/dev/workflow.md) | 框架自身构建、全局 CLI、项目侧同步（源码开发者） |
| [已知坑清单](./doc/dev/known-pitfalls.md) | 改框架前先扫一遍（源码开发者） |
| [L-R 编程范式](./doc/dev/lr-paradigm.md) | 存量类 Addon 通用骨架（源码开发者） |
| [UI 架构](./doc/dev/ui-architecture.md) | JSON UI 的分层与生成（源码开发者） |
| [UI 经验](./doc/dev/ui-lessons.md) | JSON UI 背景与踩坑（源码开发者） |

---

## 编译 Sapdon 框架

```bash
git clone https://github.com/Meteage/sapdon.git
cd sapdon
npm install
npm run build
```

构建选项：
- `npm run build -- verbose` — 查看详细日志
- `npm run build -- keep` — 保留中间 `dist/` 目录

### 受限环境：手工 4 步等价流程

`npm run build` 内部走 `cp.spawn` + 管道，在受限沙箱里跑不通。它做的其实就是下面 4 步，可以逐条手工执行（等价）：

```bash
# 1) TypeScript 编译：src/ → dist/
tsc
# 2) 解析路径别名（★ 不能漏）
npx tsc-alias
# 3) 打包：dist/ → prod/（rollup）
node scripts/buildTask.cjs
# 4) 拷贝 src/templates → prod/templates，然后删除 dist/
```

> ⚠️ **漏掉第 2 步 `tsc-alias` 的后果**：`dist/` 里会残留 `@sapdon/utils/...` 这类裸别名，
> rollup 解析不到就当成 external ⇒ **`prod/cli/start.js` 里会留下无法解析的 `@sapdon/utils` 裸包名**，
> 表现为 `ERR_MODULE_NOT_FOUND: Cannot find package '@sapdon/utils'`。
>
> ⚠️ 另外：**"rollup N/N 成功"不等于 `prod/` 是新的** —— 改完要断言 `prod/` 里确实有新导出，别只看 `Failed: 0`。

流程细节与常见坑（全局 CLI junction、项目侧 `sapdon lib` 同步、HMR 等）见 [doc/dev/workflow.md](./doc/dev/workflow.md)；
受限环境的完整说明另见 [doc/dev/known-pitfalls.md](./doc/dev/known-pitfalls.md) §5。

---

## 致谢

感谢 [Bedrock Wiki](https://wiki.bedrock.dev/) 提供的物品、方块、实体等组件与功能的方法文档，本项目（尤其是 `examples/items_demo` 中的自定义武器、投掷物品等示例）参考了其中的规范实现。

---

## 社区

- QQ 群：`810904181`
- [GitHub Issues](https://github.com/Meteage/sapdon/issues)
