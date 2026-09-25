/**
 * 纹理路径解析（Sapdon UI Designer）
 *
 * 纯函数、零依赖 —— 浏览器与 Node 共用（`serve.mjs` 用它做文件解析，画布用它拼 URL），
 * 因此可以在 `tests/designer-textures.test.mjs` 里直接跑。
 *
 * ★ 关键语义：JSON UI 里的纹理引用**不带扩展名**（`textures/ui/White`），
 *   引擎按包内实际文件找；所以内部一律用"归一化路径"（`textures/...`、无扩展名、正斜杠），
 *   文件系统/URL 那一层才补扩展名。
 *   `textures/ui/` 下同时存在 `book_pagecrease_left.json`（翻页动画定义）与 `.png`，
 *   只看图片扩展名才不会把 JSON 当贴图。
 */

/** 引擎认的图片扩展名（按优先级：先找到先用；`.tga` 放最后且浏览器不能预览） */
export const IMAGE_EXTS = Object.freeze(['.png', '.jpg', '.jpeg', '.tga'])

/** 浏览器能直接显示的扩展名（`.tga` 不在内 ⇒ 画布给"不可预览"占位） */
export const PREVIEW_EXTS = Object.freeze(['.png', '.jpg', '.jpeg'])

/** 归一化：反斜杠 → 正斜杠、去掉扩展名、补 `textures/` 前缀、拒绝越界段 */
export function normalizeTexturePath(texture) {
  let p = String(texture || '').trim().replace(/\\/g, '/')
  if (!p) return ''
  p = p.replace(/^\/+/, '')
  // 越界段：解析出来就是非法引用（诊断会给 error）
  if (p.split('/').some((seg) => seg === '..' || seg === '.')) return ''
  p = stripImageExt(p)
  if (!p.startsWith('textures/')) p = `textures/${p.replace(/^textures\/*/, '')}`
  return p
}

/** 去掉图片扩展名（`.json` 之类原样保留，好让诊断能看出是"引用了翻页定义"这种错） */
export function stripImageExt(p) {
  const lower = String(p).toLowerCase()
  for (const ext of IMAGE_EXTS) {
    if (lower.endsWith(ext)) return p.slice(0, -ext.length)
  }
  return p
}

/** 是否像一条合法纹理引用（有 `textures/` 前缀且无越界） */
export function isTextureRef(texture) {
  const p = normalizeTexturePath(texture)
  return !!p && p.startsWith('textures/')
}

/** 候选文件名（按优先级补扩展名）：用于在磁盘上找真实文件 */
export function textureCandidates(texture) {
  const p = normalizeTexturePath(texture)
  if (!p) return []
  return IMAGE_EXTS.map((ext) => `${p}${ext}`)
}

/**
 * 归一化纹理路径 → 可放进 `<img src>` / `background-image` 的 URL。
 * 不带扩展名：由 `serve.mjs` 解析真实文件并给出正确的 Content-Type。
 */
export function textureUrl(texture, base = '/tex/') {
  const p = normalizeTexturePath(texture)
  return p ? `${base}${p}` : ''
}

/**
 * 判断一条纹理引用能不能被解析到。
 *
 * ★ 大小写：包内文件名是**区分大小写**的（`textures/ui/white.png` 存在、`White` 不存在，
 *   Windows 上 `Test-Path` 会骗你）。所以这里分三档：
 *   命中 / **只差大小写**（给规范化写法，让用户一键改对）/ 找不到。
 *
 * @param {string} texture
 * @param {{paths:Set<string>, noPreview?:Set<string>, lower?:Map<string,string>}|null} index
 *        `null` = 没有索引，不判定（`known: null`）
 * @returns {{path:string, url:string, known:true|false|null, previewable:boolean, caseMismatch:string|null}}
 */
export function resolveTexture(texture, index) {
  const path = normalizeTexturePath(texture)
  if (!path) return { path: '', url: '', known: false, previewable: false, caseMismatch: null }
  if (!index || !index.paths) return { path, url: textureUrl(path), known: null, previewable: true, caseMismatch: null }

  const known = index.paths.has(path)
  const canonical = known ? path : index.lower ? index.lower.get(path.toLowerCase()) || null : null
  return {
    path,
    url: textureUrl(path),
    known: known || !!canonical,
    previewable: index.noPreview ? !index.noPreview.has(canonical || path) : true,
    caseMismatch: !known && canonical ? canonical : null,
  }
}

/**
 * 由服务端返回的路径数组构造编辑器侧的索引。
 *
 * ★ `defs` 是**纹理定义侧车文件**的内容（`textures/ui/book_back.json` → `{nineslice_size:14, base_size:[28,28]}`）：
 *   引擎会自动把侧车里的 `nineslice_size` / `tiled` / `base_size` 当成用这张贴图的控件的默认值 ——
 *   这就是"原版木框只写一句 `{type:image, texture:textures/ui/book_back}` 却能撑满整本书"的原因。
 *
 * @param {string[]} list 归一化纹理路径
 * @param {string[]} [noPreview] 存在但浏览器不能预览的（.tga）
 * @param {Record<string, {nineslice_size?:number|number[], tiled?:boolean|string, base_size?:number[]}>} [defs]
 */
export function buildTextureIndex(list, noPreview = [], defs = {}) {
  const paths = new Set(list || [])
  const lower = new Map()
  for (const p of paths) lower.set(p.toLowerCase(), p)
  return { paths, list: [...paths], noPreview: new Set(noPreview || []), lower, defs: defs || {} }
}

/**
 * 取一条纹理的元信息（侧车定义 + 图片像素尺寸）。
 *
 * 侧车 = `textures/ui/book_back.json` 这类同名 json：`{nineslice_size:14, base_size:[28,28], tiled:true}`；
 * 引擎会自动把它当默认值套到用这张贴图的控件上 —— 这是"原版木框只写一句 texture 就能撑满整本书"的原因。
 * `size` 是图片真实像素尺寸（服务端读文件头得到），九宫格切片要用它算源矩形。
 *
 * @returns {{nineslice_size?:number|number[], tiled?:boolean|string, base_size?:number[], size?:number[]}}
 */
export function textureInfo(index, path) {
  if (!index || !index.defs || !path) return {}
  return index.defs[path] || {}
}

/** 兼容旧名（等价于 textureInfo） */
export function textureDef(index, path) {
  return textureInfo(index, path)
}

/** 服务端索引文本（每行一条路径）→ Set；顺带容错空行/CRLF */
export function parseTextureIndex(text) {
  const set = new Set()
  for (const line of String(text || '').split(/\r?\n/)) {
    const p = line.trim()
    if (p) set.add(p)
  }
  return set
}

/** 从节点上取"该画哪张图"（供画布与诊断共用同一处判断） */
export function nodeTexture(node) {
  const props = node.props || {}
  if (node.type === 'image') return props.texture || ''
  if (node.type === 'form_button') return props.texture_default || ''
  return ''
}
