# 构建协议（`sapdon-build/1`）

CLI 与构建脚本子进程之间的唯一契约。目标：**CLI 不认识 addon 语义**，只负责把解析好的文件写盘、维护清单、同步与打包。

```
CLI ──SAPDON_BUILD_CONTEXT(env)──▶ 子进程(main.ts)
子进程 ──POST /submit (BuildPacket)──▶ CLI
```

---

## 1. CLI → 子进程：`BuildContext`

通过环境变量 `SAPDON_BUILD_CONTEXT` 传入（JSON）：

| 字段 | 说明 |
|---|---|
| `protocol` | 必须等于 `sapdon-build/1` |
| `projectName` | `dev/<name>_BP|_RP` 的前缀 |
| `projectPath` | 项目根目录 |
| `buildDir` | 构建目录（通常 `dev`） |
| `buildMode` | `dev` / `prod` / `debug` |
| `resourceFiles` | `_RP/textures/**` 的相对文件列表（正斜杠），core 用它自动生成贴图图集 |

没有注入时（例如直接 `node main.mjs`），使用默认上下文：空项目名、零资源文件。

---

## 2. 子进程 → CLI：`BuildPacket`

```ts
interface BuildPacket {
  protocol: 'sapdon-build/1'
  files: Array<{
    root: 'behavior' | 'resource'
    path: string              // 包内子路径，如 'items/'
    name: string              // 文件名（不含扩展名）
    data: unknown             // json=对象；text/base64=字符串
    format?: 'json' | 'text' | 'base64'   // 缺省 json
    ext?: string              // 缺省 json；text 常用 txt，base64 常用 png
  }>
  sources?: Array<{
    path: string              // 相对项目根
    content: string
    overwrite?: boolean       // 缺省 false：已存在则保留用户改动
  }>
  indexBlocks?: Array<{       // 按标记块合并的文本（可多个）
    path: string
    content: string
  }>
  indexBlock?: { path: string; content: string }  // 兼容旧字段（单个）
}
```

落盘规则：

- `files` → `dev/<projectName>_BP|_RP/<path>/<name>.<ext>`；`json` 用 `JSON.stringify(data, null, 2)`，`base64` 用 `Buffer.from(data, 'base64')`；
- `sources` → `projectPath/<path>`；`overwrite !== true` 时已存在就跳过；
- `indexBlocks` → `projectPath/<path>`，用 `@sapdon/utils/componentIndex` 的 `mergeGeneratedBlock()` 替换生成段、保留手写内容；多个块按顺序合并到各自文件。

---

## 3. 解析器管线（`addPacketResolver`）

`registry.submit()` 依次执行解析器，优先级从高到低：

```ts
import { addPacketResolver, GRegistry, registry } from '@sapdon/core'

// 第三方包：先认领自己的条目
addPacketResolver(({ entries }) => {
  const mine = entries.filter((e) => e.name.startsWith('mypkg_'))
  if (mine.length === 0) return

  return {
    files: mine.map((e) => ({ root: e.root, path: 'mypkg/', name: e.name, data: e.data })),
    consumed: mine,   // 不再交给后面的解析器，也不走默认映射
  }
}, { id: 'mypkg:resolver', priority: 100 })

registry.submit()
```

规则：

- **`@sapdon/core` 的解析器优先级是 `-100`，最后兜底**：图集、自定义组件脚本、注册索引都在那里完成；
- 返回 `consumed` 的条目不会进入后续解析器，也不会被默认映射成 `<name>.json`；
- 返回的文件如果与某个条目 `root|path|name` 相同，会**自动**视为认领该条目（多数插件不必手写 `consumed`）；
- 没有解析器认领的条目走默认映射：`{ root, path, name, data }`；
- **建议给 `id`**：同一 `id` 二次登记会**替换**旧实现（热重载 / 同一插件被两条 import 路径加载时不会叠两份）；
- `setBuildPacketBuilder(fn)` 是**废弃**的兼容入口：清空链并注册唯一解析器，调用时会打警告。新代码请用 `addPacketResolver`。

`registry.beforeSubmit(hook)` 仍用于「改已注册项 / 追加注册项」；解析器用于「把注册项变成最终文件」，两者不冲突。

---

## 4. 校验

内置结构校验在子进程 POST 前、以及 CLI 落盘前各跑一次：

| 规则 | 级别 |
|---|---|
| `root` 只能是 `behavior` / `resource` | error |
| `path` 必须是安全相对路径（不能绝对、不能含 `..`、反斜杠或 NUL；允许空串） | error |
| `name` 非空、不能含路径分隔符、不能是 `.` / `..` | error |
| `format` 只能是 `json` / `text` / `base64` | error |
| `json` 文件的 `data` 不能是 `undefined` | error |
| `sources[].content` / `indexBlocks[].content` 必须是字符串 | error |
| 重复的 `files` / `sources` | warning（后者覆盖前者） |
| `ext` 非字母数字、text/base64 的 data 不是字符串 | warning |

插件可以追加校验：

```ts
addPacketValidator((packet) => {
  const bad = packet.files.filter((f) => f.path.startsWith('ui/') && !f.name.endsWith('_screen'))
  return bad.map((f) => ({
    level: 'warning',
    target: `ui/${f.name}.json`,
    message: 'UI 文件名建议以 _screen 结尾',
  }))
}, { id: 'mypkg:ui-naming' })
```

- 校验器返回单个 issue 或 issue 数组；`error` 会**阻断提交**，`warning` 只打日志；
- 校验器里抛错同样会阻断构建。

---

## 5. 版本与兼容

- 新增字段属于兼容扩展，不升级版本；
- 破坏性改动（改字段含义、删字段、改落盘语义）必须升级 `BUILD_PROTOCOL`；
- CLI 收到不匹配的 `protocol` 会**直接抛错**（`构建协议不匹配`），不会猜着写；
- 因此项目里的 `@sapdon/core` 与 `sapdon` CLI 必须同版本。

---

## 6. 失败语义

- 子进程写包失败 → 子进程非 0 退出 → CLI 构建失败；
- CLI 落盘时任何 `files`/`sources`/`indexBlocks` 写入失败 → HTTP 500 → `transportPost` 抛错 → 子进程非 0 退出；
- `buildMode === 'debug'` 时 CLI 跳过落盘，只同步已有 `dev/`。
