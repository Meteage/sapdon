// 构建期提交前钩子（`src/core/registry.ts` 的 `registry.beforeSubmit` / `GRegistry.beforeSubmit`）：
//   `node tests/registry-hook.test.mjs`（**需先 `tsc && tsc-alias` 生成 `dist/`**）
//
// `submit()` 最后经 `transportPost` 用全局 `fetch` 把数据 POST 给 dev server。
// 这里把 `fetch` 换成记录器，直接断言「真正发出去的载荷」；
// 每个用例用带查询串的 URL 重新 import `registry.js` ⇒ 注册表与钩子表都是全新的模块实例。
import { test } from 'node:test'
import assert from 'node:assert/strict'

const posts = []
globalThis.fetch = async (url, init) => {
    posts.push({ url: String(url), body: JSON.parse(init.body) })
    return { ok: true }
}

let seq = 0
async function freshRegistry() {
    posts.length = 0
    return import(`../dist/core/registry.js?case=${seq++}`)
}

/** 最近一次 POST 的注册项（`transportPost(path, data)` 的载荷是 `[data]`） */
function lastSubmitted() {
    assert.ok(posts.length > 0, 'submit 应该发出一次 POST')
    return posts.at(-1).body[0]
}

/** 一个带 `toObject()` 的最小可序列化对象 */
function serializable(value) {
    return { value, toObject() { return { value: this.value } } }
}

test('① 钩子在序列化之前执行，可以直接修改注册项的 data', async () => {
    const { GRegistry, registry } = await freshRegistry()
    GRegistry.register('tin_ingot', 'behavior', 'items/', serializable(['c:ingots.tin']))
    registry.beforeSubmit((entries) => {
        const tin = entries.find((entry) => entry.name === 'tin_ingot')
        tin.data.value = [...tin.data.value, 'c:ingots']
    })
    registry.submit()

    const [item] = lastSubmitted()
    assert.deepEqual(item.data, { value: ['c:ingots.tin', 'c:ingots'] })
})

test('② 钩子可以追加文件；后面的钩子能看到前面追加的项', async () => {
    const { GRegistry, registry } = await freshRegistry()
    GRegistry.register('a', 'behavior', 'items/', serializable(1))
    const seenBySecond = []
    registry.beforeSubmit(() => {
        GRegistry.register('recipe_tin_hammer', 'behavior', 'recipes/', { plain: true })
    })
    registry.beforeSubmit((entries) => {
        seenBySecond.push(...entries.map((entry) => entry.name))
    })
    registry.submit()

    assert.deepEqual(seenBySecond, ['a', 'recipe_tin_hammer'])
    assert.deepEqual(lastSubmitted().map((entry) => entry.name), ['a', 'recipe_tin_hammer'])
})

test('③ 两个入口共用同一张钩子表，按登记顺序执行，两种 submit 都会触发', async () => {
    const { GRegistry, registry } = await freshRegistry()
    const order = []
    registry.beforeSubmit(() => order.push('registry'))
    GRegistry.beforeSubmit(() => order.push('GRegistry'))

    registry.submit()
    assert.deepEqual(order, ['registry', 'GRegistry'])

    GRegistry.submit()
    assert.deepEqual(order, ['registry', 'GRegistry', 'registry', 'GRegistry'])
    assert.match(posts.at(-1).url, /submitGregistry$/)
})

test('④ 钩子拿到的是快照：改数组本身不影响注册表', async () => {
    const { GRegistry, registry } = await freshRegistry()
    GRegistry.register('a', 'behavior', 'items/', serializable(1))
    registry.beforeSubmit((entries) => {
        entries.length = 0
    })
    registry.submit()
    assert.deepEqual(lastSubmitted().map((entry) => entry.name), ['a'])
})

test('⑤ 钩子追加的同名文件按「后注册者胜」去重', async () => {
    const { GRegistry, registry } = await freshRegistry()
    GRegistry.register('a', 'behavior', 'items/', serializable('original'))
    registry.beforeSubmit(() => {
        GRegistry.register('a', 'behavior', 'items/', serializable('replaced'))
    })
    registry.submit()
    assert.deepEqual(lastSubmitted(), [{ name: 'a', root: 'behavior', path: 'items/', data: { value: 'replaced' } }])
})

test('⑥ 钩子抛错 ⇒ submit 抛错，且什么都不发', async () => {
    const { registry } = await freshRegistry()
    registry.beforeSubmit(() => { throw new Error('插件失败') })
    assert.throws(() => registry.submit(), /插件失败/)
    assert.equal(posts.length, 0)
})

test('⑦ 守卫：hook 必须是函数；钩子执行期间不能再登记钩子', async () => {
    const { registry, GRegistry } = await freshRegistry()
    assert.throws(() => registry.beforeSubmit('nope'), /hook 必须是函数/)
    assert.throws(() => GRegistry.beforeSubmit(undefined), /hook 必须是函数/)

    registry.beforeSubmit(() => registry.beforeSubmit(() => { }))
    assert.throws(() => registry.submit(), /钩子执行期间/)

    // 守卫触发后状态要复原：同一个注册表之后还能正常登记
    assert.doesNotThrow(() => registry.beforeSubmit(() => { }))
})
