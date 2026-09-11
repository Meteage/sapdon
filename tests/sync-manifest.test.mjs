// 部署/资源清单驱动 prune 的受控实验（直接跑：`node tests/sync-manifest.test.mjs`）
//
// 验证「同步到游戏开发包只增不减」这个 P0/P1 缺陷真的被修掉，且**不会误删**：
//   1. 从项目里删掉的产物 → 游戏开发包里的旧副本必须消失
//   2. 用户手工放进游戏开发包的文件 → 必须**留住**（清单机制不做目录扫描）
//   3. `res/` 里删掉的资源 → dev/<proj>_RP 里的旧副本消失；用户手写的 dev/ 文件留住
//
// ⚠️ `MC_PATH` 必须在本模块 **import 之前** 设置（`versionType.ts` 在模块顶层读它），
//    故这里用动态 import。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..')

const tmpRoot = path.join(repoRoot, '.tmp', 'sync-manifest-test')
const projectPath = path.join(tmpRoot, 'proj')
const gamePath = path.join(tmpRoot, 'game')
const projectName = 'testproj'

fs.rmSync(tmpRoot, { recursive: true, force: true })
fs.mkdirSync(path.join(projectPath, 'dev', `${projectName}_BP`, 'blocks'), { recursive: true })
fs.mkdirSync(path.join(projectPath, 'dev', `${projectName}_RP`, 'ui'), { recursive: true })
fs.mkdirSync(path.join(projectPath, 'res', 'textures'), { recursive: true })
fs.mkdirSync(gamePath, { recursive: true })

fs.writeFileSync(path.join(projectPath, 'build.config'), JSON.stringify({
    formatVersion: 2,
    buildOptions: {
        useHMR: false, buildMode: 'dev', buildEntry: 'main.mjs', scriptEntry: 'scripts/index.js',
        scriptOutput: 'scripts/index.js', useJs: true, buildDir: 'dev/', dependencies: [],
        resource: { path: 'res/', resourceHints: true },
    },
    versionType: 'release',
}, null, 2))

// 把「游戏目录」重定向到临时目录（否则会动到玩家真正的 Minecraft 开发包）
process.env.MC_PATH = gamePath
process.chdir(projectPath)

const { syncDevFilesServer, syncResourceFiles } = await import('../dist/cli/dev-server/syncFiles.js')

const bpDev = path.join(projectPath, 'dev', `${projectName}_BP`)
const rpDev = path.join(projectPath, 'dev', `${projectName}_RP`)
const bpGame = path.join(gamePath, 'development_behavior_packs', `${projectName}_BP`)
const rpGame = path.join(gamePath, 'development_resource_packs', `${projectName}_RP`)

const write = (p, content = '{}') => {
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, content)
}
const exists = (p) => fs.existsSync(p)

test('第一次同步：没有清单 → 一个文件都不删，只记录', async () => {
    write(path.join(bpDev, 'manifest.json'))
    write(path.join(bpDev, 'blocks', 'a.json'))
    write(path.join(bpDev, 'blocks', 'b.json'))
    write(path.join(rpDev, 'manifest.json'))
    write(path.join(rpDev, 'ui', 'handwritten.json'), '{"hand":"written"}')
    // 「用户自己放进开发包」的东西：任何构建都不该碰它
    write(path.join(bpGame, 'user_notes.txt'), 'user file')

    await syncDevFilesServer(projectPath, projectName)

    assert.equal(exists(path.join(bpGame, 'blocks', 'a.json')), true)
    assert.equal(exists(path.join(bpGame, 'blocks', 'b.json')), true)
    assert.equal(exists(path.join(bpGame, 'user_notes.txt')), true, '未知文件必须留在游戏目录')
    assert.equal(exists(path.join(projectPath, 'dev', `.sapdon_synced_${projectName}.json`)), true, '第一次同步后应写出部署清单')
})

test('第二次同步：dev/ 里删掉的产物 → 游戏目录里的旧副本被清掉；用户文件留住', async () => {
    // 模拟"用户把方块 b 从项目里删掉"→ dev/ 里已经没有它（框架的陈旧产物清理负责这一步）
    fs.rmSync(path.join(bpDev, 'blocks', 'b.json'), { force: true })

    await syncDevFilesServer(projectPath, projectName)

    assert.equal(exists(path.join(bpGame, 'blocks', 'b.json')), false, '①②陈旧产物必须从游戏目录删掉')
    assert.equal(exists(path.join(bpGame, 'blocks', 'a.json')), true)
    assert.equal(exists(path.join(bpGame, 'blocks')), true)
    assert.equal(exists(path.join(bpGame, 'user_notes.txt')), true, '③用户放进开发包的文件必须留住')
})

test('空包目录（疑似构建中断）→ 不 prune', async () => {
    const emptyProject = path.join(tmpRoot, 'proj-empty')
    const emptyBpDev = path.join(emptyProject, 'dev', `${projectName}_BP`)
    fs.mkdirSync(emptyBpDev, { recursive: true })
    fs.mkdirSync(path.join(emptyProject, 'dev', `${projectName}_RP`), { recursive: true })
    fs.writeFileSync(path.join(emptyProject, 'build.config'), JSON.stringify({
        formatVersion: 2,
        buildOptions: {
            useHMR: false, buildMode: 'dev', buildEntry: 'main.mjs', scriptEntry: 'scripts/index.js',
            scriptOutput: 'scripts/index.js', useJs: true, buildDir: 'dev/', dependencies: [],
            resource: { path: 'res/', resourceHints: true },
        },
        versionType: 'release',
    }, null, 2))
    // 先做一次正常同步（有清单），再把 dev/ 清空模拟构建中断
    write(path.join(emptyBpDev, 'manifest.json'))
    process.chdir(emptyProject)
    await syncDevFilesServer(emptyProject, projectName)
    assert.equal(fs.existsSync(path.join(bpGame, 'manifest.json')), true)
    fs.rmSync(path.join(emptyBpDev, 'manifest.json'), { force: true })
    await syncDevFilesServer(emptyProject, projectName)
    assert.equal(fs.existsSync(path.join(bpGame, 'manifest.json')), true, '空包目录不该把游戏里完好的包删空')
    process.chdir(projectPath)
})

test('res/ 清单：删掉 res/ 里的资源 → dev 副本清掉；用户手写文件留住', () => {
    const resDir = path.join(projectPath, 'res')
    write(path.join(resDir, 'textures', 'a.png'), 'A')
    write(path.join(resDir, 'textures', 'b.png'), 'B')

    syncResourceFiles(projectPath, projectName, resDir, rpDev)
    assert.equal(exists(path.join(rpDev, 'textures', 'a.png')), true)
    assert.equal(exists(path.join(rpDev, 'textures', 'b.png')), true)

    fs.rmSync(path.join(resDir, 'textures', 'b.png'), { force: true })
    syncResourceFiles(projectPath, projectName, resDir, rpDev)

    assert.equal(exists(path.join(rpDev, 'textures', 'b.png')), false, 'res 里删掉的资源必须从 dev 清掉')
    assert.equal(exists(path.join(rpDev, 'textures', 'a.png')), true)
    assert.equal(exists(path.join(rpDev, 'ui', 'handwritten.json')), true, '用户手写的 dev/ 文件必须留住')
})
