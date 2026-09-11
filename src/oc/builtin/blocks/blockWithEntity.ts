import type { Block, BlockComponentOnPlaceEvent, BlockCustomComponent } from "@minecraft/server"

/**
 * `sapdon:block_with_entity` —— **带实体方块**（`BlockAPI.createTileBlock`）的承载实体生命周期。
 *
 * ## 为什么框架必须自己实现它
 *
 * `TileBlock` 的构造会给方块挂上这个自定义组件
 * （`src/core/block/tileBlock.js:184` → `BlockComponent.setCustomComponents(["sapdon:block_with_entity"])`）
 * ⇒ **每一个**用 `createTileBlock` 的方块，其 BP 方块 JSON 的 `components` 里都有
 * `"sapdon:block_with_entity": {}`。
 *
 * 而自定义组件**必须在 `system.beforeEvents.startup` 里注册**（见 `doc/dev/known-pitfalls.md` §2.1）。
 * 在 2026-09 之前，框架自己**从不注册**这个 id（`registerBuiltinComponents()` 只有 5 个：
 * crop_growth / fallingblock / head_rotation / intercardinal_orientation / guibook），
 * 于是**忘了手工注册的项目会整份方块被引擎丢掉**（不是局部报错）：
 * ```
 * -> components -> sapdon:block_with_entity: this component was found in the input,
 *    but is not present in the Schema
 * ```
 * 现在它进了 `registerBuiltinComponents()`，但走的是**兜底**通道
 * （`registerFallbackBlockComponent`）：项目若自己注册了同一个 id（历史做法 / 需要自定义交互），
 * **以项目实现为准**，内置实现被跳过 —— 见 `src/oc/components/registry.ts` 的注释。
 *
 * ## ★ 内置实现刻意只做一件事：`onPlace` 里 spawn 承载实体
 *
 * 本实现是**模式 A（隐形载体）**：
 *
 * | 做 | 不做 |
 * |---|---|
 * | 在方块中心 spawn `${block.typeId}_entity`；已有同种实体则跳过（防重复） | **不切** `sapdon:block_or_entity` 状态 |
 *
 * **为什么不切状态**：切到 `1` 会命中 `TileBlock` 构造里那条 permutation
 * （`geometry.cube` + 贴图 `none`）——方块**变透明**、外观完全交给实体。
 * 那是「模式 B」，要求实体同时挂几何 / 贴图 / 渲染控制器 / 动画（见
 * `examples/mob_chest` 的 `main.mjs`）。框架**无权替项目决定**要不要走这条路：
 * 对只想「方块照旧渲染 + 背后挂个容器」的项目（FZ 的机器就是这一类），
 * 切透明 = 机器从世界里消失。需要模式 B 的项目自己注册这个 id 即可。
 *
 * ## 为什么没有 `onPlayerInteract`
 *
 * 容器界面是**引擎原生**开的（`@minecraft/server` 至今没有任何「给玩家打开容器」的 API）。
 * `examples/mob_chest` 的 `onPlayerInteract` 只做 `mob_chest:chest_state` 的动画开关，
 * **不负责打开界面**（见 `examples/mob_chest/scripts/custom_components/block/block_with_entity.js:26-47`）
 * ⇒ 内置实现**不需要**它；多注册一个 handler 只会多一份「方块是否变成可交互」的未知影响。
 *
 * ## 破坏方块时的清理不在这里
 *
 * 承载实体的 despawn 由 `TileBlock` 挂的 `minecraft:block_sensor`
 * （`tileBlock.js:202-212`，`sensor_radius: 1`、`block_list: [方块自身]`、
 * `on_block_broken: despawn_event` → `item_despawn` 组 → `instant_despawn`）负责。
 * 这里再写一遍 `onPlayerBreak` 只会制造第二条语义。
 *
 * ⚠️ **游戏内结果一律未验证**（本环境无法启动 Minecraft）：实体是否真的落在方块底部、
 * 容器能否右键打开、`block_sensor` 是否真的不留幽灵实体，都只能真机确认。
 */

/**
 * 内置组件 id。
 *
 * ⚠️ 这个字符串在**两处**出现，且**不能**合并成一次 import：
 * `src/core/block/tileBlock.js:184`（`@sapdon/core`，构建期）也写着同一个字面量，
 * 而 `@sapdon/core` 被 `src/cli/build.js` 的 rollupIgnores 列为 external
 * ⇒ core **不能** import `@sapdon/runtime`（分层铁律，见 AGENTS.md）。
 * 两边各写一份 + 双向注释指路是这块唯一可行的做法；
 * 改 id 时必须同时改 `tileBlock.js:184` 与 `src/core/factory/blockFactory.js` 的文档。
 */
export const BLOCK_WITH_ENTITY_ID = "sapdon:block_with_entity"

/**
 * 承载实体的脚底相对**方块中心**的偏移。
 *
 * `block.center()` 返回 `(x+0.5, y+0.5, z+0.5)`；减 `0.5` ⇒ 实体的脚底贴在**方块底面**上。
 * 取值出处：`examples/mob_chest/scripts/custom_components/block/block_with_entity.js:10-14`
 * （已知可用的形状）。
 */
export const CARRIER_FOOT_OFFSET = 0.5

/** `ns:foo` → `ns:foo_entity`（与 `TileBlock` 里 `new Entity(\`${identifier}_entity\`, …)` 同规则） */
export function carrierEntityIdOf(blockTypeId: string): string {
    return `${blockTypeId}_entity`
}

/**
 * 该坐标是否已经有同种承载实体。
 *
 * @returns `true` 已有 / `false` 确定没有 / `undefined` **读不出来**（区块未加载、实体失效……）
 *
 * ⚠️ 三值返回是刻意的：读失败时**不能**当成「没有」去 spawn ——
 * 两个承载实体 = 两个容器 = 物品可以复制。调用方在 `undefined` 时**跳过 spawn**。
 */
function carrierStateAt(block: Block, entityTypeId: string): boolean | undefined {
    let entities
    try {
        entities = block.dimension.getEntitiesAtBlockLocation(block.location)
    } catch (e) {
        console.warn(
            `[sapdon] block_with_entity: 读 ${block.typeId} ` +
            `@${block.location.x},${block.location.y},${block.location.z} 的实体失败，` +
            `本次不 spawn 承载实体（宁可没有容器，也不要两个容器）`, e
        )
        return undefined
    }
    for (const entity of entities) {
        try {
            if (entity.typeId === entityTypeId) return true
        } catch {
            // 实体取 typeId 抛错 = 已失效；当成不匹配，继续看下一个
        }
    }
    return false
}

/**
 * 放下方块时 spawn 承载实体。
 *
 * 触发时机：**放置**，以及**任何 permuation 变化之后**
 * （`setPermutation` 也会走到这里；`TileBlock` 自带的状态切换、
 * 项目自己的 `fz:act_state` / `mob_chest:chest_state` 都算）⇒ 必须先查重再 spawn。
 */
function onPlace(event: BlockComponentOnPlaceEvent): void {
    const block = event.block
    try {
        const entityTypeId = carrierEntityIdOf(block.typeId)
        const existing = carrierStateAt(block, entityTypeId)
        if (existing !== false) return

        const center = block.center()
        const position = {
            x: center.x,
            y: center.y - CARRIER_FOOT_OFFSET,
            z: center.z,
        }
        try {
            block.dimension.spawnEntity(entityTypeId, position)
        } catch (e) {
            // ★ 绝不静默：spawn 失败必须留痕（症状是「方块在，容器打不开」，极难定位）
            console.warn(
                `[sapdon] block_with_entity: spawnEntity("${entityTypeId}") 失败` +
                `（${block.typeId} @${block.location.x},${block.location.y},${block.location.z}）。` +
                `请确认 ${entityTypeId} 的**行为**文件存在（createTileBlock 会生成 entities/${entityTypeId.replace(":", "_")}.json）`, e
            )
        }
    } catch (e) {
        console.warn(`[sapdon] block_with_entity.onPlace @${block?.typeId ?? "?"}`, e)
    }
}

/**
 * `sapdon:block_with_entity` 的**框架内置**处理器（模式 A：只 spawn，不改状态）。
 *
 * 项目注册同名 id 时本处理器会被**整体跳过**（`registerFallbackBlockComponent` 的兜底语义），
 * 需要模式 B（切透明 + 实体接管外观）或自定义交互的项目请照旧自己注册。
 */
export const BlockWithEntityComponent: BlockCustomComponent = {
    onPlace,
}
