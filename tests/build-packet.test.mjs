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

test('writeBuildPacket 拒绝结构错误的包（root 非法 / path 越界 / format 非法）', async () => {
    const { projectPath, buildPath } = makeProject()
    await assert.rejects(
        () => writeBuildPacket({
            protocol: BUILD_PROTOCOL,
            files: [{ root: 'resourc', path: 'items/', name: 'a', data: {} }],
        }, { projectPath, buildPath, projectName: 'proj' }),
        /构建包校验失败[\s\S]*root 必须是/
    )
    await assert.rejects(
        () => writeBuildPacket({
            protocol: BUILD_PROTOCOL,
            files: [{ root: 'behavior', path: '../escape/', name: 'a', data: {} }],
        }, { projectPath, buildPath, projectName: 'proj' }),
        /path 必须是安全的相对路径/
    )
    await assert.rejects(
        () => writeBuildPacket({
            protocol: BUILD_PROTOCOL,
            files: [{ root: 'behavior', path: 'items/', name: 'a', data: {}, format: 'yaml' }],
        }, { projectPath, buildPath, projectName: 'proj' }),
        /format 必须是 json \/ text \/ base64/
    )
})

// ── 结构校验（纯函数）────────────────────────────────────────────────────────

const { validateBuildPacket } = await import('../dist/utils/protocol.js')

const issuesOf = (files) => validateBuildPacket({ protocol: BUILD_PROTOCOL, files })

test('validateBuildPacket：合法包没有 error', () => {
    const issues = issuesOf([
        { root: 'behavior', path: '', name: 'blocks', data: { format_version: '1.20.20' } },
        { root: 'resource', path: 'textures/', name: 'note', data: 'x', format: 'text', ext: 'txt' },
    ])
    assert.equal(issues.filter((issue) => issue.level === 'error').length, 0)
})

test('validateBuildPacket：name 不能含路径分隔符、json 的 data 不能是 undefined', () => {
    const issues = issuesOf([
        { root: 'behavior', path: 'items/', name: 'a/b', data: {} },
        { root: 'behavior', path: 'items/', name: 'c', data: undefined },
    ])
    const messages = issues.filter((issue) => issue.level === 'error').map((issue) => issue.message).join('\n')
    assert.match(messages, /name 必须是非空文件名/)
    assert.match(messages, /data 为 undefined/)
})

test('validateBuildPacket：重复文件给 warning，不阻断', () => {
    const issues = issuesOf([
        { root: 'behavior', path: 'items/', name: 'a', data: { v: 1 } },
        { root: 'behavior', path: 'items/', name: 'a', data: { v: 2 } },
    ])
    assert.equal(issues.filter((issue) => issue.level === 'error').length, 0)
    assert.equal(issues.filter((issue) => issue.level === 'warning').length, 1)
})

// ── 解析器幂等 / 校验器 / 兼容入口 ───────────────────────────────────────────

test('addPacketResolver：同 id 二次登记会替换而不是叠加', async () => {
    const { GRegistry, registry, addPacketResolver } = await freshRegistry()
    GRegistry.register('a', 'behavior', 'items/', { from: 'entry' })

    const makeResolver = (value) => () => ({
        files: [{ root: 'behavior', path: 'items/', name: 'a', data: { value } }],
    })
    addPacketResolver(makeResolver(1), { id: 'pkg:demo', priority: 10 })
    addPacketResolver(makeResolver(2), { id: 'pkg:demo', priority: 10 })

    registry.submit()
    assert.deepEqual(lastPacket().files, [{ root: 'behavior', path: 'items/', name: 'a', data: { value: 2 } }])
})

test('addPacketValidator：error 阻断提交，warning 只提示', async () => {
    const first = await freshRegistry()
    first.addPacketValidator(() => ({ level: 'error', message: '插件校验失败' }))
    assert.throws(() => first.registry.submit(), /构建包校验失败[\s\S]*插件校验失败/)
    assert.equal(posts.length, 0)

    const second = await freshRegistry()
    const warnings = []
    const originalWarn = console.warn
    console.warn = (...args) => warnings.push(args.join(' '))
    try {
        second.addPacketValidator(() => ({ level: 'warning', message: '只是提醒' }))
        second.registry.submit()
    } finally {
        console.warn = originalWarn
    }
    assert.equal(posts.length, 1)
    assert.ok(warnings.join('\n').includes('只是提醒'))
})

test('setBuildPacketBuilder 仍可用，但会打废弃警告', async () => {
    const { GRegistry, registry, setBuildPacketBuilder } = await freshRegistry()
    GRegistry.register('a', 'behavior', 'items/', { v: 1 })

    const warnings = []
    const originalWarn = console.warn
    console.warn = (...args) => warnings.push(args.join(' '))
    try {
        setBuildPacketBuilder((entries) => ({
            protocol: BUILD_PROTOCOL,
            files: entries.map((entry) => ({ root: entry.root, path: entry.path, name: entry.name, data: entry.data })),
        }))
        registry.submit()
    } finally {
        console.warn = originalWarn
    }

    assert.ok(warnings.some((line) => line.includes('setBuildPacketBuilder 已废弃')))
    assert.deepEqual(lastPacket().files, [{ root: 'behavior', path: 'items/', name: 'a', data: { v: 1 } }])
})
