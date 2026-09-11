import { dirname, copyFolder } from "../utils.js"
import path from "path"
import fs from 'fs'
import { getGamePath } from '../meta/versionType.js'
import { getPackageJson } from "../meta/package.js"
import { getBuildConfig } from "../meta/buildConfig.js"

// ────────────────────────────────────────────────────────────────────────────
// 部署清单：让「同步到游戏开发包」不再**只增不减**
//
// 症状（真机实测）：从项目里删掉的方块 / 物品 / 配方，**永远留在玩家游戏里**，
// 并持续报 `… not present in the Schema`；`res/` 里删掉的资源同样残留。
// 根因：这里原本只有 `fs.cpSync(..., {recursive:true, force:true})` —— 它**只合并、从不删除**；
// 而陈旧的 dev/ 产物清理只作用于项目的 `dev/`（`load.js` 的清单），管不到游戏目录里的副本。
//
// 做法：**按清单 prune**。
//   - 清单 = 「上一次同步时，我把 dev/ 里哪两个包目录的哪些文件拷到了游戏目录」。
//   - 本次同步前，删掉「上次记过、这次 dev/ 里已经没有」的目标侧文件（先文件、后空目录）。
//   - ★ **禁止**改成"扫目标目录、删不认识的文件"：玩家可能自己往开发包里放东西，
//     而 `res/` 拷进来的文件也不在框架生成的清单里 —— 扫目录必误删。这正是清单机制的设计理由。
//   - **没有清单时（首跑 / 从未成功构建过的老项目）一个文件都不删**，只记录。
//
// ⚠️ 这里记的是「**实际部署过的文件全集**」，而不是直接复用 `dev/.sapdon_generated_<proj>.json`：
//    后者只记框架生成的 JSON，**不含** `manifest.json` / `pack_icon.png` / 打包好的 `scripts/index.js` /
//    `res/` 拷进来的资源；而且它在同步之前就被本次构建覆写了（`load.js` → `writeManifest`），
//    同步时已经读不到"上次"了。用部署全集才能把这些一起纳入 prune，且同样**不扫目录删未知文件**。
// ────────────────────────────────────────────────────────────────────────────
const DEPLOY_MANIFEST_VERSION = 1

const deployManifestPathOf = (projectPath, buildDir, projectName) =>
    path.join(projectPath, buildDir, `.sapdon_synced_${projectName}.json`)

function readDeployManifest(manifestPath) {
    try {
        const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
        if (parsed && parsed.v === DEPLOY_MANIFEST_VERSION && Array.isArray(parsed.files)) {
            return { files: parsed.files, existed: true }
        }
    } catch { /* 首次同步没有清单，属正常：此时**不删任何东西** */ }
    return { files: [], existed: false }
}

function writeDeployManifest(manifestPath, files) {
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true })
    fs.writeFileSync(manifestPath, JSON.stringify({
        v: DEPLOY_MANIFEST_VERSION,
        note: 'sapdon 部署清单：上一次同步到「游戏开发包目录」的文件（相对 dev/ 的路径）。下次同步据此删除不再生成的旧文件。请勿手工编辑。',
        files: [...files].sort(),
    }, null, 2))
}

/** 递归列出目录下的**文件**（相对 root，统一用 `/` 分隔），不含目录名本身 */
function listFilesRecursive(root, prefix = '') {
    const out = []
    let entries
    try {
        entries = fs.readdirSync(root, { withFileTypes: true })
    } catch {
        return out
    }
    for (const entry of entries) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name
        if (entry.isDirectory()) {
            out.push(...listFilesRecursive(path.join(root, entry.name), rel))
        } else {
            out.push(rel)
        }
    }
    return out
}

/** 删完文件后顺手清掉空目录（只在包目录**内部**向上删，绝不越过 packRoot） */
function removeEmptyDirsUpTo(packRoot, dir) {
    let current = dir
    while (current && current !== packRoot && current.startsWith(packRoot)) {
        let isEmpty = false
        try {
            isEmpty = fs.readdirSync(current).length === 0
        } catch {
            return
        }
        if (!isEmpty) return
        try {
            fs.rmdirSync(current)
        } catch {
            return
        }
        current = path.dirname(current)
    }
}

export async function syncDevFilesServer(projectPath, projectName) {
    const buildConfig = getBuildConfig()
    const buildDir = path.join(projectPath, buildConfig.buildOptions.buildDir)
    const gamePath = getGamePath()

    const packs = [
        {
            name: `${projectName}_BP`,
            src: path.join(buildDir, `${projectName}_BP`),
            destRoot: path.join(gamePath, "development_behavior_packs"),
        },
        {
            name: `${projectName}_RP`,
            src: path.join(buildDir, `${projectName}_RP`),
            destRoot: path.join(gamePath, "development_resource_packs"),
        },
    ]

    const manifestPath = deployManifestPathOf(projectPath, buildConfig.buildOptions.buildDir, projectName)
    const previous = readDeployManifest(manifestPath)

    // 本次要部署的全集（= dev/ 里这两个包目录当前的全部文件）
    const current = []
    for (const pack of packs) {
        const dest = path.join(pack.destRoot, pack.name)
        const files = listFilesRecursive(pack.src)

        if (previous.existed) {
            const previousOfPack = previous.files.filter((rel) => rel.startsWith(`${pack.name}/`))
            // 空包目录几乎只可能是「构建中途失败」，不是"用户删掉了整包东西" —— 此时不 prune，避免把游戏里
            // 一份完好可用的包删空（dev/ 里正常总该有 manifest.json）。
            if (files.length === 0 && previousOfPack.length > 0) {
                console.warn(
                    `[sapdon] ${pack.name} 的 dev/ 目录为空，跳过本次陈旧产物清理（疑似构建中断）。` +
                    `如需清空游戏里的旧包，请手工删除 ${dest}`
                )
            } else {
                const currentSet = new Set(files.map((rel) => `${pack.name}/${rel}`))
                for (const rel of previousOfPack) {
                    if (currentSet.has(rel)) continue
                    const abs = path.join(dest, path.relative(pack.name, rel))
                    if (!fs.existsSync(abs)) continue
                    fs.rmSync(abs, { force: true })
                    console.log(`已清理游戏目录中的陈旧产物: ${rel}`)
                    removeEmptyDirsUpTo(dest, path.dirname(abs))
                }
            }
        }

        for (const rel of files) current.push(`${pack.name}/${rel}`)
    }

    // 合并式拷贝（与历史行为一致：force 覆盖，但仍**不删除**未知文件）
    fs.cpSync(path.join(buildDir, `${projectName}_BP`), path.join(gamePath, "development_behavior_packs/", `${projectName}_BP/`), { recursive: true, force: true })
    fs.cpSync(path.join(buildDir, `${projectName}_RP`), path.join(gamePath, "development_resource_packs/", `${projectName}_RP/`), { recursive: true, force: true })

    // 记下本次部署的全集，供下次 prune
    writeDeployManifest(manifestPath, current)
}

// ────────────────────────────────────────────────────────────────────────────
// `res/` → `dev/<proj>_RP/` 的同步同样是「只合并、从不删除」（`copyFolder`），
// 于是**从 `res/` 删掉的资源（贴图 / UI / lang）永远留在 dev/ 与游戏里**。
//
// 做法与部署侧同一套：只记「**框架自己从 `res/` 拷过去的**文件」，
// 下次同步前删掉「上次记过、这次 `res/` 里已经没有」的那些；**不扫目录删未知文件**
// （`dev/<proj>_RP/ui/` 里有用户手写的 JSON，`textures/` 里也有框架生成的文件 —— 扫目录必误删）。
// `res/` 里**没有**、用户直接放进 `dev/<proj>_RP/` 的文件因此永远不在这份清单里，也就永远不会被删。
//
// ⚠️ 注意分工：这里只管"`res/` 复制过来的文件"；框架生成的 JSON 由 `load.js` 的
//    `dev/.sapdon_generated_<proj>.json` 清单管。两份清单互不重叠（同一路径两边都出现时，
//    删除也是安全的：`res/` 删掉后框架若仍会生成它，同一次构建里还会被重新写出来）。
// ────────────────────────────────────────────────────────────────────────────
const RES_MANIFEST_VERSION = 1

const resManifestPathOf = (projectPath, buildDir, projectName) =>
    path.join(projectPath, buildDir, `.sapdon_res_${projectName}.json`)

/**
 * 把项目的 `res/` 同步到 `dev/<proj>_RP/`，并按清单删除「从 `res/` 里删掉」的旧文件。
 * @param {string} projectPath 项目根目录
 * @param {string} projectName 项目名
 * @param {string} sourcePath 项目 `res/` 目录
 * @param {string} destinationPath `dev/<proj>_RP/`
 */
export function syncResourceFiles(projectPath, projectName, sourcePath, destinationPath) {
    const manifestPath = resManifestPathOf(projectPath, getBuildConfig().buildOptions.buildDir, projectName)
    const sourceFiles = listFilesRecursive(sourcePath)
    const sourceSet = new Set(sourceFiles)

    let previous = { files: [], existed: false }
    try {
        const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
        if (parsed && parsed.v === RES_MANIFEST_VERSION && Array.isArray(parsed.files)) {
            previous = { files: parsed.files, existed: true }
        }
    } catch { /* 首次没有清单：不删任何东西 */ }

    if (previous.existed) {
        for (const rel of previous.files) {
            if (sourceSet.has(rel)) continue
            const abs = path.join(destinationPath, rel)
            if (!fs.existsSync(abs)) continue
            fs.rmSync(abs, { force: true })
            console.log(`已清理 res/ 中已删除的资源: ${rel}`)
            removeEmptyDirsUpTo(destinationPath, path.dirname(abs))
        }
    }

    copyFolder(sourcePath, destinationPath)

    fs.mkdirSync(path.dirname(manifestPath), { recursive: true })
    fs.writeFileSync(manifestPath, JSON.stringify({
        v: RES_MANIFEST_VERSION,
        note: 'sapdon 资源清单：上一次从项目 res/ 复制到 dev/<项目>_RP/ 的文件（相对 res/ 的路径）。下次据此删除 res/ 里已不存在的旧文件。请勿手工编辑。',
        files: [...sourceFiles].sort(),
    }, null, 2))
}

export async function writeLib(projectPath) {
    const projectModules = path.join(projectPath, "node_modules")
    const rootDir = path.join(dirname(import.meta), '../')
    const corePath = path.join(rootDir, 'core')
    const cliPath = path.join(rootDir, 'cli')
    const ocPath = path.join(rootDir, 'oc')
    const targetCorePath = path.join(projectModules, '@sapdon/core')
    const targetCliPath = path.join(projectModules, '@sapdon/cli')
    const targetOcPath = path.join(projectModules, '@sapdon/runtime')
    const packageJson = getPackageJson()

    fs.cpSync(corePath, targetCorePath, { recursive: true, force: true })
    fs.cpSync(cliPath, targetCliPath, { recursive: true, force: true })
    fs.cpSync(ocPath, targetOcPath, { recursive: true, force: true })

    fs.writeFileSync(path.join(targetCorePath, 'package.json'), JSON.stringify({
        name: '@sapdon/core',
        type: 'module',
        main: 'index.js',
        types: 'index.d.ts',
        version: packageJson.version,
    }))
    fs.writeFileSync(path.join(targetCliPath, 'package.json'), JSON.stringify({
        name: '@sapdon/cli',
        type: 'module',
        main: 'index.js',
        types: 'index.d.ts',
        version: packageJson.version,
    }))
    fs.writeFileSync(path.join(targetOcPath, 'package.json'), JSON.stringify({
        name: '@sapdon/runtime',
        type: 'module',
        main: 'index.js',
        types: 'index.d.ts',
        version: packageJson.version,
    }))
}

// ── 内部工具导出：仅供 `tests/sync-manifest.test.mjs` 直接验证 prune 逻辑 ──
export const __internal = {
    deployManifestPathOf,
    resManifestPathOf,
    readDeployManifest,
    writeDeployManifest,
    listFilesRecursive,
    removeEmptyDirsUpTo,
}
