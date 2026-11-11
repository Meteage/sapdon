// 假的 @minecraft/server：方块世界 + 事件信号 + tick 定时器 + 动态属性。只实现多方块测试用到的部分。
export const state = {
    tick: 0, seq: 0, timers: [], blocks: new Map(), unloaded: new Set(), props: new Map(),
    particles: [], drops: [], spawns: [], structures: [], sounds: [], messages: [], startup: [],
    itemComponents: new Map(), blockComponents: new Map(),
}
const signals = {}
const k = (p) => `${Math.floor(p.x)},${Math.floor(p.y)},${Math.floor(p.z)}`
const chunk = (p) => `${Math.floor(p.x / 16)},${Math.floor(p.z / 16)}`
const proxy = (phase) => new Proxy({}, {
    get: (_, name) => ({
        subscribe(cb) { (signals[`${phase}.${String(name)}`] ??= []).push(cb); return cb },
        unsubscribe() { },
    }),
})
export function fire(phase, name, event) { for (const cb of signals[`${phase}.${name}`] ?? []) cb(event) }
export function listeners(phase, name) { return (signals[`${phase}.${name}`] ?? []).length }

export class ItemStack {
    constructor(typeId, amount = 1) { this.typeId = typeId; this.amount = amount }
    clone() { return new ItemStack(this.typeId, this.amount) }
    getTags() { return [] }
}
export const BlockPermutation = { resolve: (id, states = {}) => ({ typeId: id, type: { id }, getAllStates: () => ({ ...states }) }) }
export const GameMode = { Creative: 'Creative', Survival: 'Survival' }
export class BlockCustomComponentAlreadyRegisteredError extends Error { }
export class ItemCustomComponentAlreadyRegisteredError extends Error { }

class FakeBlock {
    constructor(dimension, loc) { this.dimension = dimension; this.location = { x: Math.floor(loc.x), y: Math.floor(loc.y), z: Math.floor(loc.z) } }
    get rec() { return state.blocks.get(k(this.location)) ?? { typeId: 'minecraft:air', states: {}, tags: [] } }
    get typeId() { return this.rec.typeId }
    get permutation() { const r = this.rec; return { type: { id: r.typeId }, getAllStates: () => ({ ...r.states }) } }
    get isValid() { return true }
    getTags() { return this.rec.tags ?? [] }
    setType(id) { state.blocks.set(k(this.location), { typeId: id, states: {}, tags: [] }) }
    setPermutation(p) { state.blocks.set(k(this.location), { typeId: p.typeId, states: p.getAllStates(), tags: [] }) }
}

export class FakeEntity {
    constructor(typeId, location, extra = {}) {
        this.typeId = typeId; this.location = location; this.isValid = true; this.dimension = overworld; this.extra = extra
    }
    getComponent(name) { return name === 'minecraft:item' && this.extra.itemStack ? { itemStack: this.extra.itemStack } : undefined }
    remove() { this.isValid = false }
}

export const overworld = {
    id: 'minecraft:overworld',
    getBlock(loc) { return state.unloaded.has(chunk(loc)) ? undefined : new FakeBlock(this, loc) },
    spawnItem(stack, loc) { state.drops.push({ typeId: stack.typeId, amount: stack.amount, loc }); return new FakeEntity('minecraft:item', loc, { itemStack: stack }) },
    spawnParticle(id, loc) { state.particles.push({ id, loc }) },
    playSound(id) { state.sounds.push(id) },
    spawnEntity(id, loc) { state.spawns.push({ id, loc }); return new FakeEntity(id, loc) },
}

export const world = {
    beforeEvents: proxy('before'),
    afterEvents: proxy('after'),
    getDimension: () => overworld,
    getDynamicProperty: (key) => state.props.get(key),
    setDynamicProperty: (key, value) => (value === undefined ? state.props.delete(key) : state.props.set(key, value)),
    structureManager: { place: (name, dim, loc) => state.structures.push({ name, loc }) },
    sendMessage: (m) => state.messages.push(String(m)),
}

export const system = {
    get currentTick() { return state.tick },
    beforeEvents: proxy('system.before'),
    afterEvents: proxy('system.after'),
    runTimeout(fn, ticks = 1) { const h = ++state.seq; state.timers.push({ h, due: state.tick + Math.max(1, ticks), fn }); return h },
    run(fn) { return this.runTimeout(fn, 1) },
    runInterval(fn, ticks = 1) {
        const h = ++state.seq
        const entry = { h, due: state.tick + Math.max(1, ticks), fn: () => { entry.due = state.tick + Math.max(1, ticks); state.timers.push(entry); fn() } }
        state.timers.push(entry)
        return h
    },
    clearRun(h) { state.timers = state.timers.filter((t) => t.h !== h); state.cleared = (state.cleared ?? new Set()).add(h) },
}

/** 推进 n 个 tick */
export function step(n = 1) {
    for (let i = 0; i < n; i++) {
        state.tick++
        const due = state.timers.filter((t) => t.due <= state.tick).sort((a, b) => a.due - b.due || a.h - b.h)
        state.timers = state.timers.filter((t) => t.due > state.tick)
        for (const t of due) if (!state.cleared?.has(t.h)) t.fn()
    }
}

/** 触发 startup：组件注册表记录到 state */
export function fireStartup() {
    const reg = (map) => ({ registerCustomComponent: (id, h) => { if (map.has(id)) throw new ItemCustomComponentAlreadyRegisteredError(id); map.set(id, h) } })
    fire('system.before', 'startup', { itemComponentRegistry: reg(state.itemComponents), blockComponentRegistry: reg(state.blockComponents) })
}

export function setBlock(loc, typeId, states = {}, tags = []) { state.blocks.set(k(loc), { typeId, states, tags }) }
export function getBlock(loc) { return overworld.getBlock(loc) }
export function typeAt(loc) { return state.blocks.get(k(loc))?.typeId ?? 'minecraft:air' }

export function makePlayer(held, { creative = false } = {}) {
    const slots = [held]
    return {
        typeId: 'minecraft:player', selectedSlotIndex: 0, dimension: overworld,
        getGameMode: () => (creative ? 'Creative' : 'Survival'),
        getComponent: (name) => (name === 'minecraft:inventory' ? { container: { getItem: (i) => slots[i], setItem: (i, s) => { slots[i] = s } } } : undefined),
        sendMessage: (m) => state.messages.push(String(m)),
        held: () => slots[0],
    }
}
