#!/usr/bin/env node
// 展示包冒烟测试：把 dev/ 下真实的 scripts/index.js 放进假引擎，摆出全部结构并逐一触发。
//   先在本目录 `sapdon compile`，再 `node test/smoke.mjs`
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const bundle = path.join(here, '..', 'dev', 'multiblock_showcase_BP', 'scripts', 'index.js')
const fakeSrc = path.join(here, '..', '..', '..', 'tests', 'fixtures', 'fake-minecraft-world.mjs')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mbshow-'))
fs.copyFileSync(fakeSrc, path.join(tmp, 'fake.mjs'))
const mc = await import(pathToFileURL(path.join(tmp, 'fake.mjs')).href)

// 产物里用到、假引擎没有的 @minecraft/server 导出 → 空对象
let source = fs.readFileSync(bundle, 'utf8')
const wanted = new Set()
for (const m of source.matchAll(/^import\s*\{([^}]*)\}\s*from\s*['"]@minecraft\/server['"]/gm)) {
    for (const part of m[1].split(',')) { const name = part.trim().split(/\s+as\s+/)[0]; if (name) wanted.add(name) }
}
const missing = [...wanted].filter((n) => !(n in mc))
fs.writeFileSync(path.join(tmp, 'server.mjs'), `export * from './fake.mjs'\n${missing.map((n) => `export const ${n} = {}`).join('\n')}\n`)
fs.writeFileSync(path.join(tmp, 'server-ui.mjs'), 'export class ActionFormData {}\nexport class ModalFormData {}\nexport class MessageFormData {}\n')
source = source.replace(/(['"])@minecraft\/server-ui\1/g, "'./server-ui.mjs'").replace(/(['"])@minecraft\/server\1/g, "'./server.mjs'")
fs.writeFileSync(path.join(tmp, 'index.mjs'), source)

const consoleLines = []
for (const level of ['log', 'warn', 'error']) console[level] = (...a) => consoleLines.push(`[${level}] ${a.join(' ')}`)
const out = (s) => process.stdout.write(s + '\n')

await import(pathToFileURL(path.join(tmp, 'index.mjs')).href)
mc.fireStartup()

const effects = []
const player = {
    typeId: 'minecraft:player', location: { x: 0, y: 64, z: 0 }, dimension: mc.overworld, selectedSlotIndex: 0,
    getGameMode: () => 'Survival', addEffect: (id, d) => effects.push(id), sendMessage: (m) => mc.state.messages.push(String(m)),
    getComponent: (n) => (n === 'minecraft:inventory' ? { container: { getItem: () => undefined, setItem() { }, addItem() { } } } : undefined),
    view: undefined, getBlockFromViewDirection() { return this.view ? { block: mc.getBlock(this.view) } : undefined },
}
const cmd = (id, message = '') => mc.fire('system.after', 'scriptEventReceive', { id, message, sourceEntity: player, sourceType: 'Entity' })
const at = (x, y, z) => ({ x, y, z })
const chat = () => mc.state.messages.join('\n')
const build = (key, x) => { player.location = at(x, 64, 0); cmd('mbshow:build', key) }   // 结构摆在 (x+3, 64, -1) 起

const checks = []
const expect = (name, ok) => checks.push([name, !!ok])

// 1 反应核：金剑右键 → 成形 30 秒 → 化为黑曜石
build('reactor', 0)
const core = at(4, 65, 0)
expect('reactor 摆放：核心是下界反应核', mc.typeAt(core) === 'minecraft:netherreactor')
const sword = { isFirstEvent: true, block: mc.getBlock(core), itemStack: new mc.ItemStack('minecraft:golden_sword'), player, cancel: false }
mc.fire('before', 'playerInteractWithBlock', sword)
mc.step(1)
expect('reactor 取消原版行为', sword.cancel === true)
expect('reactor 开始反应', /反应开始/.test(chat()))
mc.step(20 * 31)
expect('reactor 期间掉落、刷出僵尸猪灵', mc.state.drops.length >= 6 && mc.state.spawns.filter((s) => s.id === 'minecraft:zombie_pigman').length === 2)
expect('reactor 结束化为黑曜石', /反应结束/.test(chat()) && mc.typeAt(at(3, 64, -1)) === 'minecraft:obsidian')

// 2 符文石阵：法杖组件
build('runes', 20)
const wand = mc.state.itemComponents.get('mbshow:wand_activate')
wand?.onUseOn({ block: mc.getBlock(at(23, 64, -1)), source: player, itemStack: new mc.ItemStack('mbshow:wand') })
expect('runes 法杖组件触发并给予生命恢复', wand && effects.includes('regeneration') && /符文石阵/.test(chat()))

// 3 方尖碑：放下最后一块
build('obelisk', 40)
mc.fire('after', 'playerPlaceBlock', { dimension: mc.overworld, block: mc.getBlock(at(43, 66, -1)), player })
expect('obelisk 放下即成形，顶端变紫水晶', mc.typeAt(at(43, 66, -1)) === 'minecraft:amethyst_block')

// 4 红石祭坛：压力板上升沿
build('altar', 60)
mc.fire('after', 'pressurePlatePush', { dimension: mc.overworld, block: mc.getBlock(at(64, 65, 0)), previousRedstonePower: 0, redstonePower: 15 })
mc.fire('after', 'targetBlockHit', { dimension: mc.overworld, block: mc.getBlock(at(64, 64, 0)) })
expect('altar 压力板与标靶都能触发', /由 pressurePlate 触发/.test(chat()) && /由 target 触发/.test(chat()))

// 5 魔力水池：铁锭扔进水
build('pool', 80)
const iron = new mc.FakeEntity('minecraft:item', at(84.5, 65.2, 0.5), { itemStack: new mc.ItemStack('minecraft:iron_ingot') })
mc.fire('after', 'entitySpawn', { entity: iron })
mc.step(10)
expect('pool 铁锭变金锭', /iron_ingot → minecraft:gold_ingot/.test(chat()) && mc.state.drops.some((d) => d.typeId === 'minecraft:gold_ingot'))

// 6 爆炸熔炉：沙子不被炸掉、变成玻璃
build('furnace', 100)
const sand = at(104, 65, 0)
let kept
mc.fire('before', 'explosion', { dimension: mc.overworld, source: { typeId: 'minecraft:tnt' }, getImpactedBlocks: () => [mc.getBlock(sand)], setImpactedBlocks: (b) => { kept = b } })
mc.step(1)
expect('furnace 沙子受保护并变成玻璃', kept?.length === 0 && mc.typeAt(sand) === 'minecraft:glass')

// 7 爆炸变种：只认 TNT
mc.setBlock(at(120, 64, 0), 'minecraft:cobblestone')
mc.setBlock(at(121, 64, 0), 'minecraft:cobblestone')
let keptCreeper
mc.fire('before', 'explosion', { dimension: mc.overworld, source: { typeId: 'minecraft:creeper' }, getImpactedBlocks: () => [mc.getBlock(at(121, 64, 0))], setImpactedBlocks: (b) => { keptCreeper = b } })
mc.fire('before', 'explosion', { dimension: mc.overworld, source: { typeId: 'minecraft:tnt' }, getImpactedBlocks: () => [mc.getBlock(at(120, 64, 0))], setImpactedBlocks() { } })
mc.step(1)
expect('variants TNT 把圆石炸成沙砾，苦力怕不算', mc.typeAt(at(120, 64, 0)) === 'minecraft:gravel' && keptCreeper === undefined && mc.typeAt(at(121, 64, 0)) === 'minecraft:cobblestone')

// 8 稻草人：箭命中
build('scarecrow', 140)
mc.fire('after', 'projectileHitBlock', { dimension: mc.overworld, projectile: { typeId: 'minecraft:arrow' }, getBlockHit: () => ({ block: mc.getBlock(at(143, 65, -1)) }) })
expect('scarecrow 箭命中', /稻草人靶：命中/.test(chat()))

// 9 避雷针：闪电
build('rig', 160)
mc.fire('after', 'entitySpawn', { entity: new mc.FakeEntity('minecraft:lightning_bolt', at(164.5, 65, 0.5)) })
expect('rig 闪电充能', /避雷针充能台/.test(chat()))

// 手动：检测与投影
player.view = at(84, 64, 0)
cmd('mbshow:check')
expect('check 识别准星方块所属结构', /属于 mbshow:mana_pool/.test(chat()))
mc.setBlock(at(83, 64, -1), 'minecraft:dirt')
player.view = at(84, 65, 0)
cmd('mbshow:preview', 'pool')
expect('preview 报出缺的格子', /pool：符合 17 \/ 18/.test(chat()))
cmd('mbshow:list')
expect('list 列出全部 8 个结构', (chat().match(/^\[多方块\]   /gm) ?? []).length >= 0 && /reactor/.test(chat()) && /rig/.test(chat()))

out('══════ 断言 ══════')
let failed = 0
for (const [name, ok] of checks) { out(`${ok ? '✔' : '✘'} ${name}`); if (!ok) failed++ }
const errors = consoleLines.filter((l) => l.startsWith('[error]'))
if (errors.length) { out('\n══════ 控制台错误 ══════'); errors.forEach((l) => out(l)); failed++ }
if (process.env.DUMP) out(chat())
fs.rmSync(tmp, { recursive: true, force: true })
out(failed ? `\n${failed} 项失败` : '\n全部通过')
process.exit(failed ? 1 : 0)
