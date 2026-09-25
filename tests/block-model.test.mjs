// 构建期模型 API（BlockModel）的判据。
// 跑法：npx tsc && node tests/block-model.test.mjs
// 覆盖：盒式展开的 UV 数字、显式 UV 的编码约定、与手写模型的区域等价、构建期抛错、register 落点。
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const dist = (p) => pathToFileURL(join(here, '..', 'dist', 'core', p)).href
const { BlockModel, MODEL_FACES } = await import(dist('block/blockModel.js'))
const { GRegistry } = await import(dist('registry.js'))
const { boxFromPixels, post, slab, pane, cross } = await import(dist('block/modelShapes.js'))

let pass = 0
let fail = 0
const ok = (name, cond, extra = '') => {
    if (cond) {
        pass++
        console.log(`  ok   ${name}${extra ? '  ' + extra : ''}`)
    } else {
        fail++
        console.log(`  FAIL ${name}${extra ? '  ' + extra : ''}`)
    }
}
const eq = (name, got, want) => ok(name, JSON.stringify(got) === JSON.stringify(want), `got=${JSON.stringify(got)} want=${JSON.stringify(want)}`)
const throws = (name, fn, needle) => {
    try {
        fn()
        ok(name, false, '没有抛错')
    } catch (e) {
        ok(name, String(e.message).includes(needle), `msg=${e.message}`)
    }
}

/** 把面条目还原成「区域」[u,v,w,h]（负数尺寸 = 以 uv 为右下角的翻转写法）。 */
const rectOf = (e) => (e.uv_size[0] < 0 || e.uv_size[1] < 0
    ? [e.uv[0] + e.uv_size[0], e.uv[1] + e.uv_size[1], Math.abs(e.uv_size[0]), Math.abs(e.uv_size[1])]
    : [e.uv[0], e.uv[1], e.uv_size[0], e.uv_size[1]])

/** 只比「贴图区域」的规范化视图：比原始 JSON 更适合跨编码约定对比。 */
const canon = (json) => {
    const g = json['minecraft:geometry'][0]
    return {
        description: g.description,
        bones: g.bones.map((b) => ({
            name: b.name,
            parent: b.parent,
            pivot: b.pivot,
            cubes: b.cubes.map((c) => ({
                origin: c.origin,
                size: c.size,
                uv: Object.fromEntries(Object.entries(c.uv).map(([f, e]) => [f, rectOf(e)])),
            })),
        })),
    }
}

console.log('[1] description 与面序')
{
    const j = new BlockModel({ identifier: 'geometry.fz_marker' }).toJson()
    eq('format_version', j.format_version, '1.21.20')
    eq('description', j['minecraft:geometry'][0].description, {
        identifier: 'geometry.fz_marker',
        texture_width: 16,
        texture_height: 16,
        visible_bounds_width: 2,
        visible_bounds_height: 2.5,
        visible_bounds_offset: [0, 0.75, 0],
    })
    eq('面序 = Blockbench 导出序', [...MODEL_FACES], ['north', 'east', 'south', 'west', 'up', 'down'])
}

console.log('[2] autoUv 盒式展开（cube 2x10x2、贴图 16x16、起点 0）')
{
    const m = new BlockModel({ identifier: 'geometry.t' })
    m.bone('post').cube({ origin: [-1, 0, -1], size: [2, 10, 2] }).autoUv()
    const uv = m.toJson()['minecraft:geometry'][0].bones[0].cubes[0].uv
    eq('面键序', Object.keys(uv), ['north', 'east', 'south', 'west', 'up', 'down'])
    eq('north', rectOf(uv.north), [2, 2, 2, 10])   // 侧面行：east(2) 之后
    eq('east', rectOf(uv.east), [0, 2, 2, 10])
    eq('south', rectOf(uv.south), [6, 2, 2, 10])   // 2d+w = 6
    eq('west', rectOf(uv.west), [4, 2, 2, 10])     // d+w = 4
    eq('up', rectOf(uv.up), [2, 0, 2, 2])          // 顶排：从 u+d 起
    eq('down', rectOf(uv.down), [4, 0, 2, 2])      // 顶排：从 u+d+w 起
    ok('up/down 用负尺寸（原版翻转约定）', uv.up.uv_size[0] < 0 && uv.up.uv_size[1] < 0 && uv.down.uv_size[0] < 0)
    ok('四个侧面用正尺寸', ['north', 'east', 'south', 'west'].every((f) => uv[f].uv_size[0] > 0 && uv[f].uv_size[1] > 0))
}

console.log('[3] autoUv 一行内平铺 / 幂等')
{
    const m = new BlockModel({ identifier: 'geometry.t' })
    m.bone('b').cube({ origin: [0, 0, 0], size: [2, 10, 2] }).cube({ origin: [0, 0, 0], size: [2, 10, 2] }).autoUv()
    const cubes = m.toJson()['minecraft:geometry'][0].bones[0].cubes
    eq('第二个 cube 起点右移 8', rectOf(cubes[1].uv.east), [8, 2, 2, 10])
    const before = JSON.stringify(cubes[1].uv)
    m.autoUv()
    ok('二次 autoUv 不动已铺好的 cube', JSON.stringify(cubes[1].uv) === before)
}

console.log('[4] 与手写 fz_marker.geo.json 区域等价')
{
    const m = new BlockModel({ identifier: 'geometry.fz_marker' })
    m.bone('marker').cube({
        origin: [-1, 0, -1],
        size: [2, 10, 2],
        uv: {
            north: [7, 6, 2, 10], east: [7, 6, 2, 10], south: [7, 6, 2, 10], west: [7, 6, 2, 10],
            up: [7, 6, 2, 2], down: [7, 14, 2, 2],
        },
    })
    const gen = m.toJson()
    const cube = gen['minecraft:geometry'][0].bones[0].cubes[0]
    eq('面键序与手写一致', Object.keys(cube.uv), ['north', 'east', 'south', 'west', 'up', 'down'])

    const path = join('D:', 'Projects', 'fz-sapdon', 'res', 'models', 'blocks', 'fz_marker.geo.json')
    if (existsSync(path)) {
        const file = JSON.parse(readFileSync(path, 'utf8'))
        ok('与磁盘上的手写模型区域逐字段相等', JSON.stringify(canon(gen)) === JSON.stringify(canon(file)))
        const fileCube = file['minecraft:geometry'][0].bones[0].cubes[0]
        eq('两侧 up 区域', rectOf(cube.uv.up), rectOf(fileCube.uv.up))
        eq('两侧 down 区域', rectOf(cube.uv.down), rectOf(fileCube.uv.down))
        ok('唯一差异 = up/down 编码约定', JSON.stringify(cube.uv.up) !== JSON.stringify(fileCube.uv.up) && cube.uv.up.uv_size[0] === -2)
    } else {
        console.log('  skip 磁盘上没找到 fz-sapdon 手写模型，跳过交叉核对')
    }
}

console.log('[5] 构建期抛错')
{
    throws('identifier 为空', () => new BlockModel({ identifier: '' }), 'identifier')
    throws('贴图尺寸非正', () => new BlockModel({ identifier: 'geometry.t', texture: [0, 16] }), 'texture')
    throws('cube size 为负', () => new BlockModel({ identifier: 'geometry.t' }).cube({ origin: [0, 0, 0], size: [-1, 1, 1] }), 'size')
    throws('cube size 三轴全 0', () => new BlockModel({ identifier: 'geometry.t' }).cube({ origin: [0, 0, 0], size: [0, 0, 0] }), 'size')
    ok('零厚度平板放行', new BlockModel({ identifier: 'geometry.t' }).cube({ origin: [0, 0, 0], size: [16, 16, 0] }) !== undefined)
    throws('骨名重复', () => new BlockModel({ identifier: 'geometry.t' }).bone('a').bone('a'), '重复')
    throws('父骨不存在', () => new BlockModel({ identifier: 'geometry.t' }).bone('a', { parent: 'nope' }), '父骨')
    throws('展开超出贴图', () => new BlockModel({ identifier: 'geometry.t' }).cube({ origin: [-8, 0, -8], size: [16, 16, 16] }).autoUv(), '盒式展开')
    throws('register 名为空', () => new BlockModel({ identifier: 'geometry.t' }).register(''), 'name')
    throws('没铺 UV 就 toJson', () => new BlockModel({ identifier: 'geometry.t' }).cube({ origin: [0, 0, 0], size: [1, 1, 1] }).toJson(), '没有 UV')
    throws('没铺 UV 就 register', () => new BlockModel({ identifier: 'geometry.t' }).cube({ origin: [0, 0, 0], size: [1, 1, 1] }).register('x'), '没有 UV')
}

console.log('[6] register 落点')
{
    const seen = []
    const original = GRegistry.register
    GRegistry.register = (name, root, path, data) => { seen.push([name, root, path, data]) }
    try {
        new BlockModel({ identifier: 'geometry.my_post' }).cube({ origin: [-1, 0, -1], size: [2, 10, 2] }).autoUv().register('my_post_model')
    } finally {
        GRegistry.register = original
    }
    eq('register 次数', seen.length, 1)
    eq('register 参数前缀', seen[0].slice(0, 3), ['my_post_model', 'resource', 'models/blocks'])
    eq('落盘内容 = toJson()', seen[0][3]['minecraft:geometry'][0].description.identifier, 'geometry.my_post')
}

console.log('[7] 形状助手（像素坐标）')
{
    eq('boxFromPixels 居中 2x10x2', boxFromPixels(7, 0, 7, 9, 10, 9), { origin: [-1, 0, -1], size: [2, 10, 2] })
    eq('post 缺省 = 2x10x2 居中', post(), { origin: [-1, 0, -1], size: [2, 10, 2] })
    eq('slab 下半', slab(), { origin: [-8, 0, -8], size: [16, 8, 16] })
    eq('slab 上半', slab({ half: 'top', thickness: 4 }), { origin: [-8, 12, -8], size: [16, 4, 16] })
    eq('pane 法线朝 x', pane({ thickness: 2 }), { origin: [-1, 0, -8], size: [2, 16, 16] })
    eq('pane 法线朝 z', pane({ axis: 'z' }), { origin: [-8, 0, -1], size: [16, 16, 2] })
    throws('boxFromPixels 顺序反了', () => boxFromPixels(9, 0, 7, 7, 10, 9), 'x1<x2')
    throws('slab thickness 超范围', () => slab({ thickness: 17 }), 'thickness')

    const planes = cross()
    eq('cross = 两根 45 度平板', planes.length, 2)
    ok('cross 绕 y 反向旋转', planes[0].rotation[1] === 45 && planes[1].rotation[1] === -45)
    ok('cross 零厚度', planes[0].size[2] === 0)
    eq('cross 自带整张贴图 UV', planes[0].uv, { west: [0, 0, 16, 16], east: [0, 0, 16, 16] })
    const m = new BlockModel({ identifier: 'geometry.plant' })
    m.bone('plant').cube(cross()).autoUv()
    const uv = m.toJson()['minecraft:geometry'][0].bones[0].cubes[0].uv
    eq('零厚度平板只留朝外的两面', Object.keys(uv).sort(), ['east', 'west'])
    // 退化面在盒式展开里不参与，但两面各要一整张贴图 ⇒ 必须显式给 UV
    throws('零厚度平板不给 UV 时展开会撞墙', () => new BlockModel({ identifier: 'geometry.p' }).cube({ origin: [-8, 0, 0], size: [16, 16, 0] }).autoUv(), '盒式展开')
}

console.log('[8] 读写编辑（bones / cubesOf / editCube / removeCube / setUv）')
{
    const m = new BlockModel({ identifier: 'geometry.edit' })
    m.bone('a').cube(post()).cube(post({ height: 4 })).autoUv()
    eq('骨名列表', m.boneNames(), ['a'])
    eq('cube 数量', m.cubesOf('a').length, 2)
    eq('cubesOf 读到尺寸', m.cubesOf('a')[1].size, [2, 4, 2])

    m.editCube('a', 1, { size: [4, 4, 4], origin: [-2, 0, -2] })
    eq('editCube 改了尺寸与位置', m.toJson()['minecraft:geometry'][0].bones[0].cubes[1].size, [4, 4, 4])
    m.setUv('a', 1, 'north', [0, 0, 4, 4])
    eq('setUv 侧面正尺寸', m.toJson()['minecraft:geometry'][0].bones[0].cubes[1].uv.north, { uv: [0, 0], uv_size: [4, 4] })
    m.setUv('a', 1, 'up', [4, 4, 4, 4])
    eq('setUv 顶面负尺寸（右下角起）', m.toJson()['minecraft:geometry'][0].bones[0].cubes[1].uv.up, { uv: [8, 8], uv_size: [-4, -4] })
    m.removeCube('a', 0)
    eq('removeCube 后剩 1 个', m.cubesOf('a').length, 1)
    throws('骨名不存在', () => m.cubesOf('nope'), '没有名为 nope 的骨')
    throws('序号越界', () => m.removeCube('a', 5), '没有序号 5')
    throws('editCube 尺寸非法', () => m.editCube('a', 0, { size: [-1, 1, 1] }), '不能为负')
}

console.log(`\nblock-model: ${pass} passed, ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
