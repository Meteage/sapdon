# 常见问题 (FAQ)

## 1. 如何更新框架版本？

sapdon 作为本地 devDependency 安装，请在项目目录中更新：

```bash
npm update sapdon
```

---

## 2. 如何添加依赖？

在项目根目录的 `build.config` 文件中配置 `dependencies` 字段：

```json
{
  "dependencies": [
    {
      "module_name": "@minecraft/server",
      "version": "1.8.0"
    },
    {
      "module_name": "@minecraft/server-ui",
      "version": "1.3.0"
    }
  ]
}
```

构建时框架会自动将依赖注入到行为包的 `manifest.json` 中。

⚠️ 但 `manifest.json` **只在文件不存在时才生成**（为了保留 uuid）—— 改完 `dependencies` 后必须删掉 `dev/<项目名>_BP/manifest.json` 才会重新生成，详见第 4 条。

---

## 3. 构建输出在哪？

执行 `sapdon build <项目名>`（或 `sapdon compile`）后，构建产物输出到项目根目录的 `dev/` 文件夹中：

```
dev/
├── <项目名>_BP/          # 行为包（Behavior Pack）—— 大写 BP
│   ├── manifest.json
│   ├── pack_icon.png
│   ├── blocks/*.json     # 方块（行为侧）
│   ├── entities/*.json
│   ├── items/*.json
│   ├── recipes/*.json
│   └── scripts/index.js  # 打包后的脚本
├── <项目名>_RP/          # 资源包（Resource Pack）—— 大写 RP
│   ├── manifest.json
│   ├── pack_icon.png
│   ├── blocks.json       # ← 方块贴图/音效表（属资源包，不是行为包！）
│   ├── entity/*.json
│   ├── textures/item_texture.json
│   ├── textures/terrain_texture.json
│   └── textures/blocks|items/*.png
└── .sapdon_generated_<项目名>.json   # 框架的产物清单（请勿手工编辑）
```

⚠️ **`_BP` / `_RP` 一定是大写**。历史版本曾用小写 `_bp`/`_rp`，在 Windows 上因为大小写不敏感看不出问题，但在 Linux/macOS 下会**分叉成两个目录**（构建写一个、打包读另一个 → 打出空包）。

### 改过名 / 删过方块后 `dev/` 里可能留有旧文件

框架用**产物清单**（`dev/.sapdon_generated_<项目名>.json`）记录每次构建写出的文件，下次构建时只删除「上次有、这次没有」的产物 —— 所以**改方块名、删掉某个方块之后，对应的旧 JSON 会被自动清理**。

但有两种情况清不掉，需要你**手工删除**：

| 情况 | 原因 |
|------|------|
| **重命名了项目** | 新项目名的清单管不到旧名字的 `dev/<旧名>_BP/`、`dev/<旧名>_RP/` 目录 → 旧目录整个残留 |
| **该项目从未成功构建过** | 没有清单文件，框架不知道哪些是它生成的，因此不会删任何东西 |

这也是框架**不会**采用「扫描 `dev/` 删除所有未知文件」策略的原因：那会把你从 `res/` 拷进来、以及手写的文件一起误删。

---

## 4. 构建显示成功但产物还是旧的？

**框架现在会因失败而非 0 退出** —— 但「构建成功」这句话本身依然不可信，请用下面两个判据确认。

### 成功 / 失败的判据

| 判据 | 说明 |
|------|------|
| ✅ **退出码为 0** | 构建脚本子进程非 0 退出、脚本打包失败，都会让 CLI 以 `exit 1` 结束 |
| ✅ **日志里出现 `处理数据: <name> <root> <path>`** | 这是「产物真的生成了」的**唯一判据** —— 每个写出的注册项都会打一行 |

历史行为是：构建脚本失败被**静默吞掉**，CLI 照样打印「构建完成」并 `exit 0`，于是 `dev/` 里留下的是**上一次的旧产物**。这是本框架真实踩过的坑，所以现在失败一律非 0 退出。

### 常见误解：只跑 `sapdon compile` 并不会重新生成所有东西

- **`manifest.json` 只在文件不存在时才生成**（目的是保留 uuid）。
  ⇒ 改了 `build.config` 里的 `dependencies`（例如把 `@minecraft/server` 升到 `2.6.0`）后，旧 manifest 会被**保留**、新依赖**不会**写进去。
  **解决**：删掉 `dev/<项目名>_BP/manifest.json` 后重新 `sapdon compile`。删它不影响 uuid —— **uuid 存在项目的 `mod.info` 里**。
- **`res.hint.ts` 由 `initResourceDir()` 生成，而它只在 `sapdon build` 与 `sapdon res` 命令里被调用**，`sapdon compile` **不调用**。
  ⇒ 在 `res/` 里加了资源后只跑 `compile`，`res.hint.ts` 不会刷新 —— 需要单独跑 `sapdon res`。
- 改过方块名 / 删过方块时，`dev/` 里的旧 JSON 由**产物清单**自动清理；但**重命名项目**或**从未成功构建过**的情况清不掉，需手工删除（见第 3 条）。

---

## 5. 如何同步到 Minecraft？

框架支持自动同步功能。构建完成后，产物会自动复制到 Minecraft 开发包目录（`com.mojang` 开发包文件夹）。前提是已正确配置开发包路径。

如果自动复制失败，可以手动将 `dev/` 目录下的资源包和行为包复制到 Minecraft 的开发包目录。

---

## 6. 如何切换 release/beta 版本？

在 `build.config` 中设置 `versionType` 字段：

```json
{
  "versionType": "release"
}
```

可选值：

| 值 | 说明 |
|-----|------|
| `"release"` | 正式版 |
| `"beta"` | beta 测试版 |

切换后**只影响构建产物的同步目标路径**（release 与 beta 的 `com.mojang` 位置不同）。

⚠️ 它**不会**改变 `manifest.json` 里的 `header.name`、`min_engine_version` 或依赖版本 —— 那些来自 `mod.info` 与 `build.config` 的 `dependencies`。

---

## 7. 如何覆盖 Minecraft 路径？

通过设置环境变量来指定 Minecraft 开发包目录：

| 环境变量 | 说明 |
|----------|------|
| `MC_PATH` | 正式版 Minecraft 开发包路径 |
| `MC_BETA_PATH` | Beta 版 Minecraft 开发包路径 |

示例（Windows PowerShell）：

```powershell
$env:MC_PATH = "C:\Users\<用户名>\AppData\Local\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang"
```

设置后，构建完成的包会自动同步到指定路径。

---

## 8. 构建报错 "tsc-alias not found"？

**先确认是哪个构建在报错**：

- **`tsc-alias` 是框架仓库自身的 devDependency**（`sapdon/package.json`），只在**框架自身**的构建里被调用（`scripts/build.cjs` 执行 `npx tsc-alias`）。
- **用户项目不会用到它**：`sapdon compile` / `sapdon build` 走的是 rollup + TypeScript 插件，不调用 `tsc-alias`；项目模板的 `package.json`（`src/templates/*/package.json`）也**没有**这个依赖。

所以：

| 出现场合 | 处理 |
|---------|------|
| 在 **sapdon 框架仓库**里跑 `npm run build` 时报这个错 | 在框架仓库目录执行 `npm install`（`node_modules` 不完整） |
| 在**你自己的 addon 项目**里看到这个错 | 说明你的项目自己配置了 `tsc-alias`（例如自建构建脚本）。这是你项目侧的依赖问题，`npm install` 安装你项目的 devDependencies |

```bash
npm install     # 在报错的那个仓库/项目目录下执行
```

此错误通常是**依赖未正确安装或 `node_modules` 目录不完整**造成的。

---

## 9. 为什么实体/物品 JSON 没有生成？

常见原因：

1. **未调用 `registry.submit()`** — 在完成所有注册后必须显式调用 `registry.submit()` 来提交数据。
   ```javascript
   import { registry } from "@sapdon/core";
   registry.submit();
   ```

2. **`dataList` 为空** — 检查注册的模块是否正确调用了注册 API，确认数据是否已推入 `dataList`。

3. **注册时机不对** — 确保 `registry.submit()` 在所有 API 注册调用之后执行。

---

## 10. 热更新不生效？

检查 `build.config` 中是否启用了热更新：

```json
{
  "useHMR": true
}
```

确保 `useHMR` 设置为 `true`。如果已启用但仍不生效，请检查：

- Minecraft 是否正在运行并加载了开发包
- **HMR 靠 CLI 进程内的文件监听（`fs.watch`）触发重建，不走网络** —— 框架里**没有** WebSocket / 端口通信参与 HMR；它只负责重新构建并把产物拷到 Minecraft 开发包目录，**游戏内是否重新加载属游戏行为，未验证**
- 命令是否带 `keepServer: true`：默认构建完成后服务器会自动退出，服务器退出后**就不会再监听文件变更**了
- 是否用 `sapdon compile` 而非 `sapdon build`：`compile` 只构建一次，**不启动** HMR 监听
- 修改的文件是否在框架的监听范围内（`.js`、`.ts`、`build.config`、`mod.info`；排除点文件、`dev/` 构建目录、`.tmp`）

---

## 11. 如何手动运行 sapdon lib？

在项目目录下直接执行：

```bash
sapdon lib
```

该命令会手动运行 Sapdon 的核心库逻辑，通常用于调试或在某些自动化流程中单独触发库的处理流程。

---

> 如有其他问题，请加入官方 QQ 群：`810904181`
