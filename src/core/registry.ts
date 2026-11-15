/**
 * 兼容入口：注册表实现已经移到 `@sapdon/utils/registry`（它与传输层都不再依赖 core）。
 * 这里保留 `@sapdon/core/registry.js` 这个深路径，core 内部与 UI 都继续用它。
 */
export * from '../utils/registry.js'
