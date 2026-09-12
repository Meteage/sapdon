import { DataBindingObject } from '../dataBindingObject.js'
import { Grid } from '../elements/grid.js'
import { Image } from '../elements/image.js'
import { Label } from '../elements/label.js'
import { Panel } from '../elements/panel.js'
import { UIElement } from '../elements/uiElement.js'
import { Control } from '../properties/control.js'
import { GridProp } from '../properties/gridProp.js'
import { Layout } from '../properties/layout.js'
import { Sprite } from '../properties/sprite.js'
import { Text } from '../properties/text.js'
import { ChestUISystem } from './chest.js'
import {
  SLOT_CALIBRATION,
  anchorProps,
  checkUIName,
  gridDimensionsFor,
  normalizeBackground,
  normalizeCellSize,
  resolveSlot,
  validateSlotSpec,
  type Offset2,
  type ResolvedSlot,
  type Size2,
  type SlotBackground,
  type SlotDefaults,
  type SlotSpec,
} from './containerLayout.js'
import { UISystem } from './system.js'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any

/** 旧式格位声明（`addGridItem` / `addInputGrid` / `addOutputGrid` 的 options） */
export interface LegacyGridItemOptions {
  /** @deprecated 用 `enabled`；JSON UI 的属性名是 `enabled` 不是 `enable` */
  enable?: boolean
  /** 是否写 `enabled`（不给则该键不出现） */
  enabled?: boolean
  /** 内层控件尺寸 */
  size?: Any
  /** `$background_images` 背景控件引用 */
  background_images?: Any
}

/** `setPanel` 的入参 */
export interface PanelOptions {
  /** 根面板尺寸（像素） */
  size?: Size2
  /** 面板背景纹理 */
  background?: SlotBackground
}

/** 进度指示图的裁切方向：露出的是**该侧**的比例那一段（`'left'` = 从左往右填） */
export type ProgressClipDirection = 'left' | 'right' | 'up' | 'down' | 'center'

/** `addProgressSlot` 的入参 */
export interface ProgressSlotOptions {
  /** 容器槽位号 */
  slot: number
  /** 面板内像素坐标（左上角原点），与 `addSlot` 同义 */
  pos: Offset2
  /** 按比例裁开的填充图（纹理路径），例如 `textures/ui/arrow_active` */
  fill: string
  /** 垫在下面的静止底图（可选）；给了的话即使裁切没生效也还看得见轮廓 */
  base?: string
  /** 视觉尺寸（像素），默认 `[22, 15]`（原版熔炉箭头尺寸） */
  size?: Offset2
  /** 裁切方向，默认 `'left'`；从下往上烧的火焰用 `'down'` */
  clipDirection?: ProgressClipDirection
  /**
   * 贴图是否**保持纵横比**，默认 `false`（= 按 `size` 拉伸铺满）。
   *
   * 默认拉伸，是因为这个槽的契约就是「这块就是 `size` 像素」；原版箭头的贴图恰与尺寸同比例，
   * 两者无差别。**贴图与 `size` 比例不同时**（例如把一根竖长条压进矮格子）必须显式决定：
   * `false` = 拉伸变形；`true` = 按比例缩放（会留边，实际宽度不再是 `size`）。
   */
  keepRatio?: boolean
  /** 比例来源的集合名，默认 `"container_items"`（小箱子与大箱子都是它） */
  collection?: string
  /** 额外写进槽位的原版变量（可覆盖内置的两条） */
  vars?: Record<string, unknown>
}

/** `addProgressSlot` 默认的比例来源集合名 */
const PROGRESS_COLLECTION = 'container_items'

/**
 * 进度比例 = **剩余**耐久比例。
 *
 * ⚠️ `#item_durability_current_amount` 是**已损耗量**，所以这个看起来绕的写法是必须的；
 * 依据与实测见 `doc/dev/known-pitfalls.md` §4.12。
 */
const PROGRESS_RATIO_EXPRESSION =
  '((#item_durability_total_amount - #item_durability_current_amount) / #item_durability_total_amount)'

/**
 * 自定义容器 UI 系统：把「容器槽位」声明成面板内的像素版面。
 *
 * 坐标系为面板左上角原点的像素坐标（`top_left` 锚）；`grid_position` 与格位基座的换算见
 * `containerLayout.ts`（其中 `SLOT_CALIBRATION` 是唯一的待真机校准点）。
 * 面板背景与已声明槽位在每次修改后整体重建，故可自由链式调用。
 */
export class ContainerUISystem {
  system: UISystem
  title: string
  root_panel_size: [number, number]
  gridDimension: [number, number]
  /** 输出槽记录（`setOutputSlots` 写入）；不参与版面，版面由槽位声明的 `kind` 决定 */
  outputSlots: number[][]
  main_panel: Panel
  grids: Grid

  /** 已声明的槽位（按声明顺序；重复槽号就地覆盖） */
  #slots: SlotSpec[] = []
  #slotKeys: string[] = []
  #anonymousKey = 0
  #gridOrigin: Offset2 = [SLOT_CALIBRATION.defaultGridOrigin[0], SLOT_CALIBRATION.defaultGridOrigin[1]]
  #slotDefaults: SlotDefaults = {}
  #gridDimensionSet = false
  #panelBackground: SlotBackground | undefined
  /** 背景纹理描述 → 生成的背景控件名（同图复用同一控件） */
  #backgroundControlIds = new Map<string, string>()

  constructor(identifier: string, path: string) {
    this.system = new UISystem(identifier, path)
    this.title = '自定义容器'
    this.root_panel_size = [200, 200]
    this.gridDimension = [3, 1]

    this.outputSlots = []

    this.main_panel = new Panel('main_panel')
    this.grids = new Grid('grids')

    // 初始化
    this.#register()
    this.#updateSystem()
  }

  // ── 版面 ────────────────────────────────────────────────────────────────────

  /**
   * 设置面板尺寸与背景图。
   * @param {PanelOptions} [options] - `size` 为像素尺寸；`background` 为纹理路径或 `{ texture, nineslice_size? }`
   * @returns {ContainerUISystem} 返回当前实例以支持链式调用
   */
  setPanel(options: PanelOptions = {}): this {
    const { size } = options
    if (size !== undefined) {
      if (Array.isArray(size) && Number.isFinite(Number(size[0])) && Number.isFinite(Number(size[1]))) {
        this.root_panel_size = [Number(size[0]), Number(size[1])]
      } else {
        this.#warn(`setPanel 的 size 必须是两个有限数字 [宽, 高]（收到 ${JSON.stringify(size)}），已忽略`)
      }
    }
    if (options.background !== undefined) {
      if (normalizeBackground(options.background) === undefined) {
        this.#warn('setPanel 的 background 必须是纹理路径字符串或 { texture, nineslice_size? }，已忽略')
      } else {
        this.#panelBackground = options.background
      }
    }
    this.#updateSystem()
    return this
  }

  /**
   * 设置网格在面板内的原点（未调用时取标定表的默认原点，已为顶部标题让开一行）。
   * @param {Offset2} origin - 像素坐标 [x, y]
   * @returns {ContainerUISystem} 返回当前实例以支持链式调用
   */
  setGridOrigin(origin: Offset2): this {
    if (!Array.isArray(origin) || !Number.isFinite(origin[0]) || !Number.isFinite(origin[1])) {
      this.#warn(`setGridOrigin 需要 [x, y] 两个有限数（收到 ${JSON.stringify(origin)}），已忽略`)
      return this
    }
    this.#gridOrigin = [origin[0], origin[1]]
    this.#updateSystem()
    return this
  }

  /**
   * 合并槽位默认值（对之后声明的每个槽生效）。
   *
   * ★ `cellSize` 是**整张网格的统一格位尺寸（几何）**：基座换算与网格尺寸都用它。
   * 逐槽声明 `addSlot({ cellSize })` 只改该格的视觉尺寸（可溢出格位），不参与几何。
   * @param {SlotDefaults} defaults - 除 `slot` / `pos` / `gridPosition` / `offset` 外的槽位字段
   * @returns {ContainerUISystem} 返回当前实例以支持链式调用
   */
  setSlotDefaults(defaults: SlotDefaults = {}): this {
    this.#slotDefaults = { ...this.#slotDefaults, ...(defaults ?? {}) }
    this.#updateSystem()
    return this
  }

  // ── 槽位 ────────────────────────────────────────────────────────────────────

  /**
   * 声明一个容器槽位：`slot` 定槽号、`pos` 定面板内像素位置，框架负责换算 `grid_position` 与 `offset`。
   *
   * `kind` 为 `output` / `display` 时写 `enabled: false`；`input`（默认）不写该键。
   * 声明不合规时只 `console.warn`，不抛错。
   * @param {SlotSpec} spec - 槽位声明
   * @returns {ContainerUISystem} 返回当前实例以支持链式调用
   */
  addSlot(spec: SlotSpec): this {
    for (const warning of validateSlotSpec(spec, { existingSlots: this.#declaredSlots() })) {
      this.#warn(warning)
    }
    const key = this.#slotKey(spec)
    const index = this.#slotKeys.indexOf(key)
    if (index >= 0) {
      this.#slots[index] = spec
    } else {
      this.#slotKeys.push(key)
      this.#slots.push(spec)
    }
    this.#updateSystem()
    return this
  }

  /**
   * 向主面板中添加一个控件。
   * @param {UIElement | Any} element - 控件（UIElement 实例或原生 JSON UI 控件对象）
   * @param {Offset2} [pos] - 面板内像素坐标 [x, y]；给了就按 `top_left` 锚定位
   * @returns {ContainerUISystem} 返回当前实例以支持链式调用
   */
  addControl(element: UIElement | Any, pos?: Offset2): this {
    if (Array.isArray(pos) && Number.isFinite(pos[0]) && Number.isFinite(pos[1])) {
      if (element instanceof UIElement) {
        element.layout.setOffset([pos[0], pos[1]]).setAnchorFrom('top_left').setAnchorTo('top_left')
      } else if (element && typeof element === 'object') {
        element.offset = [pos[0], pos[1]]
        element.anchor_from = 'top_left'
        element.anchor_to = 'top_left'
      }
    } else if (pos !== undefined) {
      this.#warn(`addControl 的 pos 必须是 [x, y] 两个有限数（收到 ${JSON.stringify(pos)}），已忽略定位`)
    }
    this.main_panel.addControl(element)
    this.#updateSystem()
    return this
  }

  /**
   * 向主面板中添加一个控件（`addControl` 的别名）。
   * @param {UIElement | Any} element - 控件
   * @returns {ContainerUISystem} 返回当前实例以支持链式调用
   */
  addElementToMain(element: UIElement | Any): this {
    return this.addControl(element)
  }

  // ── 进度指示槽 ──────────────────────────────────────────────────────────────

  /**
   * 声明一个「进度指示槽」：`base` 垫底、`fill` 按 `clipDirection` 裁开，比例取**本格物品的耐久**。
   *
   * 与 `addSlot` 的区别：除了声明槽位，还会生成一个自定控件、经 `$cell_overlay_ref`
   * 注入到格子内部（`common.container_item` 的 `item_cell`）。它在格内，
   * 所以保留每格的 collection 上下文，读的是**本格自己**的绑定 —— 每格可以各显示各的进度。
   *
   * 典型用法：脚本往该槽写一个可损耗物品、让「剩余耐久 = 进度」
   * （见 `examples/mob_chest/scripts/progress_bar.js`），即可用原版箭头/火焰贴图画出进度，
   * **不需要任何进度条贴图**。
   *
   * 同时会关掉引擎自带的耐久条（`$durability_bar_required`）并把格子的浅灰底换成零尺寸面板
   * （`$background_images`），否则会看到「灰方块 + 图」。`vars` 可覆盖这两条内置变量。
   * @param {ProgressSlotOptions} options 槽位声明
   * @returns {ContainerUISystem} 返回当前实例以支持链式调用
   */
  addProgressSlot(options: ProgressSlotOptions): this {
    const {
      slot,
      pos,
      fill,
      base,
      size = [22, 15] as Offset2,
      clipDirection = 'left' as ProgressClipDirection,
      keepRatio = false,
      collection = PROGRESS_COLLECTION,
      vars = {},
    } = options ?? ({} as ProgressSlotOptions)

    if (!Number.isInteger(slot) || slot < 0) {
      this.#warn(`addProgressSlot 的 slot 必须是非负整数（收到 ${JSON.stringify(slot)}），已忽略`)
      return this
    }
    if (!Array.isArray(pos) || !Number.isFinite(pos[0]) || !Number.isFinite(pos[1])) {
      this.#warn(`addProgressSlot 的 pos 必须是 [x, y] 两个有限数（收到 ${JSON.stringify(pos)}），已忽略`)
      return this
    }
    if (typeof fill !== 'string' || fill.length === 0) {
      this.#warn('addProgressSlot 的 fill 必须是非空纹理路径，已忽略')
      return this
    }
    if (!Array.isArray(size) || !Number.isFinite(size[0]) || !Number.isFinite(size[1])) {
      this.#warn(`addProgressSlot 的 size 必须是 [宽, 高] 两个有限数（收到 ${JSON.stringify(size)}），已忽略`)
      return this
    }

    const buildImage = (id: string, texture: string, withClip: boolean): Image => {
      const sprite = new Sprite().setTexture(texture).setKeepRatio(keepRatio)
      if (withClip) sprite.setClipDirection(clipDirection)
      return new Image(id)
        .setSprite(sprite)
        .setLayout(new Layout().setSize(size).setAnchorFrom('top_left').setAnchorTo('top_left'))
    }

    const fillImage = buildImage('fill', fill, true)
    fillImage.dataBinding
      .addDataBinding(
        new DataBindingObject()
          .setBindingName('#item_durability_current_amount')
          .setBindingType('collection')
          .setBindingCollectionName(collection),
      )
      .addDataBinding(
        new DataBindingObject()
          .setBindingName('#item_durability_total_amount')
          .setBindingType('collection')
          .setBindingCollectionName(collection),
      )
      .addDataBinding(
        new DataBindingObject()
          .setBindingType('view')
          .setSourcePropertyName(PROGRESS_RATIO_EXPRESSION)
          .setTargetPropertyName('#clip_ratio'),
      )

    const controls: (UIElement | Record<string, Any>)[] = []
    if (typeof base === 'string' && base.length > 0) controls.push(buildImage('base', base, false))
    controls.push(fillImage)

    const progressControlId = `progress_${slot}`
    const backgroundId = 'progress_empty_background'
    this.system.addElement(new Panel(progressControlId).addControls(controls))
    this.system.addElement(new Panel(backgroundId).setLayout(new Layout().setSize([0, 0])))

    return this.addSlot({
      slot,
      pos,
      kind: 'display',
      cellSize: size,
      // 数量恒为 1 时不会有角标，但物品图标仍会画出来；进度指示槽只要图，所以把它归零藏掉。
      itemRenderer: { size: [0, 0] },
      vars: {
        durability_bar_required: false,
        background_images: `${this.system.namespace}.${backgroundId}`,
        cell_overlay_ref: `${this.system.namespace}.${progressControlId}`,
        ...vars,
      },
    })
  }

  // ── 旧接口（薄封装，行为不变；仅 `enable` → `enabled` 一处订正） ────────────────

  /**
   * 旧式网格项：直接给 `grid_position` 与 `offset`，不做坐标换算。
   * @param {Offset2} grid_position - 网格位置 [列, 行]
   * @param {Offset2} offset - 内层控件的偏移 [x, y]
   * @param {LegacyGridItemOptions} [options] - 可选覆盖
   * @returns {ContainerUISystem} 返回当前实例以支持链式调用
   */
  addGridItem(grid_position: Offset2, offset: Offset2, options: LegacyGridItemOptions = {}): this {
    return this.addSlot({
      gridPosition: grid_position,
      offset,
      enabled: options.enabled ?? options.enable,
      size: options.size,
      backgroundImages: options.background_images,
    })
  }

  /**
   * 旧式输入槽（等价 `addGridItem`）。
   * @param {Offset2} grid_position - 网格位置 [列, 行]
   * @param {Offset2} offset - 内层控件的偏移 [x, y]
   * @param {LegacyGridItemOptions} [options] - 可选覆盖
   */
  addInputGrid(grid_position: Offset2, offset: Offset2, options: LegacyGridItemOptions = {}): void {
    this.addSlot({
      gridPosition: grid_position,
      offset,
      kind: 'input',
      enabled: options.enabled ?? options.enable,
      size: options.size,
      backgroundImages: options.background_images,
    })
  }

  /**
   * 旧式输出槽：在该格位内层控件上写 `enabled: false`（是否被引擎拦下待真机确认）。
   * @param {Offset2} grid_position - 网格位置 [列, 行]
   * @param {Offset2} offset - 内层控件的偏移 [x, y]
   * @param {LegacyGridItemOptions} [options] - 可选覆盖（`enabled` 恒被覆盖为 false）
   */
  addOutputGrid(grid_position: Offset2, offset: Offset2, options: LegacyGridItemOptions = {}): void {
    this.addSlot({
      gridPosition: grid_position,
      offset,
      kind: 'output',
      size: options.size,
      backgroundImages: options.background_images,
    })
  }

  /**
   * 记录输出槽数组（供上层读取）；不改变已声明槽位的版面与语义。
   * @param {number[][]} output_arr - 输出槽记录
   */
  setOutputSlots(output_arr: number[][]): void {
    this.outputSlots = output_arr
  }

  /**
   * @deprecated 名字写反了（它存的是输出槽），改用 `setOutputSlots`
   * @param {number[][]} output_arr - 输出槽记录
   */
  setInputGrid(output_arr: number[][]): void {
    this.setOutputSlots(output_arr)
  }

  /**
   * 设置网格的行列数（显式覆盖；不调用则按已声明槽位自动推导）。
   * @param {number[]} dimension - 网格维度 [列数, 行数]
   * @returns {ContainerUISystem} 返回当前实例以支持链式调用
   */
  setGridDimension(dimension: number[]): this {
    this.gridDimension = dimension as [number, number]
    this.#gridDimensionSet = true
    this.#updateSystem()
    return this
  }

  /**
   * 设置容器的标题。
   * @param {string} title - 容器的标题
   * @returns {ContainerUISystem} 返回当前实例以支持链式调用
   */
  setTitle(title: string): this {
    this.title = title
    this.#updateSystem()
    return this
  }

  /**
   * 设置根面板的尺寸。
   * @param {number[]} size - 根面板的尺寸 [宽度, 高度]（像素）
   * @returns {ContainerUISystem} 返回当前实例以支持链式调用
   */
  setSize(size: number[]): this {
    return this.setPanel({ size: size as Size2 })
  }

  // ── 内部 ────────────────────────────────────────────────────────────────────

  #warn(message: string): void {
    console.warn(`[sapdon] ContainerUISystem(${this.system.identifier}): ${message}`)
  }

  #slotKey(spec: SlotSpec): string {
    if (Number.isInteger(spec?.slot)) return `slot:${spec.slot}`
    if (Array.isArray(spec?.gridPosition)) return `grid:${spec.gridPosition[0]},${spec.gridPosition[1]}`
    return `anon:${this.#anonymousKey++}`
  }

  #declaredSlots(): number[] {
    return this.#slots.filter((s) => Number.isInteger(s?.slot)).map((s) => s.slot as number)
  }

  #resolvedSlots(): ResolvedSlot[] {
    return this.#slots.map((spec) =>
      resolveSlot(spec, {
        gridOrigin: this.#gridOrigin,
        columns: SLOT_CALIBRATION.columns,
        gridCellSize: this.#panelCellSize(),
        defaults: this.#slotDefaults,
      }),
    )
  }

  /**
   * 整张网格的统一格位尺寸（几何）。
   *
   * 引擎的网格格位是均匀的 ⇒ 几何只取一处：`setSlotDefaults({ cellSize })`，缺省回落标定表。
   * 逐槽 `cellSize` 只当视觉尺寸，不参与这里，也不参与基座换算。
   */
  #panelCellSize(): Offset2 {
    return normalizeCellSize(this.#slotDefaults.cellSize, SLOT_CALIBRATION.cellSize)
  }

  /** 显式 `setGridDimension` 优先；否则按已声明槽位推导（无槽位时沿用历史默认值） */
  #effectiveGridDimension(): [number, number] {
    if (this.#gridDimensionSet || this.#slots.length === 0) return this.gridDimension
    return gridDimensionsFor(this.#resolvedSlots().map((s) => s.gridPosition))
  }

  /**
   * 注册容器 UI 系统。
   * @private
   */
  #register(): void {
    const nameWarning = checkUIName(this.system.name)
    if (nameWarning) this.#warn(nameWarning)
    ChestUISystem.registerContainerUI(this.system.name, `${this.system.namespace}.container_root_panel`)
  }

  /** 面板背景图（可选） */
  #buildPanelBackground(): Image | undefined {
    const background = normalizeBackground(this.#panelBackground)
    if (!background) return undefined
    return this.#buildBackgroundImage('panel_background', background.texture, background.nineslice_size, this.root_panel_size)
  }

  /** 为槽位背景按需生成控件，返回 `命名空间.控件名` 引用 */
  #slotBackgroundRef(resolved: ResolvedSlot): string | undefined {
    if (resolved.backgroundImages) return resolved.backgroundImages
    const background = resolved.background
    if (!background) return undefined
    const key = JSON.stringify(background)
    let id = this.#backgroundControlIds.get(key)
    if (id === undefined) {
      id = `slot_background_${this.#backgroundControlIds.size}`
      this.#backgroundControlIds.set(key, id)
    }
    this.system.addElement(this.#buildBackgroundImage(id, background.texture, background.nineslice_size))
    return `${this.system.namespace}.${id}`
  }

  #buildBackgroundImage(id: string, texture: string, nineslice_size?: number | [number, number, number, number], size?: Size2): Image {
    const image = new Image(id)
    image.setSprite(new Sprite().setTexture(texture))
    if (nineslice_size !== undefined) image.sprite.setNineSliceSize(nineslice_size)
    image.setLayout(new Layout().setSize(size ?? ['100%', '100%']).setAnchorFrom('top_left').setAnchorTo('top_left').setOffset([0, 0]))
    image.setControl(new Control().setLayer(1))
    return image
  }

  #buildTitle(): Label {
    return new Label('title')
      .setControl(new Control().setLayer(12))
      .setText(new Text().setText(this.title).setColor([0, 0, 0]).setTextAlignment('center'))
      .setLayout(new Layout().setSize(['100%', 'default']).setAnchorFrom('top_left').setAnchorTo('top_left').setOffset([0, 0]))
  }

  /** 玩家背包区（原版控件，占面板下半部分） */
  #buildInventoryPanel(): Panel {
    return new Panel('inventory_panel')
      .setControl(new Control().setLayer(2))
      .setLayout(
        new Layout().setSize(['100%', '50%']).setAnchorFrom('bottom_left').setAnchorTo('bottom_left').setOffset([0, 0]),
      )
      .addControls([
        { 'inventory_panel_bottom_half_with_label@common.inventory_panel_bottom_half_with_label': {} },
        { 'hotbar_grid@common.hotbar_grid_template': {} },
        { 'inventory_take_progress_icon_button@common.inventory_take_progress_icon_button': {} },
      ])
  }

  /** 网格本身（绝对定位在 `gridOrigin`；格位尺寸取面板统一值，与基座换算同源） */
  #buildGrid(): Grid {
    const dimension = this.#effectiveGridDimension()
    const resolved = this.#resolvedSlots()
    const [cellWidth, cellHeight] = this.#panelCellSize()

    const grid = this.grids
    grid.setGridProp(new GridProp().setGridDimensions(dimension).setGridItemTemplate('chest.chest_grid_item'))
    grid.setCollectionName('container_items')
    grid.setControl(new Control().setLayer(3))
    grid.setLayout(
      new Layout()
        .setSize([dimension[0] * cellWidth, dimension[1] * cellHeight])
        .setAnchorFrom('top_left')
        .setAnchorTo('top_left')
        .setOffset([this.#gridOrigin[0], this.#gridOrigin[1]]),
    )

    // ★ 必须按**格位顺序（行优先）**发布格位，不能按**声明顺序**：
    //   引擎是把 grid item 依次铺进格位的 —— 落点跟着 `controls` 数组顺序走，`grid_position`
    //   不参与定位（依据见 doc/dev/known-pitfalls.md §4.13）。项目若先声明了靠后的格位
    //   （例如「先声明进度槽、后声明输出槽」），声明顺序就会把整块版面错开。
    //   排序后「`pos` = 渲染位置」对任何声明顺序都成立。
    const ordered = [...resolved].sort(
      (a, b) => a.gridPosition[1] - b.gridPosition[1] || a.gridPosition[0] - b.gridPosition[0],
    )
    ordered.forEach((slot, index) => {
      grid.addGridItem(slot.gridPosition, this.#buildSlotControl(slot), `grid_item_${index}`)
    })
    return grid
  }

  /** 单个格位的内层控件（`chest.chest_grid_item` 模板 + 变量覆盖） */
  #buildSlotControl(slot: ResolvedSlot): UIElement {
    const item = new UIElement('grid_item', undefined, 'chest.chest_grid_item')
    item.addProp('offset', slot.offset)
    if (slot.enabled !== undefined) item.addProp('enabled', slot.enabled)
    // 由 pos 换算出的 offset 以 `top_left` 锚为前提，必须与标定表同步写锚点
    if (slot.derived) {
      const anchors = anchorProps()
      item.addProp('anchor_from', anchors.anchor_from)
      item.addProp('anchor_to', anchors.anchor_to)
    }
    if (slot.cellSizeDeclared) {
      item.addVariable('cell_image_size|default', slot.cellSize)
      if (slot.size === undefined) item.addProp('size', slot.cellSize)
    }
    if (slot.size !== undefined) item.addProp('size', slot.size)

    const backgroundRef = this.#slotBackgroundRef(slot)
    if (backgroundRef !== undefined) item.addVariable('background_images|default', backgroundRef)

    const renderer = slot.itemRenderer
    if (renderer) {
      if (renderer.ref !== undefined) item.addVariable('item_renderer|default', renderer.ref)
      if (renderer.size !== undefined) item.addVariable('item_renderer_size|default', renderer.size)
      if (renderer.offset !== undefined) item.addVariable('item_renderer_offset|default', renderer.offset)
      if (renderer.panelSize !== undefined) item.addVariable('item_renderer_panel_size|default', renderer.panelSize)
    }

    for (const [key, value] of Object.entries(slot.vars)) {
      item.addVariable(`${key.replace(/^\$/, '').replace(/\|default$/, '')}|default`, value)
    }
    return item
  }

  /**
   * 更新 UI 系统：按当前声明整体重建根面板（`UISystem.addElement` 按 id 覆盖，重入安全）。
   * @private
   */
  #updateSystem(): void {
    const container_root_panel = new Panel('container_root_panel')
    container_root_panel.setLayout(new Layout().setSize(this.root_panel_size))

    this.main_panel.setLayout(
      new Layout()
        .setSize(this.root_panel_size)
        .setAnchorFrom('top_left')
        .setAnchorTo('top_left')
        .setOffset([0, 0]),
    )
    // 就地改层级：`setControl` 会换掉 Control 对象，把 `addControl` 已挂上的控件丢掉
    this.main_panel.control.setLayer(4)

    const controls: (UIElement | Record<string, Any>)[] = [
      // 通用面板
      { 'common_panel@common.common_panel': {} },
      // 飞行动画图标按钮
      { 'inventory_selected_icon_button@common.inventory_selected_icon_button': {} },
    ]

    const background = this.#buildPanelBackground()
    if (background) controls.push(background)

    controls.push(this.#buildTitle(), this.#buildGrid(), this.main_panel, this.#buildInventoryPanel())

    container_root_panel.addControls(controls)
    this.system.addElement(container_root_panel)
  }
}
