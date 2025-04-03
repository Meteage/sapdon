
# Sapdon 框架

![Sapdon Logo](pack_icon.png)

Sapdon 是一个基于 JavaScript 开发的 Minecraft 基岩版模组开发框架。它通过提供丰富的 API 和自动化工具，帮助开发者简化传统开发流程，降低 JSON 配置复杂度，让您专注于模组逻辑实现。

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0-blue)](https://nodejs.org/)
[![npm Version](https://img.shields.io/npm/v/sapdon)](https://www.npmjs.com/package/sapdon)
[![QQ Group](https://img.shields.io/badge/QQ%E7%BE%A4-810904181-green)](https://qm.qq.com/q/2HrXHcKq9j)

## ✨ 核心特性

- **JavaScript 驱动开发** - 告别繁琐的 JSON 配置，使用现代 JS 语法编写模组
- **模块化 API 设计** - 提供物品/方块/实体/配方等 30+ 核心 API 接口
- **智能编译系统** - 一键生成标准 mcaddon 包文件

## 🚀 快速入门

### 环境准备

1. 安装 [Node.js](https://nodejs.org/) (推荐 v16+)
2. 安装 Visual Studio Code 或其他现代编辑器

### 安装 CLI

```bash
npm install -g sapdon
```

### 创建新项目

```bash
sapdon create hello_sapdon
```

根据提示输入项目信息：
```text
✔ Project Name: hello_sapdon
✔ Project Description: 我的第一个 Sapdon 模组
✔ Author Name: YourName
✔ Project Version: 1.0.0
✔ Minimum Engine Version: 1.19.50
```

### 项目结构

```
hello_sapdon/
├── res/            # 资源文件（纹理/模型/音效）
├── scripts/        # 游戏脚本
├── build.config    # 构建配置
├── main.mjs        # 主入口文件
├── mod.info        # 模组元数据
└── pack_icon.png   # 模组图标
```

## 📦 核心 API 示例

### 创建一个基础物品
1. 打开 `main.mjs` 文件。
2. 写入以下内容以创建一个基础物品：
   ```javascript
   import { ItemAPI } from "@sapdon/core";

   ItemAPI.createItem("hello_sapdon:my_item", "items", "masterball");
   ```
   这段代码将创建一个名为 `my_item` 的物品，其命名空间为 `hello_sapdon`，类型为 `items`，并使用 `masterball` 作为图标。


## 🛠 执行构建命令

1. 在终端中输入以下命令以构建 `hello_sapdon` 项目：
   ```bash
   sapdon build hello_sapdon
   ```
2. 构建完成后，您将在 `hello_sapdon` 文件夹下看到一个 `dev` 文件夹，其中包含构建好的 Addon 包。


生成优化后的 mcaddon 包文件

## 📚 学习资源

- [官方文档](./doc/)
- [入门教程](./doc/hello_sapdon)
- [示例模组仓库](./examples/)


## ❓ 常见问题

### 如何更新框架版本？
```bash
npm update sapdon
```

### 如何添加依赖库？
在 `build.config` 中添加：
```json
{
  "dependencies": [
    {
      "module_name": "@minecraft/server",
      "version": "1.8.0"
    }
  ]
}
```

## 🤝 社区支持

- 官方 QQ 群：`810904181`

## ts支持
[quick start](./doc/sapdon-ts.md)

## 编译 Sapdon
1. 安装依赖：`npm install`
2. 编译：`npm run build`
    1. 查看详细输出 `npm run build -- verbose`
    2. 保存中间文件夹 `dist` `npm run build -- keep`
    3. 你也可以组合两个参数 `npm run build -- keep verbose`
