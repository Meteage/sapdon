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
    /**
     * 设置按钮映射配置。
     * @param {ButtonMapping[]} mappings - 按钮映射配置数组
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setButtonMappings(mappings: ButtonMapping[]): Input;
    button_mappings: ButtonMapping[] | undefined;
    /**
     * 设置是否为模态输入。
     * @param {boolean} modal - 是否为模态输入
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setModal(modal?: boolean): Input;
    modal: boolean | undefined;
    /**
     * 设置是否为内联模态输入。
     * @param {boolean} inlineModal - 是否为内联模态输入
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setInlineModal(inlineModal?: boolean): Input;
    inline_modal: boolean | undefined;
    /**
     * 设置是否始终监听输入。
     * @param {boolean} alwaysListen - 是否始终监听输入
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setAlwaysListenToInput(alwaysListen?: boolean): Input;
    always_listen_to_input: boolean | undefined;
    /**
     * 设置是否始终处理指针事件。
     * @param {boolean} alwaysHandle - 是否始终处理指针事件
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setAlwaysHandlePointer(alwaysHandle?: boolean): Input;
    always_handle_pointer: boolean | undefined;
    /**
     * 设置是否始终处理控制器方向事件。
     * @param {boolean} alwaysHandle - 是否始终处理控制器方向事件
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setAlwaysHandleControllerDirection(alwaysHandle?: boolean): Input;
    always_handle_controller_direction: boolean | undefined;
    /**
     * 设置是否启用悬停事件。
     * @param {boolean} enabled - 是否启用悬停事件
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setHoverEnabled(enabled?: boolean): Input;
    hover_enabled: boolean | undefined;
    /**
     * 设置是否阻止触摸输入。
     * @param {boolean} prevent - 是否阻止触摸输入
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setPreventTouchInput(prevent?: boolean): Input;
    prevent_touch_input: boolean | undefined;
    /**
     * 设置是否消耗事件。
     * @param {boolean} consume - 是否消耗事件
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setConsumeEvent(consume?: boolean): Input;
    consume_event: boolean | undefined;
    /**
     * 设置是否消耗悬停事件。
     * @param {boolean} consume - 是否消耗悬停事件
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setConsumeHoverEvents(consume?: boolean): Input;
    consume_hover_events: boolean | undefined;
    /**
     * 设置手势跟踪按钮。
     * @param {string} button - 手势跟踪按钮
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setGestureTrackingButton(button: string): Input;
    gesture_tracking_button: string | undefined;
}
