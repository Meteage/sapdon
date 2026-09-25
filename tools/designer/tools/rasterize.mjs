/**
 * 离屏把画布渲染成 PNG（Sapdon UI Designer）
 *
 * **为什么需要它**：本环境没有浏览器，`src/ui/canvas.js` 画得对不对肉眼看不到。
 * 这个脚本用**和画布完全相同的规则**（`layout.js` 解算 + `paint.js` 出绘制指令）生成 draw list，
 * 再交给 `rasterize.py`（PIL）画成 PNG —— 于是"画布长什么样"变成一张我能看、也能进 review 的图。
 *
 * 用法：
 *   node tools/designer/tools/rasterize.mjs                          # 默认渲染 samples/guidebook.js
 *   node tools/designer/tools/rasterize.mjs <工程.sui.json> [输出.png]
 *   node tools/designer/tools/rasterize.mjs --zoom 2 --grid          # 带盒子/格位调试线
 *   node tools/designer/tools/rasterize.mjs --page 2                 # 只画第 2 页的可见内容（门控模拟）
 *   node tools/designer/tools/rasterize.mjs --vanilla "<RP 目录>"
 *
 * 产物默认写到 `.tmp/designer-render.png`（仓库 .tmp 已 gitignore）。
 */

import { spawnSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadProject, gateTags, screenOf } from '../src/model.js'
import { layoutTree, paintOrder } from '../src/layout.js'
import { paintTree } from '../src/paint.js'
import { visibilityOf } from '../src/gate.js'
import { FORM_MARKER } from '../src/preview.js'
import { buildTextureIndex } from '../src/textures.js'
import { discoverRoots, buildIndex } from './packScan.mjs'
import { SAMPLE } from '../samples/guidebook.js'

const HERE = resolve(fileURLToPath(new URL('.', import.meta.url)))
const DESIGNER = resolve(HERE, '..')
const REPO = resolve(DESIGNER, '..', '..')
const WORKSPACE = resolve(REPO, '..')

// --- 参数 ---
const argv = process.argv.slice(2)
const flags = { zoom: null, grid: false, page: null, all: false, vanilla: [], project: [], out: null, input: null }
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--zoom') flags.zoom = Number(argv[++i])
  else if (a === '--grid') flags.grid = true
  else if (a === '--page') flags.page = Number(argv[++i])
  else if (a === '--all') flags.all = true
  else if (a === '--vanilla') flags.vanilla.push(argv[++i])
  else if (a === '--project') flags.project.push(argv[++i])
  else if (a === '--out') flags.out = argv[++i]
  else if (!flags.input) flags.input = a
  else if (!flags.out) flags.out = a
}

// --- 工程 ---
let raw = SAMPLE
let label = 'samples/guidebook.js'
if (flags.input) {
  const abs = resolve(flags.input)
  if (!existsSync(abs)) {
    console.error(`找不到工程文件：${abs}`)
    process.exit(1)
  }
  raw = JSON.parse(await (await import('node:fs/promises')).readFile(abs, 'utf8'))
  label = abs
}
const { project: doc, errors } = loadProject(raw)
if (!doc) {
  console.error('工程装载失败：', errors.join('；'))
  process.exit(1)
}
if (errors.length) console.warn('工程装载告警：', errors.join('；'))

// --- 资源包 ---
const roots = await discoverRoots({ repo: REPO, workspace: WORKSPACE, vanilla: flags.vanilla, project: flags.project })
const index = roots.length ? await buildIndex(roots) : { paths: [], noPreview: [], defs: {}, fileByPath: new Map(), byRoot: [] }
const textures = buildTextureIndex(index.paths, index.noPreview, index.defs)
console.log(`资源包: ${roots.length} 个，纹理 ${index.paths.length} 条（${index.sidecarCount} 条带九宫格/平铺侧车定义）`)
for (const r of index.byRoot) console.log(`  [${r.kind}] ${r.dir} — ${r.count}`)

// --- 版面 + 绘制指令 ---
const frame = { x: 0, y: 0, w: doc.canvas.size[0], h: doc.canvas.size[1] }
const layout = layoutTree(doc.elements, frame)
// 绘制顺序：同级按 layer 排（与画布一致）
const ordered = paintOrder(layout)
const orderedLayout = { ...layout, list: ordered }
const allOps = paintTree(doc, orderedLayout, { textures })

// 门控模拟：默认只画第 1 页可见的内容（否则所有页会叠在一起，看不清版面）
// tag 的唯一来源 = gateTags(doc)（多页管理器登记的 tag + 元素绑定的 $gtag/$binding_text）
let sim = null
const pageNo = flags.page !== null ? flags.page : flags.all ? 0 : 1
if (pageNo) {
  const tags = gateTags(doc)
  const tag = tags[pageNo - 1]
  const scr = screenOf(doc)
  sim = tag ? { body: tag, title: `${FORM_MARKER}${scr.name}`, buttons: '' } : null
  if (sim) console.log(`门控模拟：tag #${pageNo}（#form_text=${sim.body}；--page 0 可关掉，--page N 换页）`)
}

// 被门控挡掉的元素不画（与画布"门控模拟"同一套规则）
// ★ 必须**向下传播**：父面板被挡掉时，它的子控件也不该出现（list 是先序遍历，父在前）
const hidden = new Set()
if (sim) {
  for (const box of layout.list) {
    const parentHidden = box.parentId ? hidden.has(box.parentId) : false
    const selfHidden = !visibilityOf(box.node, sim, true).visible
    if (parentHidden || selfHidden) hidden.add(box.id)
  }
}
let ops = allOps.filter((op) => !hidden.has(op.id))

// 静态图只画默认态：hover/pressed 是鼠标交互才出现的（DOM 画布由 CSS 切）
const stateFiltered = ops.filter((op) => !op.state || op.state === 'default')
if (stateFiltered.length !== ops.length) console.log(`静态渲染：跳过 ${ops.length - stateFiltered.length} 条 hover/pressed 图层`)
ops = stateFiltered
if (hidden.size) console.log(`门控隐藏：${hidden.size} 个元素`)

const zoom = flags.zoom || doc.canvas.zoom || 2
const payload = {
  width: doc.canvas.size[0],
  height: doc.canvas.size[1],
  zoom,
  grid: flags.grid,
  sim,
  boxes: layout.list.map((b) => ({ id: b.id, type: b.node.type, rect: b.rect, placement: b.placement, depth: b.depth, notes: b.notes })),
  ops: ops.map((op) => ({ ...op, file: op.texture ? index.fileByPath.get(op.texture) || null : null })),
}

await mkdir(join(REPO, '.tmp'), { recursive: true })
const listFile = join(REPO, '.tmp', 'designer-drawlist.json')
await writeFile(listFile, JSON.stringify(payload, null, 1), 'utf8')

const outPng = flags.out ? resolve(flags.out) : join(REPO, '.tmp', 'designer-render.png')
await mkdir(dirname(outPng), { recursive: true })

// --- 交给 PIL ---
const py = spawnSync('python', [join(HERE, 'rasterize.py'), listFile, outPng], { stdio: 'inherit' })
if (py.error) {
  console.error('调用 python 失败：', py.error.message)
  process.exit(1)
}
if (py.status !== 0) process.exit(py.status ?? 1)
console.log(`\n画布渲染 → ${outPng}`)
console.log(`工程：${label} · 元素 ${layout.list.length} · 绘制指令 ${ops.length} · zoom ${zoom}`)
