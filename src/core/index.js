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
// `GRegistry` 同时导出（2026-09-12）：框架**没有**专属工厂的数据
// （loot_tables / trading / dialogue …）需要它落一份原始 JSON，
// 否则项目只能手改 `dev/` 产物（fz-sapdon 明令禁止「手改 dev/ 产物」）。
// `GRegistry.register(name, root, path, data)`：`root` = `"behavior"|"resource"`，
// 产物落在 `dev/<proj>_BP|_RP/<path>/<name>.json`。
// ⚠️ 每注册一项，构建日志就多一行 `处理数据:`（fz-sapdon 的验收脚本按它做基线断言）。
export { registry, GRegistry } from './registry.js'