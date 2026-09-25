/**
 * 对齐 / 分布 / 等尺寸（Sapdon UI Designer）
 *
 * 对应 Qt Designer 的 alignment toolbar（Align Left/Right/Top/Bottom、Align Horizontal/Vertical Center、
 * Distribute Horizontally/Vertically、Lay Out …）。这里**纯函数**：给一组盒子的矩形，算出每个盒子
 * 该写回什么 `offset`（以及"等尺寸"时的 `size`），由 `store.applyBoxOps()` 一次落盘（只占一步撤销）。
 *
 * ★ 为什么写 offset 而不是锚点：JSON UI 里锚点决定"贴哪边"、offset 决定"再挪多少"。对齐是**一次性**
 *   的几何动作（Qt 也是直接改 geometry），所以这里给**像素 offset**：直观、可预测、可撤销。
 *   后果要说清：原本写 `['50%', 0]` 这种百分比 offset 的元素，对齐后会被改成像素值。
 */

/** 对齐方式（名字与 Qt 的菜单对应） */
export const ALIGN_MODES = Object.freeze({
  left: '左对齐',
  hcenter: '水平居中',
  right: '右对齐',
  top: '顶对齐',
  vcenter: '垂直居中',
  bottom: '底对齐',
})

/**
 * 算对齐结果。
 * @param {{id:string, rect:{x:number,y:number,w:number,h:number}, offset?:number[]}[]} boxes 选中盒子的矩形与当前 offset
 * @param {'left'|'hcenter'|'right'|'top'|'vcenter'|'bottom'} mode
 * @returns {{id:string, offset:[number,number]}[]} 每个盒子该写回的 offset
 */
export function alignOps(boxes, mode) {
  const list = (boxes || []).filter((b) => b && b.rect)
  if (list.length < 2) return []
  const left = Math.min(...list.map((b) => b.rect.x))
  const right = Math.max(...list.map((b) => b.rect.x + b.rect.w))
  const top = Math.min(...list.map((b) => b.rect.y))
  const bottom = Math.max(...list.map((b) => b.rect.y + b.rect.h))

  return list.map((b) => {
    const cur = offsetOf(b)
    let dx = 0
    let dy = 0
    if (mode === 'left') dx = left - b.rect.x
    else if (mode === 'right') dx = right - (b.rect.x + b.rect.w)
    else if (mode === 'hcenter') dx = (left + right) / 2 - (b.rect.x + b.rect.w / 2)
    else if (mode === 'top') dy = top - b.rect.y
    else if (mode === 'bottom') dy = bottom - (b.rect.y + b.rect.h)
    else if (mode === 'vcenter') dy = (top + bottom) / 2 - (b.rect.y + b.rect.h / 2)
    return { id: b.id, offset: [cur[0] + dx, cur[1] + dy] }
  })
}

/**
 * 分布（Distribute）：两端不动，中间按**等间距**摆开（Qt 的 Distribute Horizontally/Vertically）。
 * 至少 3 个才有意义。
 */
export function distributeOps(boxes, axis = 'h') {
  const list = (boxes || []).filter((b) => b && b.rect)
  if (list.length < 3) return []
  const key = axis === 'v' ? 'y' : 'x'
  const sizeKey = axis === 'v' ? 'h' : 'w'
  const sorted = [...list].sort((a, b) => a.rect[key] - b.rect[key])
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  // 可用空间 = 两端**内侧**之间的距离；每个中间项占自己的尺寸
  const span = last.rect[key] + last.rect[sizeKey] - first.rect[key]
  const used = sorted.reduce((n, b) => n + b.rect[sizeKey], 0)
  const gap = (span - used) / (sorted.length - 1)
  let cursor = first.rect[key]
  const out = new Map()
  for (const b of sorted) {
    const cur = offsetOf(b)
    const delta = cursor - b.rect[key]
    out.set(b.id, {
      id: b.id,
      offset: axis === 'v' ? [cur[0], cur[1] + delta] : [cur[0] + delta, cur[1]],
    })
    cursor += b.rect[sizeKey] + gap
  }
  return list.map((b) => out.get(b.id)).filter(Boolean)
}

/** 等尺寸（Qt 的 "Same width/height"）：取第一个（主选）的尺寸当基准 */
export function sameSizeOps(boxes, axis = 'both') {
  const list = (boxes || []).filter((b) => b && b.rect)
  if (list.length < 2) return []
  const base = list[0].rect
  return list.slice(1).map((b) => ({
    id: b.id,
    size: [axis === 'v' ? b.rect.w : base.w, axis === 'h' ? b.rect.h : base.h],
  }))
}

/** 当前 offset（百分比等非数值一律当 0：对齐写的是像素增量，非数值项按"没挪过"处理） */
function offsetOf(box) {
  const raw = Array.isArray(box.offset) ? box.offset : [0, 0]
  return [typeof raw[0] === 'number' ? raw[0] : 0, typeof raw[1] === 'number' ? raw[1] : 0]
}

/** 是否所有盒子都能对齐（Qt 里单选时对齐按钮是灰的） */
export function canAlign(boxes) {
  return (boxes || []).filter((b) => b && b.rect).length >= 2
}

export function canDistribute(boxes) {
  return (boxes || []).filter((b) => b && b.rect).length >= 3
}
