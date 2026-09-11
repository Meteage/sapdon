# CLI 模块文档

`src/cli/` 是 Sapdon 的命令行工具模块，负责项目初始化、构建编排、开发服务器、热更新等所有 CLI 功能。

---

## 1. 目录结构

```
src/cli/
├── index.js                 # @sapdon/cli 包入口，导出 dev server 客户端
├── start.js                 # CLI 命令定义 (commander)，入口脚本
├── build.js                 # 构建编排器：bundler、manifest 生成、注册
├── load.js                  # 处理注册数据，生成 JSON 文件 + 陈旧产物清理 + 注册索引合并
├── pack.js                  # packProject() — 把 dev/<proj>_BP、_RP 打包为 .mcaddon
├── registryServer.ts        # GRegistryServer — 服务端注册表，注册 submitGregistry / remote-logger handler
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

共 23 个文件。

---

## 2. 入口文件

### `start.js` — CLI 命令入口

此文件是 `package.json` 中 `bin` 字段指定的入口 (`prod/cli/start.js`)，**不导出任何内容**，直接定义并执行 commander 命令。

| 命令 | 说明 |
|------|------|
| `init` | 为已有项目添加 sapdon 配置（修改 package.json scripts，生成 mod.info） |
| `create <name>` | 从模板脚手架新项目，支持 `js` / `ts` 选择 |
| `build <name>` | 完整构建 + 启动热更新（构建前会调用 `initResourceDir()`） |
| `compile` | 构建当前目录（不启动 HMR）。⚠️ **不会**调用 `initResourceDir()`，即不重新生成 `res.hint.ts` |
| `pack` | 把 `dev/<proj>_BP` + `dev/<proj>_RP` 打包为 `dev/<proj>.mcaddon`（**不构建**，直接打包现有产物） |
| `lib` | 复制 `prod/core`、`prod/cli`、`prod/oc` 到 `node_modules/@sapdon/{core,cli,runtime}` |
| `res` | 生成资源提示文件 `res.hint.ts` |
| `config` | (占位) 读取 build.config |

> 命令定义见 `src/cli/start.js`。`compile` 与 `pack` 的差别是容易记错的一处：`compile` = 构建不打包，`pack` = 打包不构建。
> `initResourceDir()` 只在 `build`（`start.js:117`）与 `res`（`start.js:156`）里调用，`compile`（`start.js:130-140`）没有调用 —— 所以新增 `res/` 资源后只跑 `sapdon compile` 不会刷新 `res.hint.ts`，需要单独跑 `sapdon res`。

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
   ⚠️ 未通过时只打印原因并 return，命令本身不报错（见「退出码语义」）

2. 【仅当 dev server 尚未监听时执行】(if (!server.isListening()))
   2a. 生成 manifest.json（仅当文件不存在时：if (pathNotExist(manifestPath))）
       → BP/manifest.json + RP/manifest.json
       → 通过 AddonManifest 类生成；BP/RP 的 UUID 由 loadOrCreateUuids() 从 mod.info 读写
   2b. 复制 pack_icon.png → BP + RP
   2c. 复制资源文件夹 (res/) → RP
   2d. startDevServer()
       → 启动 HTTP 服务器（端口取 SAPDON_DEV_SERVER_PORT，默认 49037）
   2e. GRegistryServer.startServer()
       → 注册 submitGregistry / remote-logger handler
   2f. server.handle('submit', ...)
       → 收到数据后调用 generateAddon() 写 JSON
       → buildMode === 'debug' 时跳过生成（只同步已有 dev/）

3. runScript(absoluteModPath)
   → rollup 编译 buildEntry (main.ts) 到 .tmp/<uuid>.js
   → cp.spawn(process.execPath, [file], { stdio: 'inherit' }) 执行
   → ★ 检查退出码：非 0 立即抛错（不再静默走到「构建完成」）
   → 子进程中用户代码注册数据
   → HTTP POST 提交到 dev server → generateAddon() 生成 JSON 文件
   → finally 删除临时文件

4. bundleScripts()
   → rollup 打包 scripts/main.ts → scripts/index.js（await，失败即抛）

5. syncDevFilesServer()
   → 复制 BP/RP 到 Minecraft 开发包目录

6. 收尾
   → buildOptions.keepServer 为真：保持开发服务器常开（配合 HMR）
   → 为假（默认）：打印「构建完成，开发服务器已自动退出」并 process.exit(0)
```

**为什么 step 3 用 `spawn` 而不是 `fork`**（`src/cli/build.js:191-200`）：

`cp.fork` 一定会建立 IPC **命名管道**，在受限环境下会以 `EPERM`（`spawn EPERM`）失败；而框架的传输层走 **HTTP**（`src/core/transport/client.ts` → `localhost:49037`），**从不使用 IPC**。所以 `cp.spawn(process.execPath, [file], { stdio: 'inherit' })` 对「跑一个 Node 脚本」是等价且更少依赖的写法。

### 退出码语义（失败必须非 0）

历史行为是**失败被吞掉**、CLI 照样打印「构建完成」并 `exit 0`，于是 `dev/` 里留下的是**上一次的旧产物**（本仓库真实踩过的坑）。现在：

| 环节 | 行为 | 源码 |
|------|------|------|
| 构建脚本子进程非 0 退出 | 抛错 | `src/cli/build.js:191-200` `runOnChild()` |
| `scriptBundler` 打包失败 | 抛错（不再只 `console.error`） | `src/cli/build.js:101-104`、`152-155` |
| CLI 顶层 catch | `process.exit(1)` | `src/cli/start.js:118-126`（build）、`133-139`（compile） |

⇒ **「构建成功」这句话不可信**。成功的判据是**退出码 0** + 日志里出现 `处理数据: <name> <root> <path>` 行（`src/cli/load.js:210`）。

⚠️ 注意 `projectCanBuild()` 失败（项目不存在 / 没有 `build.config`）时只是**打印原因并 return**，命令本身**不报错**、退出码仍为 0 —— 这是另一条需要看日志才能发现的路径。

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

previousFiles = readManifest(buildPath, projectName)   # 上次的产物清单
cleanLegacyBpBlocksJson(buildPath, projectName)        # 清理历史误放在 BP 的 blocks.json
generatedFiles = []                                    # 本次写出的产物（相对 buildPath）

for each { name, root, path: dataPath, data } in dataList:
  ├── 日志：console.log('处理数据:', name, root, dataPath)   ← 这是「产物真的生成了」的唯一判据
  ├── case "item_texture"      → 暂存，稍后生成 item_texture.json
  ├── case "terrain_texture"   → 暂存，稍后生成 terrain_texture.json
  ├── case "flipbook_textures" → 暂存，稍后生成 flipbook_textures.json
  ├── data._scriptSource 存在  → 写 scripts/custom_components/<name>.js（已存在则跳过）
  │                             并登记进 customComponentInfos
  └── default:
       root == "behavior" → writeFileSync(<buildPath>/<projectName>_BP/<dataPath>/<name>.json)
       root == "resource" → writeFileSync(<buildPath>/<projectName>_RP/<dataPath>/<name>.json)
       （每个写出的文件都 record() 进 generatedFiles）

customComponentInfos 非空 → writeCustomComponentIndex(<projectPath>/scripts/custom_components/index.js)

generateTextureFiles(resDir, ...)
  → generateItemTextureJson()   → <proj>_RP/textures/item_texture.json
  → generateBlockTextureJson()  → <proj>_RP/textures/terrain_texture.json
  → saveFile(flipbook_textures.json)

cleanStaleGenerated(buildPath, previousFiles.files, generatedFiles)  # 删「上次有、这次没有」的
writeManifest(buildPath, projectName, generatedFiles)                # 写回本次清单
```

⚠️ 注意 path 用的是**项目名** `${projectName}_BP` / `${projectName}_RP`（`load.js:183-184`），而 `<name>.json` 用的是注册项的**数据名**，两者是两个不同的值。

### 陈旧产物清理（缺口 9）

清单文件：`dev/.sapdon_generated_<proj>.json`（`load.js:11-12`），记录**本次构建写出的产物**（相对 `dev/` 的路径）。

- 下次构建只删「**上次清单里有、这次清单里没有**」的路径 → 改名 / 删条目留下的旧 JSON 会被自动清掉。
- ★ **禁止**把它改成「扫目录删未知文件」：那会把用户从 `res/` 拷进来、以及手写的文件一起误删。
- ⚠️ **局限**（两个会留下旧文件的场合，必须手工删）：
  1. **重命名项目后**：新项目名对应的清单（`.sapdon_generated_<新名>.json`）管不到旧名字的 `dev/<旧名>_*` 目录 → 旧目录整个残留，需**手工删除**。
  2. **从未成功构建过的项目**没有清单 → 其陈旧文件也清不掉（清单不存在时 `readManifest` 返回空列表，`load.js:19`）。

### ★ 同步到游戏开发包 / `res/` → `dev/` 的「按清单 prune」（2026-09 新增，缺口 P1）

三条**互不重叠**的清单，各管一段路，**全都只删"自己上次记过的文件"**，一律不扫目录：

| 清单 | 位置 | 管什么 | 谁写的 |
|---|---|---|---|
| 生成物 | `dev/.sapdon_generated_<proj>.json` | 框架生成的 JSON 在 **`dev/`** 里的陈旧清理 | `load.js` |
| 部署物 | `dev/.sapdon_synced_<proj>.json` | **游戏开发包目录**（`development_behavior_packs` / `development_resource_packs`）里「上次部署过、这次 `dev/` 里已经没有」的文件 | `syncFiles.js` 的 `syncDevFilesServer()` |
| 资源 | `dev/.sapdon_res_<proj>.json` | **`dev/<proj>_RP/`** 里「上次从项目 `res/` 拷过、这次 `res/` 里已经没有」的文件 | `syncFiles.js` 的 `syncResourceFiles()` |

**症状（修之前）**：从项目里删掉的方块/物品/配方**永远留在玩家游戏里**，并持续报
`… not present in the Schema`；`res/` 删掉的资源同样残留 —— 因为同步/拷贝用的都是
`fs.cpSync(..., {recursive:true, force:true})` / `copyFolder`，**只合并、从不删除**。

**要点**
- 部署清单记的是「**上次实际部署过的文件全集**」，不是直接复用生成物清单：后者不含
  `manifest.json` / `pack_icon.png` / 打包好的 `scripts/index.js` / `res/` 拷进来的资源，
  而且它在同步**之前**就被本次构建覆写了（同步时已经读不到"上次"）。
- **没有清单时（首跑 / 从未成功构建过的老项目）一个文件都不删**，只记录。
- 空包目录（`dev/<proj>_BP` 里一个文件都没有，正常总该有 `manifest.json`）视为**构建中断**，
  跳过 prune 并 warn —— 免得把游戏里一份完好可用的包删空。
- HMR 路径（`hmr.js:37`）调的是同一个 `syncDevFilesServer()`，所以热更新同样会 prune。
- 单测：`node tests/sync-manifest.test.mjs`（临时目录 + `MC_PATH` 重定向，不需要真机）。

### `blocks.json` 的位置与内容（★ 2026-09 起**不再写方块条目**）

- **位置**：`blocks.json` 是**资源包（RP）**文件 → 框架写在 `dev/<proj>_RP/blocks.json`（`GRegistry.register("blocks","resource","",blocks_json)`）。
  依据：[Bedrock Wiki · Pack Folder Structure](https://wiki.bedrock.dev/documentation/pack-structure) 的目录树把 `blocks.json` 列在 **RP** 根目录下（BP 侧没有 `blocks.json` 这个概念）；[Bedrock Wiki · Block Sounds](https://wiki.bedrock.dev/blocks/block-sounds) 的示例标题即 `RP/blocks.json`。历史上框架曾把它误写在 BP，那里会被 Bedrock **完全忽略**；首次带清单构建会自动清掉 BP 侧那个**确切路径**的历史残留（`cleanLegacyBpBlocksJson()`，`load.js:34-41`）。
- ★ **内容：只有 `{"format_version": "1.20.20"}`，没有任何方块条目**（`blockFactory.js:34-59` 有完整依据）。
  - 原因：曾经每个方块写一条 `{ "ns:name": { "textures": { up/down/... } } }`；键修成完整标识符后引擎真的匹配上了这些方块，
    于是**每个自定义方块**报一条 `trying to override the Geometry component with blocks.json settings for a custom block`。
  - 官方依据（Microsoft Learn · blocks.json File Reference）：`minecraft:geometry` / `minecraft:material_instances`
    **会覆盖** blocks.json 里的配置，官方推荐用组件写视觉，`blocks.json` 只当 **sound** 配置系统。
    <https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/blocksjsonfilestructure>
  - 自定义方块的贴图由 `minecraft:material_instances`（BP 方块 JSON）+ `terrain_texture.json` 提供，**不经过** blocks.json。
- **键格式的历史**（保留记录，供查旧产物；现在没有触发场景，对应的 `assertBlocksJsonKey()` 护栏**已删除**）：
  曾经的键必须是**完整标识符** `ns:name`（如 `"mob_chest:chest"`），不是 `ns_name`。
  依据：[Bedrock Wiki · Block Sounds](https://wiki.bedrock.dev/blocks/block-sounds) 的示例键为 `"wiki:chestnut_log"`；
  本仓库历史产物 `git show e1199cc:examples/mob_chest/dev/mob_chest_RP/blocks.json` 用的也是 `"mob_chest:chest"` / `"sapdon:falling_block"`。
  `ns_name` 形态是把「**文件名安全名**」复用成 JSON 键的副产品 —— 文件名仍必须用 `_`
  （`:` 在 Windows 文件名里非法），但它不再兼任任何 JSON 键。
- ⚠️ **未验证**：只含 `format_version` 的 `blocks.json` 引擎会不会抱怨；以及音效/贴图在游戏内是否正常
  （音效本来就没配过 —— 框架从未写过 `sound` 字段，故预期与改动前一致）。
  真机验证方式：重进世界看那批 `trying to override the Geometry component` 警告是否消失 + 挖掘/放置音效正常。

### 自定义组件注册索引合并（缺口 10/11）

`scripts/custom_components/index.js` 用**标记块**维护（`load.js:166-167`）：

```
// >>> sapdon:custom-component-registry (auto-generated, 请勿手改本块) >>>
... 自动生成的 import + system.beforeEvents.startup 注册 ...
// <<< sapdon:custom-component-registry <<<
```

- **标记块之外的内容一律保留**（用户手写/模板占位都不会被覆盖）；文件里没有生成段时**追加**而不是覆盖。
- **幂等**：连跑两次文件内容不变（`load.js:158-161`）。
- 生成块里用 `import { system as __sapdon_system }` 而不是裸 `system` —— 追加时文件里可能已有 `import { system }`，同名重复声明会让整个脚本包 rollup 报 `Identifier "system" has already been declared`（`load.js:80-82`, `SYSTEM_ALIAS`）。
- ⚠️ 这里**不能**改成「文件已存在就跳过」：索引在 ts 模板里是**预置占位文件**且被 `scripts/index.ts` import，「存在即跳过」会让注册索引**永远不更新**（`load.js:262-265`）。

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
| `getBuildDirBp()` | 返回 BP 构建目录路径（`<projectPath>/<buildDir>/<name>_BP`） |
| `getBuildDirRp()` | 返回 RP 构建目录路径（`<projectPath>/<buildDir>/<name>_RP`） |

模板映射：`{ js: 'js_sapdon', ts: 'ts_sapdon' }`，对应 `src/templates/` 下的目录。

### 构建子目录名统一大写 `_BP` / `_RP`

`getBuildDirBp()` / `getBuildDirRp()` 固定拼出**大写**的 `_BP` / `_RP`（`src/cli/init.js:105-114`）。

⚠️ 历史上这里是**小写** `_bp` / `_rp`，而 `build.js`、`load.js`、`syncFiles.js`、`pack.js` 一律用大写 —— Windows 文件系统大小写不敏感才侥幸能跑；**Linux/macOS 下会分叉成两个目录**（构建写进 `X_bp`、打包读 `X_BP` → **空包**）。全框架现在只保留大写这一种形态，不要改回小写。

---

## 5. 开发服务器

### `dev-server/` 子系统

架构图：

```
 子进程 (用户代码)                    CLI 主进程
 ┌─────────────────────────┐      ┌──────────────────────────┐
 │                         │      │                          │
 │ GRegistry               │      │  DevelopmentServer       │
 │ .register()             │ POST │  (端口 SAPDON_DEV_SERVER_│
 │ .submit()               │─────→│   PORT，默认 49037)      │
 │                         │      │                          │
 │ core/transport/client.ts│      │  cliServerHandlers:      │
 │ transportPost()         │      │    submitGregistry       │
 │                         │      │    submit                │
 │                         │      │    remote-logger         │
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

端口从环境变量 **`SAPDON_DEV_SERVER_PORT`** 读取，默认 `49037`（`src/cli/dev-server/config.js:11-20`）：

```javascript
const DEFAULT_PORT = 49037
// 非整数 / ≤0 / 未设置 → 回落默认端口
export const devServerConfig = { port: resolvePort() }
```

| 事项 | 说明 |
|------|------|
| 默认端口 | `49037` |
| 覆盖方式 | 环境变量 `SAPDON_DEV_SERVER_PORT` |
| ★ 一致性要求 | 服务端（`dev-server/config.js`）与客户端（`src/core/transport/client.ts`）**必须解析同一个变量** |
| 端口被占用 | 打印「端口已被其他 sapdon 进程占用」并 **`process.exit(1)`**（`dev-server/server.ts:56-64`，判据是 `EADDRINUSE`） |

⚠️ **静默失联**：如果只有一侧读这个变量，就会出现「**客户端 POST 到 A 端口、服务端监听 B 端口**」——两边都不报错，表现为**构建产物莫名不更新**（注册数据发到了没人听的端口）。改端口相关代码时两处必须同步改。

用途：多个 sapdon 构建并行（多 agent / 多项目同时构建）时靠它避开 `EADDRINUSE`，各设各的端口即可。

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
    keepServer?: boolean                   // 构建后是否保持开发服务器常开（默认 false → 自动退出）
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

dev-server/ (HTTP 传输层 —— 全框架不使用 IPC)
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
