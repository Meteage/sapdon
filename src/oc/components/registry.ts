import { system } from '@minecraft/server'
import type { BlockCustomComponent, ItemCustomComponent, StartupEvent } from '@minecraft/server'

/**
 * 自定义组件的**运行期注册**入口（路线 B：直接用 `system.beforeEvents.startup`）。
 *
 * ## 为什么需要它
 * 手写样板很容易把时机写错 —— 用 `world.beforeEvents.worldInitialize` 注册会太晚，
 * 表现为启动时 `this component was found in the input, but is not present in the Schema`
 * （方块 JSON 里写着 `"fz:xxx": {}`，但脚本没在正确时机注册）。
 * 本模块把**时机交给框架**：你只管在运行时脚本里声明 id + handler，
 * 框架保证在 `system.beforeEvents.startup` → `init.blockComponentRegistry/…registerCustomComponent()` 注册。
 *
 * ## 与路线 A（`BlockCustomComponentBuilder` + 生成的 `scripts/custom_components/*.js`）的分工
 * | | 路线 A：`BlockCustomComponentBuilder` | **路线 B：本模块（推荐）** |
 * |---|---|---|
 * | 声明位置 | 构建期（`main.ts`） | 运行期（`scripts/`，随脚本打包） |
 * | handler | **序列化成源码**（`handler.toString()`） | **就是普通闭包** |
 * | 能否 import 共享模块 | ❌ 生成的源码里只有调用、没有定义 → `ReferenceError` | ✅ 与 `MachineBase` 等同处一个 bundle |
 * | 时机 | CLI 生成 `index.js` 注册（见 load.js） | 框架内建 `system.beforeEvents.startup` |
 * | 兼容性 | `build()` / `generateRuntimeCode()` 签名不变，老项目照旧 | 新增 |
 *
 * ⚠️ **同一个组件 id 不要同时用两条路线注册**。
 * ⚠️ 必须在**脚本模块加载期**调用（顶层语句，或顶层 `import` 的模块里）。
 *    启动完成后再调用会被本模块**抛出**（那时已经没有注册时机了 —— 宁可炸也不静默）。
 *
 * ## 框架内置组件的「兜底」注册（`registerFallbackBlockComponent`）
 *
 * 框架自己也有需要注册的内置组件（目前是 `sapdon:block_with_entity`，
 * `TileBlock` 会给每个带实体方块挂上它）。它与「项目也注册了同一个 id」的关系是：
 *
 * | 场景 | 结果 |
 * |---|---|
 * | 项目**没有**注册该 id | 内置实现**生效**（`registerBuiltinComponents()` 的默认路径） |
 * | 项目**注册了**该 id（历史项目手工注册 / 需要模式 B 或自定义交互） | **项目实现生效**，内置实现被跳过 + 一条 warn（**不是错误**） |
 * | 项目**重复**注册同一个 id（自己注册两次） | 仍然**抛错**（这条守卫不变） |
 *
 * 为什么不是「同 id 就抛错」：`sapdon:block_with_entity` 是框架**自己**挂上去的组件，
 * 项目注册它属于**历史必然**（在该组件被内置之前，不注册的方块会被引擎整份丢掉）。
 * 抛错 = 每个这样的项目升级框架后**开不了机**。
 *
 * 为什么不是「内置的直接覆盖项目的」：那会**静默改掉项目行为**
 * （例如 `examples/mob_chest` 的实现在 `onPlace` 里会把状态切到 1 变成透明方块，
 * 而内置实现刻意不切 —— 覆盖过去 = 机器从世界里消失）。
 *
 * 判定**发生在 `system.beforeEvents.startup` 回调里**（不是登记的瞬间）：
 * 项目的注册代码与 `registerBuiltinComponents()` 的调用先后顺序无法约定，
 * 只有等**所有模块加载完**才能知道「这个 id 到底有没有被项目认领」。
 *
 * @example
 * ```ts
 * // scripts/index.ts —— 运行期脚本
 * import { registerBlockComponent, registerItemComponent } from '@sapdon/runtime'
 * import { machineTick } from './machine/base.js'   // 共享逻辑可以直接 import
 *
 * registerBlockComponent('fz:machine', { onTick: machineTick })
 * registerItemComponent('fz:guide_book', { onUse: (e) => { ... } })
 * ```
 */

/** `minecraft:block` 自定义组件支持的事件名（@minecraft/server 2.x；未知名字只警告不阻断） */
const BLOCK_EVENTS = [
    // 2.x 名称
    'onBlockStateChange', 'onBreak', 'onEntity', 'onEntityFallOn', 'onPlace', 'onPlayerBreak',
    'onPlayerInteract', 'onRandomTick', 'onRedstoneUpdate', 'onStepOff', 'onStepOn', 'onTick',
    // 旧版名称（1.x 有过 beforeOnPlayerPlace），保留以免误报
    'beforeOnPlayerPlace',
]

/** `minecraft:item` 自定义组件支持的事件名（@minecraft/server 2.x） */
const ITEM_EVENTS = [
    'onBeforeDurabilityDamage', 'onCompleteUse', 'onConsume', 'onHitEntity', 'onMineBlock', 'onUse', 'onUseOn',
]

function assertHandlers(kind: 'block' | 'item', id: string, handlers: unknown, known: string[]): void {
    if (!id || typeof id !== 'string') {
        throw new Error(`register${kind === 'block' ? 'Block' : 'Item'}Component: id 必须是非空字符串`)
    }
    if (typeof handlers !== 'object' || handlers === null || Array.isArray(handlers)) {
        throw new Error(`register${kind === 'block' ? 'Block' : 'Item'}Component("${id}"): handlers 必须是对象`)
    }
    const names = Object.keys(handlers)
    if (names.length === 0) {
        throw new Error(`register${kind === 'block' ? 'Block' : 'Item'}Component("${id}"): handlers 不能为空对象`)
    }
    for (const name of names) {
        const fn = (handlers as Record<string, unknown>)[name]
        if (typeof fn !== 'function') {
            throw new Error(`register${kind === 'block' ? 'Block' : 'Item'}Component("${id}"): handler "${name}" 不是函数`)
        }
        // 只警告：引擎新增事件名时不该被框架挡住
        if (!known.includes(name)) {
            console.warn(
                `[sapdon] 组件 "${id}" 的 handler "${name}" 不在已知的${kind === 'block' ? '方块' : '物品'}事件里，` +
                `可能是拼写错误。已知：${known.join(', ')}`
            )
        }
    }
}

const BLOCK_REGISTRY_NAMES = new Set<string>()
const ITEM_REGISTRY_NAMES = new Set<string>()
/** **兜底**（框架内置）组件的 id —— 与项目注册**分账**，互不占用对方的「已注册」名额 */
const BLOCK_FALLBACK_NAMES = new Set<string>()
const ITEM_FALLBACK_NAMES = new Set<string>()

interface QueueEntry {
    kind: 'block' | 'item'
    id: string
    handlers: BlockCustomComponent | ItemCustomComponent
}

/** 项目注册的组件（先注册） */
const queue: QueueEntry[] = []
/**
 * 框架内置的**兜底**组件（后注册，且只在该 id 没有被项目认领时）。
 *
 * 两条队列必须分开：`queue` 的重复 id 是**错误**（用户写重了），
 * `fallbackQueue` 的重复 id 只是**冗余**（`registerBuiltinComponents()` 被调了两次）。
 */
const fallbackQueue: QueueEntry[] = []
let subscriberInstalled = false
let startupPassed = false
/** 已成功注册的组件（诊断用） */
const registered: string[] = []
/** 因「项目已注册同 id」而被跳过的内置组件（诊断用，形如 `block:sapdon:block_with_entity`） */
const skippedFallbacks: string[] = []

function installStartupSubscriber(): void {
    if (subscriberInstalled) return
    subscriberInstalled = true

    // 不静默降级到 world.beforeEvents.worldInitialize（太晚会报 not present in the Schema）
    const signal = (system as unknown as { beforeEvents?: { startup?: { subscribe?: (cb: (init: StartupEvent) => void) => void } } })
        ?.beforeEvents?.startup
    if (!signal || typeof signal.subscribe !== 'function') {
        throw new Error(
            '[sapdon] 当前 @minecraft/server 没有 system.beforeEvents.startup，无法保证自定义组件的注册时机。\n' +
            '请把 build.config 的 dependencies 里 @minecraft/server 升级到 2.x；' +
            '或改用构建期路线 A（BlockCustomComponentBuilder + CLI 生成的 scripts/custom_components/index.js）。'
        )
    }

    signal.subscribe((init) => {
        startupPassed = true
        // ★ 绝不吞异常：注册失败（id 拼错 / 方块 JSON 里没声明该组件）必须炸出来，
        //   否则症状是「游戏里右键毫无反应」，极难定位。
        for (const entry of queue) {
            registerNow(init, entry)
        }
        queue.length = 0

        // ★ 兜底：只在项目**没有**认领同一 id 时才注册（判定必须在此刻做，见文件头注释）。
        for (const entry of fallbackQueue) {
            const claimed = entry.kind === 'block' ? BLOCK_REGISTRY_NAMES : ITEM_REGISTRY_NAMES
            if (claimed.has(entry.id)) {
                const tag = `${entry.kind}:${entry.id}`
                skippedFallbacks.push(tag)
                console.warn(
                    `[sapdon] 内置组件 "${tag}" 已由项目注册 —— 跳过框架内置实现，**项目的实现生效**。` +
                    `（这是正常的，不是错误：项目实现取代内置实现。）`
                )
                continue
            }
            registerNow(init, entry)
        }
        fallbackQueue.length = 0
    })
}

/** 真正提交给引擎（唯一一处调用 `registerCustomComponent` 的地方） */
function registerNow(init: StartupEvent, entry: QueueEntry): void {
    const registry = entry.kind === 'block' ? init.blockComponentRegistry : init.itemComponentRegistry
    registry.registerCustomComponent(entry.id, entry.handlers as never)
    registered.push(`${entry.kind}:${entry.id}`)
}

function enqueue(kind: 'block' | 'item', id: string, handlers: object, fallback = false): void {
    if (startupPassed) {
        throw new Error(
            `[sapdon] 自定义组件 "${id}" 注册得太晚：system.beforeEvents.startup 已经触发过了。\n` +
            '组件只能在脚本**模块加载期**声明（顶层语句）。请把 registerBlockComponent/registerItemComponent ' +
            '移到脚本顶层，不要在事件回调/定时器里调用。'
        )
    }
    if (fallback) {
        // 兜底登记是**幂等**的：registerBuiltinComponents() 被重复调用不该炸
        const seen = kind === 'block' ? BLOCK_FALLBACK_NAMES : ITEM_FALLBACK_NAMES
        if (seen.has(id)) return
        seen.add(id)
        installStartupSubscriber()
        fallbackQueue.push({ kind, id, handlers: handlers as BlockCustomComponent | ItemCustomComponent })
        return
    }
    const names = kind === 'block' ? BLOCK_REGISTRY_NAMES : ITEM_REGISTRY_NAMES
    if (names.has(id)) {
        throw new Error(`[sapdon] 自定义组件 "${id}" 被重复注册（同一个 id 只能用一条路线注册一次）`)
    }
    names.add(id)
    installStartupSubscriber()
    queue.push({ kind, id, handlers: handlers as BlockCustomComponent | ItemCustomComponent })
}

/**
 * 注册方块自定义组件（自动保证 `system.beforeEvents.startup` 时机）。
 * 在方块 JSON 里仍须用 `BlockComponent.setCustomComponents(['<id>'])` 声明同名组件。
 */
export function registerBlockComponent(id: string, handlers: BlockCustomComponent): void {
    assertHandlers('block', id, handlers, BLOCK_EVENTS)
    enqueue('block', id, handlers)
}

/**
 * 注册物品自定义组件（自动保证 `system.beforeEvents.startup` 时机）。
 * ⚠️ 物品要能触发 `onUse`，还必须在物品上声明 `minecraft:interact_button`（见 AGENTS.md）。
 */
export function registerItemComponent(id: string, handlers: ItemCustomComponent): void {
    assertHandlers('item', id, handlers, ITEM_EVENTS)
    enqueue('item', id, handlers)
}

/**
 * 注册**框架内置的兜底**方块自定义组件：只有当项目**没有**自己注册同一 id 时才真正注册。
 *
 * 语义（判定发生在 `system.beforeEvents.startup`，见文件头注释）：
 * - 项目没注册该 id → 内置实现生效；
 * - 项目注册了该 id → **项目实现生效**，内置实现被跳过，并打一条 warn（不是错误）；
 * - 重复登记同一个内置 id（`registerBuiltinComponents()` 被调两次）→ **幂等**，只算一次。
 *
 * ⚠️ 与 `registerBlockComponent` 的差别只有「撞 id 时的方向」：
 * 前者是「项目说了算」，后者是「项目之间重复 = 编程错误 → 抛」。
 * 框架内置组件必须用本函数，否则每一个在历史上手工注册过该 id 的项目升级后都会开不了机。
 *
 * @param id 组件 id，必须与方块 JSON 里写的那个键完全相同
 * @param handlers 处理器对象（与 `registerBlockComponent` 同一套事件名）
 */
export function registerFallbackBlockComponent(id: string, handlers: BlockCustomComponent): void {
    assertHandlers('block', id, handlers, BLOCK_EVENTS)
    enqueue('block', id, handlers, true)
}

/** 物品侧的兜底注册（与 `registerFallbackBlockComponent` 语义完全一致，见其注释） */
export function registerFallbackItemComponent(id: string, handlers: ItemCustomComponent): void {
    assertHandlers('item', id, handlers, ITEM_EVENTS)
    enqueue('item', id, handlers, true)
}

/** 已排队但尚未注册的组件数（启动前 > 0 属正常；不含框架兜底组件） */
export function pendingComponentCount(): number {
    return queue.length
}

/** 已成功注册的组件列表（形如 `block:fz:machine`），用于运行期自检 */
export function registeredComponents(): string[] {
    return [...registered]
}

/**
 * 因「项目已注册同 id」而被跳过的**内置兜底**组件列表（形如 `block:sapdon:block_with_entity`）。
 *
 * 用途：运行期自检时区分「内置实现生效」与「项目实现生效」
 * （两者都正常，但排查「方块行为不对」时第一个要看的就是它）。
 */
export function skippedFallbackComponents(): string[] {
    return [...skippedFallbacks]
}
