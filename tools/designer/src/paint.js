/**
 * 绘制模型（Sapdon UI Designer）
 *
 * 纯函数：**模型 + 版面 → 绘制指令列表（draw list）**。两个后端共用同一份规则：
 *   - 浏览器画布  `src/ui/canvas.js`  → DOM/CSS
 *   - 离屏光栅化  `tools/rasterize.mjs` + `tools/rasterize.py` → PNG（本环境没浏览器时用来"看"画布）
 *
 * ★ 范围约定（2026-09 用户明确）：**只服务 SapdonUI 自己的界面**
 *   （`SapdonFormUI`/`ServerFormUI` 页面壳 / `SapdonGuideBook` 手册 / `ContainerUISystem` 容器 / `HudUISystem` HUD），
 *   不去复刻原版任意界面。所以这里只认 SapdonUI 会产出的那几种元素与属性组合，
 *   认不出的（`factory`/`custom`/模板内部结构）就画占位框 —— 不猜。
 *
 * 指令种类：
 *   { kind:'image',  rect, texture, fit, repeat, nine, clip, gray, alpha, state? }
 *   { kind:'text',   rect, text, color, fontSize, align, shadow, lineHeight, alpha }
 *   { kind:'placeholder', rect, reason }   // 缺纹理 / .tga / uv 未模拟
 */

import { nodeTexture, resolveTexture, textureInfo } from './textures.js'

/** JSON UI 的 font_size 名字 → 倍率（引擎位图字体的度量不模拟，只近似比例） */
export const FONT_SCALE = { small: 0.8, normal: 1, large: 1.25, extra_large: 1.5 }

/**
 * 引擎默认字号 ≈9 UI px（在 320×207 的界面里）。
 * ★ 取 8.4 而不是 9：引擎用的是**自带窄位图字体**（实测「本手册为基岩版开发者提供简单容易的」18 个字
 *   在 152 UI px 的框里一行放得下 ⇒ 每字约 7.6–8.4 px），系统字体按 9px 会宽出 ~7%，
 *   于是本该系统里放得下的一行在画布里被折行/挤出。取 8.4 让"一行放不放得下"更接近真机。
 */
export const BASE_FONT_PX = 8.4

export function rectOf(box) {
  return { x: box.rect.x, y: box.rect.y, w: box.rect.w, h: box.rect.h }
}

/**
 * 一个节点在该盒子里的绘制指令。
 * @param {object} node 模型节点
 * @param {{x,y,w,h}} rect 已解算好的盒子（画布/光栅化都用它，不再二次解算）
 * @param {{textures?:object|null}} ctx
 * @returns {object[]}
 */
export function paintNode(node, rect, ctx = {}) {
  const props = node.props || {}

  if (node.type === 'label') return textOps(props, rect)

  if (node.type === 'form_button') {
    const ops = []
    for (const [state, tex] of [
      ['default', props.texture_default],
      ['hover', props.texture_hover],
      ['pressed', props.texture_pressed],
    ]) {
      if (!tex) continue
      ops.push(...imageOps(tex, props, rect, ctx, state))
    }
    return ops
  }

  const tex = nodeTexture(node)
  if (tex) return imageOps(tex, props, rect, ctx, null)

  // 未解析的原版模板（`@settings_common.option_group_section_divider`、`book.close_button_*` 等）：
  // 结构在 vanilla UI 文件里，编辑器不解析 ⇒ 给一个**看得见但不假装**的占位
  // （手册「类别」下面那条分隔线就是这种节点）
  if (node.template) return [{ kind: 'template', rect, template: node.template, state: null }]

  // 其余容器/按钮没有自有视觉（外观来自模板或子控件）
  return []
}

/** label → 文本指令（可能多行） */
export function textOps(props, rect) {
  const raw = props.text
  if (raw === undefined || raw === null || raw === '') return []
  const text = String(raw).replace(/\\n/g, '\n')
  const scale = (FONT_SCALE[props.font_size] || 1) * (Number(props.font_scale_factor) || 1)
  return [
    {
      kind: 'text',
      rect,
      // 非按钮指令的 state 统一为 null（光栅化/画布据此区分"三态层"与"常显层"）
      state: null,
      text,
      color: Array.isArray(props.color) ? props.color.slice(0, 4) : [1, 1, 1, 1],
      fontSize: BASE_FONT_PX * scale,
      align: props.text_alignment || 'center',
      shadow: props.shadow === true,
      lineHeight: props.line_padding ? 1.15 + Number(props.line_padding) * 0.1 : 1.15,
      alpha: props.locked_alpha === undefined ? 1 : Number(props.locked_alpha),
    },
  ]
}

/**
 * 九宫格切片 → 9 块（源矩形 + 目标矩形，画布单位）。
 *
 * ★ 两处"引擎实测"细节（2026-09，看原版贴图与真机截图定出来的）：
 *   1. `nineslice_size` 可以是**数字或 [左,上,右,下] 数组**（`saleribbon` 就是 `[5,5,6,8]`）；
 *   2. **源带退化时按"贴边 1px"拉伸**：`book_back` 是 28×28 而 nineslice 14 ⇒ 左/中/右三条源带
 *      退化成 0 宽。真机仍能画出木框与米色内页 ⇒ 引擎必然取了贴边的 1px 条来拉伸
 *      （中间那块取到的是四角贴图里最靠内的那个像素 —— 恰好是米色内页色）。
 *   3. **四角按源像素原尺寸画**（不随框缩放）：真机里 320 宽的界面中木框角约 14 UI px ✔
 */
export function ninePieces(slice, size, rect) {
  const [sw, sh] = size
  if (!(sw > 0 && sh > 0)) return null
  const s = (Array.isArray(slice) ? slice.slice(0, 4) : [slice, slice, slice, slice]).map((v) => Math.max(0, Math.round(Number(v) || 0)))
  const [sl, st, sr, sb] = s
  // 源带：[起点, 终点)；退化（终≤起）时取贴边 1px
  const band = (a, b, total) => {
    const lo = Math.max(0, Math.min(a, total - 1))
    const hi = b > a ? Math.min(b, total) : lo + 1
    return [lo, Math.max(hi, lo + 1)]
  }
  const cols = [band(0, sl, sw), band(sl, sw - sr, sw), band(sw - sr, sw, sw)]
  const rows = [band(0, st, sh), band(st, sh - sb, sh), band(sh - sb, sh, sh)]
  // 目标带：四角用源像素尺寸（乘 canvasScale），边/中用剩余空间拉伸
  const k = rect.scale || 1
  const dx = [rect.x, rect.x + sl * k, rect.x + rect.w - sr * k, rect.x + rect.w]
  const dy = [rect.y, rect.y + st * k, rect.y + rect.h - sb * k, rect.y + rect.h]
  const pieces = []
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const [sx0, sx1] = cols[c]
      const [sy0, sy1] = rows[r]
      const x0 = dx[c]
      const x1 = Math.max(dx[c + 1], x0)
      const y0 = dy[r]
      const y1 = Math.max(dy[r + 1], y0)
      if (x1 - x0 <= 0 || y1 - y0 <= 0) continue
      pieces.push({ src: [sx0, sy0, sx1 - sx0, sy1 - sy0], dst: [x0, y0, x1 - x0, y1 - y0], row: r, col: c })
    }
  }
  return { size: [sw, sh], slice: [sl, st, sr, sb], pieces }
}

/**
 * 贴图 → 指令。按 JSON UI 的 Sprite 语义决定 fit/repeat/nine/clip。
 *
 * ★ **纹理定义侧车**优先于引擎缺省、但**让位于控件自己声明的属性**：
 *   `textures/ui/book_back.json` 写了 `{nineslice_size:14}` ⇒ 用这张贴图的控件即使不写
 *   `nineslice_size` 也按九宫格画（原版木框就是这样撑满整本书的）。
 *
 * 缺纹理与不可预览都给 `placeholder`（画布/光栅化各自画成斜纹或警告色）。
 */
export function imageOps(texture, props, rect, ctx = {}, state = null) {
  // 空纹理 = 框架里的"这一态不给图"（产物里确实写着 `texture: ""`），不是"缺纹理"
  if (!texture) return []
  const res = resolveTexture(texture, ctx.textures || null)
  const base = { rect, texture: res.path, url: res.url, state, source: texture }

  if (res.known === false) return [{ kind: 'placeholder', rect, reason: 'missing', texture: res.path, state }]
  if (!res.previewable) return [{ kind: 'placeholder', rect, reason: 'tga', texture: res.path, state }]

  const info = textureInfo(ctx.textures, res.path)
  const nine = props.nineslice_size !== undefined ? props.nineslice_size : info.nineslice_size
  const tiled = props.tiled !== undefined ? props.tiled : info.tiled

  if (props.uv !== undefined || props.uv_size !== undefined) {
    // uv 子区域需要图片固有尺寸的二次采样：先按整图给出图 + 一个提示 op
    return [
      { ...base, kind: 'image', fit: props.keep_ratio === false ? 'stretch' : 'contain' },
      { kind: 'placeholder', rect, reason: 'uv', texture: res.path, state },
    ]
  }

  const hasNine = typeof nine === 'number' ? nine > 0 : Array.isArray(nine) && nine.some((v) => Number(v) > 0)
  if (hasNine) {
    const pieces = info.size ? ninePieces(nine, info.size, rect) : null
    return [
      {
        ...base,
        kind: 'image',
        nine: { slice: nine, size: info.size || null, from: props.nineslice_size !== undefined ? 'node' : 'texture-def', pieces },
      },
    ]
  }

  const ratio = props.clip_ratio === undefined ? 1 : Number(props.clip_ratio)
  const dir = props.clip_direction
  if (dir && ratio < 1) {
    return [{ ...base, kind: 'image', clip: { dir, ratio } }]
  }

  const repeat = tiled === true ? 'repeat' : tiled === 'x' ? 'repeat-x' : tiled === 'y' ? 'repeat-y' : 'none'
  return [
    {
      ...base,
      kind: 'image',
      fit: repeat === 'none' ? (props.keep_ratio === false ? 'stretch' : 'contain') : 'auto',
      repeat,
      gray: props.grayscale === true,
      alpha: props.alpha === undefined ? 1 : Number(props.alpha),
    },
  ]
}

/** 整棵树的绘制指令（按绘制顺序 = 版面顺序，子项在后 = 覆盖在上） */
export function paintTree(doc, layout, ctx = {}) {
  const ops = []
  for (const box of layout.list) {
    const node = box.node
    const rect = rectOf(box)
    for (const op of paintNode(node, rect, ctx)) {
      ops.push({ ...op, id: node.id, depth: box.depth, placement: box.placement })
    }
  }
  return ops
}
