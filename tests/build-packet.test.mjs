// 构建协议：解析器管线（addPacketResolver）+ CLI 落盘格式（writeBuildPacket）
//   `npx tsc && npx tsc-alias && node tests/build-packet.test.mjs`
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..')

const { BUILD_PROTOCOL } = await import('../dist/utils/protocol.js')
const { INDEX_BEGIN, INDEX_END } = await import('../dist/utils/componentIndex.js')
const { writeBuildPacket } = await import('../dist/cli/load.js')

// ── 解析器管线 ────────────────────────────────────────────────────────────────

const posts = []
globalThis.fetch = async (url, init) => {
    posts.push({ url: String(url), body: JSON.parse(init.body) })
    return { ok: true, status: 200 }
}

let seq = 0
async function freshRegistry() {
    posts.length = 0
    return import(`../dist/utils/registry.js?pipeline=${seq++}`)
}

const lastPacket = () => posts.at(-1).body[0]

test('解析器按 priority 从高到低执行', async () => {
    const { registry, addPacketResolver } = await freshRegistry()
    const order = []

    addPacketResolver(() => { order.push('low') }, { priority: -100 })
    addPacketResolver(() => { order.push('high') }, { priority: 10 })

    registry.submit()
    assert.deepEqual(order, ['high', 'low'])
})

test('consumed 的注册项不会被默认映射，也不会交给后面的解析器', async () => {
    const { GRegistry, registry, addPacketResolver } = await freshRegistry()
    GRegistry.register('a', 'behavior', 'items/', { from: 'entry' })

    const seenByNext = []
    addPacketResolver(({ entries }) => ({
        files: [{ root: 'resource', path: 'custom/', name: 'a', data: { from: 'plugin' } }],
        consumed: entries.slice(),
    }), { priority: 10 })
    addPacketResolver(({ entries }) => { seenByNext.push(...entries.map((e) => e.name)) }, { priority: 0 })

    registry.submit()

    assert.deepEqual(lastPacket().files, [{ root: 'resource', path: 'custom/', name: 'a', data: { from: 'plugin' } }])
    assert.deepEqual(seenByNext, [])
})

test('返回同 root|path|name 的文件会自动认领注册项（不重复落盘）', async () => {
    const { GRegistry, registry, addPacketResolver } = await freshRegistry()
    GRegistry.register('a', 'behavior', 'items/', { from: 'entry' })

    addPacketResolver(() => ({
        files: [{ root: 'behavior', path: 'items/', name: 'a', data: { from: 'plugin' } }],
    }), { priority: 10 })

    registry.submit()
    assert.deepEqual(lastPacket().files, [{ root: 'behavior', path: 'items/', name: 'a', data: { from: 'plugin' } }])
})

test('没有解析器时按默认规则映射注册项', async () => {
    const { GRegistry, registry } = await freshRegistry()
    GRegistry.register('a', 'behavior', 'items/', { v: 1 })

    registry.submit()
    assert.deepEqual(lastPacket().files, [{ root: 'behavior', path: 'items/', name: 'a', data: { v: 1 } }])
})

// ── CLI 落盘 ──────────────────────────────────────────────────────────────────

const tmpRoot = path.join(repoRoot, '.tmp', 'build-packet-test')

function makeProject() {
    fs.rmSync(tmpRoot, { recursive: true, force: true })
    const projectPath = path.join(tmpRoot, 'proj')
    const buildPath = path.join(projectPath, 'dev')
    fs.mkdirSync(path.join(projectPath, 'scripts', 'custom_components'), { recursive: true })
    fs.mkdirSync(buildPath, { recursive: true })

    fs.writeFileSync(path.join(projectPath, 'scripts', 'b.js'), '// old')
    fs.writeFileSync(
        path.join(projectPath, 'scripts', 'custom_components', 'index.js'),
        `// user header\n${INDEX_BEGIN}\nOLD\n${INDEX_END}\n`
    )
    return { projectPath, buildPath }
}

test('writeBuildPacket 支持 json / text / base64、sources.overwrite 与多个 indexBlocks', async () => {
    const { projectPath, buildPath } = makeProject()

    await writeBuildPacket({
        protocol: BUILD_PROTOCOL,
        files: [
            { root: 'behavior', path: 'items/', name: 'a', data: { x: 1 } },
            { root: 'resource', path: 'textures/', name: 'note', data: 'hello', format: 'text', ext: 'txt' },
            { root: 'resource', path: 'textures/', name: 'pix', data: Buffer.from('PNG').toString('base64'), format: 'base64', ext: 'png' },
        ],
        sources: [
            { path: 'scripts/a.js', content: '// a' },
            { path: 'scripts/b.js', content: '// b', overwrite: true },
        ],
        indexBlocks: [
            { path: 'scripts/custom_components/index.js', content: `${INDEX_BEGIN}\nNEW\n${INDEX_END}` },
            { path: 'scripts/other.js', content: `${INDEX_BEGIN}\nOTHER\n${INDEX_END}` },
        ],
    }, { projectPath, buildPath, projectName: 'proj' })

    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(buildPath, 'proj_BP', 'items', 'a.json'), 'utf8')), { x: 1 })
    assert.equal(fs.readFileSync(path.join(buildPath, 'proj_RP', 'textures', 'note.txt'), 'utf8'), 'hello')
    assert.equal(fs.readFileSync(path.join(buildPath, 'proj_RP', 'textures', 'pix.png')).toString(), 'PNG')

    assert.equal(fs.readFileSync(path.join(projectPath, 'scripts', 'a.js'), 'utf8'), '// a')
    assert.equal(fs.readFileSync(path.join(projectPath, 'scripts', 'b.js'), 'utf8'), '// b', 'overwrite:true 应覆盖旧文件')

    const index = fs.readFileSync(path.join(projectPath, 'scripts', 'custom_components', 'index.js'), 'utf8')
    assert.ok(index.includes('user header'), '手写内容应保留')
    assert.ok(index.includes('NEW') && !index.includes('OLD'), '标记块应被替换')

    assert.ok(fs.readFileSync(path.join(projectPath, 'scripts', 'other.js'), 'utf8').includes('OTHER'))
})

test('协议版本不匹配时直接抛错', async () => {
    const { projectPath, buildPath } = makeProject()
    await assert.rejects(
        () => writeBuildPacket({ protocol: 'sapdon-build/0', files: [] }, { projectPath, buildPath, projectName: 'proj' }),
        /构建协议不匹配/
    )
})
