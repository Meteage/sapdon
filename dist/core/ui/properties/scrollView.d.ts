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
    /**
     * 设置滚动条轨道按钮的 ID。
     * @param {string} buttonId - 滚动条轨道按钮的 ID
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setScrollbarTrackButton(buttonId: string): ScrollView;
    scrollbar_track_button: string | undefined;
    /**
     * 设置滚动条触摸按钮的 ID。
     * @param {string} buttonId - 滚动条触摸按钮的 ID
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setScrollbarTouchButton(buttonId: string): ScrollView;
    scrollbar_touch_button: string | undefined;
    /**
     * 设置滚动速度。
     * @param {number} speed - 滚动速度
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setScrollSpeed(speed: number): ScrollView;
    scroll_speed: number | undefined;
    /**
     * 设置是否启用手势控制。
     * @param {boolean} enabled - 是否启用手势控制（默认值：false）
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setGestureControlEnabled(enabled?: boolean): ScrollView;
    gesture_control_enabled: boolean | undefined;
    /**
     * 设置是否始终处理滚动。
     * @param {boolean} alwaysHandle - 是否始终处理滚动（默认值：false）
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setAlwaysHandleScrolling(alwaysHandle?: boolean): ScrollView;
    always_handle_scrolling: boolean | undefined;
    /**
     * 设置是否启用触摸模式。
     * @param {boolean} touchMode - 是否启用触摸模式（默认值：false）
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setTouchMode(touchMode?: boolean): ScrollView;
    touch_mode: boolean | undefined;
    /**
     * 设置滚动条滑块子元素的名称。
     * @param {string} boxName - 滚动条滑块子元素的名称
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setScrollbarBox(boxName: string): ScrollView;
    scrollbar_box: string | undefined;
    /**
     * 设置滚动条轨道子元素的名称。
     * @param {string} trackName - 滚动条轨道子元素的名称
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setScrollbarTrack(trackName: string): ScrollView;
    scrollbar_track: string | undefined;
    /**
     * 设置视口子元素的名称。
     * @param {string} viewPortName - 视口子元素的名称
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setScrollViewPort(viewPortName: string): ScrollView;
    scroll_view_port: string | undefined;
    /**
     * 设置内容根父元素的名称。
     * @param {string} contentName - 内容根父元素的名称
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setScrollContent(contentName: string): ScrollView;
    scroll_content: string | undefined;
    /**
     * 设置包含滚动条滑块和轨道的子元素名称。
     * @param {string} panelName - 包含滚动条滑块和轨道的子元素名称
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setScrollBoxAndTrackPanel(panelName: string): ScrollView;
    scroll_box_and_track_panel: string | undefined;
    /**
     * 设置是否在更新时跳转到底部。
     * @param {boolean} jump - 是否在更新时跳转到底部（默认值：false）
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setJumpToBottomOnUpdate(jump?: boolean): ScrollView;
    jump_to_bottom_on_update: boolean | undefined;
}
