import { addPacketResolver } from '../utils/registry.js'
import { resolveBuild } from './build/resolve.js'

// 注册项 → 最终文件包的解析器（贴图图集 / 自定义组件脚本与索引都在这里完成）。
// 优先级 -100 = 最后兜底；`@sapdon/core` 之外的包可以用更高的 priority 先认领自己的条目。
addPacketResolver(({ entries, ctx }) => resolveBuild(entries, ctx), { priority: -100 })

export * from './addon/index.js'
export * from './biome/index.js'
export * from './block/index.js'
export * from './entity/index.js'
export * from './factory/index.js'
export * from './feature/index.js'
export * from './feature-rule/index.js'
export * from './item/index.js'
// v4：UI 独立为 @sapdon/ui，core 不再 re-export。
// 迁移：`import { Label, SapdonFormUI, ... } from '@sapdon/core'` → `from '@sapdon/ui'`。
export * from './texture.js'
export * from '../utils/index.js'
// `GRegistry` 同时导出：框架没有专属工厂的数据（`loot_tables` / `trading` / `dialogue` …）
// 用它落一份原始 JSON。`register(name, root, path, data)`：`root` = `"behavior" | "resource"`，
// 产物落在 `dev/<proj>_BP|_RP/<path>/<name>.json`。
// ⚠️ 每注册一项，构建日志就多一行 `处理数据:`（`name` 会做文件名安全化处理）。
// `registry.beforeSubmit` / `GRegistry.beforeSubmit`：提交前钩子（插件补标签、追加文件），类型 `BeforeSubmitHook` / `RegistryEntry`。
export * from './registry.js'