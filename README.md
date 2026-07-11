# Sapdon

![Sapdon Logo](pack_icon.png)

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

- Node.js 16+
- npm

### 安装

```bash
npm install -g sapdon
```

### 创建项目

```bash
sapdon create my_addon
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
import { ItemAPI, EntityAPI, registry, ItemComponent } from '@sapdon/core'

// 创建一个物品
ItemAPI.createItem('my_addon:magic_ingot', 'items', 'magic_ingot')
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
// 基础物品
ItemAPI.createItem('my:item', 'items', 'texture')

// 食物
ItemAPI.createFood('my:food', 'items', 'apple')
  .addComponent(ItemComponent.setFoodComponent(4, 0.6))

// 带自定义组件的物品
ItemAPI.createItem('my:tool', 'items', 'tool_tex')
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
| [物品 API](./doc/user/api/item.md) | ItemAPI、Item、ItemComponent |
| [实体 API](./doc/user/api/entity.md) | EntityAPI、EntityComponent、AI |
| [方块 API](./doc/user/api/block.md) | BlockAPI、BlockComponent |
| [配方 API](./doc/user/api/recipe.md) | RecipeAPI、配方类 |
| [生物群系 & 特征 API](./doc/user/api/biome.md) | BiomeAPI、FeatureAPI |
| [纹理 API](./doc/user/api/texture.md) | 纹理管理器 |
| [build.config](./doc/user/config/build-config.md) | 构建配置字段 |
| [常见问题](./doc/user/faq.md) | FAQ |
| [架构概览](./doc/dev/architecture.md) | 整体架构（源码开发者） |
| [Core 模块](./doc/dev/core.md) | 三层架构详解（源码开发者） |
| [CLI 模块](./doc/dev/cli.md) | 构建管道（源码开发者） |
| [OC 运行时](./doc/dev/oc.md) | ECS 框架（源码开发者） |

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

---

## 社区

- QQ 群：`810904181`
- [GitHub Issues](https://github.com/Meteage/sapdon/issues)
