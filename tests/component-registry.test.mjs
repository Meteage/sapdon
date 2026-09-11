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
export const system = {
    beforeEvents: {
        startup: {
            subscribe(cb) { subscribers.push(cb) },
        },
    },
}
export function fireStartup() {
    const init = {
        blockComponentRegistry: { registerCustomComponent: (id, handlers) => calls.push({ kind: 'block', id, handlers }) },
        itemComponentRegistry: { registerCustomComponent: (id, handlers) => calls.push({ kind: 'item', id, handlers }) },
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
