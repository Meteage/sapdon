/**
 * 资源包扫描（Sapdon UI Designer，Node 侧）
 *
 * `serve.mjs`（提供 /api/textures 与 /tex/）与 `tools/rasterize.mjs`（离屏把画布画成 PNG）
 * 共用同一份"找包 + 建索引 + 定位文件"逻辑 —— 只有一处事实来源。
 */

import { readdir, readFile, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { IMAGE_EXTS, PREVIEW_EXTS, normalizeTexturePath } from '../src/textures.js'

const listDirs = async (dir) => {
  try {
    return (await readdir(dir, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name)
  } catch {
    return []
  }
}

/** 目录能不能当纹理根（下面要有 textures/） */
export async function isPackDir(dir) {
  try {
    return (await stat(join(dir, 'textures'))).isDirectory()
  } catch {
    return false
  }
}

/** 浅层找 `resource_pack`（默认深度 ≤3）—— 用于自动发现 bedrock-samples */
export async function findResourcePacks(base, depth = 3) {
  const out = []
  const walk = async (dir, left) => {
    if (left < 0) return
    const names = await listDirs(dir)
    if (names.includes('resource_pack')) {
      const rp = join(dir, 'resource_pack')
      if (await isPackDir(rp)) out.push(rp)
    }
    for (const name of names) {
      if (/^(behavior_pack|documentation|metadata|node_modules|\.git)$/i.test(name)) continue
      await walk(join(dir, name), left - 1)
    }
  }
  await walk(base, depth)
  return out
}

/**
 * 决定扫哪些包。顺序 = 优先级：**越靠后越优先**（工程包覆盖原版，与游戏里一致）。
 * @param {{repo:string, workspace:string, vanilla?:string[], project?:string[], scanExamples?:boolean}} opts
 */
export async function discoverRoots(opts) {
  const roots = []
  const vanillaCandidates = [...(opts.vanilla || [])]
  if (!vanillaCandidates.length) {
    for (const name of await listDirs(opts.workspace)) {
      if (!/^bedrock-samples/i.test(name)) continue
      vanillaCandidates.push(...(await findResourcePacks(join(opts.workspace, name), 2)))
    }
  }
  for (const dir of vanillaCandidates) {
    const abs = resolve(dir)
    if (await isPackDir(abs)) roots.push({ kind: 'vanilla', dir: abs })
    else console.warn(`[designer] 忽略资源包 ${abs}（里面没有 textures/）`)
  }

  const projectCandidates = [...(opts.project || [])]
  if (opts.scanExamples !== false) {
    const examplesDir = join(opts.repo, 'examples')
    for (const name of await listDirs(examplesDir)) {
      for (const sub of await listDirs(join(examplesDir, name, 'dev'))) {
        if (/_RP$/i.test(sub)) projectCandidates.push(join(examplesDir, name, 'dev', sub))
      }
    }
  }
  const explicit = new Set((opts.project || []).map((p) => resolve(p)))
  for (const dir of projectCandidates) {
    const abs = resolve(dir)
    const pack = (await isPackDir(abs)) ? abs : (await isPackDir(join(abs, 'resource_pack'))) ? join(abs, 'resource_pack') : null
    if (pack) roots.push({ kind: 'project', dir: pack })
    else if (explicit.has(abs)) console.warn(`[designer] 忽略工程资源包 ${abs}（里面没有 textures/）`)
  }
  return roots
}

/**
 * 扫所有根的 textures/ 建索引。
 *
 * 同时读 **纹理定义侧车文件**：`textures/ui/book_back.json` 这类与 png 同名的 json 声明了
 * `nineslice_size` / `tiled` / `base_size`，引擎会把它当默认值套到用这张贴图的控件上
 * （原版 `book_background` 只写一句 texture 就能撑满整本书，靠的就是它）。
 *
 * @returns {{paths:string[], noPreview:string[], defs:object, fileByPath:Map<string,string>, byRoot:object[]}}
 */
export async function buildIndex(roots) {
  const map = new Map()
  const byRoot = []
  for (const root of roots) {
    const before = map.size
    await walkTextures(join(root.dir, 'textures'), root.dir, map)
    byRoot.push({ kind: root.kind, dir: root.dir, count: map.size - before })
  }
  const paths = [...map.keys()].sort()
  const defs = {}
  let sidecars = 0
  for (const [path, entry] of map.entries()) {
    if (!entry.def || !Object.keys(entry.def).length) continue
    defs[path] = entry.def
    // 真正来自侧车 json 的（只有 size 的条目是"读文件头得到的尺寸"，不算侧车）
    if (entry.def.nineslice_size !== undefined || entry.def.tiled !== undefined || entry.def.base_size !== undefined) sidecars++
  }
  return {
    paths,
    noPreview: [...map.entries()].filter(([, v]) => !v.preview).map(([k]) => k),
    defs,
    sidecarCount: sidecars,
    fileByPath: new Map([...map.entries()].map(([k, v]) => [k, v.file])),
    byRoot,
  }
}

async function walkTextures(dir, base, out) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      await walkTextures(full, base, out)
      continue
    }
    const dot = e.name.lastIndexOf('.')
    const ext = dot >= 0 ? e.name.slice(dot).toLowerCase() : ''
    if (!IMAGE_EXTS.includes(ext)) continue
    const path = normalizeTexturePath(full.slice(base.length + 1))
    if (!path) continue
    const size = await readImageSize(full, ext)
    const def = await readTextureDef(path, full)
    out.set(path, { file: full, preview: PREVIEW_EXTS.includes(ext), def: { ...(def || {}), ...(size ? { size } : {}) } })
  }
}

/** 读图片像素尺寸（只读文件头，不解码整图）：九宫格切片要用它算源矩形 */
async function readImageSize(file, ext) {
  try {
    const head = (await readFile(file)).subarray(0, 4096)
    if (ext === '.png') {
      if (head.length < 24 || head.readUInt32BE(0) !== 0x89504e47) return null
      return [head.readUInt32BE(16), head.readUInt32BE(20)]
    }
    if (ext === '.tga') {
      if (head.length < 18) return null
      return [head.readUInt16LE(12), head.readUInt16LE(14)]
    }
    if (ext === '.jpg' || ext === '.jpeg') {
      let i = 2
      while (i + 9 < head.length) {
        if (head[i] !== 0xff) {
          i++
          continue
        }
        const marker = head[i + 1]
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return [head.readUInt16BE(i + 7), head.readUInt16BE(i + 5)]
        }
        i += 2 + head.readUInt16BE(i + 2)
      }
    }
  } catch {
    return null
  }
  return null
}

/** 读侧车定义：`<同名>.json` 里的 nineslice_size / tiled / base_size（读不到就 null） */
async function readTextureDef(path, file) {
  const sidecar = file.replace(/\.(png|jpg|jpeg|tga)$/i, '.json')
  try {
    const raw = await readFile(sidecar, 'utf8')
    const json = JSON.parse(raw)
    const def = {}
    if (json.nineslice_size !== undefined) def.nineslice_size = json.nineslice_size
    if (json.tiled !== undefined) def.tiled = json.tiled
    if (Array.isArray(json.base_size)) def.base_size = json.base_size
    return Object.keys(def).length ? def : null
  } catch {
    return null
  }
}
