// 内置组件（`src/oc/builtin/index.ts` 的 `registerBuiltinComponents()`）的进程内验证：
//   `node tests/builtin-components.test.mjs`（**需先 `tsc && tsc-alias` 生成 `dist/`**）
//
// 做法与 `component-registry.test.mjs` 相同（编译产物 + 桩），区别是这里要把**整棵** `dist/oc/builtin`
// 与 `dist/oc/components` 拷进临时目录：`builtin/index.js` 经相对路径引用注册表，
// 两边必须是同一份模块实例。所有 `@minecraft/server` / `@minecraft/server-ui` 说明符改写成桩。
//
// ## 覆盖
//
//   1. 六个内置组件（5 方块 + 1 物品）全部经兜底通道、在**一个** startup 回调里注册
//   2. `registerBuiltinComponents()` 调两次 → 幂等
//   3. 项目自己注册了某个内置 id → 项目实现生效、内置跳过
//   4. 同一世界里另一个 sapdon 包已注册全部内置 id → 不抛错，六个都记入 `sharedFallbackComponents()`
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const DIST_OC = path.resolve(here, '..', 'dist', 'oc')
if (!fs.existsSync(path.join(DIST_OC, 'builtin', 'index.js'))) {
    throw new Error('缺少 dist/oc/builtin/index.js —— 本测试需要先跑 `tsc && tsc-alias`（见 doc/dev/workflow.md §2.3）')
}

const SERVER_STUB = `
const subscribers = []
const calls = []
const taken = new Set()
export class BlockCustomComponentAlreadyRegisteredError extends Error {}
export class ItemCustomComponentAlreadyRegisteredError extends Error {}
export const system = { beforeEvents: { startup: { subscribe(cb) { subscribers.push(cb) } } } }
export const world = {}
export const EquipmentSlot = { Mainhand: 'Mainhand' }
export const GameMode = { Creative: 'Creative', creative: 'creative' }
export function preRegister(kind, id) { taken.add(kind + ':' + id) }
function registryOf(kind, AlreadyRegistered) {
    return {
        registerCustomComponent(id, handlers) {
            const key = kind + ':' + id
            if (taken.has(key)) throw new AlreadyRegistered('Custom component ' + id + ' already registered')
            taken.add(key)
            calls.push({ kind, id, handlers })
        },
    }
}
export function fireStartup() {
    const init = {
        blockComponentRegistry: registryOf('block', BlockCustomComponentAlreadyRegisteredError),
        itemComponentRegistry: registryOf('item', ItemCustomComponentAlreadyRegisteredError),
    }
    for (const cb of subscribers) cb(init)
}
export function startupCalls() { return calls }
export function subscriberCount() { return subscribers.length }
`
const UI_STUB = `export class ActionFormData {}\n`

const BUILTIN_IDS = [
    'block:sapdon:block_with_entity',
    'block:sapdon:crop_growth',
    'block:sapdon:fallingblock',
    'block:sapdon:head_rotation',
    'block:sapdon:intercardinal_orientation',
    'item:sapdon:guibook',
]

let seq = 0
const dirs = []

/** 把 builtin + components 两棵目录拷进全新的临时目录并改写说明符，返回各模块实例 */
async function harness() {
    const root = path.join(os.tmpdir(), `sapdon-builtin-${process.pid}-${seq++}`)
    dirs.push(root)
    fs.mkdirSync(root, { recursive: true })
    const serverStub = path.join(root, 'stub-server.mjs')
    const uiStub = path.join(root, 'stub-server-ui.mjs')
    fs.writeFileSync(serverStub, SERVER_STUB)
    fs.writeFileSync(uiStub, UI_STUB)

    let rewrites = 0
    for (const sub of ['builtin', 'components']) {
        fs.cpSync(path.join(DIST_OC, sub), path.join(root, sub), { recursive: true })
        for (const file of fs.readdirSync(path.join(root, sub), { recursive: true })) {
            const full = path.join(root, sub, String(file))
            if (!full.endsWith('.js')) continue
            const source = fs.readFileSync(full, 'utf8')
            const rewritten = source
                .replace(/(['"])@minecraft\/server-ui\1/g, `'${pathToFileURL(uiStub).href}'`)
                .replace(/(['"])@minecraft\/server\1/g, `'${pathToFileURL(serverStub).href}'`)
            if (rewritten !== source) rewrites++
            fs.writeFileSync(full, rewritten)
        }
    }
    assert.ok(rewrites > 0, 'dist 产物里没有 @minecraft/* 说明符 —— 本测试的改写规则需要更新')

    const stub = await import(pathToFileURL(serverStub).href)
    const builtin = await import(pathToFileURL(path.join(root, 'builtin', 'index.js')).href)
    const registry = await import(pathToFileURL(path.join(root, 'components', 'registry.js')).href)
    return { stub, builtin, registry }
}

/** 捕获 `console.warn`，并记录 `fn` 抛出的错误（不抛出去） */
function capture(fn) {
    const warnings = []
    const original = console.warn
    console.warn = (...args) => { warnings.push(args.map(String).join(' ')) }
    let thrown
    try { fn() } catch (error) { thrown = error } finally { console.warn = original }
    return { warnings, thrown }
}

test.after(() => {
    for (const dir of dirs) { try { fs.rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略清理失败 */ } }
})

test('① 六个内置组件全部经兜底通道、在一个 startup 回调里注册', async () => {
    const { stub, builtin, registry } = await harness()
    builtin.registerBuiltinComponents()
    assert.equal(stub.subscriberCount(), 1, '只能有注册表自己的那一个 startup 订阅')

    const { thrown } = capture(() => stub.fireStartup())

    assert.equal(thrown, undefined)
    assert.deepEqual(registry.registeredComponents().sort(), [...BUILTIN_IDS].sort())
    assert.deepEqual(registry.pendingComponentCount(), 0, '内置组件不占项目队列')
})

test('② registerBuiltinComponents() 调两次 → 幂等', async () => {
    const { stub, builtin, registry } = await harness()
    builtin.registerBuiltinComponents()
    builtin.registerBuiltinComponents()
    assert.equal(stub.subscriberCount(), 1)

    const { thrown } = capture(() => stub.fireStartup())

    assert.equal(thrown, undefined, '旧实现在这里会因同 id 注册两次而抛错')
    assert.equal(stub.startupCalls().length, BUILTIN_IDS.length)
})

test('③ 项目自己注册了某个内置 id → 项目实现生效、内置跳过', async () => {
    const { stub, builtin, registry } = await harness()
    const projectHandlers = { onRandomTick() { } }
    registry.registerBlockComponent('sapdon:crop_growth', projectHandlers)
    builtin.registerBuiltinComponents()

    const { thrown, warnings } = capture(() => stub.fireStartup())

    assert.equal(thrown, undefined)
    const crop = stub.startupCalls().filter((call) => call.id === 'sapdon:crop_growth')
    assert.equal(crop.length, 1)
    assert.equal(crop[0].handlers, projectHandlers)
    assert.deepEqual(registry.skippedFallbackComponents(), ['block:sapdon:crop_growth'])
    assert.equal(warnings.length, 1)
})

test('④ 另一个 sapdon 包已注册全部内置 id → 不抛错，六个都沿用', async () => {
    const { stub, builtin, registry } = await harness()
    for (const tag of BUILTIN_IDS) {
        const [kind, ...rest] = tag.split(':')
        stub.preRegister(kind, rest.join(':'))
    }
    registry.registerBlockComponent('fz:machine', { onTick() { } })
    builtin.registerBuiltinComponents()

    const { thrown, warnings } = capture(() => stub.fireStartup())

    assert.equal(thrown, undefined, '多个 sapdon 包共存不是错误')
    assert.deepEqual(registry.registeredComponents(), ['block:fz:machine'], '本包自己的组件照常注册')
    assert.deepEqual(registry.sharedFallbackComponents().sort(), [...BUILTIN_IDS].sort())
    assert.equal(warnings.length, BUILTIN_IDS.length)
})
