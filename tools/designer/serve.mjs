/**
 * 零依赖静态服务器 + 资源包纹理索引（Sapdon UI Designer）
 *
 * 为什么不引 vite：本仓库没有 vite，受限环境装不了依赖，而原生 ESM 直接跑就够了。
 *
 * 用法：
 *   node tools/designer/serve.mjs                     # 默认 http://127.0.0.1:5178
 *   node tools/designer/serve.mjs 6000                # 指定端口
 *   node tools/designer/serve.mjs --vanilla <RP 目录>  # 指定原版资源包（或用环境变量）
 *   node tools/designer/serve.mjs --project <RP 目录>  # 追加工程资源包（可多次；工程贴图优先于原版）
 *
 * 环境变量：`SAPDON_DESIGNER_PORT` / `SAPDON_DESIGNER_HOST` /
 *          `SAPDON_DESIGNER_VANILLA` / `SAPDON_DESIGNER_PROJECT`（多个用 `;` 分隔）
 *
 * 扫描逻辑（找包/建索引/读纹理定义侧车）都在 `tools/packScan.mjs`，与离屏光栅化共用一份。
 *
 * 路由：
 *   GET /                       编辑器页面
 *   GET /api/config             可用资源包清单 / 索引状态
 *   GET /api/textures?q=&limit= 纹理路径检索（`all=1` 取全量 + 侧车定义，供画布与诊断用）
 *   GET /tex/<归一化路径>        贴图本体（自动补 .png/.jpg/.jpeg/.tga）
 *
 * 注意：**不要**用 sapdon dev-server 的 49037（那是构建用的），两者互不干扰。
 */

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeTexturePath } from './src/textures.js'
import { discoverRoots, buildIndex } from './tools/packScan.mjs'

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)))
const REPO = resolve(ROOT, '..', '..')
const WORKSPACE = resolve(REPO, '..')

const argv = process.argv.slice(2)
const flags = { vanilla: [], project: [], port: null }
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--vanilla') flags.vanilla.push(argv[++i])
  else if (a === '--project') flags.project.push(argv[++i])
  else if (/^\d+$/.test(a)) flags.port = Number(a)
}
if (process.env.SAPDON_DESIGNER_VANILLA) flags.vanilla.push(process.env.SAPDON_DESIGNER_VANILLA)
if (process.env.SAPDON_DESIGNER_PROJECT) flags.project.push(...process.env.SAPDON_DESIGNER_PROJECT.split(';'))

const PORT = flags.port || Number(process.env.SAPDON_DESIGNER_PORT || 5178)
const HOST = process.env.SAPDON_DESIGNER_HOST || '127.0.0.1'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.tga': 'image/x-tga',
  '.map': 'application/json; charset=utf-8',
}

let ROOTS = []
let INDEX = null

async function ensureIndex() {
  if (!INDEX) INDEX = await buildIndex(ROOTS)
  return INDEX
}

const json = (res, code, body) => {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }).end(JSON.stringify(body))
}

async function serveTexture(res, pathname) {
  const index = await ensureIndex()
  const key = normalizeTexturePath(pathname.replace(/^\/tex\/?/, ''))
  const file = key ? index.fileByPath.get(key) : null
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end(`404 找不到纹理 ${pathname}`)
    return
  }
  const body = await readFile(file)
  res.writeHead(200, {
    'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
    // 资源包内容是不变量：给长缓存，让选择器滚动不卡
    'cache-control': 'public, max-age=604800, immutable',
  })
  res.end(body)
}

async function serveStatic(res, pathname) {
  const p = pathname === '/' || pathname.endsWith('/') ? `${pathname}index.html` : pathname
  const target = normalize(join(ROOT, p))
  if (!target.startsWith(ROOT + sep) && target !== ROOT) {
    res.writeHead(403).end('403 越界')
    return
  }
  const info = await stat(target).catch(() => null)
  if (!info || !info.isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end(`404 找不到 ${pathname}`)
    return
  }
  const body = await readFile(target)
  res.writeHead(200, { 'content-type': MIME[extname(target).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-cache' })
  res.end(body)
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || HOST}`)
    const pathname = decodeURIComponent(url.pathname)

    if (pathname === '/api/config') {
      const index = ROOTS.length ? await ensureIndex() : null
      return json(res, 200, {
        ok: true,
        roots: index ? index.byRoot : [],
        textureCount: index ? index.paths.length : 0,
        noPreviewCount: index ? index.noPreview.length : 0,
        defCount: index ? Object.keys(index.defs).length : 0,
        sidecarCount: index ? index.sidecarCount : 0,
        hasTextures: !!ROOTS.length,
      })
    }

    if (pathname === '/api/textures') {
      const index = await ensureIndex()
      if (url.searchParams.get('all') === '1') {
        // 全量：给画布/诊断/纹理选择器用（本地工具，几万条也就几百 KB）
        return json(res, 200, { total: index.paths.length, noPreview: index.noPreview, defs: index.defs, paths: index.paths })
      }
      const q = (url.searchParams.get('q') || '').trim().toLowerCase()
      const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit') || 120)))
      const hits = []
      for (const p of index.paths) {
        if (q && !p.toLowerCase().includes(q)) continue
        hits.push(p)
        if (hits.length >= limit) break
      }
      return json(res, 200, { total: index.paths.length, returned: hits.length, paths: hits })
    }

    if (pathname.startsWith('/tex/')) return await serveTexture(res, pathname)

    return await serveStatic(res, pathname)
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }).end(`500 ${err.message}`)
  }
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`端口 ${PORT} 被占用：换一个（node tools/designer/serve.mjs 6000）或设 SAPDON_DESIGNER_PORT`)
    process.exit(1)
  }
  throw err
})

ROOTS = await discoverRoots({ repo: REPO, workspace: WORKSPACE, vanilla: flags.vanilla, project: flags.project })
server.listen(PORT, HOST, async () => {
  console.log(`Sapdon UI Designer: http://${HOST}:${PORT}/`)
  console.log(`工具根目录: ${ROOT}`)
  if (!ROOTS.length) {
    console.log('⚠️ 没找到资源包：画布不画贴图、纹理选择器退回文本输入。')
    console.log('   指定原版包：node tools/designer/serve.mjs --vanilla "<bedrock-samples>/resource_pack"')
  } else {
    const index = await ensureIndex()
    console.log(`贴图索引: ${index.paths.length} 条（${index.noPreview.length} 条 .tga 不可预览；${index.sidecarCount} 条带九宫格/平铺侧车定义）`)
    for (const r of index.byRoot) console.log(`  [${r.kind}] ${r.dir} — ${r.count} 张`)
  }
  console.log('停止：Ctrl+C')
})
