# CLI 模块文档

`src/cli/` 是 Sapdon 的命令行工具模块，负责项目初始化、构建编排、开发服务器、热更新等所有 CLI 功能。

---

## 1. 目录结构

```
src/cli/
├── index.js                 # @sapdon/cli 包入口，导出 dev server 客户端
├── start.js                 # CLI 命令定义 (commander)，入口脚本
├── build.js                 # 构建编排器：bundler、manifest 生成、注册
├── load.js                  # 处理注册数据，生成 JSON 文件
├── registryServer.ts        # GRegistryServer — 服务端注册表，注册 submit/remote-logger handler
├── init.js                  # 项目初始化、路径辅助
├── utils.ts                 # 通用文件 I/O 工具
├── tools/
│   └── textureSet.js        # 纹理图集生成 (item_texture.json / terrain_texture.json)
├── dev-server/
│   ├── index.ts             # 开发服务器入口，导出 server 实例
│   ├── server.ts            # DevelopmentServer 类 — HTTP 服务
│   ├── client.js            # cliRequest() — 子进程向 dev server 发送数据
│   ├── hmr.js               # 热更新文件监听
│   ├── syncFiles.js         # 同步产物到 Minecraft 目录 + 复制库文件
│   └── config.js            # dev server 配置 (端口)
├── meta/
│   ├── buildConfig.ts       # 读取/解析 build.config (含 v1→v2 迁移)
│   ├── versionType.ts       # Minecraft 安装路径 (release/beta)
│   └── package.ts           # 读取框架自身的 package.json
├── res/
│   ├── server.ts            # 资源提示文件生成 (res.hint.ts) + res/ 目录监听
│   └── fileResource.ts      # FileResource 类 — 惰性文件资源加载器
└── remoteLogger/
    ├── server.ts            # 远程日志服务端处理
    ├── client.ts            # 远程日志客户端发送
    └── message.ts            # 日志消息类型定义
```

共 22 个文件。

---

## 2. 入口文件

### `start.js` — CLI 命令入口

此文件是 `package.json` 中 `bin` 字段指定的入口 (`prod/cli/start.js`)，**不导出任何内容**，直接定义并执行 commander 命令。

| 命令 | 说明 |
|------|------|
| `init` | 为已有项目添加 sapdon 配置（修改 package.json scripts，生成 mod.info） |
| `create <name>` | 从模板脚手架新项目，支持 `js` / `ts` 选择 |
| `build <name>` | 完整构建 + 启动热更新 |
| `pack` | 构建当前目录（不启动 HMR） |
| `lib` | 复制 `prod/` 到 `node_modules/@sapdon/` |
| `res` | 生成资源提示文件 `res.hint.ts` |
| `config` | (占位) 读取 build.config |

### `index.js` — 包入口

`@sapdon/cli` 的包入口，供其他模块编程式使用：

```typescript
import { devServer, client } from '@sapdon/cli'

// devServer: DevelopmentServer 单例
// client.call(name, ...args) — 向 dev server 发送请求
```

---

## 3. 构建管道

### `build.js` — 构建编排器

核心构建函数 `buildProject()` 的执行流程：

```
1. projectCanBuild()
   → 验证项目存在 + build.config 存在

2. 生成 manifest.json（仅首次）
   → BP/manifest.json + RP/manifest.json
   → 通过 AddonManifest 类生成

3. 复制 pack_icon.png → BP + RP

4. 复制资源文件夹 (res/) → RP

5. startDevServer()
   → 启动 HTTP 服务器 (端口 49037)

6. GRegistryServer.startServer()
   → 注册 submit handler

7. runScript(absoluteModPath)
   → rollup 编译 buildEntry (main.ts)
   → fork 子进程执行
   → 子进程中用户代码注册数据
   → HTTP POST 提交到 dev server
   → generateAddon() 生成 JSON 文件

8. bundleScripts()
   → rollup 打包 scripts/main.ts → scripts/index.js

9. syncDevFilesServer()
   → 复制 BP/RP 到 Minecraft 开发包目录
```

**导出的关键组件：**

| 导出 | 说明 |
|------|------|
| `scriptBundler` | Rollup 包装器，`.js()` / `.ts()` / `.any()` 三个方法 |
| `projectCanBuild(path)` | 验证项目可构建 |
| `buildProject(path, name)` | 完整构建流程 |

**scriptBundler 详细：**

```typescript
scriptBundler.js(source, target, sourcemap)
  → 纯 JS 打包，使用 commonjs + node-resolve + json + terser(production)

scriptBundler.ts(source, target, sourcemap)
  → TS 打包，额外使用 typescript 插件 + typescript-paths 插件
  → tsconfig 使用项目自身的 tsconfig.json

scriptBundler.any(source, target)
  → 根据 useJs 配置委托给 .js() 或 .ts()
```

### `load.js` — 注册数据处理

`generateAddon()` 在 `submit` handler 中调用，负责将 `GRegistryServer.dataList` 中的注册数据写出为 JSON 文件：

```
generateAddon(modPath, buildPath, projectName)

for each { name, root, path: dataPath, data } in dataList:
  ├── case "item_texture"      → 暂存，稍后生成 item_texture.json
  ├── case "terrain_texture"   → 暂存，稍后生成 terrain_texture.json
  ├── case "flipbook_textures" → 暂存，稍后生成 flipbook_textures.json
  └── default:
       root == "behavior"
         → writeFileSync(<buildPath>/<name>_BP/<dataPath>/<name>.json)
       root == "resource"
         → writeFileSync(<buildPath>/<name>_RP/<dataPath>/<name>.json)

generateTextureFiles()
  → generateItemTextureJson()
  → generateBlockTextureJson()
  → saveFile(flipbook_textures.json)
```

---

## 4. 初始化模块

### `init.js` — 项目初始化与路径工具

| 导出 | 说明 |
|------|------|
| `initProject(path, data)` | 从模板创建新项目，复制文件 + 生成 mod.info + npm install |
| `initNPMProject(path, data)` | 为已有 npm 项目添加 sapdon 支持 |
| `readPackageJson(dir)` | 读取目录的 package.json，返回 `{ name, description, author, version }` |
| `globalObject` | 全局可变对象，存储运行时状态 (projectPath) |
| `getProjectPath()` | 返回当前项目路径 |
| `getProjectName()` | 返回项目名 (目录 basename) |
| `getBuildDirBp()` | 返回 BP 构建目录路径 |
| `getBuildDirRp()` | 返回 RP 构建目录路径 |

模板映射：`{ js: 'js_sapdon', ts: 'ts_sapdon' }`，对应 `src/templates/` 下的目录。

---

## 5. 开发服务器

### `dev-server/` 子系统

架构图：

```
 子进程 (用户代码)                    CLI 主进程
 ┌─────────────────────────┐      ┌──────────────────────────┐
 │                         │      │                          │
 │ GRegistry               │      │  DevelopmentServer       │
 │ .register()             │ POST │  (端口 49037)            │
 │ .submit()               │─────→│                          │
 │                         │      │  cliServerHandlers:      │
 │ core/transport/client.ts│      │    submit                │
 │ transportPost()         │      │    remote-logger         │
 └─────────────────────────┘      └──────────────────────────┘
```

### `server.ts` — DevelopmentServer 类

| 方法 | 说明 |
|------|------|
| `isListening()` | 服务器是否在监听 |
| `bootstrap()` | 创建 HTTP server，监听配置端口 |
| `handle(url, handler)` | 注册 URL handler |
| `getHandler(url)` | 获取已注册的 handler |
| `interceptHandler(url, interceptor)` | 用拦截器包装已有 handler |

**请求处理流程：**

```
HTTP POST /<url>
  → 匹配 cliServerHandlers 中的 handler
  → 收集 body chunk
  → end 时 decode(body) 解析 JSON
  → await handler(...decodedArgs)
  → 响应 200
```

### `client.js` — 客户端通信

| 导出 | 说明 |
|------|------|
| `cliRequest(path, ...params)` | POST 请求到 dev server，body 用 `encode()` 编码 |
| `post(path, body)` | 发送原始 body 的 POST 请求 |

### `config.js` — 配置

```javascript
{ port: 49037 }
```

---

## 6. 热更新 (HMR)

### `hmr.js`

```
hmr(projectPath, projectName)
  → 检查 buildConfig.buildOptions.useHMR
  → fs.watch(projectPath, { recursive: true })
  → 1 秒防抖
  → 过滤条件：
      ✅ .js / .ts 文件
      ✅ build.config / mod.info
      ❌ 点文件/目录 (.git, .vscode)
      ❌ buildDir (dev/)
      ❌ .tmp 文件
  → 变更时:
      buildProject(projectPath, projectName)
      syncDevFilesServer(projectPath, projectName)
  → 额外启动:
      watchResourceDir() — 监听 res/ 目录 (3 秒防抖)
```

---

## 7. 文件同步

### `syncFiles.js`

| 导出 | 说明 |
|------|------|
| `syncDevFilesServer(path, name)` | `fs.cpSync` 复制 BP/RP 到 Minecraft 开发包目录 |
| `writeLib(path)` | 复制 `prod/core`、`prod/cli`、`prod/oc` 到 `node_modules/@sapdon/` |

**Minecraft 目录路径**（由 `versionType` 决定）：

| versionType | 路径 |
|-------------|------|
| `release` | `%USERPROFILE%/AppData/Roaming/Minecraft Bedrock/Users/Shared/games/com.mojang/` |
| `beta` | `%USERPROFILE%/AppData/Local/Packages/Microsoft.MinecraftWindowsBeta_8wekyb3d8bbwe/LocalState/games/com.mojang/` |

可被环境变量 `MC_PATH` / `MC_BETA_PATH` 覆盖。

**writeLib 写入的 package.json：**

```json
// node_modules/@sapdon/core/package.json
{ "name": "@sapdon/core", "main": "index.js", "version": "..." }

// node_modules/@sapdon/cli/package.json
{ "name": "@sapdon/cli", "main": "index.js", "version": "..." }

// node_modules/@sapdon/runtime/package.json
{ "name": "@sapdon/runtime", "main": "index.js", "version": "..." }
```

---

## 8. 元数据模块

### `meta/buildConfig.ts` — build.config 解析

`getBuildConfig()` 读取项目根目录的 `build.config` 文件：

- 使用 `parseJsonWithComments()` 解析（支持 `//` 和 `/* */` 注释）
- 自动检测 v1 格式并迁移到 v2（`transferV1ToV2()`）
- 结果通过 `cacheSync` 缓存

**BuildConfig 接口：**

```typescript
interface BuildConfig {
  formatVersion: number                    // 当前是 2
  buildOptions: {
    useHMR: boolean                        // 热更新
    buildMode: 'dev' | 'prod' | 'debug' // 构建模式
    buildEntry: string                     // main.ts 入口
    scriptEntry: string                    // scripts/main.ts
    scriptOutput: string                   // scripts/index.js
    useJs: boolean                         // 是否用 JS
    buildDir: string                       // dev/
    dependencies: Array<{ module_name: string, version: string }>
    resource: { path: string, resourceHints: boolean }
  }
  versionType: 'release' | 'beta'
}
```

### `meta/versionType.ts` — Minecraft 路径

| 函数 | 说明 |
|------|------|
| `mojangPath()` | release 版路径（环境变量 `MC_PATH` 可覆盖） |
| `betaPath()` | beta 版路径（环境变量 `MC_BETA_PATH` 可覆盖） |
| `getGamePath()` | 根据 `buildConfig.versionType` 返回对应路径 |

### `meta/package.ts` — 框架自身信息

`getPackageJson()` 读取框架根目录的 `package.json`（用于获取版本号等）。

---

## 9. 资源提示系统

### `res/server.ts`

为 TypeScript 项目生成 `res.hint.ts`，提供类型安全的资源引用：

```
initResourceDir()
  → 仅 TS 项目 (buildEntry 不以 .js 结尾)
  → 创建 res/ 目录（如不存在）
  → walk(res/) 递归扫描文件
  → 生成 ResourceHint 树
  → 写入 res.hint.ts
  
res.hint.ts 示例:
  import { FileResource } from '...'
  export default {
    "textures": {
      "blocks": {
        "stone": FileResource.get("res/textures/blocks/stone.png")
      }
    }
  }
```

`watchResourceDir()` 监听 `res/` 目录变更，3 秒防抖，变更时执行 `sapdon res`。

### `res/fileResource.ts` — FileResource 类

惰性文件资源加载器，带全局缓存：

| 成员 | 说明 |
|------|------|
| `static cache` | 全局实例缓存（按 URI 键） |
| `static fileSystemLoader` | 默认加载器：`fs.readFileSync` |
| `static get(uri)` | 工厂方法，返回缓存或新实例 |
| `load(loader)` | 加载并缓存 |
| `clear()` | 清除缓存 |
| `ptr()` | 返回惰性 getter 函数 |

---

## 10. 纹理图集生成

### `tools/textureSet.js`

扫描资源目录的 PNG 文件，生成 Minecraft 所需的纹理图集 JSON：

| 导出 | 说明 |
|------|------|
| `generateItemTextureJson(dir, output, projectName, userData)` | 扫描 `textures/items/` 的 PNG，合并用户数据，输出 `item_texture.json` |
| `generateBlockTextureJson(dir, output, projectName, userData)` | 扫描 `textures/blocks/` 的 PNG，合并用户数据，输出 `terrain_texture.json` |

---

## 11. 远程日志系统

### `remoteLogger/`

用于 Minecraft 游戏内 Script API 向 CLI 发送日志消息：

```
游戏内 (Script API)              CLI 主进程
┌──────────────────────┐      ┌──────────────────┐
│ remoteLogger.client  │      │ remoteLogger.server
│ .info("msg")         │─────→│ .handleRemoteLogger()
│ .error("err")        │ POST │ → console[level]()
└──────────────────────┘      └──────────────────┘
```

| 文件 | 内容 |
|------|------|
| `message.ts` | `LogLevel` 枚举 + `Message` 接口 + `createMessage()` |
| `client.ts` | `sendMessage()` / `remoteLogger.info()` / `remoteLogger.error()` |
| `server.ts` | `handleRemoteLogger()` — 接收并输出日志 |

---

## 12. 通用工具

### `utils.ts`

| 导出 | 说明 |
|------|------|
| `generateUUID()` | 生成 UUID v4 |
| `copyFileSync(src, dest)` | 同步复制文件 |
| `pathNotExist(path)` | 检查路径是否**不存在** |
| `readFile(path)` | 同步读文件 (UTF-8)，失败返回 null |
| `saveFile(path, data)` | 同步写文件，自动创建父目录 |
| `copyFolder(src, dest)` | 递归复制目录 |
| `dirname(importMeta)` | 从 `import.meta` 获取 `__dirname` |
| `asyncImport(path)` | 动态 import，非相对路径自动加 `file://` 前缀 |
| `parseJsonWithComments(str)` | 解析含 `//` 和 `/* */` 注释的 JSON |

---

## 13. 模块依赖关系

```
start.js (命令定义)
  ├── init.js          → 项目创建/初始化
  ├── build.js         → 构建编排
  ├── dev-server/hmr.js → 热更新
  ├── dev-server/syncFiles.js → writeLib
  └── res/server.js    → initResourceDir

build.js (构建核心)
  ├── load.js          → generateAddon (数据处理)
  ├── dev-server/      → server, startDevServer, syncDevFilesServer
  ├── registryServer.js → GRegistryServer
  ├── core/addon/manifest.js → 清单生成
  └── meta/buildConfig.js → 配置读取

load.js (JSON 文件生成)
  ├── tools/textureSet.js → 纹理图集
  └── registryServer.js → GRegistryServer

dev-server/ (IPC 基础设施)
  ├── server.ts ←→ client.js (HTTP 通信)
  ├── hmr.js → build.js + syncFiles.js
  └── syncFiles.js → meta/versionType.js + meta/package.js

meta/ (配置层)
  ├── buildConfig.ts → init.js (getProjectPath)
  ├── versionType.ts → buildConfig.ts
  └── package.ts     → (读取 package.json)

res/ (资源提示)
  ├── server.ts → fileResource.ts + meta/buildConfig.ts
  └── fileResource.ts

remoteLogger/ (远程日志)
  ├── client.ts → dev-server/client.js + message.ts
  └── server.ts → message.ts
```
