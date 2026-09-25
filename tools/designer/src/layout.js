/**
 * 版面引擎（Sapdon UI Designer）
 *
 * 纯函数、**零 import**（照 `src/core/ui/systems/containerLayout.ts` 的先例），因此
 * 既能在浏览器里驱动画布，也能被 `tests/designer-layout.test.mjs` 在 Node 里直接跑。
 *
 * 它镜像的是 **JSON UI 的锚点模型**（不是 Qt 的布局管理器）：
 *   base  = 父矩形原点 + 父尺寸 × anchor_from + offset
 *   尺寸  = size 给定 → 用它；未给定 → 取 anchor_to 与 anchor_from 之间的**跨距**
 *   原点  = base − 尺寸 × anchor_to        ← anchor_to 决定「往哪边长」
 *
 * 三个自检用例（单测锁死）：
 *   size[48,24] + top_right/top_right  → 盒子右上角贴父右上角
 *   size[48,24] + center/center        → 盒子居中
 *   无 size     + top_left/bottom_right → 盒子拉伸铺满父容器
 *
 * ⚠️ 这是**编辑器近似**，刻意不模拟引擎的 max_size/min_size 夹取、
 *    inherit_max_sibling_*、模板内部结构、集合实例、字体度量 —— 缺口清单见
 *    `doc/dev/ui-designer.md` §5.3。画布"看起来对" ≠ 真机对。
 */

/** 9 个锚点 → 归一化坐标（0 = 左/上，0.5 = 中，1 = 右/下） */
export const ANCHORS = Object.freeze({
  top_left: [0, 0],
  top_middle: [0.5, 0],
  top_right: [1, 0],
  left_middle: [0, 0.5],
  center: [0.5, 0.5],
  right_middle: [1, 0.5],
  bottom_left: [0, 1],
  bottom_middle: [0.5, 1],
  bottom_right: [1, 1],
})

export const ANCHOR_NAMES = Object.freeze(Object.keys(ANCHORS))

/**
 * 未声明锚点时引擎的实际行为。
 *
 * ★ 2026-09 由**真机截图**反证为 `center`（不是 `top_left`）：
 *   `SapdonGuideBook` 的 `cover_title` 只写 `anchor_to: 'center'`（`anchor_from` 不写），
 *   真机里标题文字**端端正正落在缎带内部**；若缺省是 `top_left`，盒子会整体偏移半个自身尺寸、
 *   一半跑到缎带外面去。同批证据：`text_body`（80%×80% + anchor_to center）在文本页里居中。
 *   注意这与 `Layout.setAnchorFrom()` 的**入参默认值**是两件事（那里的默认值也恰好是 center，
 *   但真正确定行为的是引擎缺省）。
 */
export const ENGINE_DEFAULT_ANCHOR = 'center'

// ---------------------------------------------------------------------------
// 取值解算
// ---------------------------------------------------------------------------

/** 锚点名 → [x, y]；未知名字按引擎缺省 top_left 处理 */
export function anchorNorm(name) {
  return ANCHORS[name] || ANCHORS[ENGINE_DEFAULT_ANCHOR]
}

/**
 * 把一个尺寸/偏移分量解算成像素。
 * @returns {number|null} `null` = 未声明（引擎按 default 处理，画布走"跨距"分支）
 */
export function resolveLength(value, base) {
  if (value === undefined || value === null) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const s = value.trim()
  if (s === '' || s === 'default') return null
  if (s === 'fill' || s === '100%') return s === 'fill' ? base : base
  if (s.endsWith('%')) {
    const n = Number.parseFloat(s.slice(0, -1))
    return Number.isFinite(n) ? (base * n) / 100 : null
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** `size` 归一成 [w, h]；单个字符串视为两轴同值；未声明 → null */
export function normalizeSize(size) {
  if (size === undefined || size === null) return null
  if (typeof size === 'string' || typeof size === 'number') return [size, size]
  if (Array.isArray(size) && size.length > 0) return [size[0], size[1] ?? size[0]]
  return null
}

/** 解算一对分量（offset 之类），未声明取 fallback */
export function resolvePair(pair, baseW, baseH, fallback = [0, 0]) {
  const a = Array.isArray(pair) ? pair : [pair, pair]
  const x = resolveLength(a[0], baseW)
  const y = resolveLength(a[1], baseH)
  return [x === null ? fallback[0] : x, y === null ? fallback[1] : y]
}

// ---------------------------------------------------------------------------
// 单节点：锚点解算
// ---------------------------------------------------------------------------

/**
 * 解算一个节点在其父矩形里的盒子。
 * @param {{props?:object}} node
 * @param {{x:number,y:number,w:number,h:number}} parent
 * @returns {{x:number,y:number,w:number,h:number}}
 */
export function measure(node, parent) {
  const props = (node && node.props) || {}
  // FormButton 用单值 `anchor` 同时设 anchor_from/anchor_to（框架 `setAnchor`），
  // 所以 `anchor` 是两个锚点的缺省值（其余元素没有这个键，不受影响）。
  const [afX, afY] = anchorNorm(props.anchor_from || props.anchor)
  const [atX, atY] = anchorNorm(props.anchor_to || props.anchor)
  const useAnchored = props.use_anchored_offset === true
  const [offX, offY] = resolvePair(props.offset, parent.w, parent.h, [0, 0])
  const size = normalizeSize(props.size)

  // use_anchored_offset：offset 相对「锚点对齐后的盒子」再加一次，故不并进 base（近似引擎语义）
  const baseX = parent.x + parent.w * afX + (useAnchored ? 0 : offX)
  const baseY = parent.y + parent.h * afY + (useAnchored ? 0 : offY)

  const axis = (i, base, parentLen, afl, atl) => {
    let given = size ? resolveLength(size[i], parentLen) : null
    if (given === null) {
      if (atl === afl) {
        // ★ 引擎缺省：**未声明 size = 铺满父级**（证据：原版 `book_screen.json` 与 SapdonGuideBook 的
        //   `book_background` 都只写 `{type:image, texture:...}`，无 size，真机里却撑满整本书；
        //   配合 `textures/ui/book_back.json` 的 `nineslice_size:14` 才画得出木框）
        given = parentLen
      } else {
        // 两锚点不同：盒子 = 两锚点之间的跨距（跨锚点 = 区域用法）
        const span = (atl - afl) * parentLen
        return { pos: base + Math.min(0, span) + (useAnchored ? (i === 0 ? offX : offY) : 0), len: Math.abs(span) }
      }
    }
    // anchor_to 决定往哪边长
    const pos = base - given * atl + (useAnchored ? (i === 0 ? offX : offY) : 0)
    return { pos, len: given }
  }

  const hx = axis(0, baseX, parent.w, afX, atX)
  const hy = axis(1, baseY, parent.h, afY, atY)
  return { x: hx.pos, y: hy.pos, w: hx.len, h: hy.len }
}

// ---------------------------------------------------------------------------
// 整树：按容器语义排布子项
// ---------------------------------------------------------------------------

/** 容器排布模式（决定子项定位来源） */
export function containerMode(node) {
  const t = node && node.type
  if (t === 'form_button_grid') return 'form-grid' // 组合件：视觉格 = pos，基准格 = slot
  if (t === 'grid') return 'grid'
  if (t === 'stack_panel') return 'flow'
  return 'anchored' // panel / collection_panel / 叶子一律锚点定位
}

/**
 * 非视觉对象：不产出任何控件，因此**不进版面**（画布不画框、光栅化不画它）。
 * 目前只有多页管理器 `PagePanelManage`（它的产物是挂在容器里的门控页面板）。
 */
export function isNonVisual(node) {
  return !!node && (node.type === 'page_panel_manage' || node.type === 'manager')
}

/** 网格参数：`grid_dimensions`（GridProp）或组合件的 `dimensions` */
export function gridDimensions(props) {  const s = (props && (props.grid_dimensions || props.dimensions)) || [1, 1]
  const cols = Math.max(1, Number(Array.isArray(s) ? s[0] : 1) || 1)
  const rows = Math.max(1, Number(Array.isArray(s) ? s[1] : 1) || 1)
  return [cols, rows]
}

/**
 * 摊平整棵树，算出每个节点的盒子。
 *
 * ★ 两个概念必须分开（否则 stack/grid 的子项会按锚点摆，位置全错）：
 *   - `placement`：这个节点**自己**被父容器怎么放的 → 'anchored' | 'flow' | 'grid-cell' | 'form-grid-cell'
 *   - `container`：这个节点**怎么摆它的子项** → 'anchored' | 'flow' | 'grid' | 'form-grid'
 *
 * @param {object[]} roots 根元素数组
 * @param {{x?:number,y?:number,w:number,h:number}} frame 画布参照框（100% 的基准）
 * @returns {{list:object[], byId:Map<string,object>}}
 *   box = { id, node, parentId, rect, depth, placement, container, notes[], ghostOffset }
 */
export function layoutTree(roots, frame) {
  const list = []
  const byId = new Map()
  const root = { x: frame.x ?? 0, y: frame.y ?? 0, w: frame.w, h: frame.h }

  const visit = (node, rect, parentId, depth, placement, notes, ghostOffset) => {
    const parentBox = parentId ? byId.get(parentId) : null
    const box = {
      id: node.id,
      node,
      parentId,
      depth,
      placement,
      container: containerMode(node),
      rect,
      /** 父级矩形（判断"本体能不能直接拖"要看面积占比） */
      parentRect: parentBox ? parentBox.rect : root,
      notes: notes || [],
      ghostOffset: ghostOffset || null,
      /** 文档序（绘制稳定排序用） */
      order: list.length,
      /** JSON UI 的 layer：同层 z-order，越大越靠上（缺省 0） */
      layer: layerOf(node),
    }
    list.push(box)
    byId.set(node.id, box)
    placeChildren(node, rect, box)
  }

  const placeChildren = (node, rect, box) => {
    const children = Array.isArray(node.controls) ? node.controls : []
    if (children.length === 0) return
    const props = node.props || {}

    if (box.container === 'grid') {
      const [cols, rows] = gridDimensions(props)
      const cellW = rect.w / cols
      const cellH = rect.h / rows
      children.forEach((child, i) => {
        const gp = Array.isArray(child.gridPosition) ? child.gridPosition : [i % cols, Math.floor(i / cols)]
        const cell = { x: rect.x + gp[0] * cellW, y: rect.y + gp[1] * cellH, w: cellW, h: cellH }
        // 网格接管定位：子项自己的 size 生效、offset 无效（画成 ghost 并给 warn）
        const size = normalizeSize((child.props || {}).size)
        const inner = measure(child, cell)
        const r = {
          x: inner.x,
          y: inner.y,
          w: size && resolveLength(size[0], cell.w) !== null ? inner.w : cell.w, // 未声明 → 铺满格位（近似）
          h: size && resolveLength(size[1], cell.h) !== null ? inner.h : cell.h,
        }
        const off = (child.props || {}).offset
        visit(child, r, node.id, box.depth + 1, 'grid-cell', off ? ['grid-offset-ignored'] : [], off || null)
      })
      return
    }

    if (box.container === 'form-grid') {
      // FormButtonGrid 的两级坐标（依据：more-golem 产物的 nav_grid —— grid_position [1,0] + offset ["0%","0%"]；
      // 索引卡 grid_position [3,0]/[0,1]… + 负偏移）：
      //   base 格 = slot（运行期 form 槽位序号，不是视觉序号）→ 写进 grid_position
      //   pos    = **目标格** → addButton 用 offset = (pos − base) × 100% 把按钮挪过去
      //   ⇒ 画布上的视觉格就是 pos；offset 只是补偿量，所以画布要同时标出 base 格（槽）与目标格。
      const [cols, rows] = gridDimensions(props)
      const cellW = rect.w / cols
      const cellH = rect.h / rows
      children.forEach((child, i) => {
        const slot = Number.isFinite(child.slot) ? child.slot : i
        const baseCol = ((slot % cols) + cols) % cols
        const baseRow = Math.floor(slot / cols)
        const pos = Array.isArray(child.pos) ? child.pos : [0, 0]
        const col = ((pos[0] % cols) + cols) % cols
        const row = Math.floor(pos[1])
        const cell = { x: rect.x + col * cellW, y: rect.y + row * cellH, w: cellW, h: cellH }
        const size = normalizeSize((child.props || {}).size)
        const inner = measure(child, cell)
        const r = {
          x: inner.x,
          y: inner.y,
          w: size && resolveLength(size[0], cell.w) !== null ? inner.w : Math.min(cell.w, 24),
          h: size && resolveLength(size[1], cell.h) !== null ? inner.h : Math.min(cell.h, 24),
        }
        const notes = baseCol === col && baseRow === row ? [] : ['form-grid-offset-compensated']
        visit(child, r, node.id, box.depth + 1, 'form-grid-cell', notes, { slot, baseCol, baseRow, col, row })
      })
      return
    }

    if (box.container === 'flow') {
      const horizontal = props.orientation === 'horizontal'
      let cursor = 0
      children.forEach((child) => {
        const size = normalizeSize((child.props || {}).size)
        const mainIdx = horizontal ? 0 : 1
        const crossIdx = horizontal ? 1 : 0
        const mainLen = horizontal ? rect.w : rect.h
        const crossLen = horizontal ? rect.h : rect.w
        const mainGiven = size ? resolveLength(size[mainIdx], mainLen) : null
        const crossGiven = size ? resolveLength(size[crossIdx], crossLen) : null
        const main = mainGiven === null ? 0 : mainGiven
        const cross = crossGiven === null ? crossLen : crossGiven
        const r = horizontal
          ? { x: rect.x + cursor, y: rect.y, w: main, h: cross }
          : { x: rect.x, y: rect.y + cursor, w: cross, h: main }
        cursor += main
        const off = (child.props || {}).offset
        const notes = []
        if (off) notes.push('flow-offset-ignored')
        if (mainGiven === null) notes.push('flow-main-size-missing')
        visit(child, r, node.id, box.depth + 1, 'flow', notes)
      })
      return
    }

    // 锚点定位
    children.forEach((child) => {
      visit(child, measure(child, rect), node.id, box.depth + 1, 'anchored')
    })
  }

  // 非视觉对象（`PagePanelManage` 这类管理器）不进版面：它不产出任何控件
  roots.filter((node) => !isNonVisual(node)).forEach((node) => visit(node, measure(node, root), null, 0, 'anchored'))

  // 子项后画（覆盖在上）⇒ 渲染顺序 = list 顺序；命中测试从后往前
  return { list, byId }
}

/** 命中测试：取最深的、绘制顺序最后的一个（list 末尾优先） */
export function hitTest(layout, x, y) {
  for (let i = layout.list.length - 1; i >= 0; i--) {
    const r = layout.list[i].rect
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return layout.list[i]
  }
  return null
}

/** 节点的 `layer`（JSON UI：同一父级内的 z-order，越大越靠上；缺省 0） */
export function layerOf(node) {
  const v = node && node.props ? node.props.layer : undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * **绘制顺序**（与版面解耦）：先序遍历，但**同级按 `layer` 稳定排序**。
 *
 * 为什么单独出这么一个函数：
 *   `stack_panel` 的子项位置由文档序决定，而 `layer` 又只该改 z-order 不该改位置 ——
 *   所以版面（`layoutTree` 的 rect）保持文档序，绘制顺序另算。
 *   画布是绝对定位的 div，改 DOM 顺序就等于改 z-order，不影响位置 ✔
 */
export function paintOrder(layout) {
  const byParent = new Map()
  for (const box of layout.list) {
    const key = box.parentId || '__root__'
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key).push(box)
  }
  const out = []
  const rec = (parentId) => {
    const kids = (byParent.get(parentId) || []).slice().sort((a, b) => a.layer - b.layer || a.order - b.order)
    for (const k of kids) {
      out.push(k)
      rec(k.id)
    }
  }
  rec('__root__')
  return out
}

// ---------------------------------------------------------------------------
// 画布交互 → 属性值（拖动/缩放反解）
// ---------------------------------------------------------------------------

/**
 * 拖动反解：锚点模型下 offset 与盒子原点是 1:1 线性关系，
 * 所以"拖了多少像素"就等于"offset 加多少像素"（锚点不动，产物位置才不漂）。
 */
export function offsetFromDrag(prevOffset, dx, dy, parentRect) {
  const [ox, oy] = resolvePair(prevOffset, parentRect.w, parentRect.h, [0, 0])
  return [toSameUnit(prevOffset && prevOffset[0], ox + dx, parentRect.w), toSameUnit(prevOffset && prevOffset[1], oy + dy, parentRect.h)]
}

/**
 * 缩放反解：保持原单位（`%` 还是 `%`，数字还是数字），只换算数值。
 * 例：原来是 "50%"、父宽 320、拖成 200px → 仍写 "62.5%"。
 */
export function sizeFromPixels(prevSize, w, h, parentRect) {
  const prev = normalizeSize(prevSize)
  return [toSameUnit(prev && prev[0], w, parentRect.w), toSameUnit(prev && prev[1], h, parentRect.h)]
}

function toSameUnit(prevValue, px, base) {
  const round = (n) => Math.round(n * 100) / 100
  if (typeof prevValue === 'string' && prevValue.trim().endsWith('%') && base > 0) {
    return `${round((px / base) * 100)}%`
  }
  return round(px)
}

/** 盒子的像素值 → 可读文本（属性面板/画布角标共用） */
export function formatRect(rect) {
  const f = (n) => Math.round(n * 10) / 10
  return `${f(rect.x)},${f(rect.y)}  ${f(rect.w)}×${f(rect.h)}`
}
