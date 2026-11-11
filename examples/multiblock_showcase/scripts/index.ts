/**
 * 多方块结构展示包：每种触发方式一个结构（结构全部是原版方块，符文石阵的法杖除外）。
 *
 *   /scriptevent mbshow:list              列出全部结构与测试方法
 *   /scriptevent mbshow:build <名字>      在你东边摆出结构（不用手搭）
 *   /scriptevent mbshow:check             看准星指着的方块属于哪个结构（手动触发）
 *   /scriptevent mbshow:preview <名字>    以准星方块为锚点投影缺的方块
 *   /scriptevent mbshow:wand              拿一根符文法杖
 */
import { ItemStack, system, world, type Player } from '@minecraft/server'
import { Is, Multiblocks, Trigger, type MultiblockDefinition } from '@sapdon/runtime'

const say = (text: string) => world.sendMessage(`§b[多方块]§r ${text}`)

// ───────── 1. 下界反应核：原版物品右键（金剑）+ 取消原版行为 + 结构不完整时投影 + 成形结构生命周期 ─────────
interface ReactorData { t: number }
const reactor = Multiblocks.define<ReactorData>('mbshow:nether_reactor', {
    aisles: [
        ['GCG', 'CCC', 'GCG'],
        ['C C', ' R ', 'C C'],
        [' C ', 'CCC', ' C '],
    ],
    where: {
        G: Is.block('minecraft:gold_block'),
        C: Is.block('minecraft:cobblestone'),
        // 原版的下界反应核方块（命令可得）；拿不到时用磁石代替
        R: Is.block('minecraft:netherreactor', 'minecraft:lodestone'),
    },
    anchor: 'R',
    formed: {
        interval: 20,
        // 反应开始后金块会变成哭泣的黑曜石：完整性检查要接受这两种，否则会被判定为「结构被破坏」
        intact: (inst) => inst.validate({ G: Is.block('minecraft:gold_block', 'minecraft:crying_obsidian') }),
        onTick(inst) {
            inst.data.t++
            inst.save()
            inst.particle('minecraft:basic_flame_particle', 'G')
            if (inst.data.t === 1) inst.replace('G', 'minecraft:crying_obsidian')
            if (inst.data.t % 5 === 0) {
                const loot = ['minecraft:glowstone_dust', 'minecraft:quartz', 'minecraft:nether_wart', 'minecraft:blaze_powder']
                inst.drop(loot[Math.floor(Math.random() * loot.length)], undefined, 1 + Math.floor(Math.random() * 3))
                inst.sound('random.explode')
            }
            if (inst.data.t === 10 || inst.data.t === 20) inst.spawn('minecraft:zombie_pigman')
            if (inst.data.t >= 30) {
                inst.replace('G', 'minecraft:obsidian')
                inst.replace('C', 'minecraft:obsidian')
                say('下界反应核：反应结束，结构已化为黑曜石')
                inst.unform()
            }
        },
        onBreak(inst, reason) {
            if (reason === 'broken') say(`下界反应核：结构在第 ${inst.data.t} 秒被破坏，反应中止`)
        },
        onLoad(inst) {
            say(`下界反应核：从存档恢复，继续第 ${inst.data.t} 秒`)
        },
    },
})
Multiblocks.on(reactor, Trigger.interact({ item: 'minecraft:golden_sword', cancelVanilla: true, previewOnFail: true }), (ctx) => {
    if (Multiblocks.formedAt(ctx.dimension, ctx.match!.anchor)) return say('下界反应核：已经在反应中')
    ctx.form<ReactorData>({ t: 0 })
    say('下界反应核：§c反应开始§r（30 秒，期间拆掉任意一块会中止）')
})

// ───────── 2. 符文石阵：自定义物品（法杖）的 onUseOn ─────────
const runes = Multiblocks.define('mbshow:rune_circle', {
    aisles: [['SSS', 'SLS', 'SSS']],
    where: { S: Is.block('minecraft:chiseled_stone_bricks'), L: Is.block('minecraft:lapis_block') },
    anchor: 'L',
})
Multiblocks.on(runes, Trigger.useItem({ component: 'mbshow:wand_activate' }), (ctx) => {
    ctx.particle('minecraft:totem_particle', 'S')
    ctx.sound('random.levelup')
    ctx.player?.addEffect('regeneration', 200, { amplifier: 1 })
    say('符文石阵：获得 10 秒生命恢复')
})

// ───────── 3. 宝石方尖碑：放上最后一块（任意顺序）即成形 ─────────
const obelisk = Multiblocks.define('mbshow:obelisk', {
    aisles: [['L'], ['L'], ['D']],
    where: { L: Is.block('minecraft:lapis_block'), D: Is.block('minecraft:diamond_block') },
    anchor: 'D',
})
Multiblocks.on(obelisk, Trigger.place(), (ctx) => {
    ctx.replace('D', 'minecraft:amethyst_block')
    ctx.drop('minecraft:experience_bottle', 'D', 3)
    ctx.particle('minecraft:totem_particle', 'D')
    say('宝石方尖碑：成形！顶端化为紫水晶，掉落 3 个附魔之瓶')
})

// ───────── 4. 红石祭坛：压力板 / 拉杆 / 按钮 / 标靶（只认上升沿） ─────────
const altar = Multiblocks.define('mbshow:redstone_altar', {
    aisles: [
        ['AAA', 'ATA', 'AAA'],
        ['   ', ' P ', '   '],
    ],
    where: {
        A: Is.block('minecraft:polished_andesite'),
        T: Is.block('minecraft:target'),
        P: Is.or(Is.block('minecraft:stone_pressure_plate', 'minecraft:lever', 'minecraft:stone_button'), Is.air()),
    },
    anchor: 'T',
})
Multiblocks.on(altar, Trigger.redstone(), (ctx) => {
    const reward: Record<string, string> = { pressurePlate: 'minecraft:redstone', lever: 'minecraft:repeater', button: 'minecraft:comparator', target: 'minecraft:arrow', tripwire: 'minecraft:string' }
    ctx.drop(reward[ctx.redstone!], 'T')
    ctx.particle('minecraft:redstone_ore_dust_particle', 'A')
    say(`红石祭坛：由 ${ctx.redstone} 触发`)
})

// ───────── 5. 魔力水池：把物品扔进中心的水里 ─────────
const POOL_RECIPES: Record<string, string> = {
    'minecraft:iron_ingot': 'minecraft:gold_ingot',
    'minecraft:stick': 'minecraft:blaze_rod',
    'minecraft:wheat_seeds': 'minecraft:nether_wart',
}
const pool = Multiblocks.define('mbshow:mana_pool', {
    aisles: [
        ['QQQ', 'QQQ', 'QQQ'],
        ['QQQ', 'QWQ', 'QQQ'],
    ],
    where: { Q: Is.block('minecraft:quartz_block'), W: Is.block('minecraft:water') },
    anchor: 'W',
})
Multiblocks.on(pool, Trigger.itemInside({ cell: 'W', item: Object.keys(POOL_RECIPES) }), (ctx) => {
    const output = POOL_RECIPES[ctx.itemStack!.typeId]
    if (!ctx.consumeItem()) return
    ctx.drop(output, 'W')
    ctx.particle('minecraft:totem_particle', 'W')
    ctx.sound('random.orb')
    say(`魔力水池：${ctx.itemStack!.typeId} → ${output}`)
})

// ───────── 6. 爆炸熔炉：TNT 在黑曜石炉膛里炸，沙子不被炸掉而是烧成玻璃 ─────────
const blastFurnace = Multiblocks.define('mbshow:blast_chamber', {
    aisles: [
        ['OOO', 'OOO', 'OOO'],
        ['OOO', 'OSO', 'OOO'],
    ],
    where: { O: Is.block('minecraft:obsidian'), S: Is.block('minecraft:sand') },
    anchor: 'S',
})
Multiblocks.on(blastFurnace, Trigger.explosion({ cell: 'S' }), (ctx) => {
    ctx.replace('S', 'minecraft:glass')
    say('爆炸熔炉：沙子被炸成了玻璃')
})

// ───────── 7. 爆炸变种：不绑定结构，只认 TNT（苦力怕不算） ─────────
const VARIANTS: Record<string, string> = {
    'minecraft:cobblestone': 'minecraft:gravel',
    'minecraft:stone_bricks': 'minecraft:cracked_stone_bricks',
    'minecraft:sandstone': 'minecraft:sand',
}
Multiblocks.on(null, Trigger.explosion({ blocks: Object.keys(VARIANTS), sources: ['minecraft:tnt'] }), (ctx) => {
    if (ctx.block) ctx.convert(VARIANTS[ctx.block.typeId])
})

// ───────── 8. 稻草人靶：箭射中结构 ─────────
const scarecrow = Multiblocks.define('mbshow:scarecrow', {
    aisles: [['H'], ['H'], ['P']],
    where: { H: Is.block('minecraft:hay_block'), P: Is.block('minecraft:carved_pumpkin') },
    anchor: 'P',
})
Multiblocks.on(scarecrow, Trigger.projectile({ projectiles: ['minecraft:arrow'] }), (ctx) => {
    ctx.particle('minecraft:critical_hit_emitter', ctx.block?.location)
    ctx.drop('minecraft:arrow', 'P')
    say('稻草人靶：命中！箭还给你')
})

// ───────── 9. 避雷针充能台：闪电落在避雷针上 ─────────
const lightningRig = Multiblocks.define('mbshow:lightning_rig', {
    aisles: [
        ['KKK', 'KKK', 'KKK'],
        ['   ', ' N ', '   '],
    ],
    where: { K: Is.block('minecraft:copper_block'), N: Is.block('minecraft:lightning_rod') },
    anchor: 'N',
})
Multiblocks.on(lightningRig, Trigger.lightning(), (ctx) => {
    ctx.drop('minecraft:glowstone_dust', 'N', 4)
    ctx.particle('minecraft:electric_spark_particle', 'K')
    say('避雷针充能台：吸收雷电，产出 4 份荧石粉')
})

// ───────── 命令 ─────────
const DEMOS: { key: string, def: MultiblockDefinition<any>, trigger: string, how: string }[] = [
    { key: 'reactor', def: reactor, trigger: 'interact + 成形结构', how: '手持金剑右键核心（结构不完整时会投影缺的方块）' },
    { key: 'runes', def: runes, trigger: 'useItem', how: '/scriptevent mbshow:wand 拿法杖，右键石阵任意一格' },
    { key: 'obelisk', def: obelisk, trigger: 'place', how: '拆掉顶上的钻石块再放回去（任意一块最后放都行）' },
    { key: 'altar', def: altar, trigger: 'redstone', how: '踩压力板 / 换成拉杆或按钮 / 用箭射标靶' },
    { key: 'pool', def: pool, trigger: 'itemInside', how: '把铁锭、木棍或小麦种子扔进中间的水里' },
    { key: 'furnace', def: blastFurnace, trigger: 'explosion（绑定结构）', how: '在沙子上方放 TNT 并点燃' },
    { key: 'scarecrow', def: scarecrow, trigger: 'projectile', how: '用弓射它' },
    { key: 'rig', def: lightningRig, trigger: 'lightning', how: '/summon lightning_bolt 到避雷针上，或等雷雨' },
]

function lookedAt(player: Player) {
    return player.getBlockFromViewDirection({ maxDistance: 8 })?.block
}

system.afterEvents.scriptEventReceive.subscribe((event) => {
    const player = event.sourceEntity?.typeId === 'minecraft:player' ? event.sourceEntity as Player : undefined
    const arg = event.message.trim()
    switch (event.id) {
        case 'mbshow:list': {
            say('全部结构（/scriptevent mbshow:build <名字> 摆出来）：')
            for (const d of DEMOS) say(`  §e${d.key}§r [${d.trigger}] ${d.how}`)
            say('  §e爆炸变种§r [explosion 不绑定结构] 用 TNT 炸圆石 / 石砖 / 砂岩（苦力怕不算）')
            say('  §e检测§r [手动] /scriptevent mbshow:check 看准星方块属于哪个结构')
            return
        }
        case 'mbshow:build': {
            if (!player) return say('请由玩家执行')
            const demo = DEMOS.find((d) => d.key === arg)
            if (!demo) return say(`用法：/scriptevent mbshow:build <${DEMOS.map((d) => d.key).join('|')}>`)
            const base = { x: Math.floor(player.location.x) + 3, y: Math.floor(player.location.y), z: Math.floor(player.location.z) - 1 }
            const a = demo.def.pattern.anchorCell
            const anchor = { x: base.x + a.x, y: base.y + a.y, z: base.z + a.z }
            const placed = Multiblocks.build(demo.def, player.dimension, anchor)
            const total = demo.def.pattern.bill().reduce((n, b) => n + b.count, 0)
            say(`已摆出 ${demo.key}：${placed} / ${total} 格（空着的格子不检查）。测试方法：${demo.how}`)
            for (const line of demo.def.pattern.describe()) say(`  ${line}`)
            return
        }
        case 'mbshow:check': {
            if (!player) return say('请由玩家执行')
            const block = lookedAt(player)
            if (!block) return say('准星没有指着方块')
            const found = Multiblocks.findAll(player.dimension, block.location)
            const formed = Multiblocks.formedAt(player.dimension, block.location)
            if (!found.length) return say(`${block.typeId} 不属于任何完整的结构`)
            for (const f of found) say(`属于 ${f.definition.id}：锚点 ${JSON.stringify(f.match.anchor)}，朝向 ${f.match.facing}${formed?.definition.id === f.definition.id ? '，§a已成形§r' : ''}`)
            return
        }
        case 'mbshow:preview': {
            if (!player) return say('请由玩家执行')
            const demo = DEMOS.find((d) => d.key === arg)
            const block = lookedAt(player)
            if (!demo || !block) return say(`用法：准星指着锚点方块，/scriptevent mbshow:preview <${DEMOS.map((d) => d.key).join('|')}>`)
            const partial = Multiblocks.preview(demo.def, player.dimension, block.location)
            say(`${demo.key}：符合 ${partial.matched} / ${partial.total}，缺的格子已用粒子标出（5 秒）`)
            return
        }
        case 'mbshow:wand': {
            if (!player) return say('请由玩家执行')
            player.getComponent('minecraft:inventory')?.container?.addItem(new ItemStack('mbshow:wand'))
            return say('已给出符文法杖')
        }
    }
}, { namespaces: ['mbshow'] })

system.runTimeout(() => say('多方块展示包已加载：/scriptevent mbshow:list 查看全部结构'), 40)
