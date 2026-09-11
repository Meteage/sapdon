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

interface QueueEntry {
    kind: 'block' | 'item'
    id: string
    handlers: BlockCustomComponent | ItemCustomComponent
}

const queue: QueueEntry[] = []
let subscriberInstalled = false
let startupPassed = false
/** 已成功注册的组件（诊断用） */
const registered: string[] = []

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
            const registry = entry.kind === 'block' ? init.blockComponentRegistry : init.itemComponentRegistry
            registry.registerCustomComponent(entry.id, entry.handlers as never)
            registered.push(`${entry.kind}:${entry.id}`)
        }
        queue.length = 0
    })
}

function enqueue(kind: 'block' | 'item', id: string, handlers: object): void {
    if (startupPassed) {
        throw new Error(
            `[sapdon] 自定义组件 "${id}" 注册得太晚：system.beforeEvents.startup 已经触发过了。\n` +
            '组件只能在脚本**模块加载期**声明（顶层语句）。请把 registerBlockComponent/registerItemComponent ' +
            '移到脚本顶层，不要在事件回调/定时器里调用。'
        )
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

/** 已排队但尚未注册的组件数（启动前 > 0 属正常） */
export function pendingComponentCount(): number {
    return queue.length
}

/** 已成功注册的组件列表（形如 `block:fz:machine`），用于运行期自检 */
export function registeredComponents(): string[] {
    return [...registered]
}
