/**
 * 多方块结构 —— 运行期层（`@sapdon/runtime`）。
 *
 * 三层：图案（`pattern.ts`，纯逻辑）→ 触发器（本文件，把基岩版事件的坑收在框架里）→ 行为（回调 + 常用动作 + 成形结构生命周期）。
 *
 * | 触发器 | 事件 | 框架处理 |
 * |---|---|---|
 * | `interact` | `world.beforeEvents.playerInteractWithBlock` | `isFirstEvent` 去重；可取消原版行为；回调推迟到下一 tick（before 事件里不能改世界） |
 * | `useItem` | 物品自定义组件 `onUseOn` | 自动注册组件；物品 JSON 里挂上组件 id 即可 |
 * | `place` | `world.afterEvents.playerPlaceBlock` | 刚放下的方块可能是任意一格 → 反推匹配 |
 * | `redstone` | 按钮 / 拉杆 / 压力板 / 标靶 / 绊线 | 只认「上升沿」：拉杆打开、压力板从 0 变为有信号 |
 * | `itemInside` | `world.afterEvents.entitySpawn` + 轮询 | 只跟踪通过物品过滤的新掉落物、只跟踪有限时间 |
 * | `explosion` | `world.beforeEvents.explosion` | 同步把受保护方块移出受影响列表，回调推迟到下一 tick |
 * | `projectile` | `world.afterEvents.projectileHitBlock` | 按投掷物类型过滤 |
 * | `lightning` | `world.afterEvents.entitySpawn`（`minecraft:lightning_bolt`） | 检查落点及其下方一格 |
 *
 * 其余任何时机：直接调用 `Multiblocks.check / find / findAll`（手动触发）。
 */
import {
    BlockPermutation, GameMode, ItemStack, system, world,
    type Block, type Dimension, type Entity, type Player, type Vector3,
} from '@minecraft/server'
import { registerItemComponent } from '../components/registry.js'
import {
    type BlockPredicate, type BlockProbe, type BlockReader, type MatchResult, type Orientation, type PartialMatch, type PatternSpec, type BlockPos,
    MultiblockPattern,
} from './pattern.js'

export * from './pattern.js'

// ───────────────────────────── 读世界 ─────────────────────────────

function probeOf(block: Block | undefined): BlockProbe | undefined {
    if (!block) return undefined
    return {
        typeId: block.typeId,
        states: () => block.permutation.getAllStates() as Record<string, string | number | boolean>,
        tags: () => block.getTags(),
    }
}

function blockAt(dimension: Dimension, pos: BlockPos): Block | undefined {
    try {
        return dimension.getBlock(pos)
    } catch {
        return undefined
    }
}

function readerFor(dimension: Dimension): BlockReader {
    return (pos) => probeOf(blockAt(dimension, pos))
}

const floorPos = (v: Vector3): BlockPos => ({ x: Math.floor(v.x), y: Math.floor(v.y), z: Math.floor(v.z) })
const center = (v: BlockPos): Vector3 => ({ x: v.x + 0.5, y: v.y + 0.5, z: v.z + 0.5 })
const posKey = (dimensionId: string, p: BlockPos) => `${dimensionId}|${p.x}|${p.y}|${p.z}`

function safely(label: string, fn: () => void): void {
    try {
        fn()
    } catch (error) {
        console.error(`[sapdon:multiblock] ${label} 出错：${(error as Error)?.stack ?? error}`)
    }
}

// ───────────────────────────── 定义 ─────────────────────────────

export interface FormedOptions<D = Record<string, unknown>> {
    /** onTick 间隔（tick），默认 20 */
    interval?: number
    /** 每隔多少 tick 重新校验一次结构（捕捉命令 / 末影人 / 火等非玩家改动），默认 100；0 = 只靠事件 */
    revalidateInterval?: number
    /** 每个间隔调用一次（只在锚点所在区块已加载时） */
    onTick?: (instance: FormedInstance<D>) => void
    /** 解体时调用：`broken`（结构被破坏）/ `unformed`（代码主动解体） */
    onBreak?: (instance: FormedInstance<D>, reason: 'broken' | 'unformed') => void
    /** 进入世界、从存档恢复时调用 */
    onLoad?: (instance: FormedInstance<D>) => void
    /**
     * 自定义完整性检查（缺省 = 按原图案 `instance.validate()`）。
     * ⚠️ 成形后会改动**自身**方块的结构（例如把金块换成别的方块）必须提供，否则下一次校验会判定结构被破坏。
     * 常见写法：`(inst) => inst.validate({ G: Is.block('minecraft:gold_block', 'minecraft:crying_obsidian') })`
     */
    intact?: (instance: FormedInstance<D>) => boolean | undefined
}

export interface MultiblockSpec<D = Record<string, unknown>> extends PatternSpec {
    /** 提供则为「成形结构」：`ctx.form()` 之后持久存在，带生命周期 */
    formed?: FormedOptions<D>
}

export class MultiblockDefinition<D = Record<string, unknown>> {
    readonly pattern: MultiblockPattern
    constructor(readonly id: string, readonly spec: MultiblockSpec<D>) {
        this.pattern = new MultiblockPattern(spec)
    }
}

// ───────────────────────────── 触发器 ─────────────────────────────

export type ItemFilter = string | string[] | ((stack: ItemStack) => boolean)
export type RedstoneKind = 'button' | 'lever' | 'pressurePlate' | 'target' | 'tripwire'

export type TriggerSpec =
    | { kind: 'interact', item?: ItemFilter, cell?: string, cancelVanilla?: boolean, previewOnFail?: boolean }
    | { kind: 'useItem', component: string, cell?: string }
    | { kind: 'place', cell?: string }
    | { kind: 'redstone', kinds?: RedstoneKind[], cell?: string }
    | { kind: 'itemInside', cell: string, item?: ItemFilter, watchSeconds?: number, interval?: number }
    | { kind: 'explosion', blocks?: string[], cell?: string, sources?: string[], protect?: 'cell' | 'structure' | false }
    | { kind: 'projectile', cell?: string, projectiles?: string[] }
    | { kind: 'lightning', cell?: string }

export type TriggerKind = TriggerSpec['kind']

/** 触发器构造器 */
export const Trigger = {
    /** 玩家拿物品（或空手）右键结构。`item` 缺省 = 任意；`cell` 缺省 = 锚点；`previewOnFail` 点到锚点但结构不完整时投影缺的方块 */
    interact: (o: { item?: ItemFilter, cell?: string, cancelVanilla?: boolean, previewOnFail?: boolean } = {}): TriggerSpec => ({ kind: 'interact', ...o }),
    /** 自定义物品右键结构：框架注册物品自定义组件 `component`，物品 JSON 里挂上它 */
    useItem: (o: { component: string, cell?: string }): TriggerSpec => ({ kind: 'useItem', ...o }),
    /** 玩家放下最后一块（任意一格）时成形 */
    place: (o: { cell?: string } = {}): TriggerSpec => ({ kind: 'place', ...o }),
    /** 结构里的按钮 / 拉杆 / 压力板 / 标靶 / 绊线被触发（只认上升沿）；`kinds` 缺省 = 全部 */
    redstone: (o: { kinds?: RedstoneKind[], cell?: string } = {}): TriggerSpec => ({ kind: 'redstone', ...o }),
    /** 掉落物进入结构的某一格（例如水池）。只跟踪通过 `item` 过滤的新掉落物 `watchSeconds` 秒（默认 15），每 `interval` tick（默认 10）检查一次 */
    itemInside: (o: { cell: string, item?: ItemFilter, watchSeconds?: number, interval?: number }): TriggerSpec => ({ kind: 'itemInside', ...o }),
    /** 爆炸波及结构（或不绑定结构时：波及 `blocks` 里的方块）。`protect` 缺省 'cell'：被波及的触发格不会被炸掉 */
    explosion: (o: { blocks?: string[], cell?: string, sources?: string[], protect?: 'cell' | 'structure' | false } = {}): TriggerSpec => ({ kind: 'explosion', ...o }),
    /** 投掷物命中结构 */
    projectile: (o: { cell?: string, projectiles?: string[] } = {}): TriggerSpec => ({ kind: 'projectile', ...o }),
    /** 闪电落在结构上（检查落点与其下方一格） */
    lightning: (o: { cell?: string } = {}): TriggerSpec => ({ kind: 'lightning', ...o }),
}

function itemMatches(filter: ItemFilter | undefined, stack: ItemStack | undefined): boolean {
    if (filter === undefined) return true
    if (!stack) return false
    if (typeof filter === 'function') return filter(stack)
    return (Array.isArray(filter) ? filter : [filter]).includes(stack.typeId)
}

// ───────────────────────────── 上下文与动作 ─────────────────────────────

type Where = BlockPos | string

class Actions {
    constructor(
        readonly dimension: Dimension,
        /** 结构匹配结果；不绑定结构的爆炸触发为 undefined */
        readonly match: MatchResult | undefined,
        protected readonly fallback: BlockPos,
    ) { }

    /** 某个字符的所有格子 */
    positions(char: string): BlockPos[] {
        return this.match?.cells[char] ?? []
    }

    /** 某个字符的所有方块（未加载的跳过） */
    blocks(char: string): Block[] {
        return this.positions(char).map((p) => blockAt(this.dimension, p)).filter((b): b is Block => !!b)
    }

    /** 结构中心（不绑定结构时为触发位置） */
    center(): Vector3 {
        const all = this.match ? Object.values(this.match.cells).flat() : [this.fallback]
        const sum = all.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y, z: a.z + p.z }), { x: 0, y: 0, z: 0 })
        return { x: sum.x / all.length + 0.5, y: sum.y / all.length + 0.5, z: sum.z / all.length + 0.5 }
    }

    private where(at?: Where): Vector3[] {
        if (at === undefined) return [this.center()]
        if (typeof at === 'string') return this.positions(at).map(center)
        return [center(at)]
    }

    /** 把某个字符的所有格子换成方块（id 或 BlockPermutation） */
    replace(char: string, block: string | BlockPermutation): void {
        for (const p of this.positions(char)) this.setBlock(p, block)
    }

    setBlock(pos: BlockPos, block: string | BlockPermutation): void {
        const b = blockAt(this.dimension, pos)
        if (!b) return
        if (typeof block === 'string') b.setType(block)
        else b.setPermutation(block)
    }

    /** 掉落物品（默认在结构中心） */
    drop(item: string | ItemStack, at?: Where, count = 1): void {
        for (const loc of this.where(at)) {
            const stack = typeof item === 'string' ? new ItemStack(item, count) : item
            safely('drop', () => this.dimension.spawnItem(stack, loc))
        }
    }

    particle(effect: string, at?: Where): void {
        for (const loc of this.where(at)) safely('particle', () => this.dimension.spawnParticle(effect, loc))
    }

    sound(soundId: string, at?: Where): void {
        for (const loc of this.where(at)) safely('sound', () => this.dimension.playSound(soundId, loc))
    }

    /** 生成实体（默认在结构中心） */
    spawn(entityId: string, at?: Where): void {
        for (const loc of this.where(at)) safely('spawn', () => this.dimension.spawnEntity(entityId as never, loc))
    }

    /** 放置结构文件（`world.structureManager`），位置为锚点 + offset */
    placeStructure(name: string, offset: BlockPos = { x: 0, y: 0, z: 0 }): void {
        const base = this.match?.anchor ?? this.fallback
        safely('placeStructure', () => world.structureManager.place(name, this.dimension, { x: base.x + offset.x, y: base.y + offset.y, z: base.z + offset.z }))
    }
}

export class MultiblockContext extends Actions {
    readonly trigger: TriggerKind | 'manual'
    readonly definition: MultiblockDefinition<any> | undefined
    /** 触发的方块（点击 / 放置 / 按钮 / 命中 / 被炸 / 被雷劈的那一格） */
    readonly block: Block | undefined
    readonly player: Player | undefined
    readonly itemStack: ItemStack | undefined
    /** itemInside：进入结构的掉落物实体 */
    readonly itemEntity: Entity | undefined
    /** projectile / lightning / explosion：投掷物、闪电、爆炸来源 */
    readonly entity: Entity | undefined
    /** redstone：具体是哪种红石元件 */
    readonly redstone: RedstoneKind | undefined

    constructor(init: {
        trigger: TriggerKind | 'manual', definition?: MultiblockDefinition<any>, dimension: Dimension, match?: MatchResult,
        block?: Block, player?: Player, itemStack?: ItemStack, itemEntity?: Entity, entity?: Entity, redstone?: RedstoneKind, at: BlockPos,
    }) {
        super(init.dimension, init.match, init.at)
        this.trigger = init.trigger
        this.definition = init.definition
        this.block = init.block
        this.player = init.player
        this.itemStack = init.itemStack
        this.itemEntity = init.itemEntity
        this.entity = init.entity
        this.redstone = init.redstone
    }

    /** 不绑定结构的爆炸：把被炸的这一格换成别的方块 */
    convert(block: string | BlockPermutation): void {
        if (this.block) this.setBlock(this.block.location, block)
    }

    /**
     * 消耗触发物品：interact / useItem 消耗玩家手里的（创造模式不消耗），itemInside 消耗掉落物。
     * @returns 是否真的消耗了
     */
    consumeItem(count = 1): boolean {
        if (this.itemEntity) {
            const e = this.itemEntity
            if (!e.isValid) return false
            const stack = e.getComponent('minecraft:item')?.itemStack
            if (!stack) return false
            const loc = e.location
            e.remove()
            if (stack.amount > count) {
                const rest = stack.clone()
                rest.amount = stack.amount - count
                safely('consumeItem', () => this.dimension.spawnItem(rest, loc))
            }
            return true
        }
        const player = this.player
        if (!player) return false
        if (player.getGameMode() === GameMode.Creative) return true
        const container = player.getComponent('minecraft:inventory')?.container
        const slot = player.selectedSlotIndex
        const stack = container?.getItem(slot)
        if (!container || !stack || stack.amount < count) return false
        if (stack.amount === count) container.setItem(slot, undefined)
        else {
            stack.amount -= count
            container.setItem(slot, stack)
        }
        return true
    }

    /** 把这次匹配到的结构登记为「已成形」（定义必须带 `formed`）。已成形则返回现有实例 */
    form<D = Record<string, unknown>>(data?: D): FormedInstance<D> {
        if (!this.definition || !this.match) throw new Error('[sapdon:multiblock] form() 只能用于绑定了结构的触发')
        return formStructure(this.definition, this.dimension, this.match, data ?? ({} as D))
    }
}

export type MultiblockHandler = (ctx: MultiblockContext) => void

// ───────────────────────────── 成形结构 ─────────────────────────────

interface StoredInstance {
    dim: string
    a: [number, number, number]
    f: 0 | 1 | 2 | 3
    m: boolean
    d: unknown
}

export class FormedInstance<D = Record<string, unknown>> extends Actions {
    dirty = false
    private tickHandle: number | undefined
    constructor(
        readonly definition: MultiblockDefinition<D>,
        dimension: Dimension,
        match: MatchResult,
        /** 自定义数据：改完调用 `save()` 才会写进存档 */
        public data: D,
    ) {
        super(dimension, match, match.anchor)
    }

    get anchor(): BlockPos {
        return this.match!.anchor
    }

    get key(): string {
        return posKey(this.dimension.id, this.anchor)
    }

    /** 锚点所在区块是否已加载 */
    isLoaded(): boolean {
        return blockAt(this.dimension, this.anchor) !== undefined
    }

    /**
     * 按成形时的朝向检查结构是否还完整（区块未加载时返回 undefined）。
     * @param overrides 按字符覆盖判断条件（成形后方块会变化时用）
     */
    validate(overrides: Partial<Record<string, BlockPredicate>> = {}): boolean | undefined {
        if (!this.isLoaded()) return undefined
        const pattern = this.definition.pattern
        const read = readerFor(this.dimension)
        const o: Orientation = { facing: this.match!.facing, mirrored: this.match!.mirrored }
        return pattern.layout(this.anchor, o).every((c) => (overrides[c.char] ?? pattern.where[c.char]).test(read(c.pos)))
    }

    /** @internal 按定义的 intact（或原图案）判断 */
    isIntact(): boolean | undefined {
        if (!this.isLoaded()) return undefined
        const custom = this.definition.spec.formed?.intact
        return custom ? custom(this) : this.validate()
    }

    save(): void {
        persist(this.definition)
    }

    /** 主动解体 */
    unform(): void {
        unformStructure(this, 'unformed')
    }

    /** @internal */
    setTickHandle(h: number | undefined): void {
        this.tickHandle = h
    }
}

const formedByDef = new Map<string, Map<string, FormedInstance<any>>>()
const cellIndex = new Map<string, FormedInstance<any>>()
const storageKey = (defId: string) => `sapdon:multiblock:${defId}`

function indexInstance(inst: FormedInstance<any>, add: boolean): void {
    for (const cells of Object.values(inst.match!.cells)) {
        for (const p of cells) {
            const k = posKey(inst.dimension.id, p)
            if (add) cellIndex.set(k, inst)
            else if (cellIndex.get(k) === inst) cellIndex.delete(k)
        }
    }
}

function persist(def: MultiblockDefinition<any>): void {
    const list: StoredInstance[] = [...(formedByDef.get(def.id)?.values() ?? [])].map((i) => ({
        dim: i.dimension.id, a: [i.anchor.x, i.anchor.y, i.anchor.z], f: i.match!.facing, m: i.match!.mirrored, d: i.data,
    }))
    safely('保存成形结构', () => world.setDynamicProperty(storageKey(def.id), list.length ? JSON.stringify(list) : undefined))
}

function formStructure<D>(def: MultiblockDefinition<any>, dimension: Dimension, match: MatchResult, data: D): FormedInstance<D> {
    if (!def.spec.formed) throw new Error(`[sapdon:multiblock] ${def.id} 没有 formed 选项，不能 form()`)
    const map = formedByDef.get(def.id) ?? new Map<string, FormedInstance<any>>()
    formedByDef.set(def.id, map)
    const key = posKey(dimension.id, match.anchor)
    const existing = map.get(key)
    if (existing) return existing
    const inst = new FormedInstance<D>(def as MultiblockDefinition<D>, dimension, match, data)
    map.set(key, inst)
    indexInstance(inst, true)
    persist(def)
    ensureFormedTicker(def)
    ensureInvalidationListeners()
    return inst
}

function unformStructure(inst: FormedInstance<any>, reason: 'broken' | 'unformed'): void {
    const map = formedByDef.get(inst.definition.id)
    if (!map?.delete(inst.key)) return
    indexInstance(inst, false)
    persist(inst.definition)
    safely(`${inst.definition.id} onBreak`, () => inst.definition.spec.formed?.onBreak?.(inst, reason))
}

const tickers = new Set<string>()
function ensureFormedTicker(def: MultiblockDefinition<any>): void {
    if (tickers.has(def.id)) return
    tickers.add(def.id)
    const f = def.spec.formed!
    const interval = Math.max(1, f.interval ?? 20)
    const revalidate = f.revalidateInterval ?? 100
    let elapsed = 0
    system.runInterval(() => {
        elapsed += interval
        const due = revalidate > 0 && elapsed >= revalidate
        if (due) elapsed = 0
        for (const inst of [...(formedByDef.get(def.id)?.values() ?? [])]) {
            if (!inst.isLoaded()) continue
            if (inst.dirty || due) {
                inst.dirty = false
                if (inst.isIntact() === false) {
                    unformStructure(inst, 'broken')
                    continue
                }
            }
            if (f.onTick) safely(`${def.id} onTick`, () => f.onTick!(inst))
        }
    }, interval)
}

let invalidationReady = false
function ensureInvalidationListeners(): void {
    if (invalidationReady) return
    invalidationReady = true
    const touch = (dimension: Dimension, pos: BlockPos) => {
        const inst = cellIndex.get(posKey(dimension.id, floorPos(pos)))
        if (!inst) return
        // 下一 tick 再校验（破坏事件发生时方块可能还在更新中）
        system.run(() => {
            if (inst.isIntact() === false) unformStructure(inst, 'broken')
        })
    }
    world.afterEvents.playerBreakBlock.subscribe((e) => touch(e.dimension, e.block.location))
    world.afterEvents.blockExplode.subscribe((e) => touch(e.dimension, e.block.location))
    world.afterEvents.pistonActivate.subscribe((e) => {
        touch(e.dimension, e.block.location)
        safely('pistonActivate', () => {
            for (const loc of e.piston.getAttachedBlocksLocations()) touch(e.dimension, loc)
        })
    })
}

/** 进入世界后从存档恢复成形结构（第一个 tick 执行；定义必须在脚本顶层完成） */
function restoreFormed(): void {
    for (const def of definitions.values()) {
        if (!def.spec.formed) continue
        let list: StoredInstance[] = []
        safely(`读取 ${def.id} 存档`, () => {
            const raw = world.getDynamicProperty(storageKey(def.id))
            if (typeof raw === 'string') list = JSON.parse(raw)
        })
        for (const s of list) {
            safely(`恢复 ${def.id}`, () => {
                const dimension = world.getDimension(s.dim)
                const anchor = { x: s.a[0], y: s.a[1], z: s.a[2] }
                const layout = def.pattern.layout(anchor, { facing: s.f, mirrored: s.m })
                const cells: Record<string, BlockPos[]> = {}
                for (const c of layout) (cells[c.char] ??= []).push(c.pos)
                const map = formedByDef.get(def.id) ?? new Map()
                formedByDef.set(def.id, map)
                const inst = new FormedInstance(def, dimension, { anchor, facing: s.f, mirrored: s.m, cells }, s.d as Record<string, unknown>)
                inst.dirty = true // 恢复后第一次 tick 先校验
                map.set(inst.key, inst)
                indexInstance(inst, true)
                def.spec.formed!.onLoad?.(inst)
            })
        }
        if (list.length) {
            ensureFormedTicker(def)
            ensureInvalidationListeners()
        }
    }
}

// ───────────────────────────── 注册与分发 ─────────────────────────────

interface Registration {
    def: MultiblockDefinition<any> | undefined
    trigger: TriggerSpec
    handler: MultiblockHandler
}

const definitions = new Map<string, MultiblockDefinition<any>>()
const registrations = new Map<TriggerKind, Registration[]>()
const subscribed = new Set<string>()
let restoreScheduled = false

function regs(kind: TriggerKind): Registration[] {
    return registrations.get(kind) ?? []
}

function run(reg: Registration, ctx: MultiblockContext): void {
    safely(`${reg.def?.id ?? '（无结构）'} 的 ${reg.trigger.kind} 回调`, () => reg.handler(ctx))
}

/** 在触发格上反推匹配：`cell` 指定时只把触发方块当作该字符的格子 */
function matchFor(reg: Registration, dimension: Dimension, pos: BlockPos): MatchResult | undefined {
    if (!reg.def) return undefined
    const cell = (reg.trigger as { cell?: string }).cell
    return reg.def.pattern.matchContaining(pos, readerFor(dimension), cell ? [cell] : undefined)
}

function subscribeOnce(key: string, setup: () => void): void {
    if (subscribed.has(key)) return
    subscribed.add(key)
    setup()
}

function install(kind: TriggerKind, trigger: TriggerSpec, reg: Registration): void {
    switch (kind) {
        case 'interact': return subscribeOnce('interact', () => {
            world.beforeEvents.playerInteractWithBlock.subscribe((e) => {
                if (!e.isFirstEvent) return
                const dimension = e.block.dimension
                const pos = e.block.location
                for (const r of regs('interact')) {
                    const t = r.trigger as Extract<TriggerSpec, { kind: 'interact' }>
                    if (!itemMatches(t.item, e.itemStack)) continue
                    const match = matchFor(r, dimension, pos)
                    if (!match) {
                        if (t.previewOnFail && r.def && r.def.pattern.where[r.def.pattern.anchorChar].test(probeOf(e.block))) {
                            const def = r.def
                            const player = e.player
                            system.run(() => {
                                const partial = Multiblocks.preview(def, dimension, pos)
                                safely('提示', () => player.sendMessage(`§e${def.id}：还差 ${partial.missing.length} / ${partial.total} 个方块（已用粒子标出）`))
                            })
                        }
                        continue
                    }
                    if (t.cancelVanilla) e.cancel = true
                    const block = e.block
                    const player = e.player
                    const itemStack = e.itemStack
                    system.run(() => run(r, new MultiblockContext({ trigger: 'interact', definition: r.def, dimension, match, block, player, itemStack, at: pos })))
                    return
                }
            })
        })
        case 'useItem': {
            const component = (trigger as Extract<TriggerSpec, { kind: 'useItem' }>).component
            return subscribeOnce(`useItem:${component}`, () => {
                registerItemComponent(component, {
                    onUseOn(e) {
                        const player = e.source?.typeId === 'minecraft:player' ? e.source as Player : undefined
                        const dimension = e.block.dimension
                        const pos = e.block.location
                        for (const r of regs('useItem')) {
                            if ((r.trigger as Extract<TriggerSpec, { kind: 'useItem' }>).component !== component) continue
                            const match = matchFor(r, dimension, pos)
                            if (!match) continue
                            run(r, new MultiblockContext({ trigger: 'useItem', definition: r.def, dimension, match, block: e.block, player, itemStack: e.itemStack, at: pos }))
                            return
                        }
                    },
                })
            })
        }
        case 'place': return subscribeOnce('place', () => {
            world.afterEvents.playerPlaceBlock.subscribe((e) => {
                for (const r of regs('place')) {
                    const match = matchFor(r, e.dimension, e.block.location)
                    if (!match) continue
                    run(r, new MultiblockContext({ trigger: 'place', definition: r.def, dimension: e.dimension, match, block: e.block, player: e.player, at: e.block.location }))
                    return
                }
            })
        })
        case 'redstone': return subscribeOnce('redstone', () => {
            const dispatch = (kind: RedstoneKind, dimension: Dimension, block: Block, player?: Player, entity?: Entity) => {
                for (const r of regs('redstone')) {
                    const kinds = (r.trigger as Extract<TriggerSpec, { kind: 'redstone' }>).kinds
                    if (kinds && !kinds.includes(kind)) continue
                    const match = matchFor(r, dimension, block.location)
                    if (!match) continue
                    run(r, new MultiblockContext({ trigger: 'redstone', definition: r.def, dimension, match, block, player, entity, redstone: kind, at: block.location }))
                    return
                }
            }
            const asPlayer = (e: Entity | undefined) => (e?.typeId === 'minecraft:player' ? e as Player : undefined)
            world.afterEvents.buttonPush.subscribe((e) => dispatch('button', e.dimension, e.block, asPlayer(e.source), e.source))
            world.afterEvents.leverAction.subscribe((e) => { if (e.isPowered) dispatch('lever', e.dimension, e.block, e.player) })
            world.afterEvents.pressurePlatePush.subscribe((e) => {
                if (e.previousRedstonePower === 0 && e.redstonePower > 0) dispatch('pressurePlate', e.dimension, e.block, asPlayer(e.source), e.source)
            })
            world.afterEvents.targetBlockHit.subscribe((e) => dispatch('target', e.dimension, e.block, undefined, e.source))
            world.afterEvents.tripWireTrip.subscribe((e) => { if (e.isPowered) dispatch('tripwire', e.dimension, e.block, asPlayer(e.sources[0]), e.sources[0]) })
        })
        case 'itemInside': return subscribeOnce('itemInside', installItemInside)
        case 'explosion': return subscribeOnce('explosion', installExplosion)
        case 'projectile': return subscribeOnce('projectile', () => {
            world.afterEvents.projectileHitBlock.subscribe((e) => {
                const hit = e.getBlockHit()
                const block = hit.block
                for (const r of regs('projectile')) {
                    const types = (r.trigger as Extract<TriggerSpec, { kind: 'projectile' }>).projectiles
                    if (types && !types.includes(e.projectile.typeId)) continue
                    const match = matchFor(r, e.dimension, block.location)
                    if (!match) continue
                    const shooter = e.source?.typeId === 'minecraft:player' ? e.source as Player : undefined
                    run(r, new MultiblockContext({ trigger: 'projectile', definition: r.def, dimension: e.dimension, match, block, player: shooter, entity: e.projectile, at: block.location }))
                    return
                }
            })
        })
        case 'lightning': return subscribeOnce('entitySpawn', installEntitySpawn)
    }
}

// itemInside 与 lightning 共用 entitySpawn
interface Tracked {
    entity: Entity
    until: number
}
const trackedItems: Tracked[] = []
let itemTicker: number | undefined

function installItemInside(): void {
    subscribeOnce('entitySpawn', installEntitySpawn)
}

function installEntitySpawn(): void {
    world.afterEvents.entitySpawn.subscribe((e) => {
        const entity = e.entity
        if (!entity.isValid) return
        if (entity.typeId === 'minecraft:lightning_bolt') return onLightning(entity)
        if (entity.typeId !== 'minecraft:item' || regs('itemInside').length === 0) return
        const stack = entity.getComponent('minecraft:item')?.itemStack
        const wanted = regs('itemInside').filter((r) => itemMatches((r.trigger as Extract<TriggerSpec, { kind: 'itemInside' }>).item, stack))
        if (!wanted.length) return
        const seconds = Math.max(...wanted.map((r) => (r.trigger as Extract<TriggerSpec, { kind: 'itemInside' }>).watchSeconds ?? 15))
        trackedItems.push({ entity, until: system.currentTick + seconds * 20 })
        ensureItemTicker()
    })
}

function ensureItemTicker(): void {
    if (itemTicker !== undefined) return
    const interval = Math.max(1, Math.min(...regs('itemInside').map((r) => (r.trigger as Extract<TriggerSpec, { kind: 'itemInside' }>).interval ?? 10)))
    itemTicker = system.runInterval(() => {
        const now = system.currentTick
        for (let i = trackedItems.length - 1; i >= 0; i--) {
            const t = trackedItems[i]
            if (!t.entity.isValid || now > t.until) {
                trackedItems.splice(i, 1)
                continue
            }
            if (checkItemInside(t.entity)) trackedItems.splice(i, 1)
        }
        if (trackedItems.length === 0 && itemTicker !== undefined) {
            system.clearRun(itemTicker)
            itemTicker = undefined
        }
    }, interval)
}

function checkItemInside(entity: Entity): boolean {
    const dimension = entity.dimension
    const pos = floorPos(entity.location)
    const stack = entity.getComponent('minecraft:item')?.itemStack
    for (const r of regs('itemInside')) {
        const t = r.trigger as Extract<TriggerSpec, { kind: 'itemInside' }>
        if (!itemMatches(t.item, stack)) continue
        const match = matchFor(r, dimension, pos)
        if (!match) continue
        run(r, new MultiblockContext({ trigger: 'itemInside', definition: r.def, dimension, match, block: blockAt(dimension, pos), itemEntity: entity, itemStack: stack, at: pos }))
        return true
    }
    return false
}

function onLightning(bolt: Entity): void {
    const dimension = bolt.dimension
    const at = floorPos(bolt.location)
    for (const pos of [at, { ...at, y: at.y - 1 }]) {
        for (const r of regs('lightning')) {
            const match = matchFor(r, dimension, pos)
            if (!match) continue
            run(r, new MultiblockContext({ trigger: 'lightning', definition: r.def, dimension, match, block: blockAt(dimension, pos), entity: bolt, at: pos }))
            return
        }
    }
}

function installExplosion(): void {
    world.beforeEvents.explosion.subscribe((e) => {
        const impacted = e.getImpactedBlocks()
        const protectedKeys = new Set<string>()
        const deferred: (() => void)[] = []
        const seenStructures = new Set<string>()
        for (const r of regs('explosion')) {
            const t = r.trigger as Extract<TriggerSpec, { kind: 'explosion' }>
            if (t.sources && (!e.source || !t.sources.includes(e.source.typeId))) continue
            for (const block of impacted) {
                if (t.blocks && !t.blocks.includes(block.typeId)) continue
                if (!r.def) {
                    if (t.protect !== false) protectedKeys.add(posKey(e.dimension.id, block.location))
                    const loc = block.location
                    deferred.push(() => run(r, new MultiblockContext({ trigger: 'explosion', dimension: e.dimension, block: blockAt(e.dimension, loc), entity: e.source, at: loc })))
                    continue
                }
                const match = matchFor(r, e.dimension, block.location)
                if (!match) continue
                const id = `${r.def.id}|${posKey(e.dimension.id, match.anchor)}`
                if (seenStructures.has(id)) continue
                seenStructures.add(id)
                const protect = t.protect ?? 'cell'
                if (protect === 'structure') for (const ps of Object.values(match.cells)) for (const p of ps) protectedKeys.add(posKey(e.dimension.id, p))
                else if (protect === 'cell') {
                    for (const p of t.cell ? match.cells[t.cell] ?? [] : [block.location]) protectedKeys.add(posKey(e.dimension.id, p))
                }
                const loc = block.location
                deferred.push(() => run(r, new MultiblockContext({ trigger: 'explosion', definition: r.def, dimension: e.dimension, match, block: blockAt(e.dimension, loc), entity: e.source, at: loc })))
            }
        }
        if (protectedKeys.size) e.setImpactedBlocks(impacted.filter((b) => !protectedKeys.has(posKey(e.dimension.id, b.location))))
        if (deferred.length) system.run(() => deferred.forEach((fn) => fn()))
    })
}

// ───────────────────────────── 公开 API ─────────────────────────────

export const Multiblocks = {
    /** 定义一个多方块结构（脚本顶层调用）。图案不合法时直接抛错 */
    define<D = Record<string, unknown>>(id: string, spec: MultiblockSpec<D>): MultiblockDefinition<D> {
        if (definitions.has(id)) throw new Error(`[sapdon:multiblock] 重复定义 ${id}`)
        const def = new MultiblockDefinition<D>(id, spec)
        definitions.set(id, def)
        if (spec.formed && !restoreScheduled) {
            restoreScheduled = true
            system.run(restoreFormed)
        }
        return def
    },

    /**
     * 给结构挂一个触发器（脚本顶层调用；`useItem` 必须在 startup 之前）。
     * `def` 为 null 只允许用于 `explosion`：不绑定结构，按 `blocks` 逐个方块触发。
     */
    on(def: MultiblockDefinition<any> | null, trigger: TriggerSpec, handler: MultiblockHandler): void {
        if (!def && trigger.kind !== 'explosion') throw new Error(`[sapdon:multiblock] 只有 explosion 触发器可以不绑定结构`)
        if (!def && !(trigger as { blocks?: string[] }).blocks?.length) throw new Error('[sapdon:multiblock] 不绑定结构的 explosion 必须给出 blocks')
        const cell = (trigger as { cell?: string }).cell
        if (def && cell && !def.pattern.where[cell]) throw new Error(`[sapdon:multiblock] ${def.id} 的图案里没有字符 "${cell}"`)
        const reg: Registration = { def: def ?? undefined, trigger, handler }
        const list = registrations.get(trigger.kind) ?? []
        list.push(reg)
        registrations.set(trigger.kind, list)
        install(trigger.kind, trigger, reg)
    },

    /** 手动检查：以 `anchor` 为锚点匹配 */
    check(def: MultiblockDefinition<any>, dimension: Dimension, anchor: BlockPos): MatchResult | undefined {
        return def.pattern.matchAt(floorPos(anchor), readerFor(dimension))
    },

    /** 手动检查：`pos` 可以是结构的任意一格 */
    find(def: MultiblockDefinition<any>, dimension: Dimension, pos: BlockPos): MatchResult | undefined {
        return def.pattern.matchContaining(floorPos(pos), readerFor(dimension))
    },

    /** 对所有已定义的结构做 `find` */
    findAll(dimension: Dimension, pos: BlockPos): { definition: MultiblockDefinition<any>, match: MatchResult }[] {
        const out: { definition: MultiblockDefinition<any>, match: MatchResult }[] = []
        for (const definition of definitions.values()) {
            const match = Multiblocks.find(definition, dimension, pos)
            if (match) out.push({ definition, match })
        }
        return out
    },

    /** 构造一个手动触发的上下文（用于自定义时机复用动作与 `form()`） */
    context(def: MultiblockDefinition<any>, dimension: Dimension, match: MatchResult, extra: { player?: Player, block?: Block } = {}): MultiblockContext {
        return new MultiblockContext({ trigger: 'manual', definition: def, dimension, match, at: match.anchor, ...extra })
    },

    /**
     * 投影：在缺少 / 不对的格子上放粒子（类似沉浸工程手册的投影）。
     * 不给朝向时自动选符合格子最多的朝向。
     */
    preview(def: MultiblockDefinition<any>, dimension: Dimension, anchor: BlockPos,
        options: { orientation?: Orientation, particle?: string, durationTicks?: number } = {}): PartialMatch {
        const a = floorPos(anchor)
        const read = readerFor(dimension)
        const partial = options.orientation
            ? (() => {
                const o = options.orientation
                const missing = def.pattern.layout(a, o)
                    .filter((c) => !def.pattern.where[c.char].test(read(c.pos)))
                    .map((c) => ({ pos: c.pos, char: c.char, label: def.pattern.where[c.char].label }))
                const total = def.pattern.layout(a, o).length
                return { anchor: a, ...o, matched: total - missing.length, total, missing }
            })()
            : def.pattern.bestPartial(a, read)
        const effect = options.particle ?? 'minecraft:villager_happy'
        const duration = options.durationTicks ?? 100
        let elapsed = 0
        const handle = system.runInterval(() => {
            for (const m of partial.missing) safely('preview', () => dimension.spawnParticle(effect, center(m.pos)))
            elapsed += 10
            if (elapsed >= duration) system.clearRun(handle)
        }, 10)
        return partial
    },

    /** 按图案摆出结构（创造模式 / 测试用）：每格放判断的示例方块，没有示例的格子跳过；自下而上摆放 */
    build(def: MultiblockDefinition<any>, dimension: Dimension, anchor: BlockPos, orientation: Orientation = { facing: 0, mirrored: false }): number {
        let placed = 0
        const layout = def.pattern.layout(floorPos(anchor), orientation).sort((p, q) => p.pos.y - q.pos.y)
        for (const c of layout) {
            const ex = def.pattern.where[c.char].example
            const b = blockAt(dimension, c.pos)
            if (!ex || !b) continue
            safely('build', () => {
                if (ex.states) b.setPermutation(BlockPermutation.resolve(ex.id, ex.states))
                else b.setType(ex.id)
                placed++
            })
        }
        return placed
    },

    /** 已成形的实例 */
    formed<D = Record<string, unknown>>(def: MultiblockDefinition<D>): FormedInstance<D>[] {
        return [...(formedByDef.get(def.id)?.values() ?? [])] as FormedInstance<D>[]
    },

    /** 某一格属于哪个已成形实例 */
    formedAt(dimension: Dimension, pos: BlockPos): FormedInstance<any> | undefined {
        return cellIndex.get(posKey(dimension.id, floorPos(pos)))
    },

    /** 所有定义 */
    definitions(): MultiblockDefinition<any>[] {
        return [...definitions.values()]
    },

    /** 诊断 */
    stats(): { definitions: number, triggers: Record<string, number>, formed: number, trackedItems: number } {
        return {
            definitions: definitions.size,
            triggers: Object.fromEntries([...registrations].map(([k, v]) => [k, v.length])),
            formed: [...formedByDef.values()].reduce((n, m) => n + m.size, 0),
            trackedItems: trackedItems.length,
        }
    },
}
