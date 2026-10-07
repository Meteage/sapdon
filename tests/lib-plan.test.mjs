// `sapdon lib` 源根解析的受控实验（先 `npx tsc && npx tsc-alias`，再 `node tests/lib-plan.test.mjs`）
//
// 缺陷（`doc/dev/known-pitfalls.md` §8）：`lib` 把**「CLI 自己所在目录的父目录」**当框架源根。
// npm 的正常用户布局是「CLI 在项目的 `node_modules/@sapdon/cli`」，那时源根 == 项目的
// `node_modules/@sapdon`，于是：
//   ① `src === dest` → `ERR_FS_CP_EINVAL: src and dest cannot be the same`；
//   ② 目标名是 `runtime`，源目录在框架侧叫 `oc` → 该布局下只有 `runtime`、没有 `oc` → `ENOENT`。
//
// 判据（§8 末尾）：**能同步的同步**；「源就是目标」/「源不存在」→ 打印一行说明并**跳过该包**，
// 而不是整条命令 exit 1；真正的 IO 错误（权限、磁盘满）仍然抛。
// 另外：框架仓库内部（CLI 来自 `prod/`）的既有行为必须不变 —— `core/cli/oc` 三个包照旧同步。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..')
const frameworkVersion = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf-8')).version

const { planLibCopies, isSameOrInside, isSamePath, LIB_PACKAGES } =
    await import('../dist/cli/dev-server/libPlan.js')
const { writeLib } = await import('../dist/cli/dev-server/syncFiles.js')

const tmpRoot = path.join(repoRoot, '.tmp', 'lib-plan-test')
fs.rmSync(tmpRoot, { recursive: true, force: true })

/** 造一个「框架源根」：core/ cli/ 必有，oc/ 或 runtime/ 二选一 */
function makeFrameworkRoot(name, runtimeDirName) {
    const root = path.join(tmpRoot, name)
    const touch = (rel, content = '// x') => {
        const abs = path.join(root, rel)
        fs.mkdirSync(path.dirname(abs), { recursive: true })
        fs.writeFileSync(abs, content)
    }
    touch('core/index.js', '// core')
    touch('core/index.d.ts', '// core dts')
    touch('cli/index.js', '// cli')
    if (runtimeDirName) touch(`${runtimeDirName}/index.js`, '// runtime')
    return root
}

const item = (plan, name) => {
    const found = plan.find((i) => i.name === name)
    assert.ok(found, `规划里应有 ${name}`)
    return found
}

// ---------------------------------------------------------------------------
// ① 源 == 目标 → 跳过（原来的 ERR_FS_CP_EINVAL）
// ---------------------------------------------------------------------------
test('源与目标同一处（CLI 来自项目自己的 node_modules/@sapdon）→ 三个包全部跳过并说明', () => {
    const proj = path.join(tmpRoot, 'proj-same')
    const modulesDir = path.join(proj, 'node_modules')
    // 源根 = 项目自己的 node_modules/@sapdon（这正是「CLI 从依赖解析到」时的源根）
    const rootDir = path.join(modulesDir, '@sapdon')

    const plan = planLibCopies({
        rootDir,
        modulesDir,
        // 真实的 npm 布局：@sapdon/ 下只有 core / cli / runtime，**没有** oc/
        exists: (dir) => !dir.endsWith(`${path.sep}oc`),
    })

    assert.equal(plan.length, 3)
    for (const entry of plan) {
        assert.equal(entry.skip !== null, true, `${entry.name} 应跳过`)
        assert.match(entry.skip, /源与目标同一处/)
        assert.equal(isSamePath(entry.src, entry.dest), true)
    }
    assert.match(item(plan, '@sapdon/runtime').skip, /node_modules\/@sapdon/)
})

test('真实目录 + 真实 writeLib：源 == 目标不再抛错，也不覆盖已装好的 package.json', async () => {
    const proj = path.join(tmpRoot, 'proj-same-real')
    const modulesDir = path.join(proj, 'node_modules')
    const sapdonDir = path.join(modulesDir, '@sapdon')
    // 预置「npm 装好的」三个包（模拟正常用户布局）
    const installed = {}
    for (const spec of LIB_PACKAGES) {
        const dir = path.join(sapdonDir, spec.target)
        fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(path.join(dir, 'index.js'), `// installed ${spec.name}`)
        const pkg = JSON.stringify({ name: spec.name, installed: 'from-npm' })
        fs.writeFileSync(path.join(dir, 'package.json'), pkg)
        installed[spec.name] = pkg
    }

    const lines = []
    const plan = await writeLib(proj, { rootDir: sapdonDir, log: (l) => lines.push(l) })

    assert.equal(plan.every((i) => i.skip !== null), true)
    const skipLines = lines.filter((l) => l.startsWith('[sapdon] 跳过'))
    assert.equal(skipLines.length, 3, `应有 3 行跳过说明：${lines.join(' | ')}`)
    assert.equal(lines.some((l) => l.includes('没有任何包可同步')), true)
    for (const spec of LIB_PACKAGES) {
        const pkgPath = path.join(sapdonDir, spec.target, 'package.json')
        assert.equal(fs.readFileSync(pkgPath, 'utf-8'), installed[spec.name], '跳过时不该改写已装的 package.json')
    }
})

// ---------------------------------------------------------------------------
// ② 目标落在源内部 → 同样跳过（cpSync 也会 EINVAL）
// ---------------------------------------------------------------------------
test('目标目录落在源目录内部 → 跳过', () => {
    const proj = path.join(tmpRoot, 'proj-nested')
    const modulesDir = path.join(proj, 'node_modules')
    // 源 = node_modules/@sapdon（目录），目标 = node_modules/@sapdon/deep/core（源内部）
    const plan = planLibCopies({
        rootDir: modulesDir,
        modulesDir,
        exists: () => true,
        packages: [{ name: '@sapdon/core', target: 'deep/core', sources: ['@sapdon'] }],
    })

    const entry = item(plan, '@sapdon/core')
    assert.equal(entry.skip !== null, true)
    assert.match(entry.skip, /源与目标同一处/)
    assert.equal(isSameOrInside(entry.src, entry.dest), true)
})

test('isSameOrInside 按路径段比较（/a/bc 不算法在 /a/b 内部）', () => {
    assert.equal(isSameOrInside(`/a/b`, `/a/b`), true)
    assert.equal(isSameOrInside(`/a/b`, `/a/b/c`), true)
    assert.equal(isSameOrInside(`/a/b`, `/a/bc`), false, '前缀相同但不是子目录，不算 inside')
    assert.equal(isSameOrInside(`/a/b/c`, `/a/b`), false)
    assert.equal(isSamePath(`/a/b/`, `/a/b`), true)
})

// ---------------------------------------------------------------------------
// ③④ 源目录探测：oc 与 runtime 都接受
// ---------------------------------------------------------------------------
test('源根是框架 prod/ 布局（源目录叫 oc）→ runtime 从 oc/ 同步，行为与历史一致', () => {
    const fw = makeFrameworkRoot('fw-with-oc', 'oc')
    const modulesDir = path.join(tmpRoot, 'proj-oc', 'node_modules')

    const plan = planLibCopies({ rootDir: fw, modulesDir })

    assert.deepEqual(plan.map((i) => i.name), ['@sapdon/core', '@sapdon/cli', '@sapdon/runtime'])
    assert.equal(plan.every((i) => i.skip === null), true)
    assert.equal(path.basename(item(plan, '@sapdon/runtime').src), 'oc')
    assert.equal(item(plan, '@sapdon/runtime').dest, path.join(modulesDir, '@sapdon', 'runtime'))
})

test('源根下只有 runtime/（无 oc/）→ 照样认，不再 ENOENT', () => {
    const fw = makeFrameworkRoot('fw-with-runtime', 'runtime')
    const modulesDir = path.join(tmpRoot, 'proj-runtime', 'node_modules')

    const plan = planLibCopies({ rootDir: fw, modulesDir })

    const runtime = item(plan, '@sapdon/runtime')
    assert.equal(runtime.skip, null)
    assert.equal(path.basename(runtime.src), 'runtime')
})

test('oc/ 与 runtime/ 都不存在 → 跳过该包 + 一行说明（不抛）', () => {
    const modulesDir = path.join(tmpRoot, 'proj-nosrc', 'node_modules')
    const rootDir = path.join(tmpRoot, 'fw-empty')

    // core/ cli/ 存在、runtime 两个候选都没有
    const exists = (dir) => !/runtime|oc/.test(dir)
    const plan = planLibCopies({ rootDir, modulesDir, exists })

    const runtime = item(plan, '@sapdon/runtime')
    assert.equal(runtime.src, null)
    assert.equal(runtime.skip !== null, true)
    assert.match(runtime.skip, /oc\/ 或 runtime\//)
    assert.match(runtime.skip, /框架源根/)
    assert.equal(runtime.dest, path.join(modulesDir, '@sapdon', 'runtime'))
})

test('源根本身整块不存在（dist 布局下直接跑）→ 三个包都跳过、一个都不抛', () => {
    const modulesDir = path.join(tmpRoot, 'proj-noroot', 'node_modules')
    const plan = planLibCopies({ rootDir: path.join(tmpRoot, 'not-there'), modulesDir })

    assert.equal(plan.length, 3)
    for (const entry of plan) {
        assert.equal(entry.src, null)
        assert.equal(entry.skip !== null, true)
    }
})

// ---------------------------------------------------------------------------
// ⑤ 正常拷贝路径：真的拷过去 + 写 package.json
// ---------------------------------------------------------------------------
test('正常拷贝路径：core/ cli/ oc → node_modules/@sapdon/{core,cli,runtime}，并写出版本号', async () => {
    const fw = makeFrameworkRoot('fw-ok', 'oc')
    const proj = path.join(tmpRoot, 'proj-ok')
    fs.mkdirSync(path.join(proj, 'node_modules'), { recursive: true })

    const lines = []
    const plan = await writeLib(proj, { rootDir: fw, log: (l) => lines.push(l) })

    assert.equal(plan.every((i) => i.skip === null), true)
    const targets = [
        ['@sapdon/core', 'core'],
        ['@sapdon/cli', 'cli'],
        ['@sapdon/runtime', 'runtime'],
    ]
    for (const [name, target] of targets) {
        const dir = path.join(proj, 'node_modules', '@sapdon', target)
        assert.equal(fs.existsSync(path.join(dir, 'index.js')), true, `${name} 的 index.js 应已拷入`)
        const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8'))
        assert.deepEqual(pkg, { name, type: 'module', main: 'index.js', types: 'index.d.ts', version: frameworkVersion })
    }
    assert.equal(fs.existsSync(path.join(proj, 'node_modules', '@sapdon', 'runtime', 'index.js')), true, 'runtime 的内容来自 oc/')
    assert.equal(lines.some((l) => l.includes('已同步 @sapdon/core、@sapdon/cli、@sapdon/runtime')), true, lines.join(' | '))
})

test('框架仓库内部行为不变：已经存在的目标包被覆盖（时间戳/内容更新）', async () => {
    const fw = makeFrameworkRoot('fw-overwrite', 'oc')
    const proj = path.join(tmpRoot, 'proj-overwrite')
    const coreDir = path.join(proj, 'node_modules', '@sapdon', 'core')
    fs.mkdirSync(coreDir, { recursive: true })
    fs.writeFileSync(path.join(coreDir, 'index.js'), '// stale')

    await writeLib(proj, { rootDir: fw, log: () => { } })

    assert.equal(fs.readFileSync(path.join(coreDir, 'index.js'), 'utf-8'), '// core', '旧内容应被新产物覆盖')
})

// ---------------------------------------------------------------------------
// ⑥ 真正的错误仍然抛（不是「什么都吞掉」）
// ---------------------------------------------------------------------------
test('真正的 IO 错误仍然抛：目标位置被一个同名文件占住', async () => {
    const fw = makeFrameworkRoot('fw-err', 'oc')
    const proj = path.join(tmpRoot, 'proj-err')
    const sapdonDir = path.join(proj, 'node_modules', '@sapdon')
    fs.mkdirSync(sapdonDir, { recursive: true })
    // 目标 @sapdon/core 是个**文件**（不是目录）→ cpSync 目录进文件必然失败
    fs.writeFileSync(path.join(sapdonDir, 'core'), 'not a directory')

    await assert.rejects(() => writeLib(proj, { rootDir: fw, log: () => { } }))
})
