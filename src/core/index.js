export * from './addon/index.js'
export * from './biome/index.js'
export * from './block/index.js'
export * from './entity/index.js'
export * from './factory/index.js'
export * from './feature/index.js'
export * from './feature-rule/index.js'
export * from './item/index.js'
export * from './ui/index.js'
export * from './texture.js'
export * from '../utils/index.js'
// `GRegistry` 同时导出：框架没有专属工厂的数据（`loot_tables` / `trading` / `dialogue` …）
// 用它落一份原始 JSON。`register(name, root, path, data)`：`root` = `"behavior" | "resource"`，
// 产物落在 `dev/<proj>_BP|_RP/<path>/<name>.json`。
// ⚠️ 每注册一项，构建日志就多一行 `处理数据:`（`name` 会做文件名安全化处理）。
export { registry, GRegistry } from './registry.js'