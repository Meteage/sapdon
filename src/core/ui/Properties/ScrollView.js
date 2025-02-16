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
    constructor() {
        /*
        this.scrollbar_track_button = '';
        this.scrollbar_touch_button = '';
        this.scroll_speed = null;
        this.gesture_control_enabled = false;
        this.always_handle_scrolling = false;
        this.touch_mode = false;
        this.scrollbar_box = '';
        this.scrollbar_track = '';
        this.scroll_view_port = '';
        this.scroll_content = '';
        this.scroll_box_and_track_panel = '';
        this.jump_to_bottom_on_update = false;
        */
    }

    /**
     * 设置滚动条轨道按钮的 ID。
     * @param {string} buttonId - 滚动条轨道按钮的 ID
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setScrollbarTrackButton(buttonId) {
        this.scrollbar_track_button = buttonId;
        return this;
    }

    /**
     * 设置滚动条触摸按钮的 ID。
     * @param {string} buttonId - 滚动条触摸按钮的 ID
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setScrollbarTouchButton(buttonId) {
        this.scrollbar_touch_button = buttonId;
        return this;
    }

    /**
     * 设置滚动速度。
     * @param {number} speed - 滚动速度
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setScrollSpeed(speed) {
        this.scroll_speed = speed;
        return this;
    }

    /**
     * 设置是否启用手势控制。
     * @param {boolean} enabled - 是否启用手势控制（默认值：false）
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setGestureControlEnabled(enabled = false) {
        this.gesture_control_enabled = enabled;
        return this;
    }

    /**
     * 设置是否始终处理滚动。
     * @param {boolean} alwaysHandle - 是否始终处理滚动（默认值：false）
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setAlwaysHandleScrolling(alwaysHandle = false) {
        this.always_handle_scrolling = alwaysHandle;
        return this;
    }

    /**
     * 设置是否启用触摸模式。
     * @param {boolean} touchMode - 是否启用触摸模式（默认值：false）
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setTouchMode(touchMode = false) {
        this.touch_mode = touchMode;
        return this;
    }

    /**
     * 设置滚动条滑块子元素的名称。
     * @param {string} boxName - 滚动条滑块子元素的名称
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setScrollbarBox(boxName) {
        this.scrollbar_box = boxName;
        return this;
    }

    /**
     * 设置滚动条轨道子元素的名称。
     * @param {string} trackName - 滚动条轨道子元素的名称
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setScrollbarTrack(trackName) {
        this.scrollbar_track = trackName;
        return this;
    }

    /**
     * 设置视口子元素的名称。
     * @param {string} viewPortName - 视口子元素的名称
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setScrollViewPort(viewPortName) {
        this.scroll_view_port = viewPortName;
        return this;
    }

    /**
     * 设置内容根父元素的名称。
     * @param {string} contentName - 内容根父元素的名称
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setScrollContent(contentName) {
        this.scroll_content = contentName;
        return this;
    }

    /**
     * 设置包含滚动条滑块和轨道的子元素名称。
     * @param {string} panelName - 包含滚动条滑块和轨道的子元素名称
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setScrollBoxAndTrackPanel(panelName) {
        this.scroll_box_and_track_panel = panelName;
        return this;
    }

    /**
     * 设置是否在更新时跳转到底部。
     * @param {boolean} jump - 是否在更新时跳转到底部（默认值：false）
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setJumpToBottomOnUpdate(jump = false) {
        this.jump_to_bottom_on_update = jump;
        return this;
    }
}