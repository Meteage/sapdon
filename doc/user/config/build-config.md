# build.config 配置参考

`build.config` 是项目的构建配置文件，位于项目根目录，支持 `//` 和 `/* */` 注释。

## 完整字段

```jsonc
{
  "formatVersion": 2,
  "buildOptions": {
    "useHMR": true,                       // 是否启用热更新
    "buildMode": "dev",                   // "dev" | "prod" | "debug"
    "buildEntry": "main.ts",              // Addon 构建入口文件
    "useJs": false,                       // 是否使用 JavaScript
    "scriptEntry": "scripts/main.ts",     // Script API 入口
    "scriptOutput": "scripts/index.js",   // Script API 输出路径（相对于 buildDir）
    "buildDir": "dev/",                   // 构建输出目录
    "dependencies": [
      {
        "module_name": "@minecraft/server",
        "version": "2.0.0"
      }
    ],
    "resource": {
      "path": "res/",                     // 资源文件目录
      "resourceHints": true               // 是否生成资源提示文件
    }
  },
  "versionType": "release"                // "release" | "beta"
}
```

## 字段说明

### formatVersion
配置格式版本，当前为 `2`。v1 配置会在读取时自动迁移。

### buildMode

| 值 | 说明 |
|----|------|
| `dev` | **完整构建**：运行 `main.ts` → 根据代码生成所有 JSON → 打包脚本 → 同步到 Minecraft 目录。Script API 输出带 sourcemap，不压缩。 |
| `prod` | **生产构建**：运行 `main.ts` → 生成 JSON → 打包脚本（terser 压缩混淆）→ 同步。不生成 sourcemap。 |
| `debug` | **仅同步**：跳过 `main.ts` 执行和 JSON 生成，跳过脚本压缩，将已有 `dev/` 目录直接同步到 Minecraft 目录。适合直接编辑 JSON 文件测试时使用。 |

### buildEntry
构建入口文件路径（相对项目根目录）；可以是**子目录**里的文件（例如 `src/index.ts`）。文件中的 `registry.submit()` 会将注册数据提交到构建系统。

> 自定义组件脚本仍写在项目根的 `scripts/custom_components/` 下（与 `scriptEntry` 同处 `scripts/`），**与 `buildEntry` 放在哪里无关**。

### scriptEntry / scriptOutput
- `scriptEntry` — Script API 源码入口，会打包为单个文件
- `scriptOutput` — 打包后的输出路径，相对于 `buildDir/<name>_BP/`

### buildDir
构建输出目录，内容结构：

```
<buildDir>/
├── <projectName>_BP/      # 行为包
└── <projectName>_RP/      # 资源包
```

### dependencies
写进**行为包** `manifest.json` 的 `dependencies`。每一项二选一：

| 写法 | 含义 | 写进 manifest 的形式 |
|---|---|---|
| `{ "module_name": "@minecraft/server", "version": "2.0.0" }` | 脚本模块 | 原样 |
| `{ "uuid": "<另一个包的 header uuid>", "version": "1.2.0" }` | 依赖另一个行为包 | `{ "uuid": …, "version": [1, 2, 0] }`（`version` 也可直接写数组） |

常见脚本模块：

| 模块名 | 说明 |
|--------|------|
| `@minecraft/server` | 核心 Script API |
| `@minecraft/server-ui` | 表单 UI API |
| `@minecraft/server-net` | 网络 API |
| `@minecraft/server-admin` | 管理 API |

依赖另一个行为包（例如前置包）：

```jsonc
"dependencies": [
  { "module_name": "@minecraft/server", "version": "2.0.0" },
  { "uuid": "3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90", "version": "1.2.0" }
]
```

`uuid` 填被依赖包 `manifest.json` 里的 `header.uuid`，`version` 填它的 `header.version`。

⚠️ 引擎要求版本**完全一致**（2026-11 真机）：被依赖包升到 0.1.2 后，依赖 0.1.1 的包在包列表里显示「缺少依赖项」，
详情为 `缺少 ID '<uuid>' 和版本 '0.1.1' 的依赖项。`。同 UUID 的包只保留较高版本，所以被依赖包每发一版，依赖它的包都要同步重发。
适合同一作者、同步发版的一组包；跨作者的前置依赖用运行期探测（软依赖）。

构建时会校验每一项，不合法就**构建失败**（退出码 1），报错带下标，例如：

```text
[sapdon] 构建失败：build.config 的 buildOptions.dependencies[1] 的 uuid 不是合法的 UUID："not-a-uuid"
```

| 情况 | 报错 |
|---|---|
| 同一项既写 `module_name` 又写 `uuid`，或两个都没写 | `必须且只能写 module_name（脚本模块）或 uuid（另一个包）之一` |
| 包依赖的 `version` 不是三段非负整数 | `的 version 必须是 "主.次.修" 三段非负整数（字符串或数组）` |
| `uuid` 是本项目自己的 BP / RP | `依赖的是本项目自己` |
| 同一个 `uuid` 写了两次 | `与前面的依赖重复` |

⚠️ `manifest.json` **只在首次构建时生成**。之后再改 `dependencies`，构建会打印哪几项还没写进去：

```text
[sapdon] build.config 的 dependencies 里有 1 项不在现有的 dev/<projectName>_BP/manifest.json 中：
  - {"uuid":"3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90","version":[1,3,0]}
[sapdon] manifest 只在首次构建时生成。删除 dev/<projectName>_BP/manifest.json 后重新构建即可写入（BP/RP 的 UUID 取自 mod.info，不会变）。
```

删除 `dev/<projectName>_BP/manifest.json` 再构建即可；包的 UUID 从 `mod.info` 读取，不会变。

### resource
- `path` — 资源文件夹路径，内容会复制到 RP 根目录
- `resourceHints` — 设为 `true` 时生成 `res.hint.ts`，提供类型安全的资源引用

### versionType

| 值 | Minecraft 路径 |
|----|---------------|
| `release` | `%USERPROFILE%/AppData/Roaming/Minecraft Bedrock/...` |
| `beta` | `%USERPROFILE%/AppData/Local/Packages/Microsoft.MinecraftWindowsBeta_.../LocalState/...` |

可通过环境变量 `MC_PATH` 或 `MC_BETA_PATH` 覆盖。
