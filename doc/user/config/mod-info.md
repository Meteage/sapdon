# mod.info 配置参考

`mod.info` 位于项目根目录，定义模组的元数据，用于生成 manifest.json。

## 格式

```json
{
  "name": "hello_sapdon",
  "description": "我的第一个 Sapdon 模组",
  "author": "YourName",
  "version": "1.0.0",
  "min_engine_version": "1.19.50"
}
```

## 字段说明

| 字段 | 说明 | 必填 |
|------|------|------|
| `name` | 模组名称，会被用作 `manifest.json` 中的名字和包目录名 | 是 |
| `description` | 模组描述 | 是 |
| `author` | 作者名 | 是 |
| `version` | 版本号，格式 `major.minor.patch` | 是 |
| `min_engine_version` | 最低游戏引擎版本 | 是 |

### version 格式

版本号必须是三位数字，用 `.` 分隔，如 `1.0.0`、`2.3.1`。

### min_engine_version

指定支持的最低 Minecraft 版本。例如 `1.19.50` 表示需要 1.19.50 及以上版本。
