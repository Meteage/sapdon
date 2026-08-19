import { registry } from '@sapdon/core'

// 仅保留 mfx（Molang 粒子家族）：脚本只生成初始形状，粒子由 Molang/发射器自移动。
// 通过 `/sapdon:mfx <preset>` 触发，不再依赖脚本轨迹/演示物品。

registry.submit()