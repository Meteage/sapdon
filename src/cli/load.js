import path from "path"
import fs from "fs"
import { saveFile } from "./utils.js"
import { mergeGeneratedBlock } from '@sapdon/utils/componentIndex.js'
import { BUILD_PROTOCOL, formatPacketIssues, validateBuildPacket } from '@sapdon/utils/protocol.js'

/** `SAPDON_VERBOSE=1` 时恢复逐文件 / 跳过 / 无变化日志 */
const VERBOSE = process.env.SAPDON_VERBOSE === '1'

// ── 生成物清单：用于精确清理「陈旧产物」（缺口 9）──
// 只有**框架自己生成过**的文件才会被清理；用户 res/ 拷进来的文件与手写文件一律不碰。
const MANIFEST_VERSION = 1
const manifestPathOf = (buildPath, projectName) =>
    path.join(buildPath, `.sapdon_generated_${projectName}.json`)

function readManifest(buildPath, projectName) {
    const p = manifestPathOf(buildPath, projectName)
    try {
        const parsed = JSON.parse(fs.readFileSync(p, 'utf-8'))
        if (parsed && parsed.v === MANIFEST_VERSION && Array.isArray(parsed.files)) return { files: parsed.files, existed: true }
    } catch { /* 首次构建没有清单，属正常 */ }
    return { files: [], existed: false }
}

/**
 * 清掉历史版本留在**行为包**里的 `blocks.json`。
 *
 * `blocks.json` 规范上属资源包（RP 根目录），但 05bd104..本次修复之间框架把它写在 BP，
 * 那些文件**不在任何清单里**（当年还没有清单机制），只能在这里显式点名清理
 * —— 否则「dev/*_BP/blocks.json 不存在」这条验收永远过不了。
 *
 * ⚠️ 每次都查而不是只在「没有清单的首次构建」做：清单是否存在取决于构建历史
 *    （中断的构建也会留下清单），按清单判断会漏掉这类残留。规则本身是**一个确切路径**，
 *    不做任何目录扫描，所以无条件执行也是安全的。
 */
function cleanLegacyBpBlocksJson(buildPath, projectName) {
    const rel = `${projectName}_BP/blocks.json`
    const abs = path.join(buildPath, rel)
    if (fs.existsSync(abs)) {
        fs.rmSync(abs, { force: true })
        console.log(`已删除历史误放产物 ${rel}（blocks.json 规范属资源包 RP，框架不会再往 BP 写）`)
    }
}

function writeManifest(buildPath, projectName, files) {
    saveFile(manifestPathOf(buildPath, projectName), JSON.stringify({
        v: MANIFEST_VERSION,
        note: 'sapdon 生成物清单：本次构建写出的产物文件（相对 dev/ 的路径）。下次构建据此删除不再生成的旧文件。请勿手工编辑。',
        files: [...files].sort(),
    }, null, 2))
}

/**
 * 删除上一次构建生成、但本次不再生成的产物（改名/删条目的场景）。
 * ⚠️ 只删清单里记过的路径 —— 不扫目录、不猜规则，避免误删用户 res/ 资源与手写文件。
 */
function cleanStaleGenerated(buildPath, previousFiles, nextFiles) {
    const next = new Set(nextFiles)
    let removed = 0
    for (const rel of previousFiles) {
        if (next.has(rel)) continue
        const abs = path.join(buildPath, rel)
        if (fs.existsSync(abs)) {
            fs.rmSync(abs, { force: true })
            removed++
            console.log(`已清理陈旧产物: ${rel}`)
        }
    }
    return removed
}

/**
 * 写入/更新一个「按标记块合并」的文本文件（自定义组件索引、自动注册表等）。
 *
 * 合并规则见 `@sapdon/utils/componentIndex`（纯函数、幂等、保留手写部分）。
 * `block` 已由解析器生成好，这里只做「按标记替换」。
 */
function writeIndexBlock(indexPath, block) {
    if (!fs.existsSync(indexPath)) {
        saveFile(indexPath, `${block}\n`)
        console.log(`已生成索引文件: ${indexPath}`)
        return
    }

    const current = fs.readFileSync(indexPath, 'utf-8')
    const next = mergeGeneratedBlock(current, block)

    if (next === current) {
        if (VERBOSE) console.log(`索引文件已是最新，未改动: ${indexPath}`)
        return
    }

    saveFile(indexPath, next)
    console.log(`已更新索引文件（保留手写部分）: ${indexPath}`)
}

/**
 * 把构建脚本提交的「最终文件包」落盘。
 *
 * CLI 在这里**不认识任何 addon 语义**：图集、组件索引、脚本源码都已在 core 侧解析完成。
 *
 * @param {object} packet `BuildPacket`（见 `@sapdon/utils/protocol`）
 * @param {{ projectPath: string, buildPath: string, projectName: string }} options
 *        `projectPath` = 项目根（源码写到它下面）、`buildPath` = `dev/`、`projectName` = 包名前缀
 * @throws 协议版本不符时（CLI 与项目里的 core 版本不一致）
 */
export async function writeBuildPacket(packet, options) {
    const { projectPath, buildPath, projectName } = options

    if (!packet || packet.protocol !== BUILD_PROTOCOL) {
        throw new Error(
            `构建协议不匹配：CLI 期望 ${BUILD_PROTOCOL}，收到 ${packet?.protocol ?? '(空)'}。` +
            `请把项目里的 @sapdon/core 与 sapdon CLI 升到同一版本。`
        )
    }

    // 结构校验：CLI 是最后一道防线（也可能收到非 core 生产者发来的包）
    const issues = validateBuildPacket(packet)
    const errors = issues.filter((issue) => issue.level === 'error')
    if (errors.length > 0) {
        throw new Error(`构建包校验失败:\n${formatPacketIssues(errors)}`)
    }
    const warnings = issues.filter((issue) => issue.level === 'warning')
    if (warnings.length > 0) {
        console.warn(`[sapdon] 构建包校验警告:\n${formatPacketIssues(warnings)}`)
    }

    const previousFiles = readManifest(buildPath, projectName)
    cleanLegacyBpBlocksJson(buildPath, projectName)
    const generatedFiles = []
    const record = (absPath) => { generatedFiles.push(path.relative(buildPath, absPath)) }

    const counts = { behavior: 0, resource: 0 }
    for (const file of packet.files) {
        if (VERBOSE) console.log('处理数据:', file.name, file.root, file.path)
        counts[file.root] = (counts[file.root] ?? 0) + 1

        const packDir = file.root === 'behavior' ? `${projectName}_BP` : `${projectName}_RP`
        const format = file.format ?? 'json'
        const ext = file.ext ?? 'json'
        const filePath = path.join(buildPath, packDir, file.path, `${file.name}.${ext}`)

        let content
        if (format === 'base64') content = Buffer.from(String(file.data ?? ''), 'base64')
        else if (format === 'text') content = String(file.data ?? '')
        else content = JSON.stringify(file.data, null, 2)

        saveFile(filePath, content)
        record(filePath)
    }
    console.log(
        `处理数据: ${packet.files.length} 个文件` +
        `（behavior ${counts.behavior ?? 0} / resource ${counts.resource ?? 0}）`
    )

    for (const source of packet.sources ?? []) {
        const filePath = path.join(projectPath, source.path)
        const exists = fs.existsSync(filePath)
        if (exists && !source.overwrite) {
            if (VERBOSE) console.log(`源码文件已存在，跳过: ${filePath}`)
            continue
        }
        saveFile(filePath, source.content)
        console.log(`${exists ? '已更新' : '已生成'}源码文件: ${filePath}`)
    }

    const indexBlocks = packet.indexBlocks ?? (packet.indexBlock ? [packet.indexBlock] : [])
    for (const block of indexBlocks) {
        writeIndexBlock(path.join(projectPath, block.path), block.content)
    }

    cleanStaleGenerated(buildPath, previousFiles.files, generatedFiles)
    writeManifest(buildPath, projectName, generatedFiles)
}
