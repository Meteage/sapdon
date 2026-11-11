// 多方块运行期（`src/oc/multiblock/index.ts`）：8 种触发器、成形结构生命周期、投影、自动搭建。
//   `node tests/multiblock-runtime.test.mjs`（**需先 `tsc && tsc-alias` 生成 `dist/`**）
//
// 每个用例把 dist/oc/{multiblock,components} 拷进新的临时目录，`@minecraft/server` 改写成
// tests/fixtures/fake-minecraft-world.mjs 的副本 ⇒ 每个用例都是全新的模块实例（注册表、订阅、成形实例互不串）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const DIST_OC = path.resolve(here, '..', 'dist', 'oc')
const FAKE = path.join(here, 'fixtures', 'fake-minecraft-world.mjs')
if (!fs.existsSync(path.join(DIST_OC, 'multiblock', 'index.js'))) throw new Error('缺少 dist/oc/multiblock —— 先跑 `tsc && tsc-alias`')

let seq = 0
const dirs = []
async function harness() {
    const root = path.join(os.tmpdir(), `sapdon-mb-${process.pid}-${seq++}`)
    dirs.push(root)
    fs.mkdirSync(root, { recursive: true })
    const fakePath = path.join(root, 'fake.mjs')
    fs.copyFileSync(FAKE, fakePath)
    for (const sub of ['multiblock', 'components']) {
        fs.cpSync(path.join(DIST_OC, sub), path.join(root, sub), { recursive: true })
        for (const f of fs.readdirSync(path.join(root, sub))) {
            const full = path.join(root, sub, f)
            if (full.endsWith('.js')) fs.writeFileSync(full, fs.readFileSync(full, 'utf8').replace(/(['"])@minecraft\/server\1/g, `'${pathToFileURL(fakePath).href}'`))
        }
    }
    const mc = await import(pathToFileURL(fakePath).href)
    const mb = await import(pathToFileURL(path.join(root, 'multiblock', 'index.js')).href)
    return { mc, mb }
}
test.after(() => { for (const d of dirs) fs.rmSync(d, { recursive: true, force: true }) })

const O = { x: 0, y: 64, z: 0 }   // 锚点
const at = (dx, dy, dz) => ({ x: O.x + dx, y: O.y + dy, z: O.z + dz })

/** 反应核：金块在核心正下方，北边一格圆石（让朝向唯一） */
function reactor(mb, extra = {}) {
    return mb.Multiblocks.define('t:reactor', {
        aisles: [['C', 'G'], [' ', 'R']],
        where: { C: mb.Is.block('minecraft:cobblestone'), G: mb.Is.block('minecraft:gold_block'), R: mb.Is.block('minecraft:netherreactor') },
        anchor: 'R', ...extra,
    })
}
function buildReactor(mc) {
    mc.setBlock(at(0, 0, 0), 'minecraft:netherreactor')
    mc.setBlock(at(0, -1, 0), 'minecraft:gold_block')
    mc.setBlock(at(0, -1, -1), 'minecraft:cobblestone')
}

test('① interact：只认首次事件与指定物品；可取消原版行为；回调推迟到下一 tick', async () => {
    const { mc, mb } = await harness()
    const def = reactor(mb)
    const calls = []
    mb.Multiblocks.on(def, mb.Trigger.interact({ item: 'minecraft:golden_sword', cancelVanilla: true }), (ctx) => calls.push(ctx))
    buildReactor(mc)
    const player = mc.makePlayer(new mc.ItemStack('minecraft:golden_sword'))
    const ev = (extra) => ({ isFirstEvent: true, block: mc.getBlock(O), itemStack: new mc.ItemStack('minecraft:golden_sword'), player, cancel: false, ...extra })

    const e1 = ev()
    mc.fire('before', 'playerInteractWithBlock', e1)
    assert.equal(e1.cancel, true, '匹配到结构时同步取消原版行为')
    assert.equal(calls.length, 0, 'before 事件里不执行回调')
    mc.step()
    assert.equal(calls.length, 1)
    assert.deepEqual(calls[0].match.anchor, O)
    assert.equal(calls[0].trigger, 'interact')
    assert.equal(calls[0].player, player)

    mc.fire('before', 'playerInteractWithBlock', ev({ isFirstEvent: false }))
    const wrong = ev({ itemStack: new mc.ItemStack('minecraft:stick') })
    mc.fire('before', 'playerInteractWithBlock', wrong)
    mc.step()
    assert.equal(calls.length, 1, '按住重复的事件、物品不对都不触发')
    assert.equal(wrong.cancel, false, '不匹配时不动原版行为')
})

test('② interact + previewOnFail：结构不完整时投影缺的方块并提示', async () => {
    const { mc, mb } = await harness()
    const def = reactor(mb)
    mb.Multiblocks.on(def, mb.Trigger.interact({ previewOnFail: true }), () => assert.fail('不应触发'))
    buildReactor(mc)
    mc.setBlock(at(0, -1, -1), 'minecraft:dirt')
    mc.fire('before', 'playerInteractWithBlock', { isFirstEvent: true, block: mc.getBlock(O), player: mc.makePlayer(undefined), cancel: false })
    mc.step(12)
    assert.match(mc.state.messages.join('\n'), /还差 1 \/ 3 个方块/)
    assert.ok(mc.state.particles.some((p) => p.loc.x === 0.5 && p.loc.y === 63.5 && p.loc.z === -0.5), '粒子标在缺的那一格中心')
})

test('③ useItem：自动注册物品自定义组件，onUseOn 右键结构即触发', async () => {
    const { mc, mb } = await harness()
    const def = reactor(mb)
    const calls = []
    mb.Multiblocks.on(def, mb.Trigger.useItem({ component: 't:wand' }), (ctx) => calls.push(ctx))
    mc.fireStartup()
    const comp = mc.state.itemComponents.get('t:wand')
    assert.ok(comp?.onUseOn, '组件已注册')
    buildReactor(mc)
    const player = mc.makePlayer(new mc.ItemStack('t:wand'))
    comp.onUseOn({ block: mc.getBlock(at(0, -1, -1)), source: player, itemStack: new mc.ItemStack('t:wand') })
    assert.equal(calls.length, 1, '点结构的任意一格都行')
    assert.equal(calls[0].trigger, 'useItem')
})

test('④ place：放下最后一块（任意一格）即成形', async () => {
    const { mc, mb } = await harness()
    const def = reactor(mb)
    const calls = []
    mb.Multiblocks.on(def, mb.Trigger.place(), (ctx) => calls.push(ctx))
    mc.setBlock(at(0, 0, 0), 'minecraft:netherreactor')
    mc.setBlock(at(0, -1, -1), 'minecraft:cobblestone')
    mc.fire('after', 'playerPlaceBlock', { block: mc.getBlock(at(0, -1, -1)), dimension: mc.overworld, player: mc.makePlayer() })
    assert.equal(calls.length, 0, '还缺金块')
    mc.setBlock(at(0, -1, 0), 'minecraft:gold_block')
    mc.fire('after', 'playerPlaceBlock', { block: mc.getBlock(at(0, -1, 0)), dimension: mc.overworld, player: mc.makePlayer() })
    assert.equal(calls.length, 1)
    assert.deepEqual(calls[0].match.anchor, O)
})

test('⑤ redstone：只认上升沿，可按元件类型过滤', async () => {
    const { mc, mb } = await harness()
    const def = mb.Multiblocks.define('t:panel', {
        aisles: [['P'], ['B']],
        where: { B: mb.Is.block('minecraft:stone_bricks'), P: mb.Is.block('minecraft:lever', 'minecraft:stone_pressure_plate', 'minecraft:stone_button') },
        anchor: 'B', rotate: false,
    })
    const kinds = []
    mb.Multiblocks.on(def, mb.Trigger.redstone({ kinds: ['lever', 'pressurePlate'] }), (ctx) => kinds.push(ctx.redstone))
    mc.setBlock(at(0, 0, 0), 'minecraft:stone_bricks')
    mc.setBlock(at(0, -1, 0), 'minecraft:lever')
    const base = { dimension: mc.overworld, block: mc.getBlock(at(0, -1, 0)) }
    mc.fire('after', 'leverAction', { ...base, isPowered: false })
    mc.fire('after', 'leverAction', { ...base, isPowered: true })
    mc.fire('after', 'pressurePlatePush', { ...base, previousRedstonePower: 15, redstonePower: 15 })
    mc.fire('after', 'pressurePlatePush', { ...base, previousRedstonePower: 0, redstonePower: 15 })
    mc.fire('after', 'buttonPush', { ...base })
    assert.deepEqual(kinds, ['lever', 'pressurePlate'], '关拉杆、压力板持续受压、按钮（被过滤）都不触发')
})

test('⑥ itemInside：只跟踪通过过滤的新掉落物；进入水格即触发；consumeItem 只吃一个', async () => {
    const { mc, mb } = await harness()
    const def = mb.Multiblocks.define('t:pool', {
        aisles: [['QQQ', 'QQQ', 'QQQ'], ['QQQ', 'QWQ', 'QQQ']],
        where: { Q: mb.Is.block('minecraft:quartz_block'), W: mb.Is.block('minecraft:water') },
        anchor: 'W',
    })
    const got = []
    mb.Multiblocks.on(def, mb.Trigger.itemInside({ cell: 'W', item: 'minecraft:iron_ingot' }), (ctx) => {
        got.push(ctx.itemStack.typeId)
        ctx.consumeItem()
        ctx.drop('minecraft:gold_ingot')
    })
    for (const c of def.pattern.layout(O, { facing: 0, mirrored: false })) mc.setBlock(c.pos, c.char === 'W' ? 'minecraft:water' : 'minecraft:quartz_block')

    const stick = new mc.FakeEntity('minecraft:item', { x: 0.5, y: 64.3, z: 0.5 }, { itemStack: new mc.ItemStack('minecraft:stick') })
    mc.fire('after', 'entitySpawn', { entity: stick })
    assert.equal(mb.Multiblocks.stats().trackedItems, 0, '不在过滤里的物品不跟踪')

    const iron = new mc.FakeEntity('minecraft:item', { x: 3.5, y: 70, z: 3.5 }, { itemStack: new mc.ItemStack('minecraft:iron_ingot', 3) })
    mc.fire('after', 'entitySpawn', { entity: iron })
    mc.step(10)
    assert.deepEqual(got, [], '还没落进水里')
    iron.location = { x: 0.4, y: 64.2, z: 0.6 }
    mc.step(10)
    assert.deepEqual(got, ['minecraft:iron_ingot'])
    assert.equal(iron.isValid, false)
    assert.deepEqual(mc.state.drops.map((d) => `${d.typeId}×${d.amount}`), ['minecraft:iron_ingot×2', 'minecraft:gold_ingot×1'], '剩下 2 个铁锭放回原处，产出金锭')
    assert.equal(mb.Multiblocks.stats().trackedItems, 0)
})

test('⑦ explosion：绑定结构时保护触发格并在下一 tick 转化；不绑定结构时按方块逐个转化', async () => {
    const { mc, mb } = await harness()
    const chamber = mb.Multiblocks.define('t:chamber', {
        aisles: [['OSO']],
        where: { O: mb.Is.block('minecraft:obsidian'), S: mb.Is.block('minecraft:sand') },
        anchor: 'S',
    })
    mb.Multiblocks.on(chamber, mb.Trigger.explosion({ cell: 'S' }), (ctx) => ctx.replace('S', 'minecraft:glass'))
    mb.Multiblocks.on(null, mb.Trigger.explosion({ blocks: ['minecraft:cobblestone'] }), (ctx) => ctx.convert('minecraft:gravel'))
    mc.setBlock(at(-1, 0, 0), 'minecraft:obsidian')
    mc.setBlock(at(0, 0, 0), 'minecraft:sand')
    mc.setBlock(at(1, 0, 0), 'minecraft:obsidian')
    mc.setBlock(at(5, 0, 0), 'minecraft:cobblestone')
    mc.setBlock(at(6, 0, 0), 'minecraft:dirt')
    const impacted = [at(0, 0, 0), at(5, 0, 0), at(6, 0, 0)].map((p) => mc.getBlock(p))
    let kept
    mc.fire('before', 'explosion', { dimension: mc.overworld, source: undefined, getImpactedBlocks: () => impacted, setImpactedBlocks: (b) => { kept = b } })
    assert.deepEqual(kept.map((b) => b.typeId), ['minecraft:dirt'], '沙子与圆石被保护，泥土照常被炸')
    assert.equal(mc.typeAt(O), 'minecraft:sand', 'before 事件里不改世界')
    mc.step()
    assert.equal(mc.typeAt(O), 'minecraft:glass')
    assert.equal(mc.typeAt(at(5, 0, 0)), 'minecraft:gravel')
})

test('⑧ projectile 与 lightning', async () => {
    const { mc, mb } = await harness()
    const def = reactor(mb)
    const hits = []
    mb.Multiblocks.on(def, mb.Trigger.projectile({ projectiles: ['minecraft:arrow'] }), (ctx) => hits.push(`arrow@${ctx.block.typeId}`))
    mb.Multiblocks.on(def, mb.Trigger.lightning(), (ctx) => hits.push(`bolt@${ctx.block.typeId}`))
    buildReactor(mc)
    const hit = (type) => mc.fire('after', 'projectileHitBlock', { dimension: mc.overworld, projectile: { typeId: type }, getBlockHit: () => ({ block: mc.getBlock(at(0, -1, -1)) }) })
    hit('minecraft:snowball')
    hit('minecraft:arrow')
    mc.fire('after', 'entitySpawn', { entity: new mc.FakeEntity('minecraft:lightning_bolt', { x: 0.5, y: 65, z: 0.5 }) })
    assert.deepEqual(hits, ['arrow@minecraft:cobblestone', 'bolt@minecraft:netherreactor'], '雪球被过滤；闪电落点下方一格是核心')
})

test('⑨ 成形结构：form 持久化、只在区块加载时 tick、被拆即解体、重进世界恢复', async () => {
    const storage = new Map()
    const ticks = []
    const breaks = []
    const loads = []
    const setup = async () => {
        const { mc, mb } = await harness()
        mc.state.props = storage
        const def = reactor(mb, {
            formed: {
                interval: 20, revalidateInterval: 0,
                onTick: (inst) => { inst.data.charge++; inst.save(); ticks.push(inst.data.charge) },
                onBreak: (inst, reason) => breaks.push(reason),
                onLoad: (inst) => loads.push(inst.data.charge),
            },
        })
        return { mc, mb, def }
    }
    const { mc, mb, def } = await setup()
    mb.Multiblocks.on(def, mb.Trigger.interact(), (ctx) => ctx.form({ charge: 0 }))
    buildReactor(mc)
    mc.fire('before', 'playerInteractWithBlock', { isFirstEvent: true, block: mc.getBlock(O), player: mc.makePlayer(), cancel: false })
    mc.step(1)
    assert.equal(mb.Multiblocks.formed(def).length, 1)
    assert.ok(storage.get('sapdon:multiblock:t:reactor'), '写进世界动态属性')
    mc.step(40)
    assert.deepEqual(ticks, [1, 2])

    mc.state.unloaded.add('0,0')
    mc.step(40)
    assert.deepEqual(ticks, [1, 2], '区块未加载时不 tick')
    mc.state.unloaded.clear()

    // 重进世界：新的模块实例读同一份存档
    const second = await setup()
    buildReactor(second.mc)
    second.mc.step(1)
    assert.deepEqual(loads, [2], 'onLoad 拿到存档里的数据')
    assert.equal(second.mb.Multiblocks.formed(second.def).length, 1)
    assert.ok(second.mb.Multiblocks.formedAt(second.mc.overworld, at(0, -1, -1)), '每一格都能反查到实例')

    second.mc.setBlock(at(0, -1, 0), 'minecraft:air')
    second.mc.fire('after', 'playerBreakBlock', { dimension: second.mc.overworld, block: second.mc.getBlock(at(0, -1, 0)) })
    second.mc.step(1)
    assert.deepEqual(breaks, ['broken'])
    assert.equal(second.mb.Multiblocks.formed(second.def).length, 0)
    assert.equal(storage.has('sapdon:multiblock:t:reactor'), false, '解体后存档清空')
})

test('⑨b 成形后改动自身方块：不声明 intact 会被判定破坏，声明后正常运行', async () => {
    for (const withIntact of [false, true]) {
        const { mc, mb } = await harness()
        const broken = []
        const def = reactor(mb, {
            formed: {
                interval: 20, revalidateInterval: 20,
                onTick: (inst) => inst.replace('G', 'minecraft:crying_obsidian'),
                onBreak: (inst, reason) => broken.push(reason),
                ...(withIntact ? { intact: (inst) => inst.validate({ G: mb.Is.block('minecraft:gold_block', 'minecraft:crying_obsidian') }) } : {}),
            },
        })
        buildReactor(mc)
        mb.Multiblocks.context(def, mc.overworld, mb.Multiblocks.check(def, mc.overworld, O)).form({})
        mc.step(60)
        assert.deepEqual(broken, withIntact ? [] : ['broken'], withIntact ? '声明 intact 后不误判' : '自身改动被当成破坏')
        if (withIntact) {
            mc.setBlock(at(0, -1, -1), 'minecraft:air')
            mc.fire('after', 'playerBreakBlock', { dimension: mc.overworld, block: mc.getBlock(at(0, -1, -1)) })
            mc.step(1)
            assert.deepEqual(broken, ['broken'], '真的被拆时照样解体')
        }
    }
})

test('⑩ build 按示例自下而上摆放；find / findAll；定义与注册的守卫', async () => {
    const { mc, mb } = await harness()
    const def = reactor(mb)
    const placed = mb.Multiblocks.build(def, mc.overworld, O, { facing: 2, mirrored: false })
    assert.equal(placed, 3)
    assert.equal(mc.typeAt(at(0, -1, 1)), 'minecraft:cobblestone', 'facing=2 时圆石转到南边')
    assert.ok(mb.Multiblocks.find(def, mc.overworld, at(0, -1, 1)))
    assert.equal(mb.Multiblocks.findAll(mc.overworld, at(0, -1, 0))[0].definition.id, 't:reactor')
    assert.throws(() => reactor(mb), /重复定义/)
    assert.throws(() => mb.Multiblocks.on(null, mb.Trigger.interact(), () => { }), /只有 explosion/)
    assert.throws(() => mb.Multiblocks.on(def, mb.Trigger.place({ cell: 'Z' }), () => { }), /没有字符 "Z"/)
    assert.equal(mc.listeners('after', 'playerPlaceBlock'), 0, '没有用到的事件不订阅')
})
