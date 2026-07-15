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
构建入口文件路径（相对项目根目录）。文件中的 `registry.submit()` 会将注册数据提交到构建系统。

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
manifest.json 中的依赖声明。常见模块：

| 模块名 | 说明 |
|--------|------|
| `@minecraft/server` | 核心 Script API |
| `@minecraft/server-ui` | 表单 UI API |
| `@minecraft/server-net` | 网络 API |
| `@minecraft/server-admin` | 管理 API |

### resource
- `path` — 资源文件夹路径，内容会复制到 RP 根目录
- `resourceHints` — 设为 `true` 时生成 `res.hint.ts`，提供类型安全的资源引用

### versionType

| 值 | Minecraft 路径 |
|----|---------------|
| `release` | `%USERPROFILE%/AppData/Roaming/Minecraft Bedrock/...` |
| `beta` | `%USERPROFILE%/AppData/Local/Packages/Microsoft.MinecraftWindowsBeta_.../LocalState/...` |

可通过环境变量 `MC_PATH` 或 `MC_BETA_PATH` 覆盖。
