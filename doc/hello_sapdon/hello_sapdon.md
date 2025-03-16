# Sapdon 使用指南

## 1. Sapdon 介绍

Sapdon 是一个基于 JavaScript 开发的 Minecraft 基岩版通用工具箱。它提供了大量的接口，帮助开发者简化传统开发 Addon 的过程，提高开发效率，并减少直接编辑 JSON 文件时可能出现的错误和麻烦。

## 2. 准备工作

在开始使用 Sapdon 之前，您需要准备以下工具和环境：

### 软件要求
- **Visual Studio Code (VSCode)**：用于编写和编辑代码。
- **Node.js**：确保已安装 Node.js，因为 Sapdon 是基于 Node.js 开发的。

### 安装 Node.js
1. 访问 [Node.js 官网](https://nodejs.org/) 下载并安装适合您操作系统的版本。
2. 安装完成后，打开终端或命令提示符，输入以下命令以验证安装是否成功：
   ```bash
   node -v
   npm -v
   ```
   如果显示了版本号，说明安装成功。

### 创建 Node.js 项目
1. 在您的工作目录中，新建一个文件夹作为项目根目录。
2. 打开终端，进入该文件夹，并初始化一个新的 Node.js 项目：
   ```bash
   npm init -y
   ```
3. 安装 Sapdon 作为项目依赖：
   ```bash
   npm install sapdon
   ```

## 3. 新建一个 Sapdon 项目

### 创建命令
使用以下命令创建一个新的 Sapdon 项目：
```bash
npm run create <project-name>
```
其中 `<project-name>` 是您的项目名称。

### 示例：创建名为 `hello_sapdon` 的项目
1. 在 VSCode 的终端中输入以下命令：
   ```bash
   npm run create hello_sapdon
   ```
2. 终端将交互式地询问一些项目信息，如下所示：
   ```
   ✔ Project Name: hello_sapdon
   ✔ Project Description: A new sapdon project
   ✔ Author Name: Sapdon
   ✔ Project Version: 1.0.0
   ✔ Minimum Engine Version: 1.19.50
   ```
   如果您希望采用默认值，只需按下回车键即可。

### 参数解释
- **Project Name**：项目名称，即模组名称。
- **Project Description**：项目描述，将在 Minecraft 包中显示。
- **Author Name**：模组作者的名字。
- **Minimum Engine Version**：最低支持的 Minecraft 版本。如果 Minecraft 版本低于此版本，模组将不会工作。

### 项目结构
创建完成后，您的工作目录下将生成一个名为 `hello_sapdon` 的文件夹。展开该文件夹，您将看到以下结构：
```
hello_sapdon/
├── res/            # 资源文件夹，存放贴图、模型、实体动画等资源文件
├── scripts/        # 脚本文件夹，存放 SAPI 文件，这些文件将在游戏中执行
├── build.config    # 构建配置文件
├── main.mjs        # 模组内容注册脚本，使用 Sapdon 提供的接口编写模组内容
├── mod.info        # 模组信息文件
└── pack_icon.png   # 模组的图标
```

### `build.config` 文件解析
```json
{
  "defaultConfig": {
    "buildMode": "development",
    "buildEntry": "main.mjs",
    "scriptEntry": "scripts/index.js",
    "buildDir": "dev/",
    "dependencies": [
      {
        "module_name": "@minecraft/server",
        "version": "1.8.0"
      }
    ]
  },
  "libraries": [
    {
      "path": "lib/"
    }
  ],
  "resources": [
    {
      "path": "res/"
    }
  ],
  "scripts": [
    {
      "path": "scripts/"
    }
  ]
}
```
- **buildMode**：构建模式。设置为 `"development"` 时，构建程序将根据 `main.mjs` 中的内容构建 Addon 包，并将输出到 `buildDir` 指定的文件夹中；设置为 `"debug"` 时，仅将 `dev` 文件夹的内容输出到指定路径。
- **buildEntry**：构建入口文件的路径，即您编写模组内容的文件。
- **scriptEntry**：脚本入口文件的路径。
- **buildDir**：构建输出文件夹的路径，构建好的 Addon 包将输出到此文件夹。
- **dependencies**：依赖的模块。在此示例中，我们依赖了 Minecraft 官方的 `@minecraft/server` 模块，用于 SAPI。

## 4. 编写模组内容

### 创建一个基础物品
1. 打开 `main.mjs` 文件。
2. 写入以下内容以创建一个基础物品：
   ```javascript
   import { ItemAPI } from "../src/core";

   ItemAPI.createItem("hello_sapdon:my_item", "items", "masterball");
   ```
   这段代码将创建一个名为 `my_item` 的物品，其命名空间为 `hello_sapdon`，类型为 `items`，并使用 `masterball` 作为图标。

## 5. 执行构建命令

### 构建 Addon 包
1. 在终端中输入以下命令以构建 `hello_sapdon` 项目：
   ```bash
   npm run build hello_sapdon
   ```
2. 构建完成后，您将在 `hello_sapdon` 文件夹下看到一个 `dev` 文件夹，其中包含构建好的 Addon 包。

## 6. 下一步

现在，您已经成功创建并构建了一个简单的 Sapdon 项目。接下来，您可以继续探索 Sapdon 提供的其他功能，如创建方块、实体、配方和 UI 等。通过 Sapdon 的强大接口，您可以更高效地开发 Minecraft 基岩版模组。

## 7. 常见问题

### Q: 如何修改模组的最低支持版本？
A: 在 `mod.info` 文件中，您可以找到 `min_engine_version` 字段，修改该字段的值即可调整模组的最低支持版本。

### Q: 如何添加更多依赖？
A: 在 `build.config` 文件的 `dependencies` 数组中，您可以添加更多依赖模块。例如：
```json
{
  "module_name": "@minecraft/server-ui",
  "version": "1.0.0"
}
```

### Q: 构建时出现错误怎么办？
A: 请检查 `main.mjs` 文件中的代码是否正确，并确保所有依赖模块已正确安装。如果问题仍然存在，请参考 Sapdon 的官方文档或社区支持。

---

通过本指南，您已经掌握了 Sapdon 的基本使用方法。祝您在 Minecraft 模组开发中取得成功！