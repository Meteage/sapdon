# Sapdon 框架开发工作流

本文档记录 Sapdon 框架自身的开发流程与经验，帮助贡献者快速上手。

---

## 1. 核心原则

**永远只修改 `src/` 下的源码，不要直接修改 `prod/` 或 `node_modules/`。**

- `prod/` 是构建产物，由 `npm run build` 自动生成，手动编辑会被覆盖。
- 项目中的 `node_modules/@sapdon/*` 是从 `prod/` 同步的副本，手动编辑会被 `sapdon lib` 覆盖。

---

## 2. 框架自身的构建流程

```
npm run build
  │
  ├─ tsc          → src/ → dist/  (TypeScript 编译)
  ├─ tsc-alias    → 解析路径别名
  └─ rollup       → dist/ → prod/ (打包为 ESM bundle)
       ├─ prod/cli/start.js   CLI 入口
       ├─ prod/cli/index.js   CLI 库
       ├─ prod/core/index.js  @sapdon/core
       ├─ prod/oc/index.js    @sapdon/runtime
       ├─ prod/utils/index.js @sapdon/utils
       └─ prod/*/index.d.ts   TypeScript 声明文件
```

构建命令在 `scripts/build.cjs` 中定义。

---

## 3. 全局 CLI 与本地开发

全局安装的 `sapdon` 命令通常通过 **junction 软链接** 指向仓库目录：

```
C:\nodejs\node_modules\sapdon  →  D:\Projects\sapdon
```

这意味着：
- 修改 `src/` 后只需 `npm run build` 重建 `prod/`，全局 CLI 立即生效，无需重新 `npm i -g`。
- 如果不是 junction 链接（例如直接 npm publish 后安装），需要把新 `prod/` 覆盖到全局安装目录，或重新 `npm i -g sapdon`。

---

## 4. 项目侧同步新库

在示例项目或用户项目中，使用框架新功能前，需要将 `prod/` 同步到项目的 `node_modules/@sapdon/`。有两种方式：

### 方式一：`npm i`（推荐）

项目 `package.json` 的 `postinstall` 脚本会自动执行 `sapdon lib`：

```json
{
  "scripts": {
    "postinstall": "sapdon lib"
  }
}
```

`npm i` 会触发 `postinstall`，将 `prod/` 下的库复制到 `node_modules/@sapdon/`：

| 源路径 | 目标路径 |
|--------|----------|
| `prod/core/` | `node_modules/@sapdon/core/` |
| `prod/cli/` | `node_modules/@sapdon/cli/` |
| `prod/oc/` | `node_modules/@sapdon/runtime/` |

### 方式二：手动执行 `sapdon lib`

```bash
sapdon lib
```

效果相同，适合在 `npm i` 之后快速刷新库。

### 然后编译项目

```bash
sapdon compile       # 仅构建，不启动 HMR
# 或
npm run build        # 构建 + 启动开发服务器（HMR）
```

---

## 5. 完整开发循环

当修改框架源码时，完整的开发和验证流程如下：

```
1. 修改 src/ 下的源码
2. npm run build              # 重建 prod/
3. 进入示例项目目录
4. npm i                      # 触发 postinstall → sapdon lib，同步新库
   # 或：sapdon lib            # 手动同步
5. sapdon compile             # 验证构建结果
6. 确认无误后提交 PR
```

---

## 6. 常见坑点

### 6.1 修改了 prod/ 但项目没生效

`prod/` 是构建产物，手动修改会被下次 `npm run build` 覆盖。务必回到 `src/` 修改，然后重建。

### 6.2 手动修改了 node_modules/@sapdon/*

`node_modules/@sapdon/*` 是 `sapdon lib` 的输出，运行 `npm i` 或 `sapdon lib` 会覆盖所有手动修改。

### 6.3 编译后服务器不退出

`sapdon compile` 默认构建完成后自动退出。如果服务器一直占端口，检查 `build.config` 中是否设置了 `buildOptions.keepServer: true`。

### 6.4 新建项目后忘记同步库

使用 `sapdon create` 创建新项目后，`postinstall` 会自动执行 `sapdon lib`。如果手动创建项目或删除了 `node_modules`，需要重新 `npm i` 或手动运行 `sapdon lib`。

### 6.5 manifest.json 不会随 dependencies 变化重新生成

`src/cli/build.js` 中 manifest 只在**不存在时**才生成（`if (pathNotExist(manifestPath))`），目的是保留 uuid。因此修改 `build.config` 里的 `@minecraft/server` 版本后，旧 manifest 会被保留、新版本不生效。

**解决**：手动删除 `dev/<name>_BP/manifest.json` 后重新 `sapdon compile`。删除 manifest 不影响 uuid（uuid 缓存在 `dev/.sapdon` 等目录，由 `loadOrCreateUuids` 复用）。

### 6.6 方块脚本事件不存在（blockTick / blockUpdate）与自定义组件注册时机

`world.afterEvents.blockTick` 与 `world.afterEvents.blockUpdate` **在任何版本都不存在**（包括 @minecraft/server 1.19.0）。调用会报 `cannot read property 'subscribe' of undefined`。

**正确做法**：使用**自定义组件**（custom components）：
- 方块 JSON 加扁平化自定义组件（V2，format_version ≥ 1.21.90）：`"sapdon:xxx_tick": {}`
- 脚本在 `system.beforeEvents.startup` 注册（需 **@minecraft/server ≥ 2.0.0**）：
  ```js
  import { system } from "@minecraft/server";
  system.beforeEvents.startup.subscribe((init) => {
      init.blockComponentRegistry.registerCustomComponent('sapdon:xxx_tick', { onTick, onPlayerInteract, ... });
  });
  ```
- `onTick` 由 `minecraft:tick` 组件驱动（两者共存），`onPlayerInteract` 替代 `world.afterEvents.itemUseOn`

**注册时机是关键**：`startup`（2.0.0+）在方块 JSON 被加载/校验**之前**触发，此时注册自定义组件才能让 Schema 识别。用 `world.beforeEvents.worldInitialize`（1.x 时代的入口）注册会在方块 JSON 校验之后，报 `this component was found in the input, but is not present in the Schema`。

**版本对应关系**（@minecraft/server → Minecraft 稳定版）：`2.0.0`→1.21.90/1.21.100，`2.6.0`→1.26.20，`2.8.0`→1.26.30，`2.9.0`→1.26.40。声明版本≤游戏支持的版本即可。

### 6.7 build.config 带 UTF-8 BOM 导致 JSON 解析失败

如果 `build.config` 被以带 BOM 的 UTF-8 保存（如某些编辑器/命令输出），`JSON.parse` 会报 `Unexpected token '﻿'`。

**解决**：字节级剥离 BOM（重新保存为无 BOM 的 UTF-8）。注意 `ConvertTo-Json | Out-File` 或部分重定向写法会引入 BOM；编辑此类配置文件时用无 BOM 编码保存。

---

## 7. 实战案例

### 案例 1：修复方块 JSON 报错（Minecraft 1.26.20+）

**问题**：Minecraft 从 format version 1.26.20 起，`minecraft:material_instances` 的 `ambient_occlusion` 不接受布尔值，必须是 0.0–10.0 浮点数。

**修复位置**：`src/cli/load.ts`（方块 JSON 生成逻辑）。

**修复前**：
```ts
ambient_occlusion: this.options.ambient_occlusion ?? true
// 生成: "ambient_occlusion": true  ← Minecraft 1.26.20+ 报错
```

**修复后**：
```ts
ambient_occlusion: "number" == typeof i ? i : !1 === i ? 0 : 1
// 生成: "ambient_occlusion": 0  ← 合法浮点数
```

### 案例 2：新增 keepServer 配置项

**需求**：`sapdon compile` 构建完成后 dev server 不退出，一直占端口 49037。需要加开关控制是否常驻。

**修改文件**：
- `src/cli/meta/buildConfig.ts`：在 `BuildOptions` 中新增 `keepServer?: boolean` 字段。
- `src/cli/build.js`：在 `buildProject()` 末尾添加自动退出逻辑，默认 `keepServer` 为 false 时 `process.exit(0)`。
- `src/templates/js_sapdon/build.config` 和 `src/templates/ts_sapdon/build.config`：在模板中新增 `keepServer` 字段及注释。

**使用方式**：
```json
{
  "buildOptions": {
    "keepServer": false,  // 默认 false，构建完成后自动退出；true 保持服务器常开（配合 useHMR）
    "useHMR": true
  }
}
```

### 案例 3：修复 keepServer 自动退出导致脚本未打包

**问题**：`sapdon compile` 加入 `keepServer: false` 自动退出后，`dev/<name>_BP/scripts/index.js` 经常缺失或内容为旧版本。

**根因**：`src/cli/build.js` 的 `bundleScripts()` 调用异步的 `scriptBundler[elementType](...)` 时**没有 `await`**。之前服务器一直常驻（不退出），异步打包有足够时间完成，问题被掩盖；开启自动退出后，`process.exit(0)` 在异步 rollup 写入完成前就终止了进程，导致打包文件未写入。

**修复**：在 `bundleScripts()` 中 `await` 异步调用，并提前 `fs.mkdirSync` 创建输出目录（rollup 不会自动创建父目录）：

```js
async function bundleScripts(useJs=false) {
    const elementType = useJs ? 'js' : 'ts'
    const projectPath = getProjectPath()
    const buildConfig = getBuildConfig()
    const { scriptEntry, scriptOutput, buildMode } = buildConfig.buildOptions
    const targetPath = path.join(getBuildDirBp(), scriptOutput)
    fs.mkdirSync(path.dirname(targetPath), { recursive: true })
    await scriptBundler[elementType](   // ← 必须 await，否则进程退出导致打包中断
        path.join(projectPath, scriptEntry),
        targetPath,
        buildMode === 'dev' ? true : false
    )
}
```

**排查经验**：当框架新增 `process.exit(0)` 类逻辑时，要检查所有异步操作是否都被 `await`。现象是"同步创建的目录存在，但异步写入的文件缺失"。

### 案例 4：数字电路方块报 `subscribe of undefined` / `not present in the Schema` → 自定义组件 + @minecraft/server 2.x

**问题**：`examples/digitCircuit` 的 `scripts/index.js` 中 `world.afterEvents.blockTick.subscribe(...)` 报 `TypeError: cannot read property 'subscribe' of undefined`；改用 `world.beforeEvents.worldInitialize` 注册自定义组件后又报 `sapdon:wire_tick: this component was found in the input, but is not present in the Schema`。

**根因（三层）**：
1. **API 版本被 manifest 门控**：`build.config` 里声明 `@minecraft/server: 1.8.0`，Bedrock 运行时只暴露该版本的 API 表面。`blockTick`/`blockUpdate` 即使在新版本也不存在（1.19.0 的 `.d.ts` 中确认无此事件），但 `registerCustomComponent` 需要 ≥1.9.0。
2. **事件选错**：正确的 tick 机制是自定义组件的 `onTick`，而非 afterEvents。
3. **注册入口太晚**：`world.beforeEvents.worldInitialize` 在方块 JSON 校验之后触发，Schema 不认自定义组件。必须用 **`system.beforeEvents.startup`（@minecraft/server ≥ 2.0.0）**，它在方块 JSON 加载前触发。

**修改文件**：
- `examples/digitCircuit/build.config`：`@minecraft/server` `1.8.0` → `2.6.0`（对应游戏 1.26.20），并**删除旧 manifest** 强制重新生成（见 6.5）。同时把 `package.json` devDependency 同步为 `2.6.0`（精确版本，保证类型与运行时一致）。
- `lib/wire.js`、`main.mjs`：给方块加 `BlockComponent.setCustomComponents(["sapdon:wire_tick"])` / `["sapdon:gate_tick"]`，生成扁平化自定义组件 JSON：
  ```json
  "components": { "sapdon:wire_tick": {}, "minecraft:tick": { "interval_range": [5, 10], "looping": true } }
  ```
- `scripts/index.js`：在 `system.beforeEvents.startup` 注册：
  ```js
  import { Direction, system } from "@minecraft/server";
  system.beforeEvents.startup.subscribe((init) => {
      init.blockComponentRegistry.registerCustomComponent("sapdon:wire_tick", {
          onPlayerInteract(event) { /* 右键设信号 15 */ },
          onTick(event) { /* 传播信号 */ }
      });
      init.blockComponentRegistry.registerCustomComponent("sapdon:gate_tick", {
          onTick(event) { /* 重算 AND/OR/NOT */ }
      });
  });
  ```

**要点**：
- 扁平化自定义组件（`"id": {}` 直接写在 `components`）是 format_version 1.21.90+ 的 V2 规范，与框架 `setCustomComponents` 的输出一致，`minecraft:custom_components` 数组写法已废弃。
- 注册入口用 `system.beforeEvents.startup`（`StartupEvent.blockComponentRegistry`），与 `src/oc/builtin/index.ts` 的 `registerBuiltinComponents()` 一致；`src/cli/load.js` 自动生成的注册模板也用的是 startup，版本升级后该模板可直接使用。
- `onPlayerInteract` 替代 `world.afterEvents.itemUseOn`（右键交互即触发，无需手持特定物品）。
- 验证手段：检查生成的 `dev/<name>_BP/manifest.json` 版本号、方块 JSON 的 `components` 里是否含自定义组件、打包后的 `scripts/index.js` 是否含 `system.beforeEvents.startup` 与 `registerCustomComponent`。