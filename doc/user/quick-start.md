# 快速入门

## 环境要求

- Node.js 16+
- npm（随 Node.js 安装）
- Visual Studio Code（推荐）

## 安装 CLI

```bash
npm install -g sapdon
```

## 创建项目

```bash
sapdon create hello_sapdon
```

按提示填写项目信息：

```
✔ Project Name: hello_sapdon
✔ Project Description: 我的第一个模组
✔ Author Name: YourName
✔ Project Version: 1.0.0
✔ Minimum Engine Version: 1.19.50
✔ Language:(js/ts) ts
```

## 项目结构

```
hello_sapdon/
├── main.ts              # 构建入口——定义物品、实体等
├── build.config         # 构建配置文件
├── mod.info             # 模组元数据
├── tsconfig.json        # TypeScript 配置
├── pack_icon.png        # 模组图标
├── res/                 # 资源文件（纹理、模型、音效）
└── scripts/
    ├── index.ts         # 脚本入口——注册组件 + 游戏内逻辑
    └── main.ts          # 游戏主类
```

## 编写代码

打开 `main.ts`，编写以下代码：

```typescript
import { ItemAPI, registry, ItemComponent } from '@sapdon/core'

// 创建一个基础物品
const item = ItemAPI.createItem(
  'hello_sapdon:my_item',
  'items',
  'masterball'
)
item.addComponent(ItemComponent.setDisplayName('我的物品'))

// 提交所有注册数据
registry.submit()
```

## 构建项目

```bash
cd hello_sapdon
sapdon build .
```

### 构建模式

`build.config` 中的 `buildMode` 控制构建行为：

| 模式 | 行为 |
|------|------|
| `dev`（默认） | 运行 `main.ts` → 根据代码生成所有 JSON → 打包脚本（不压缩）→ 同步到 Minecraft |
| `prod` | 运行 `main.ts` → 生成 JSON → 打包脚本（terser 压缩）→ 同步 |
| `debug` | 跳过 `main.ts`，跳过压缩，直接同步已有 `dev/` 目录到 Minecraft（适合直接编辑 JSON 测试） |

```bash
# 使用 sapdon pack 以 production 模式构建（不启动热更新）
sapdon pack
```

## 构建输出

构建完成后，`dev/` 目录下生成：

```
dev/
├── hello_sapdon_BP/          # 行为包
│   ├── manifest.json
│   ├── items/my_item.json
│   └── scripts/index.js
└── hello_sapdon_RP/          # 资源包
    ├── manifest.json
    └── textures/item_texture.json
```

同时自动同步到 Minecraft 开发包目录，启动游戏即可看到你的模组。

## 下一步

- [物品教程](./tutorials/item.md) — 学习创建各类物品
- [实体教程](./tutorials/entity.md) — 学习创建实体
- [方块教程](./tutorials/block.md) — 学习创建方块
- [API 参考](./api/item.md) — 完整的 API 文档
