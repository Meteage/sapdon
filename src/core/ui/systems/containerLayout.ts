/**
 * 容器槽位的版面换算 —— 纯函数模块。
 *
 * 只做三件事：槽号 ↔ `grid_position`、像素坐标 ↔ 格位 `offset`、槽位声明校验。
 * **零 import**，因此 Node 里可直接加载、可离线单测（不依赖 UI 元素类与构建管道）。
 *
 * 坐标系约定：`pos` / `gridOrigin` 都是**面板左上角为原点**的像素坐标（`top_left` 锚）。
 */

export type Offset2 = [number, number]
export type Size2 = [number | string, number | string]

/** 槽位语义：`input` 不写标志位；`output` / `display` 写 `enabled: false` */
export type SlotKind = 'input' | 'output' | 'display'

/** 声明的槽位语义全集（用于校验与遍历） */
export const SLOT_KINDS: readonly SlotKind[] = Object.freeze(['input', 'output', 'display'])

/** 会被写成 `enabled: false` 的槽位语义：`output` 与 `display` */
export function isGatedKind(kind: SlotKind): boolean {
  return kind === 'output' || kind === 'display'
}

/** 格位尺寸：单数字 = 正方形边长；二元组 = [宽, 高] */
export type CellSizeInput = number | Offset2

/** 九宫格切分：单数字或 [x0, y0, x1, y1] */
export type NineSlice = number | [number, number, number, number]

/** 格位背景：纹理路径，或带九宫格切分的纹理描述 */
export type SlotBackground = string | { texture: string; nineslice_size?: NineSlice }

/** 内层格位控件的锚点（与 `SLOT_CALIBRATION.anchor` 同步） */
export type SlotAnchor = 'top_left' | 'center'

/** 原版 `common.container_item` 可覆盖变量子集 */
export interface ItemRendererSpec {
  /** `$item_renderer`：渲染器控件引用 */
  ref?: string
  /** `$item_renderer_size` */
  size?: Offset2
  /** `$item_renderer_offset` */
  offset?: Offset2
  /** `$item_renderer_panel_size` */
  panelSize?: Offset2
}

/** 槽位声明（`addSlot` 的入参；旧接口路径可用 `gridPosition` / `offset` 直传） */
export interface SlotSpec {
  /** 容器槽位号（与 `gridPosition` 二选一；两者都给时以 `gridPosition` 为准） */
  slot?: number
  /** 面板内像素坐标（`top_left` 锚）；与 `offset` 二选一（都给时以 `offset` 为准） */
  pos?: Offset2
  /** 显式网格位置 `[列, 行]`（旧接口路径；给了就不再由 `slot` 换算） */
  gridPosition?: Offset2
  /** 显式偏移（旧接口路径；给了就不再由 `pos` 换算） */
  offset?: Offset2
  /** 槽位语义，默认 `input` */
  kind?: SlotKind
  /**
   * 该槽的**视觉**格位尺寸（默认取标定表）。
   *
   * 只影响内层控件的 `$cell_image_size` / `size`，**不参与**基座与网格尺寸换算 ——
   * 网格几何一律由 `setSlotDefaults({ cellSize })`（或标定表）决定；比格位大的视觉尺寸
   * 会从格位左上角向外溢出（原版槽位模板允许，用于画长条进度槽之类）。
   */
  cellSize?: CellSizeInput
  /** 内层控件尺寸（不给则等于 `cellSize`） */
  size?: Size2
  /**
   * 显式写进内层控件的 `enabled` 值（只对 `input` 生效）。
   * `output` / `display` 恒写 `false`；不给则该键不出现（继承原版默认 `true`）。
   */
  enabled?: boolean
  /** 格位背景纹理（框架据此生成背景 image 控件） */
  background?: SlotBackground
  /** `$background_images`：直接指定已有的背景控件引用 */
  backgroundImages?: string
  /** 原版 item renderer 变量覆盖 */
  itemRenderer?: ItemRendererSpec
  /** 其余原版可覆盖变量，键名不带 `$` 与 `|default` 后缀 */
  vars?: Record<string, unknown>
}

/** 槽位默认值（`setSlotDefaults` 的入参：除 `slot` / `pos` / `gridPosition` / `offset` 外均可） */
export type SlotDefaults = Omit<SlotSpec, 'slot' | 'pos' | 'gridPosition' | 'offset'>

/** 标定表 */
export interface SlotCalibration {
  anchor: SlotAnchor
  originPadding: Offset2
  cellSize: Offset2
  columns: number
  /** 未调用 `setGridOrigin` 时网格的默认原点（给顶部标题留高度） */
  defaultGridOrigin: Offset2
}

/**
 * ★ 待真机校准项 —— 整套「格位基座」假设集中在此，校准只需改这一个对象。
 *
 * 假设：格位基座 = 网格原点 + 该格在网格里的序号 × **网格统一格位尺寸**，且格位锚点在左上角。
 * 真机实测若证明锚点其实在格位中心（offset 整体差半格），把 `anchor` 改成 `'center'`
 * 即可同时翻转换算与写进产物的 `anchor_from` / `anchor_to`，不必改调用方。
 */
export const SLOT_CALIBRATION: Readonly<SlotCalibration> = Object.freeze({
  anchor: 'top_left',
  originPadding: [0, 0] as Offset2,
  /** 等于原版 `common.container_item` 的 `size` */
  cellSize: [18, 18] as Offset2,
  /** 槽号铺进网格的列数：1 = 单列（每槽一行），沿用既有产物的排版约定 */
  columns: 1,
  /** 默认网格原点：标题控件占 `[0, 0]` 起的一行（约 20px），网格下移让开它 */
  defaultGridOrigin: [0, 24] as Offset2,
})

/** 换算参数 */
export interface CellLayoutOptions {
  /** 网格在面板内的原点（`top_left` 锚，像素） */
  gridOrigin?: Offset2
  /** 槽号所在网格的列数（默认取标定表） */
  columns?: number
  /**
   * **网格统一格位尺寸**（几何）：整张网格的格位尺寸，同一网格内只有这一个值
   * （来自 `setSlotDefaults({ cellSize })` 或标定表）。
   *
   * 逐槽声明的 `cellSize` **不参与**基座换算，它只决定内层控件的视觉尺寸（可溢出格位）。
   * 传入逐槽尺寸会让偏移与网格尺寸互相矛盾。
   */
  gridCellSize?: CellSizeInput
  /** 标定表覆盖（默认 `SLOT_CALIBRATION`） */
  calibration?: SlotCalibration
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isOffset2(value: unknown): value is Offset2 {
  return Array.isArray(value) && value.length === 2 && isFiniteNumber(value[0]) && isFiniteNumber(value[1])
}

/** 解析标定表：缺省字段回落 `SLOT_CALIBRATION` */
export function resolveCalibration(calibration?: Partial<SlotCalibration>): SlotCalibration {
  const columns = calibration?.columns
  return {
    anchor: calibration?.anchor ?? SLOT_CALIBRATION.anchor,
    originPadding: isOffset2(calibration?.originPadding) ? [...calibration.originPadding] : [...SLOT_CALIBRATION.originPadding],
    cellSize: normalizeCellSize(calibration?.cellSize, SLOT_CALIBRATION.cellSize),
    columns: Number.isInteger(columns) && (columns as number) > 0 ? (columns as number) : SLOT_CALIBRATION.columns,
    defaultGridOrigin: isOffset2(calibration?.defaultGridOrigin) ? [...calibration.defaultGridOrigin] : [...SLOT_CALIBRATION.defaultGridOrigin],
  }
}

/** 把 `number | [宽, 高]` 归一成 `[宽, 高]`；非法输入回落 `fallback` */
export function normalizeCellSize(size: CellSizeInput | undefined, fallback: Offset2 = SLOT_CALIBRATION.cellSize): Offset2 {
  if (isFiniteNumber(size)) return [size, size]
  if (isOffset2(size)) return [size[0], size[1]]
  return [fallback[0], fallback[1]]
}

/**
 * 槽号 → 网格位置 `[列, 行]`（行优先）。
 * @param slot 容器槽位号，须为非负整数
 * @param columns 网格列数，默认取标定表（1 = 单列）
 */
export function slotToGridPosition(slot: number, columns: number = SLOT_CALIBRATION.columns): Offset2 {
  const cols = Number.isInteger(columns) && columns > 0 ? columns : SLOT_CALIBRATION.columns
  return [slot % cols, Math.floor(slot / cols)]
}

/** 一组网格位置 → `grid_dimensions` `[列, 行]`（至少 `[1, 1]`） */
export function gridDimensionsFor(positions: Offset2[]): Offset2 {
  let cols = 1
  let rows = 1
  for (const [col, row] of positions) {
    if (!isFiniteNumber(col) || !isFiniteNumber(row)) continue
    cols = Math.max(cols, Math.floor(col) + 1)
    rows = Math.max(rows, Math.floor(row) + 1)
  }
  return [cols, rows]
}

/**
 * 单个格位的基座坐标（面板像素）。
 *
 * 这是「网格原点 + 序号 × 网格统一格位尺寸」假设的**唯一落点**；锚点由标定表的 `anchor` 决定
 * （`top_left` 时基座即格位左上角，`center` 时再加半个格位）。
 *
 * ⚠️ 格位尺寸取 `options.gridCellSize`（整张网格一个值）；**不要**传某个槽自己的视觉尺寸 ——
 * 引擎的网格格位是均匀的，逐槽尺寸只会让偏移与网格尺寸互相矛盾。
 */
export function cellBase(slot: number, options: CellLayoutOptions = {}): Offset2 {
  const calibration = resolveCalibration(options.calibration)
  const cell = normalizeCellSize(options.gridCellSize, calibration.cellSize)
  const origin = options.gridOrigin ?? [0, 0]
  const columns = options.columns ?? calibration.columns
  const [col, row] = slotToGridPosition(slot, columns)
  const [padX, padY] = calibration.originPadding
  const halfX = calibration.anchor === 'center' ? cell[0] / 2 : 0
  const halfY = calibration.anchor === 'center' ? cell[1] / 2 : 0
  return [
    origin[0] + padX + col * cell[0] + halfX,
    origin[1] + padY + row * cell[1] + halfY,
  ]
}

/**
 * 像素坐标 → 格位 `offset`（相对格位基座）。
 * @param pos 目标位置（面板左上角为原点的像素坐标）
 * @param slot 容器槽位号
 */
export function posToOffset(pos: Offset2, slot: number, options: CellLayoutOptions = {}): Offset2 {
  const base = cellBase(slot, options)
  return [pos[0] - base[0], pos[1] - base[1]]
}

/** 与标定表同步的锚点属性（写进内层格位控件） */
export function anchorProps(calibration?: Partial<SlotCalibration>): { anchor_from: SlotAnchor; anchor_to: SlotAnchor } {
  const anchor = resolveCalibration(calibration).anchor
  return { anchor_from: anchor, anchor_to: anchor }
}

/** 归一化背景描述：字符串 → `{ texture }`；非法输入 → `undefined` */
export function normalizeBackground(background: SlotBackground | undefined): { texture: string; nineslice_size?: NineSlice } | undefined {
  if (typeof background === 'string') return background.length > 0 ? { texture: background } : undefined
  if (background && typeof background === 'object' && typeof (background as { texture?: unknown }).texture === 'string' && (background.texture as string).length > 0) {
    const nine = (background as { nineslice_size?: unknown }).nineslice_size
    return nine === undefined ? { texture: background.texture } : { texture: background.texture, nineslice_size: nine as NineSlice }
  }
  return undefined
}

/**
 * 校验一条槽位声明。
 * @returns 警告文案数组（空数组 = 通过）；**任何输入都不会抛错**
 */
export function validateSlotSpec(spec: SlotSpec | undefined, context: { existingSlots?: number[] } = {}): string[] {
  const warnings: string[] = []
  if (!spec || typeof spec !== 'object') return ['槽位声明必须是对象']

  const { slot, pos, gridPosition, offset, kind, cellSize, size, background } = spec

  if (slot === undefined) {
    if (gridPosition === undefined) warnings.push('槽位声明缺少 slot 与 gridPosition，无法定位格位')
  } else if (!Number.isInteger(slot)) {
    warnings.push(`slot 必须是整数（收到 ${JSON.stringify(slot)}）`)
  } else if (slot < 0) {
    warnings.push(`slot 不能为负（收到 ${slot}）`)
  } else if (context.existingSlots?.includes(slot)) {
    warnings.push(`slot ${slot} 重复声明，后一次会覆盖前一次`)
  }

  if (gridPosition !== undefined && !isOffset2(gridPosition)) {
    warnings.push(`gridPosition 必须是 [列, 行] 两个有限数（收到 ${JSON.stringify(gridPosition)}）`)
  }
  if (pos !== undefined && !isOffset2(pos)) {
    warnings.push(`pos 必须是 [x, y] 两个有限数（收到 ${JSON.stringify(pos)}）`)
  }
  if (offset !== undefined && !isOffset2(offset)) {
    warnings.push(`offset 必须是 [x, y] 两个有限数（收到 ${JSON.stringify(offset)}）`)
  }
  if (kind !== undefined && !SLOT_KINDS.includes(kind)) {
    warnings.push(`kind 只能是 ${SLOT_KINDS.join(' / ')}（收到 ${JSON.stringify(kind)}）`)
  }
  if (cellSize !== undefined && !isFiniteNumber(cellSize) && !isOffset2(cellSize)) {
    warnings.push(`cellSize 必须是数字或 [宽, 高]（收到 ${JSON.stringify(cellSize)}）`)
  }
  if (size !== undefined && !Array.isArray(size)) {
    warnings.push(`size 必须是 [宽, 高]（收到 ${JSON.stringify(size)}）`)
  }
  if (background !== undefined && normalizeBackground(background) === undefined) {
    warnings.push('background 必须是纹理路径字符串或 { texture, nineslice_size? }')
  }
  if (pos === undefined && offset === undefined) {
    const label = slot !== undefined ? `slot ${slot}` : `网格位置 ${JSON.stringify(gridPosition)}`
    warnings.push(`${label} 既没有 pos 也没有 offset，将落在格位基座（offset 归零）`)
  }

  return warnings
}

/** 门控键（同时会用作 `ui/<name>.json` 的文件名）允许的字符 */
export const UI_NAME_PATTERN = /^[A-Za-z0-9_-]+$/

/** 门控键是否可安全用作 UI 文件名 */
export function isSafeUIName(name: unknown): boolean {
  return typeof name === 'string' && UI_NAME_PATTERN.test(name)
}

/**
 * 校验门控键 / UI 文件名。
 * @returns 不合规时的说明文案；合规返回 `undefined`
 */
export function checkUIName(name: unknown): string | undefined {
  if (isSafeUIName(name)) return undefined
  return `UI 名 ${JSON.stringify(name)} 含非法字符：只允许 A-Z a-z 0-9 _ -（该名字同时用作 ui/<name>.json 的文件名，与 identifier 不一致会让 UI 静默不加载）`
}

/** 已解析的槽位：默认值已合并、`grid_position` 与 `offset` 已换算完毕 */
export interface ResolvedSlot {
  slot: number
  kind: SlotKind
  /** 写进产物的 `grid_position` `[列, 行]` */
  gridPosition: Offset2
  /** 面板像素坐标（显式 `gridPosition` 路径下为格位基座） */
  pos: Offset2
  /** 写进产物的 `offset` */
  offset: Offset2
  /** 该槽的**视觉**格位尺寸（网格几何由 `setSlotDefaults` 决定，见 `CellLayoutOptions.gridCellSize`） */
  cellSize: Offset2
  /** 调用方是否显式声明了 `cellSize`（决定是否写出 `$cell_image_size` / `size`） */
  cellSizeDeclared: boolean
  /** 写进 `enabled` 的值；`undefined` = 不写该键 */
  enabled: boolean | undefined
  /** 是否由 `pos` 换算得到 offset（是则同时写锚点，保证换算前提成立） */
  derived: boolean
  background?: { texture: string; nineslice_size?: NineSlice }
  backgroundImages?: string
  size?: Size2
  itemRenderer?: ItemRendererSpec
  vars: Record<string, unknown>
}

/**
 * 把一条槽位声明解析成可写进产物的槽位记录（合并默认值 + 换算 `grid_position` / `offset`）。
 *
 * `gridPosition` / `offset` 任一显式给出时走旧接口路径：该维度原样使用，不参与换算。
 */
export function resolveSlot(spec: SlotSpec, options: CellLayoutOptions & { defaults?: SlotDefaults } = {}): ResolvedSlot {
  const calibration = resolveCalibration(options.calibration)
  const defaults = options.defaults ?? {}
  const merged: SlotSpec = { ...defaults, ...spec }
  const kind: SlotKind = merged.kind ?? 'input'
  const cellSize = normalizeCellSize(merged.cellSize, calibration.cellSize)
  const columns = options.columns ?? calibration.columns

  const gridPosition: Offset2 = isOffset2(merged.gridPosition)
    ? [merged.gridPosition[0], merged.gridPosition[1]]
    : slotToGridPosition(Number.isInteger(merged.slot) ? (merged.slot as number) : 0, columns)

  const slot = Number.isInteger(merged.slot) ? (merged.slot as number) : gridPosition[1] * columns + gridPosition[0]

  let derived = false
  let offset: Offset2
  let pos: Offset2
  // 基座换算只用**网格统一格位尺寸**（视觉尺寸各槽可以不同，见 CellLayoutOptions.gridCellSize）
  const geometry = { ...options, gridCellSize: options.gridCellSize ?? calibration.cellSize }
  if (isOffset2(merged.offset)) {
    offset = [merged.offset[0], merged.offset[1]]
    pos = addOffset(cellBase(slot, geometry), offset)
  } else if (isOffset2(merged.pos)) {
    pos = [merged.pos[0], merged.pos[1]]
    offset = posToOffset(pos, slot, geometry)
    derived = true
  } else {
    // 两者都没给：落在格位基座（`offset` 归零，而不是负的基座坐标）
    pos = cellBase(slot, geometry)
    offset = [0, 0]
  }

  const background = normalizeBackground(merged.background)

  return {
    slot,
    kind,
    gridPosition,
    pos,
    offset,
    cellSize,
    cellSizeDeclared: merged.cellSize !== undefined,
    enabled: isGatedKind(kind) ? false : merged.enabled,
    derived,
    background,
    backgroundImages: merged.backgroundImages,
    size: merged.size,
    itemRenderer: merged.itemRenderer,
    vars: merged.vars ?? {},
  }
}

function addOffset(base: Offset2, offset: Offset2): Offset2 {
  return [base[0] + offset[0], base[1] + offset[1]]
}
