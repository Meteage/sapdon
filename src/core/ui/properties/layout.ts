/**
 * Layout 类
 *
 * 该类表示一个具有各种属性和方法的 UI 布局元素，用于操作其布局和大小。
 *
 * 属性：
 * - size: Vector [width, height] - UI 元素的大小（默认值：["default", "default"]）
 * - max_size: Vector [width, height] - UI 元素的最大大小（默认值：["default", "default"]）
 * - min_size: Vector [width, height] - UI 元素的最小大小（默认值：["default", "default"]）
 * - offset: Vector [x, y] - UI 元素相对于父元素的位置（默认值：[0, 0]）
 * - anchor_from: enum - 父元素中的锚点（默认值：center）
 * - anchor_to: enum - 元素自身的锚点（默认值：center）
 * - inherit_max_sibling_width: boolean - 是否使用兄弟元素的最大宽度（默认值：false）
 * - inherit_max_sibling_height: boolean - 是否使用兄弟元素的最大高度（默认值：false）
 * - use_anchored_offset: boolean - 是否使用基于锚点的偏移（默认值：false）
 * - contained: boolean - 是否限制元素在父元素边界内（默认值：false）
 * - draggable: enum - 是否使元素可拖动（可能值：vertical, horizontal, both）
 * - follows_cursor: boolean - 是否使元素跟随光标（默认值：false）
 */

import type { Anchor, Offset2, Size2 } from '../types.js'

type AnchorOrString = Anchor | string

type SizeOrString = Size2 | string

export class Layout {
  [key: string]: unknown

  declare size: SizeOrString
  declare max_size: Size2
  declare min_size: Size2
  declare offset: Offset2
  declare anchor_from: AnchorOrString
  declare anchor_to: AnchorOrString
  declare inherit_max_sibling_width: boolean
  declare inherit_max_sibling_height: boolean
  declare use_anchored_offset: boolean
  declare contained: boolean
  declare draggable: 'vertical' | 'horizontal' | 'both'
  declare follows_cursor: boolean

  /**
   * 设置 UI 元素的大小。
   * @param {Size2} size - 大小，格式为 [width, height]（默认值：["default", "default"]）
   * @returns {Layout} 返回当前实例以支持链式调用
   */
  setSize(size: SizeOrString = ['default', 'default']): this {
    this.size = size
    return this
  }

  /**
   * 设置 UI 元素的最大大小。
   * @param {Size2} maxSize - 最大大小，格式为 [width, height]（默认值：["default", "default"]）
   * @returns {Layout} 返回当前实例以支持链式调用
   */
  setMaxSize(maxSize: Size2 = ['default', 'default']): this {
    this.max_size = maxSize
    return this
  }

  /**
   * 设置 UI 元素的最小大小。
   * @param {Size2} minSize - 最小大小，格式为 [width, height]（默认值：["default", "default"]）
   * @returns {Layout} 返回当前实例以支持链式调用
   */
  setMinSize(minSize: Size2 = ['default', 'default']): this {
    this.min_size = minSize
    return this
  }

  /**
   * 设置 UI 元素相对于父元素的位置。
   * @param {Offset2} offset - 偏移量，格式为 [x, y]（默认值：[0, 0]）
   * @returns {Layout} 返回当前实例以支持链式调用
   */
  setOffset(offset: Offset2 = [0, 0]): this {
    this.offset = offset
    return this
  }

  /**
   * 设置父元素中的锚点。
   * @param {AnchorOrString} anchorFrom - 锚点（可能值：top_left, top_middle, top_right, left_middle, center, right_middle, bottom_left, bottom_middle, bottom_right）（默认值：center）
   * @returns {Layout} 返回当前实例以支持链式调用
   */
  setAnchorFrom(anchorFrom: AnchorOrString = 'center'): this {
    this.anchor_from = anchorFrom
    return this
  }

  /**
   * 设置元素自身的锚点。
   * @param {AnchorOrString} anchorTo - 锚点（可能值：top_left, top_middle, top_right, left_middle, center, right_middle, bottom_left, bottom_middle, bottom_right）（默认值：center）
   * @returns {Layout} 返回当前实例以支持链式调用
   */
  setAnchorTo(anchorTo: AnchorOrString = 'center'): this {
    this.anchor_to = anchorTo
    return this
  }

  /**
   * 设置是否使用兄弟元素的最大宽度。
   * @param {boolean} inherit - 是否使用兄弟元素的最大宽度（默认值：false）
   * @returns {Layout} 返回当前实例以支持链式调用
   */
  setInheritMaxSiblingWidth(inherit = false): this {
    this.inherit_max_sibling_width = inherit
    return this
  }

  /**
   * 设置是否使用兄弟元素的最大高度。
   * @param {boolean} inherit - 是否使用兄弟元素的最大高度（默认值：false）
   * @returns {Layout} 返回当前实例以支持链式调用
   */
  setInheritMaxSiblingHeight(inherit = false): this {
    this.inherit_max_sibling_height = inherit
    return this
  }

  /**
   * 设置是否使用基于锚点的偏移。
   * @param {boolean} use - 是否使用基于锚点的偏移（默认值：false）
   * @returns {Layout} 返回当前实例以支持链式调用
   */
  setUseAnchoredOffset(use = false): this {
    this.use_anchored_offset = use
    return this
  }

  /**
   * 设置是否限制元素在父元素边界内。
   * @param {boolean} contained - 是否限制元素在父元素边界内（默认值：false）
   * @returns {Layout} 返回当前实例以支持链式调用
   */
  setContained(contained = false): this {
    this.contained = contained
    return this
  }

  /**
   * 设置是否使元素可拖动。
   * @param {'vertical' | 'horizontal' | 'both'} draggable - 是否使元素可拖动（可能值：vertical, horizontal, both）
   * @returns {Layout} 返回当前实例以支持链式调用
   */
  setDraggable(draggable: 'vertical' | 'horizontal' | 'both'): this {
    this.draggable = draggable
    return this
  }

  /**
   * 设置是否使元素跟随光标。
   * @param {boolean} follows - 是否使元素跟随光标（默认值：false）
   * @returns {Layout} 返回当前实例以支持链式调用
   */
  setFollowsCursor(follows = false): this {
    this.follows_cursor = follows
    return this
  }
}