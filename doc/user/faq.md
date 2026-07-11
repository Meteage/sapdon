# 常见问题 (FAQ)

## 1. 如何更新框架版本？

全局更新 sapdon CLI 和核心库：

```bash
npm update -g sapdon
```

如果使用的是本地项目依赖，请在项目目录中执行：

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

---

## 3. 构建输出在哪？

执行 `sapdon build <项目名>` 后，构建产物会输出到项目根目录的 `dev/` 文件夹中。该目录包含完整的资源包和行为包结构，可直接用于开发测试。

---

## 4. 如何同步到 Minecraft？

框架支持自动同步功能。构建完成后，产物会自动复制到 Minecraft 开发包目录（`com.mojang` 开发包文件夹）。前提是已正确配置开发包路径。

如果自动复制失败，可以手动将 `dev/` 目录下的资源包和行为包复制到 Minecraft 的开发包目录。

---

## 5. 如何切换 release/beta 版本？

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

切换后会影响生成的 `manifest.json` 中的 `header.name` 后缀和 `min_engine_version` 等配置。

---

## 6. 如何覆盖 Minecraft 路径？

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

## 7. 构建报错 "tsc-alias not found"？

确保已安装项目依赖：

```bash
npm install
```

如果使用了全局安装方式，可能需要重新安装：

```bash
npm install -g sapdon
```

此错误通常是因为依赖未正确安装或 node_modules 目录不完整导致的。

---

## 8. 为什么实体/物品 JSON 没有生成？

常见原因：

1. **未调用 `registry.submit()`** — 在完成所有注册后必须显式调用 `registry.submit()` 来提交数据。
   ```javascript
   import { registry } from "@sapdon/core";
   registry.submit();
   ```

2. **`dataList` 为空** — 检查注册的模块是否正确调用了注册 API，确认数据是否已推入 `dataList`。

3. **注册时机不对** — 确保 `registry.submit()` 在所有 API 注册调用之后执行。

---

## 9. 热更新不生效？

检查 `build.config` 中是否启用了热更新：

```json
{
  "useHMR": true
}
```

确保 `useHMR` 设置为 `true`。如果已启用但仍不生效，请检查：

- Minecraft 是否正在运行并加载了开发包
- 网络连接是否正常（HMR 通过 WebSocket 通信）
- 修改的文件是否在框架的监听范围内

---

## 10. 如何手动运行 sapdon lib？

在项目目录下直接执行：

```bash
sapdon lib
```

该命令会手动运行 Sapdon 的核心库逻辑，通常用于调试或在某些自动化流程中单独触发库的处理流程。

---

> 如有其他问题，请加入官方 QQ 群：`810904181`
