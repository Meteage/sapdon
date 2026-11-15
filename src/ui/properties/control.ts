/**
 * Control Class
 *
 * This class represents a UI control element with various properties and methods to manipulate its state.
 *
 * Properties:
 * - visible: boolean - If the UI element should be visible (default: true)
 * - enabled: boolean - If true and if the UI element or any of its children have the locked state then they will be in the locked (default: true)
 * - layer: int - Z-Index/Layer (like zindex in CSS) relative to parent element. Higher layers will render above (default: 0)
 * - alpha: float - Alpha/transparency of the element. It will only affect the UI element. Its children will be unaffected. (default: 1.0)
 * - propagate_alpha: boolean - If alpha should not only apply to the parent if possible but also all its children (default: false)
 * - clips_children: boolean - Cuts off visually and interactively everything beyond the boundaries of the UI element (default: false)
 * - allow_clipping: boolean - If clips_children works in the UI element. Otherwise, it won't have any effect (default: true)
 * - clip_offset: Vector [x, y] - Offset from the start of the clipping (default: [0, 0])
 * - clip_state_change_event: string - Event triggered when the clip state changes
 * - enable_scissor_test: boolean - Enables scissor test for clipping (default: false)
 * - property_bag: object - Property bag contains properties/variables that are more related with the data than the actual structure and look of the UI element
 * - selected: boolean - If the text box is selected by default
 * - use_child_anchors: boolean - Use the anchor_from and anchor_to of the child of the UI element (default: false)
 * - controls: array - For adding children to the element
 * - anims: string[] - Array of the animation names
 * - disable_anim_fast_forward: boolean - Disables fast-forwarding animations
 * - animation_reset_name: string - Name of the animation to reset to
 * - ignored: boolean - If the UI element should be ignored (default: false)
 * - variables: array or object - A bunch of conditions that change the variables values
 * - modifications: array - Allows to modify the UI files of resource packs below (vanilla being the most bottom one)
 * - grid_position: Vector [row, column] - Position that the control will take inside the grid. This also allows to modify specific grid items of a hardcoded grid
 * - collection_index: int - Index that the control takes in the collection
 */

import type { JsonUIBag, Offset2 } from '../types.js'

/** 附加到 Control.controls 的子元素：可序列化元素对象或 JSON UI 控件对象 */
type ChildControl = Record<string, unknown>

export class Control {
  [key: string]: unknown

  declare visible: boolean
  declare enabled: boolean
  declare layer: number
  declare alpha: number
  declare propagate_alpha: boolean
  declare clips_children: boolean
  declare allow_clipping: boolean
  declare clip_offset: Offset2
  declare clip_state_change_event: string
  declare enable_scissor_test: boolean
  declare property_bag: JsonUIBag
  declare selected: boolean
  declare use_child_anchors: boolean
  declare controls: ChildControl[]
  declare anims: string[]
  declare disable_anim_fast_forward: boolean
  declare animation_reset_name: string
  declare ignored: boolean
  declare variables: JsonUIBag
  declare modifications: unknown[]
  declare grid_position: Offset2
  declare collection_index: number

  /**
   * 设置控件的可见性。
   * @param {boolean} visible - 控件是否可见（默认值：true）
   * @returns {Control} 返回当前实例以支持链式调用
   */
  setVisible(visible = true): this {
    this.visible = visible
    return this
  }

  /**
   * 设置控件的启用状态。
   * @param {boolean} enabled - 控件是否启用（默认值：true）
   * @returns {Control} 返回当前实例以支持链式调用
   */
  setEnabled(enabled = true): this {
    this.enabled = enabled
    return this
  }

  /**
   * 设置控件的层级（z-index）。
   * @param {number} layer - 要设置的层级（默认值：0）
   * @returns {Control} 返回当前实例以支持链式调用
   */
  setLayer(layer = 0): this {
    this.layer = layer
    return this
  }

  /**
   * 设置控件的透明度。
   * @param {number} alpha - 要设置的透明度值（默认值：1.0）
   * @returns {Control} 返回当前实例以支持链式调用
   */
  setAlpha(alpha = 1.0): this {
    this.alpha = alpha
    return this
  }

  /**
   * 设置透明度是否应传播到子元素。
   * @param {boolean} propagate - 透明度是否应传播（默认值：false）
   * @returns {Control} 返回当前实例以支持链式调用
   */
  setPropagateAlpha(propagate = false): this {
    this.propagate_alpha = propagate
    return this
  }

  /**
   * 设置控件是否应裁剪其子元素。
   * @param {boolean} clips - 控件是否应裁剪其子元素（默认值：false）
   * @returns {Control} 返回当前实例以支持链式调用
   */
  setClipsChildren(clips = false): this {
    this.clips_children = clips
    return this
  }

  /**
   * 设置控件是否允许裁剪。
   * @param {boolean} allow - 是否允许裁剪（默认值：true）
   * @returns {Control} 返回当前实例以支持链式调用
   */
  setAllowClipping(allow = true): this {
    this.allow_clipping = allow
    return this
  }

  /**
   * 设置控件的裁剪偏移量。
   * @param {Offset2} offset - 裁剪偏移量，格式为 [x, y]（默认值：[0, 0]）
   * @returns {Control} 返回当前实例以支持链式调用
   */
  setClipOffset(offset: Offset2 = [0, 0]): this {
    this.clip_offset = offset
    return this
  }

  /**
   * 设置裁剪状态更改事件。
   * @param {string} event - 裁剪状态更改时触发的事件名称
   * @returns {Control} 返回当前实例以支持链式调用
   */
  setClipStateChangeEvent(event: string): this {
    this.clip_state_change_event = event
    return this
  }

  /**
   * 设置是否启用裁剪测试。
   * @param {boolean} enable - 是否启用裁剪测试（默认值：false）
   * @returns {Control} 返回当前实例以支持链式调用
   */
  setEnableScissorTest(enable = false): this {
    this.enable_scissor_test = enable
    return this
  }

  /**
   * 设置控件的属性包。
   * @param {JsonUIBag} bag - 要设置的属性包
   * @returns {Control} 返回当前实例以支持链式调用
   */
  setPropertyBag(bag: JsonUIBag): this {
    this.property_bag = bag
    return this
  }

  /**
   * 设置控件是否被选中。
   * @param {boolean} selected - 控件是否被选中（默认值：false）
   * @returns {Control} 返回当前实例以支持链式调用
   */
  setSelected(selected = false): this {
    this.selected = selected
    return this
  }

  /**
   * 设置控件是否使用子元素的锚点。
   * @param {boolean} use - 是否使用子元素的锚点（默认值：false）
   * @returns {Control} 返回当前实例以支持链式调用
   */
  setUseChildAnchors(use = false): this {
    this.use_child_anchors = use
    return this
  }

  /**
   * 向控件添加子控件。
   * @param {ChildControl} control - 要添加的子控件
   * @returns {Control} 返回当前实例以支持链式调用
   */
  addControl(control: ChildControl): this {
    if (!this.controls) this.controls = []
    this.controls.push(control)
    return this
  }

  /**
   * 设置控件的动画。
   * @param {string[]} anims - 动画名称数组
   * @returns {Control} 返回当前实例以支持链式调用
   */
  setAnimations(anims: string[]): this {
    this.anims = anims
    return this
  }

  /**
   * 设置是否禁用动画快进。
   * @param {boolean} disable - 是否禁用动画快进（默认值：false）
   * @returns {Control} 返回当前实例以支持链式调用
   */
  setDisableAnimFastForward(disable = false): this {
    this.disable_anim_fast_forward = disable
    return this
  }

  /**
   * 设置动画重置名称。
   * @param {string} name - 要重置的动画名称
   * @returns {Control} 返回当前实例以支持链式调用
   */
  setAnimationResetName(name: string): this {
    this.animation_reset_name = name
    return this
  }

  /**
   * 设置是否忽略该控件。
   * @param {boolean} ignored - 是否忽略该控件（默认值：false）
   * @returns {Control} 返回当前实例以支持链式调用
   */
  setIgnored(ignored = false): this {
    this.ignored = ignored
    return this
  }

  /**
   * 设置控件的变量。
   * @param {JsonUIBag} variables - 要设置的变量
   * @returns {Control} 返回当前实例以支持链式调用
   */
  setVariables(variables: JsonUIBag): this {
    this.variables = variables
    return this
  }

  /**
   * 设置控件的修改项。
   * @param {unknown[]} modifications - 要设置的修改项
   * @returns {Control} 返回当前实例以支持链式调用
   */
  setModifications(modifications: unknown[]): this {
    this.modifications = modifications
    return this
  }

  /**
   * 设置控件在网格中的位置。
   * @param {Offset2} position - 网格位置，格式为 [行, 列]
   * @returns {Control} 返回当前实例以支持链式调用
   */
  setGridPosition(position: Offset2): this {
    this.grid_position = position
    return this
  }

  /**
   * 设置控件在集合中的索引。
   * @param {number} index - 要设置的索引
   * @returns {Control} 返回当前实例以支持链式调用
   */
  setCollectionIndex(index: number): this {
    this.collection_index = index
    return this
  }
}