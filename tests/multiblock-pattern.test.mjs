// 多方块图案（`src/oc/multiblock/pattern.ts`，纯逻辑）：
//   `node tests/multiblock-pattern.test.mjs`（**需先 `tsc && tsc-alias` 生成 `dist/`**）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Is, MultiblockPattern, orient } from '../dist/oc/multiblock/pattern.js'

/** 用 Map 模拟世界：key "x,y,z" → { typeId, states, tags } */
function worldOf(entries = []) {
    const map = new Map(entries.map(([p, id, extra = {}]) => [`${p.x},${p.y},${p.z}`, { typeId: id, ...extra }]))
    const read = (pos) => {
        const b = map.get(`${pos.x},${pos.y},${pos.z}`)
        const typeId = b?.typeId ?? 'minecraft:air'
        return { typeId, states: () => b?.states ?? {}, tags: () => b?.tags ?? [] }
    }
    return { map, read, set: (p, id, extra = {}) => map.set(`${p.x},${p.y},${p.z}`, { typeId: id, ...extra }), del: (p) => map.delete(`${p.x},${p.y},${p.z}`) }
}

/** 把图案按某个朝向「摆」进世界：每格放判断的示例方块 */
function place(pattern, anchor, o, w = worldOf()) {
    for (const c of pattern.layout(anchor, o)) {
        const ex = pattern.where[c.char].example
        if (ex) w.set(c.pos, ex.id, { states: ex.states })
    }
    return w
}

// 不对称的 L 形：用来区分朝向与镜像
const L = () => new MultiblockPattern({
    aisles: [['GC ', 'C  ', 'C  '], ['R  ', '   ', '   ']],
    where: { G: Is.block('minecraft:gold_block'), C: Is.block('minecraft:cobblestone'), R: Is.block('minecraft:netherreactor') },
    anchor: 'R',
})

test('朝向：facing=1 把北（-z）转到东（+x），四次回到原处', () => {
    assert.deepEqual(orient({ x: 0, y: 0, z: -1 }, { facing: 1, mirrored: false }), { x: 1, y: 0, z: 0 })
    assert.deepEqual(orient({ x: 1, y: 0, z: 0 }, { facing: 1, mirrored: false }), { x: 0, y: 0, z: 1 })
    assert.deepEqual(orient({ x: 2, y: 3, z: 5 }, { facing: 0, mirrored: true }), { x: -2, y: 3, z: 5 })
})

test('四个朝向都能匹配，结果给出正确的朝向与各字符的格子', () => {
    const p = L()
    const anchor = { x: 10, y: 64, z: -7 }
    for (const facing of [0, 1, 2, 3]) {
        const w = place(p, anchor, { facing, mirrored: false })
        const m = p.matchAt(anchor, w.read)
        assert.ok(m, `facing ${facing}`)
        assert.equal(m.facing, facing)
        assert.equal(m.cells.C.length, 3)
        assert.deepEqual(m.cells.R, [anchor])
    }
})

test('从结构的任意一格反推锚点（放置 / 红石 / 命中等触发用）', () => {
    const p = L()
    const anchor = { x: 0, y: 70, z: 0 }
    for (const facing of [0, 1, 2, 3]) {
        const w = place(p, anchor, { facing, mirrored: false })
        for (const c of p.layout(anchor, { facing, mirrored: false })) {
            const m = p.matchContaining(c.pos, w.read)
            assert.ok(m, `facing ${facing} 从 ${c.char}@${JSON.stringify(c.pos)}`)
            assert.deepEqual(m.anchor, anchor)
        }
    }
    const w = place(p, anchor, { facing: 2, mirrored: false })
    const gold = p.layout(anchor, { facing: 2, mirrored: false }).find((c) => c.char === 'G').pos
    assert.equal(p.matchContaining(gold, w.read, ['C']), undefined, '限定字符后，金块那一格不被当作圆石格')
    assert.ok(p.matchContaining(gold, w.read, ['G']))
})

test('镜像：手性结构只有开启 mirror 才能匹配镜像摆法', () => {
    const anchor = { x: 0, y: 0, z: 0 }
    const w = place(L(), anchor, { facing: 1, mirrored: true })
    assert.equal(L().matchAt(anchor, w.read), undefined)
    const mirrored = new MultiblockPattern({ ...L(), aisles: L().aisles, where: L().where, anchor: 'R', mirror: true })
    const m = mirrored.matchAt(anchor, w.read)
    assert.ok(m)
    assert.equal(m.mirrored, true)
})

test('判断：空格不检查、air 要求空气、states、tag、or、not', () => {
    const p = new MultiblockPattern({
        aisles: [['A B', 'XYZ']],
        where: {
            A: Is.states('minecraft:lever', { open_bit: true }),
            B: Is.tag('minecraft:is_stone', 'minecraft:stone'),
            X: Is.air(),
            Y: Is.or(Is.block('minecraft:dirt'), Is.block('minecraft:grass_block')),
            Z: Is.not(Is.block('minecraft:bedrock')),
        },
        anchor: 'Y', rotate: false,
    })
    const w = worldOf([
        [{ x: -1, y: 0, z: -1 }, 'minecraft:lever', { states: { open_bit: true, lever_direction: 'up_north_south' } }],
        [{ x: 0, y: 0, z: -1 }, 'minecraft:bedrock'],                       // 空格：什么都行
        [{ x: 1, y: 0, z: -1 }, 'minecraft:andesite', { tags: ['minecraft:is_stone'] }],
        [{ x: 0, y: 0, z: 0 }, 'minecraft:grass_block'],
        [{ x: 1, y: 0, z: 0 }, 'minecraft:stone'],
    ])
    assert.ok(p.matchAt({ x: 0, y: 0, z: 0 }, w.read))
    w.set({ x: -1, y: 0, z: -1 }, 'minecraft:lever', { states: { open_bit: false } })
    assert.equal(p.matchAt({ x: 0, y: 0, z: 0 }, w.read), undefined, '状态不符')
    w.set({ x: -1, y: 0, z: -1 }, 'minecraft:lever', { states: { open_bit: true } })
    w.set({ x: -1, y: 0, z: 0 }, 'minecraft:stone')
    assert.equal(p.matchAt({ x: 0, y: 0, z: 0 }, w.read), undefined, 'X 必须是空气')
    w.del({ x: -1, y: 0, z: 0 })
    w.set({ x: 1, y: 0, z: 0 }, 'minecraft:bedrock')
    assert.equal(p.matchAt({ x: 0, y: 0, z: 0 }, w.read), undefined, 'Z 不能是基岩')
    assert.equal(Is.any().test(undefined), false, '未加载的格子不满足任何判断')
})

test('图案校验：形状不齐、锚点缺失 / 重复、字符未定义都直接抛错', () => {
    const where = { A: Is.any(), B: Is.any() }
    assert.throws(() => new MultiblockPattern({ aisles: [['AB', 'A']], where, anchor: 'A' }), /长度 1，应为 2/)
    assert.throws(() => new MultiblockPattern({ aisles: [['AB'], ['AB', 'AB']], where, anchor: 'A' }), /各层必须同样大小/)
    assert.throws(() => new MultiblockPattern({ aisles: [['BB']], where, anchor: 'A' }), /没有出现在图案里/)
    assert.throws(() => new MultiblockPattern({ aisles: [['AA']], where, anchor: 'A' }), /不止一次/)
    assert.throws(() => new MultiblockPattern({ aisles: [['AQ']], where, anchor: 'A' }), /"Q" 没有在 where 里定义/)
})

test('部分匹配：选出符合格子最多的朝向，列出缺的格子（投影用）', () => {
    const p = L()
    const anchor = { x: 5, y: 5, z: 5 }
    const w = place(p, anchor, { facing: 3, mirrored: false })
    const cobble = p.layout(anchor, { facing: 3, mirrored: false }).filter((c) => c.char === 'C')
    w.del(cobble[2].pos)
    const partial = p.bestPartial(anchor, w.read)
    assert.equal(partial.facing, 3)
    assert.equal(partial.total, 5)
    assert.equal(partial.matched, 4)
    assert.deepEqual(partial.missing.map((m) => m.pos), [cobble[2].pos])
    assert.equal(partial.missing[0].label, 'minecraft:cobblestone')
})

test('材料清单与说明', () => {
    const p = L()
    assert.deepEqual(p.bill(), [
        { char: 'G', count: 1, label: 'minecraft:gold_block' },
        { char: 'C', count: 3, label: 'minecraft:cobblestone' },
        { char: 'R', count: 1, label: 'minecraft:netherreactor' },
    ])
    const text = p.describe().join('\n')
    assert.match(text, /尺寸 3×2×3/)
    assert.match(text, /GC·/)
    assert.match(text, /C=minecraft:cobblestone×3/)
})
