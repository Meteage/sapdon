# mod.info 配置参考

`mod.info` 位于项目根目录，定义模组的元数据，用于生成 `manifest.json`。

## 格式

```json
{
  "name": "my_addon",
  "authors": ["YourName"],
  "version": "1.0.0",
  "min_engine_version": "1.19.50",
  "description": "我的第一个 Sapdon 模组"
}
```

首次构建后，框架会**写回**两个 UUID 字段：

```json
{
  "name": "my_addon",
  "authors": ["YourName"],
  "version": "1.0.0",
  "min_engine_version": "1.19.50",
  "description": "我的第一个 Sapdon 模组",
  "bp": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "rp": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
}
```

## 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 模组名称，用作 `manifest.json` 的包名与 `dev/` 下的目录名（`<name>_BP` / `<name>_RP`） |
| `authors` | string[] | 是 | 作者信息，仅作项目元数据记录，不会写进 manifest |
| `version` | string | 是 | 版本号，格式 `major.minor.patch` |
| `min_engine_version` | string | 是 | 最低游戏引擎版本 |
| `description` | string | 是 | 模组描述，写入 manifest 的 `header.description` |
| `bp` | string(uuid) | 否 | 行为包 UUID，首次构建时自动生成并写回 |
| `rp` | string(uuid) | 否 | 资源包 UUID，首次构建时自动生成并写回 |

### version 格式

必须是三段数字，用 `.` 分隔，如 `1.0.0`、`2.3.1`。
框架会把字符串按 `.` 拆成数字数组写进 manifest，**不做补位**：写 `1.0` 得到 `[1, 0]`，
写 `1.0.0.0` 得到四项。统一用三段最稳妥。

### min_engine_version

指定支持的最低 Minecraft 版本。`1.19.50` 表示需要 1.19.50 及以上。
写高了低版本玩家看不到包，写低了可能用上新版本才有的字段。

### bp / rp（UUID）

- **首次构建自动生成**，并写回 `mod.info`，之后每次构建都读同一组
- **拷贝项目时必须删掉这两个字段重新生成**：Minecraft 按 `header.uuid` 认包，UUID 相同的两个包在引擎眼里是同一个包，会互相抢脚本组件注册，且不报错
- 手动改过 `mod.info` 的 UUID 后，要**删掉 `dev/*/manifest.json` 再构建**，否则框架复用旧 manifest

```bash
# 换 UUID 的正确顺序
# 1. 删掉 mod.info 里的 bp / rp 两行
# 2. 删掉旧产物，避免复用旧 manifest
rm -rf dev
# 3. 重新构建，UUID 会自动生成并写回
sapdon build .
```

## 与 manifest 的对应关系

| mod.info | manifest.json |
|----------|--------------|
| `name` | `header.name`（加 `_BP` / `_RP` 后缀）、包目录名 |
| `description` | `header.description` |
| `version` | `header.version`、各 module 的 `version` |
| `bp` / `rp` | 两个包的 `header.uuid` 与互相的 `dependencies[].uuid` |
| — | `metadata.authors` 固定为 `["@sapdon"]` |
