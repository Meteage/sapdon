import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
    saveChunked,
    loadChunked,
    clearChunked,
    chunkKey,
    chunkMetaJson,
    parseChunkCount,
    looksLikeChunkMeta,
    splitValue,
    CHUNK_SIZE,
    MAX_CHUNK_SCAN,
} from '../dist/oc/persist/chunked.js'

// ── 内存版 DynamicPropertyTarget（等价 world/Entity/ItemStack 的语义）──
// enumerate: true 时提供 getDynamicPropertyIds()（新版引擎），false 走兜底扫描路径。
function makeStore({ enumerate = true } = {}) {
    const map = new Map()
    const store = {
        setCalls: 0,
        getCalls: 0,
        getDynamicProperty(id) { store.getCalls++; return map.get(id) },
        setDynamicProperty(id, value) {
            store.setCalls++
            if (value === undefined) map.delete(id)
            else map.set(id, value)
        },
        _map: map,
        _keys() { return [...map.keys()] },
    }
    if (enumerate) store.getDynamicPropertyIds = () => [...map.keys()]
    return store
}

// ── 纯函数 ──
test('splitValue：按 size 切分且可无损拼回', () => {
    assert.deepEqual(splitValue('', 4), [''])
    assert.deepEqual(splitValue('abcd', 4), ['abcd'])
    assert.deepEqual(splitValue('abcde', 4), ['abcd', 'e'])
    assert.deepEqual(splitValue('abcdefgh', 3), ['abc', 'def', 'gh'])
    const long = 'x'.repeat(CHUNK_SIZE * 2 + 7)
    const parts = splitValue(long)
    assert.equal(parts.length, 3)
    assert.equal(parts.join(''), long)
    assert.equal(parts[0].length, CHUNK_SIZE)
})

test('splitValue：非法 size 抛错', () => {
    assert.throws(() => splitValue('abc', 0), /size 必须是正整数/)
    assert.throws(() => splitValue('abc', 1.5), /size 必须是正整数/)
})

test('parseChunkCount：只认「仅含整型 _chunks」的对象', () => {
    assert.equal(parseChunkCount(chunkMetaJson(3)), 3)
    assert.equal(parseChunkCount('{"_chunks":0}'), 0)
    assert.equal(parseChunkCount('{"_chunks":3,"x":1}'), undefined)
    assert.equal(parseChunkCount('{"_chunks":"3"}'), undefined)
    assert.equal(parseChunkCount('{"_chunks":-1}'), undefined)
    assert.equal(parseChunkCount('{"_chunks":1.5}'), undefined)
    assert.equal(parseChunkCount('[1,2]'), undefined)
    assert.equal(parseChunkCount('{不是 json'), undefined)
    assert.equal(parseChunkCount('普通字符串'), undefined)
    assert.equal(parseChunkCount(42), undefined)
    assert.equal(parseChunkCount(undefined), undefined)
})

test('looksLikeChunkMeta：识别元数据形态的原文', () => {
    assert.equal(looksLikeChunkMeta('{"_chunks":2}'), true)
    assert.equal(looksLikeChunkMeta('{"v":1}'), false)
})

// ── ① 分块：超限自动切块 ──
test('① 超限值自动分块，主 key 存 {"_chunks":N}', () => {
    const s = makeStore()
    const big = 'A'.repeat(CHUNK_SIZE * 2 + 10)
    saveChunked(s, 'fz:data', big)

    assert.equal(s.getDynamicProperty('fz:data'), chunkMetaJson(3))
    assert.equal(s.getDynamicProperty(chunkKey('fz:data', 0)).length, CHUNK_SIZE)
    assert.equal(s.getDynamicProperty(chunkKey('fz:data', 1)).length, CHUNK_SIZE)
    assert.equal(s.getDynamicProperty(chunkKey('fz:data', 2)).length, 10)
    assert.equal(loadChunked(s, 'fz:data'), big)
    assert.deepEqual(s._keys().sort(), ['fz:data', 'fz:data#0', 'fz:data#1', 'fz:data#2'])
})

test('① 恰好等于 CHUNK_SIZE 不分块；+1 就分块（边界）', () => {
    const s = makeStore()
    const exact = 'B'.repeat(CHUNK_SIZE)
    saveChunked(s, 'k', exact)
    assert.equal(s.getDynamicProperty('k'), exact)
    assert.equal(loadChunked(s, 'k'), exact)

    const over = 'B'.repeat(CHUNK_SIZE + 1)
    saveChunked(s, 'k', over)
    assert.equal(s.getDynamicProperty('k'), chunkMetaJson(2))
    assert.equal(loadChunked(s, 'k'), over)
})

test('① 元数据形态的原文被强制分块，读回不歧义', () => {
    const s = makeStore()
    const tricky = '{"_chunks":2}'
    saveChunked(s, 'k', tricky)
    assert.equal(s.getDynamicProperty('k'), chunkMetaJson(1))
    assert.equal(s.getDynamicProperty(chunkKey('k', 0)), tricky)
    assert.equal(loadChunked(s, 'k'), tricky)
})

test('① 空串 → 分块路径下为单块空串', () => {
    assert.deepEqual(splitValue('', 10), [''])
})

// ── ② 幂等 / 可重复 ──
test('② 同一份数据连存两次结果一致', () => {
    const s1 = makeStore()
    const s2 = makeStore()
    const big = 'C'.repeat(CHUNK_SIZE + 500) + '尾部'
    saveChunked(s1, 'k', big)
    const snap1 = JSON.stringify(s1._keys().sort().map((id) => [id, s1.getDynamicProperty(id)]))
    saveChunked(s1, 'k', big)
    const snap2 = JSON.stringify(s1._keys().sort().map((id) => [id, s1.getDynamicProperty(id)]))
    assert.equal(snap1, snap2)

    saveChunked(s2, 'k', big)
    const snap3 = JSON.stringify(s2._keys().sort().map((id) => [id, s2.getDynamicProperty(id)]))
    assert.equal(snap1, snap3)
})

test('② 大→小：旧分块被清干净（无残留脏块）', () => {
    const s = makeStore()
    saveChunked(s, 'k', 'D'.repeat(CHUNK_SIZE * 3))
    assert.equal(s.getDynamicProperty('k'), chunkMetaJson(3))
    saveChunked(s, 'k', '短值')
    assert.deepEqual(s._keys(), ['k'])
    assert.equal(loadChunked(s, 'k'), '短值')
})

test('② 小→大→小 反复切换仍一致', () => {
    const s = makeStore()
    for (const v of ['a', 'E'.repeat(CHUNK_SIZE * 2), 'b', 'E'.repeat(CHUNK_SIZE * 2), 'c']) {
        saveChunked(s, 'k', v)
        assert.equal(loadChunked(s, 'k'), v)
    }
})

// ── ③ 清空 ──
test('③ clearChunked 后回到「从没存过」', () => {
    const s = makeStore()
    saveChunked(s, 'k', 'F'.repeat(CHUNK_SIZE * 2))
    assert.notEqual(loadChunked(s, 'k'), undefined)
    clearChunked(s, 'k')
    assert.equal(loadChunked(s, 'k'), undefined)
    assert.deepEqual(s._keys(), [])
})

test('③ clearChunked 删掉比声明的 N 更高的残留分块', () => {
    const s = makeStore()
    // 模拟旧实现/崩溃留下的脏块：主 key 只声明 1 块，磁盘上却有 #0..#5
    s.setDynamicProperty('k', chunkMetaJson(1))
    for (let i = 0; i < 6; i++) s.setDynamicProperty(chunkKey('k', i), `part${i}`)
    clearChunked(s, 'k')
    assert.deepEqual(s._keys(), [])
})

test('③ clearChunked 不误删相邻 key（前缀相同但不是分块）', () => {
    const s = makeStore()
    saveChunked(s, 'k', 'G'.repeat(CHUNK_SIZE * 2))
    saveChunked(s, 'k2', '另一个键')
    saveChunked(s, 'k#x', '后缀不是数字')
    clearChunked(s, 'k')
    assert.deepEqual(s._keys().sort(), ['k#x', 'k2'])
    assert.equal(loadChunked(s, 'k2'), '另一个键')
})

// ── ④ 空值语义 ──
test('④ 区分「没存过」与「存了空串」', () => {
    const s = makeStore()
    assert.equal(loadChunked(s, 'k'), undefined) // 没存过
    saveChunked(s, 'k', '')                      // 存空串
    assert.equal(loadChunked(s, 'k'), '')        // 不是 undefined
    assert.notEqual(loadChunked(s, 'k'), undefined)
    clearChunked(s, 'k')
    assert.equal(loadChunked(s, 'k'), undefined)
})

// ── ⑤ 绝不吞异常 ──
test('⑤ 底层 setDynamicProperty 抛错时原样抛出（不静默丢存档）', () => {
    const s = makeStore()
    s.setDynamicProperty = () => { throw new Error('Dynamic property value is too large') }
    assert.throws(() => saveChunked(s, 'k', 'H'.repeat(10)), /too large/)
})

test('⑤ 分块存档损坏时抛错，而不是返回半截数据', () => {
    const s = makeStore()
    s.setDynamicProperty('k', chunkMetaJson(3))
    s.setDynamicProperty(chunkKey('k', 0), 'aaa')
    s.setDynamicProperty(chunkKey('k', 1), 'bbb')
    // #2 缺失
    assert.throws(() => loadChunked(s, 'k'), /分块存档损坏/)
})

test('⑤ 主 key 被非字符串占用时抛错', () => {
    const s = makeStore()
    s.setDynamicProperty('k', 42)
    assert.throws(() => loadChunked(s, 'k'), /只读写字符串/)
})

test('⑤ 非字符串 value / 空 key 抛错', () => {
    const s = makeStore()
    assert.throws(() => saveChunked(s, 'k', 123), /必须是字符串/)
    assert.throws(() => saveChunked(s, 'k', { a: 1 }), /必须是字符串/)
    assert.throws(() => saveChunked(s, '', 'x'), /key 不能为空/)
    assert.throws(() => loadChunked(s, ''), /key 不能为空/)
    assert.throws(() => clearChunked(s, ''), /key 不能为空/)
})

// ── ⑥ 兼容性：与既有实现的格式互通 ──
test('⑥ 能读 BaseEngine/digitCircuit 写出的分块格式', () => {
    const s = makeStore()
    const payload = JSON.stringify({ v: 1, _w: ['1,2,3'] }) + 'J'.repeat(CHUNK_SIZE + 5)
    const n = Math.ceil(payload.length / CHUNK_SIZE)
    // 模拟既有实现：主 key 存 {"_chunks":N}，数据块 key#0..N-1
    s.setDynamicProperty('sapdos:circuit_data', JSON.stringify({ _chunks: n }))
    for (let i = 0; i < n; i++) {
        s.setDynamicProperty(`sapdos:circuit_data#${i}`, payload.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE))
    }
    assert.equal(loadChunked(s, 'sapdos:circuit_data'), payload)
})

test('⑥ 无 getDynamicPropertyIds() 时走兜底扫描路径，行为一致', () => {
    const s = makeStore({ enumerate: false })
    const big = 'K'.repeat(CHUNK_SIZE * 2 + 3)
    saveChunked(s, 'k', big)
    assert.equal(loadChunked(s, 'k'), big)
    saveChunked(s, 'k', '小')
    assert.deepEqual(s._keys(), ['k'])
    clearChunked(s, 'k')
    assert.equal(loadChunked(s, 'k'), undefined)
    assert.ok(MAX_CHUNK_SCAN >= 32)
})
