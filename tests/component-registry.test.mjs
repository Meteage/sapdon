// 组件注册表（`src/oc/components/registry.ts`）的进程内行为验证：
//   `node tests/component-registry.test.mjs`（**需先 `tsc` 生成 `dist/`**）
//
// ## 为什么用「编译产物 + 桩」
//
// `registry.ts` 顶层 `import { system } from '@minecraft/server'`，而该包**只发 index.d.ts**，
// Node 里导入不了（`doc/dev/known-pitfalls.md` §5）。所以这里：
//   1. 读 `dist/oc/components/registry.js`（**真代码**，不是副本）；
//   2. 把它里面 `@minecraft/server` 的**说明符**改写成同目录的桩模块路径；
//   3. 每个用例用一份**全新的临时副本** import ⇒ 模块状态（队列 / 已注册表 / startup 标志）天然隔离。
// 桩只实现 registry.ts 真正碰到的东西：`system.beforeEvents.startup.subscribe` 与
// `init.{block,item}ComponentRegistry.registerCustomComponent`。
//
// ## 覆盖（P0-1 的「重复注册耦合」）
//
//   1. 项目没注册 → **内置兜底生效**
//   2. 项目注册了同 id（顺序：内置先 / 项目后）→ **项目生效**、内置被跳过、一条 warn、**不抛错**
//   3. 项目注册了同 id（顺序：项目先 / 内置后）→ 同上（**顺序无关**）
//   4. 项目重复注册同一个 id → **仍然抛错**（守卫不变）
//   5. 兜底登记重复（`registerBuiltinComponents()` 被调两次）→ **幂等**，只注册一次
//   6. `startup` 之后再做任何登记 → 抛错（守卫不变）
//
// ## 覆盖（同一世界里有多个 sapdon 包）
//
// 桩用 `preRegister(kind, id)` 模拟「另一个行为包已注册该 id」：此后再注册同 id，
// 桩会像引擎一样抛 `*CustomComponentAlreadyRegisteredError`。
//
//   8. 内置兜底已被其他包注册 → 沿用、不抛错、记入 `sharedFallbackComponents()`
//   9. 项目组件已被其他包注册 → 后续组件照常注册，最后抛出原错误
//  10. 一项未知错误 → 不中断其余注册，最后抛出原错误对象
//  11. 多项失败 → 一条汇总错误，逐项列出
//  12. instanceof 不成立时按错误类名识别「已被注册」
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const ARTIFACT = new URL('../dist/oc/components/registry.js', import.meta.url)
if (!fs.existsSync(ARTIFACT)) {
    throw new Error('缺少 dist/oc/components/registry.js —— 本测试需要先跑 `tsc`（见 doc/dev/workflow.md §2.3）')
}
const SOURCE = fs.readFileSync(ARTIFACT, 'utf8')

const STUB = `
const subscribers = []
const calls = []
const taken = new Set()
const failing = new Map()
export class BlockCustomComponentAlreadyRegisteredError extends Error {}
export class ItemCustomComponentAlreadyRegisteredError extends Error {}
export const system = {
    beforeEvents: {
        startup: {
            subscribe(cb) { subscribers.push(cb) },
        },
    },
}
/** 模拟「同一世界里的另一个行为包已注册该 id」 */
export function preRegister(kind, id) { taken.add(kind + ':' + id) }
/** 让某个 id 的注册抛出指定错误 */
export function failWith(kind, id, error) { failing.set(kind + ':' + id, error) }
function registryOf(kind, AlreadyRegistered) {
    return {
        registerCustomComponent(id, handlers) {
            const key = kind + ':' + id
            if (failing.has(key)) throw failing.get(key)
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

let seq = 0
const dirs = []

/** 造一份全新的「桩 + 改写后的 registry」临时副本，返回两个模块实例 */
async function harness() {
    const dir = path.join(os.tmpdir(), `sapdon-regtest-${process.pid}-${seq++}`)
    fs.mkdirSync(dir, { recursive: true })
    dirs.push(dir)
    fs.writeFileSync(path.join(dir, 'stub-server.mjs'), STUB)

    const rewritten = SOURCE.replace(/['"]@minecraft\/server['"]/g, "'./stub-server.mjs'")
    assert.notEqual(rewritten, SOURCE, 'dist 产物里没有 @minecraft/server 说明符 —— 本测试的改写规则需要更新')
    fs.writeFileSync(path.join(dir, 'registry.mjs'), rewritten)

    const stub = await import(pathToFileURL(path.join(dir, 'stub-server.mjs')).href)
    const registry = await import(pathToFileURL(path.join(dir, 'registry.mjs')).href)
    return { stub, registry }
}

/** 捕获 `console.warn`（框架的诊断走它） */
function captureWarn(fn) {
    const out = []
    const original = console.warn
    console.warn = (...args) => { out.push(args.map(String).join(' ')) }
    try { return { result: fn(), warnings: out } } finally { console.warn = original }
}

/** 同时捕获 `console.warn` / `console.error`，并记录 `fn` 抛出的错误（不抛出去） */
function captureConsole(fn) {
    const warnings = []
    const errors = []
    const originalWarn = console.warn
    const originalError = console.error
    console.warn = (...args) => { warnings.push(args.map(String).join(' ')) }
    console.error = (...args) => { errors.push(args.map(String).join(' ')) }
    let thrown
    try { fn() } catch (error) { thrown = error } finally {
        console.warn = originalWarn
        console.error = originalError
    }
    return { warnings, errors, thrown }
}

const ID = 'sapdon:block_with_entity'
const builtinHandlers = { onPlace() { } }
const projectHandlers = { onPlace() { }, onPlayerInteract() { } }

test.after(() => {
    for (const dir of dirs) { try { fs.rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略清理失败 */ } }
})

test('① 项目没注册 → 框架内置兜底生效', async () => {
    const { stub, registry } = await harness()
    registry.registerFallbackBlockComponent(ID, builtinHandlers)
    stub.fireStartup()

    assert.equal(stub.startupCalls().length, 1)
    assert.equal(stub.startupCalls()[0].kind, 'block')
    assert.equal(stub.startupCalls()[0].id, ID)
    assert.equal(stub.startupCalls()[0].handlers, builtinHandlers, '注册的必须是内置 handler 本体')
    assert.deepEqual(registry.registeredComponents(), [`block:${ID}`])
    assert.deepEqual(registry.skippedFallbackComponents(), [])
})

test('② 项目注册了同 id（内置先登记）→ 项目生效、内置跳过、**不抛错** + 一条 warn', async () => {
    const { stub, registry } = await harness()
    const { warnings } = captureWarn(() => {
        registry.registerFallbackBlockComponent(ID, builtinHandlers)
        registry.registerBlockComponent(ID, projectHandlers)   // ← 既有项目（如 fz-sapdon）的写法
        stub.fireStartup()
    })

    assert.equal(stub.startupCalls().length, 1, '同一个 id 只能提交给引擎一次')
    assert.equal(stub.startupCalls()[0].handlers, projectHandlers, '★ 生效的必须是**项目**的 handler')
    assert.deepEqual(registry.registeredComponents(), [`block:${ID}`])
    assert.deepEqual(registry.skippedFallbackComponents(), [`block:${ID}`])
    assert.equal(warnings.length, 1, '应恰好一条「内置被项目取代」的 warn')
    assert.match(warnings[0], /已由项目注册/)
    assert.match(warnings[0], /不是错误/)
})

test('③ 项目注册了同 id（项目先登记）→ 结果与②一致（**顺序无关**）', async () => {
    const { stub, registry } = await harness()
    const { warnings } = captureWarn(() => {
        registry.registerBlockComponent(ID, projectHandlers)   // ← 与②相反的顺序
        registry.registerFallbackBlockComponent(ID, builtinHandlers)
        stub.fireStartup()
    })

    assert.equal(stub.startupCalls().length, 1)
    assert.equal(stub.startupCalls()[0].handlers, projectHandlers)
    assert.deepEqual(registry.skippedFallbackComponents(), [`block:${ID}`])
    assert.equal(warnings.length, 1)
})

test('④ 项目自己重复注册同一个 id → **仍然抛错**（守卫不变）', async () => {
    const { registry } = await harness()
    registry.registerBlockComponent('fz:machine', { onTick() { } })
    assert.throws(
        () => registry.registerBlockComponent('fz:machine', { onTick() { } }),
        /被重复注册/
    )
})

test('⑤ 兜底登记是幂等的：registerBuiltinComponents() 被调两次只注册一次', async () => {
    const { stub, registry } = await harness()
    registry.registerFallbackBlockComponent(ID, builtinHandlers)
    registry.registerFallbackBlockComponent(ID, builtinHandlers)
    assert.equal(stub.subscriberCount(), 1, '重复登记不该重复装 startup 订阅')
    stub.fireStartup()
    assert.equal(stub.startupCalls().length, 1)
})

test('⑥ startup 之后再登记（项目/兜底都算）→ 抛错，且文案指向「太晚」', async () => {
    const { stub, registry } = await harness()
    registry.registerFallbackBlockComponent(ID, builtinHandlers)
    stub.fireStartup()

    assert.throws(() => registry.registerBlockComponent('fz:late', { onTick() { } }), /注册得太晚/)
    assert.throws(() => registry.registerFallbackBlockComponent('sapdon:late', { onTick() { } }), /注册得太晚/)
})

test('⑦ 项目与内置是**两张账**：项目注册的 id 不影响兜底的 `pendingComponentCount` 语义', async () => {
    const { stub, registry } = await harness()
    registry.registerBlockComponent('fz:machine', { onTick() { } })
    registry.registerFallbackBlockComponent(ID, builtinHandlers)
    assert.equal(registry.pendingComponentCount(), 1, 'pending 只算项目队列（兜底不走它）')
    stub.fireStartup()
    assert.equal(registry.pendingComponentCount(), 0)
    assert.deepEqual(registry.registeredComponents().sort(), [`block:${ID}`, 'block:fz:machine'].sort())
})

test('⑧ 内置兜底已被**其他包**注册 → 沿用那一份、不抛错、记入 sharedFallbackComponents', async () => {
    const { stub, registry } = await harness()
    stub.preRegister('block', ID)
    registry.registerBlockComponent('fz:machine', { onTick() { } })
    registry.registerFallbackBlockComponent(ID, builtinHandlers)

    const { warnings, errors, thrown } = captureConsole(() => stub.fireStartup())

    assert.equal(thrown, undefined, '其他包已提供内置组件不是错误')
    assert.deepEqual(errors, [])
    assert.deepEqual(registry.registeredComponents(), ['block:fz:machine'])
    assert.deepEqual(registry.sharedFallbackComponents(), [`block:${ID}`])
    assert.deepEqual(registry.skippedFallbackComponents(), [], '不是「被项目取代」，两种诊断不能混')
    assert.equal(warnings.length, 1)
    assert.match(warnings[0], /其他行为包/)
})

test('⑨ 项目组件已被**其他包**注册 → 后续组件照常注册，最后抛出原错误', async () => {
    const { stub, registry } = await harness()
    stub.preRegister('block', ID)                                   // 另一个包的内置实现抢先
    registry.registerBlockComponent(ID, projectHandlers)             // 本包认领了同一个 sapdon:* id
    registry.registerBlockComponent('fz:machine', { onTick() { } })  // 排在后面的项目组件
    registry.registerFallbackBlockComponent('sapdon:crop_growth', builtinHandlers)

    const { errors, thrown } = captureConsole(() => stub.fireStartup())

    assert.ok(thrown, '本包实现不会生效，必须报出来')
    assert.equal(thrown.constructor.name, 'BlockCustomComponentAlreadyRegisteredError', '只有一项失败时抛原错误对象')
    assert.deepEqual(
        registry.registeredComponents().sort(),
        ['block:fz:machine', 'block:sapdon:crop_growth'].sort(),
        '★ 一项失败不能中断后面的注册'
    )
    assert.equal(errors.length, 1)
    assert.match(errors[0], /不会生效/)
    assert.match(errors[0], /sapdon:block_with_entity/)
})

test('⑩ 一项未知错误 → 不中断其余注册，最后抛出原错误对象', async () => {
    const { stub, registry } = await harness()
    const boom = new TypeError('handlers 不合法')
    stub.failWith('block', 'fz:broken', boom)
    registry.registerBlockComponent('fz:broken', { onTick() { } })
    registry.registerBlockComponent('fz:machine', { onTick() { } })
    registry.registerItemComponent('fz:guide', { onUse() { } })

    const { errors, thrown } = captureConsole(() => stub.fireStartup())

    assert.equal(thrown, boom, '原错误对象原样抛出（类型与堆栈都保留）')
    assert.deepEqual(registry.registeredComponents().sort(), ['block:fz:machine', 'item:fz:guide'].sort())
    assert.equal(errors.length, 1)
    assert.match(errors[0], /fz:broken/)
})

test('⑪ 多项失败 → 一条汇总错误，逐项列出', async () => {
    const { stub, registry } = await harness()
    stub.failWith('block', 'fz:a', new Error('坏了 A'))
    stub.failWith('item', 'fz:b', new Error('坏了 B'))
    registry.registerBlockComponent('fz:a', { onTick() { } })
    registry.registerItemComponent('fz:b', { onUse() { } })
    registry.registerBlockComponent('fz:ok', { onTick() { } })

    const { thrown } = captureConsole(() => stub.fireStartup())

    assert.ok(thrown instanceof Error)
    assert.match(thrown.message, /2 个自定义组件注册失败/)
    assert.match(thrown.message, /block:fz:a: 坏了 A/)
    assert.match(thrown.message, /item:fz:b: 坏了 B/)
    assert.deepEqual(registry.registeredComponents(), ['block:fz:ok'])
})

test('⑫ instanceof 不成立时按错误类名识别「已被注册」', async () => {
    const { stub, registry } = await harness()
    // 与桩导出的类**不是**同一个类，只是同名 —— 模拟跨上下文的原生错误
    const Foreign = class BlockCustomComponentAlreadyRegisteredError extends Error { }
    stub.failWith('block', ID, new Foreign('already registered'))
    registry.registerFallbackBlockComponent(ID, builtinHandlers)

    const { thrown } = captureConsole(() => stub.fireStartup())

    assert.equal(thrown, undefined)
    assert.deepEqual(registry.sharedFallbackComponents(), [`block:${ID}`])
})
