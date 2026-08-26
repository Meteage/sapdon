/**
 * ScrollView 类
 *
 * 该类表示一个滚动视图控件，用于管理滚动行为及其相关属性。
 *
 * 属性：
 * - scrollbar_track_button: string - 滚动条轨道按钮的 ID
 * - scrollbar_touch_button: string - 滚动条触摸按钮的 ID
 * - scroll_speed: number - 滚动速度
 * - gesture_control_enabled: boolean - 是否启用手势控制
 * - always_handle_scrolling: boolean - 是否始终处理滚动
 * - touch_mode: boolean - 是否启用触摸模式
 * - scrollbar_box: string - 滚动条滑块子元素的名称
 * - scrollbar_track: string - 滚动条轨道子元素的名称
 * - scroll_view_port: string - 视口子元素的名称
 * - scroll_content: string - 内容根父元素的名称
 * - scroll_box_and_track_panel: string - 包含滚动条滑块和轨道的子元素名称
 * - jump_to_bottom_on_update: boolean - 是否在更新时跳转到底部
 */

export class ScrollView {
  [key: string]: unknown

  declare scrollbar_track_button: string
  declare scrollbar_touch_button: string
  declare scroll_speed: number
  declare gesture_control_enabled: boolean
  declare always_handle_scrolling: boolean
  declare touch_mode: boolean
  declare scrollbar_box: string
  declare scrollbar_track: string
  declare scroll_view_port: string
  declare scroll_content: string
  declare scroll_box_and_track_panel: string
  declare jump_to_bottom_on_update: boolean

  /**
   * 设置滚动条轨道按钮的 ID。
   * @param {string} buttonId - 滚动条轨道按钮的 ID
   * @returns {ScrollView} 返回当前实例以支持链式调用
   */
  setScrollbarTrackButton(buttonId: string): this {
    this.scrollbar_track_button = buttonId
    return this
  }

  /**
   * 设置滚动条触摸按钮的 ID。
   * @param {string} buttonId - 滚动条触摸按钮的 ID
   * @returns {ScrollView} 返回当前实例以支持链式调用
   */
  setScrollbarTouchButton(buttonId: string): this {
    this.scrollbar_touch_button = buttonId
    return this
  }

  /**
   * 设置滚动速度。
   * @param {number} speed - 滚动速度
   * @returns {ScrollView} 返回当前实例以支持链式调用
   */
  setScrollSpeed(speed: number): this {
    this.scroll_speed = speed
    return this
  }

  /**
   * 设置是否启用手势控制。
   * @param {boolean} enabled - 是否启用手势控制（默认值：false）
   * @returns {ScrollView} 返回当前实例以支持链式调用
   */
  setGestureControlEnabled(enabled = false): this {
    this.gesture_control_enabled = enabled
    return this
  }

  /**
   * 设置是否始终处理滚动。
   * @param {boolean} alwaysHandle - 是否始终处理滚动（默认值：false）
   * @returns {ScrollView} 返回当前实例以支持链式调用
   */
  setAlwaysHandleScrolling(alwaysHandle = false): this {
    this.always_handle_scrolling = alwaysHandle
    return this
  }

  /**
   * 设置是否启用触摸模式。
   * @param {boolean} touchMode - 是否启用触摸模式（默认值：false）
   * @returns {ScrollView} 返回当前实例以支持链式调用
   */
  setTouchMode(touchMode = false): this {
    this.touch_mode = touchMode
    return this
  }

  /**
   * 设置滚动条滑块子元素的名称。
   * @param {string} boxName - 滚动条滑块子元素的名称
   * @returns {ScrollView} 返回当前实例以支持链式调用
   */
  setScrollbarBox(boxName: string): this {
    this.scrollbar_box = boxName
    return this
  }

  /**
   * 设置滚动条轨道子元素的名称。
   * @param {string} trackName - 滚动条轨道子元素的名称
   * @returns {ScrollView} 返回当前实例以支持链式调用
   */
  setScrollbarTrack(trackName: string): this {
    this.scrollbar_track = trackName
    return this
  }

  /**
   * 设置视口子元素的名称。
   * @param {string} viewPortName - 视口子元素的名称
   * @returns {ScrollView} 返回当前实例以支持链式调用
   */
  setScrollViewPort(viewPortName: string): this {
    this.scroll_view_port = viewPortName
    return this
  }

  /**
   * 设置内容根父元素的名称。
   * @param {string} contentName - 内容根父元素的名称
   * @returns {ScrollView} 返回当前实例以支持链式调用
   */
  setScrollContent(contentName: string): this {
    this.scroll_content = contentName
    return this
  }

  /**
   * 设置包含滚动条滑块和轨道的子元素名称。
   * @param {string} panelName - 包含滚动条滑块和轨道的子元素名称
   * @returns {ScrollView} 返回当前实例以支持链式调用
   */
  setScrollBoxAndTrackPanel(panelName: string): this {
    this.scroll_box_and_track_panel = panelName
    return this
  }

  /**
   * 设置是否在更新时跳转到底部。
   * @param {boolean} jump - 是否在更新时跳转到底部（默认值：false）
   * @returns {ScrollView} 返回当前实例以支持链式调用
   */
  setJumpToBottomOnUpdate(jump = false): this {
    this.jump_to_bottom_on_update = jump
    return this
  }
}