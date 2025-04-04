/**
 * ButtonMapping 类
 *
 * 该类表示按钮映射配置，用于定义输入事件的映射关系。
 *
 * 属性：
 * - ignored: boolean - 是否忽略映射（默认值：false）
 * - from_button_id: string - 触发事件的按钮 ID
 * - to_button_id: string - 事件触发时执行的按钮 ID
 * - mapping_type: enum - 映射类型（可能值：global, pressed, double_pressed, focused）
 * - scope: enum - 映射范围（可能值：view, controller）
 * - input_mode_condition: enum - 输入模式条件（可能值：not_gaze, not_gamepad, gamepad_and_not_gaze）
 * - ignore_input_scope: boolean - 是否忽略输入范围
 * - consume_event: boolean - 是否消耗事件
 * - handle_select: boolean - 是否处理选择事件
 * - handle_deselect: boolean - 是否处理取消选择事件
 * - button_up_right_of_first_refusal: boolean - 是否在首次拒绝后处理按钮释放事件
 */
export class ButtonMapping {
    ignored: boolean;
    from_button_id: string;
    to_button_id: string;
    mapping_type: string | null;
    scope: string | null;
    input_mode_condition: string | null;
    ignore_input_scope: boolean;
    consume_event: boolean;
    handle_select: boolean;
    handle_deselect: boolean;
    button_up_right_of_first_refusal: boolean;
    /**
     * 设置是否忽略映射。
     * @param {boolean} ignored - 是否忽略映射（默认值：false）
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setIgnored(ignored?: boolean): ButtonMapping;
    /**
     * 设置触发事件的按钮 ID。
     * @param {string} fromButtonId - 触发事件的按钮 ID
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setFromButtonId(fromButtonId: string): ButtonMapping;
    /**
     * 设置事件触发时执行的按钮 ID。
     * @param {string} toButtonId - 事件触发时执行的按钮 ID
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setToButtonId(toButtonId: string): ButtonMapping;
    /**
     * 设置映射类型。
     * @param {string} mappingType - 映射类型（可能值：global, pressed, double_pressed, focused）
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setMappingType(mappingType: string): ButtonMapping;
    /**
     * 设置映射范围。
     * @param {string} scope - 映射范围（可能值：view, controller）
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setScope(scope: string): ButtonMapping;
    /**
     * 设置输入模式条件。
     * @param {string} condition - 输入模式条件（可能值：not_gaze, not_gamepad, gamepad_and_not_gaze）
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setInputModeCondition(condition: string): ButtonMapping;
    /**
     * 设置是否忽略输入范围。
     * @param {boolean} ignore - 是否忽略输入范围
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setIgnoreInputScope(ignore?: boolean): ButtonMapping;
    /**
     * 设置是否消耗事件。
     * @param {boolean} consume - 是否消耗事件
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setConsumeEvent(consume?: boolean): ButtonMapping;
    /**
     * 设置是否处理选择事件。
     * @param {boolean} handle - 是否处理选择事件
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setHandleSelect(handle?: boolean): ButtonMapping;
    /**
     * 设置是否处理取消选择事件。
     * @param {boolean} handle - 是否处理取消选择事件
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setHandleDeselect(handle?: boolean): ButtonMapping;
    /**
     * 设置是否在首次拒绝后处理按钮释放事件。
     * @param {boolean} handle - 是否处理按钮释放事件
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setButtonUpRightOfFirstRefusal(handle?: boolean): ButtonMapping;
}
