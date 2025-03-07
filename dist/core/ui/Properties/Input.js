/**
 * Input 类
 *
 * 该类表示输入配置，用于管理 UI 元素的输入行为。
 *
 * 属性：
 * - button_mappings: Array of mapping objects - 按钮映射配置
 * - modal: boolean - 是否为模态输入
 * - inline_modal: boolean - 是否为内联模态输入
 * - always_listen_to_input: boolean - 是否始终监听输入
 * - always_handle_pointer: boolean - 是否始终处理指针事件
 * - always_handle_controller_direction: boolean - 是否始终处理控制器方向事件
 * - hover_enabled: boolean - 是否启用悬停事件
 * - prevent_touch_input: boolean - 是否阻止触摸输入
 * - consume_event: boolean - 是否消耗事件
 * - consume_hover_events: boolean - 是否消耗悬停事件
 * - gesture_tracking_button: string - 手势跟踪按钮
 */
export class Input {
    constructor() {
        /*
        this.button_mappings = [];
        this.modal = false;
        this.inline_modal = false;
        this.always_listen_to_input = false;
        this.always_handle_pointer = false;
        this.always_handle_controller_direction = false;
        this.hover_enabled = false;
        this.prevent_touch_input = false;
        this.consume_event = false;
        this.consume_hover_events = false;
        this.gesture_tracking_button = '';
        */
    }
    /**
     * 设置按钮映射配置。
     * @param {ButtonMapping[]} mappings - 按钮映射配置数组
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setButtonMappings(mappings) {
        this.button_mappings = mappings;
        return this;
    }
    /**
     * 设置是否为模态输入。
     * @param {boolean} modal - 是否为模态输入
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setModal(modal = false) {
        this.modal = modal;
        return this;
    }
    /**
     * 设置是否为内联模态输入。
     * @param {boolean} inlineModal - 是否为内联模态输入
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setInlineModal(inlineModal = false) {
        this.inline_modal = inlineModal;
        return this;
    }
    /**
     * 设置是否始终监听输入。
     * @param {boolean} alwaysListen - 是否始终监听输入
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setAlwaysListenToInput(alwaysListen = false) {
        this.always_listen_to_input = alwaysListen;
        return this;
    }
    /**
     * 设置是否始终处理指针事件。
     * @param {boolean} alwaysHandle - 是否始终处理指针事件
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setAlwaysHandlePointer(alwaysHandle = false) {
        this.always_handle_pointer = alwaysHandle;
        return this;
    }
    /**
     * 设置是否始终处理控制器方向事件。
     * @param {boolean} alwaysHandle - 是否始终处理控制器方向事件
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setAlwaysHandleControllerDirection(alwaysHandle = false) {
        this.always_handle_controller_direction = alwaysHandle;
        return this;
    }
    /**
     * 设置是否启用悬停事件。
     * @param {boolean} enabled - 是否启用悬停事件
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setHoverEnabled(enabled = false) {
        this.hover_enabled = enabled;
        return this;
    }
    /**
     * 设置是否阻止触摸输入。
     * @param {boolean} prevent - 是否阻止触摸输入
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setPreventTouchInput(prevent = false) {
        this.prevent_touch_input = prevent;
        return this;
    }
    /**
     * 设置是否消耗事件。
     * @param {boolean} consume - 是否消耗事件
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setConsumeEvent(consume = false) {
        this.consume_event = consume;
        return this;
    }
    /**
     * 设置是否消耗悬停事件。
     * @param {boolean} consume - 是否消耗悬停事件
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setConsumeHoverEvents(consume = false) {
        this.consume_hover_events = consume;
        return this;
    }
    /**
     * 设置手势跟踪按钮。
     * @param {string} button - 手势跟踪按钮
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setGestureTrackingButton(button) {
        this.gesture_tracking_button = button;
        return this;
    }
}
