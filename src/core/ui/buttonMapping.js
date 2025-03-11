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
    constructor() {
        this.ignored = false;
        this.from_button_id = '';
        this.to_button_id = '';
        this.mapping_type = null;
        this.scope = null;
        this.input_mode_condition = null;
        this.ignore_input_scope = false;
        this.consume_event = false;
        this.handle_select = false;
        this.handle_deselect = false;
        this.button_up_right_of_first_refusal = false;
    }

    /**
     * 设置是否忽略映射。
     * @param {boolean} ignored - 是否忽略映射（默认值：false）
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setIgnored(ignored = false) {
        this.ignored = ignored;
        return this;
    }

    /**
     * 设置触发事件的按钮 ID。
     * @param {string} fromButtonId - 触发事件的按钮 ID
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setFromButtonId(fromButtonId) {
        this.from_button_id = fromButtonId;
        return this;
    }

    /**
     * 设置事件触发时执行的按钮 ID。
     * @param {string} toButtonId - 事件触发时执行的按钮 ID
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setToButtonId(toButtonId) {
        this.to_button_id = toButtonId;
        return this;
    }

    /**
     * 设置映射类型。
     * @param {string} mappingType - 映射类型（可能值：global, pressed, double_pressed, focused）
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setMappingType(mappingType) {
        this.mapping_type = mappingType;
        return this;
    }

    /**
     * 设置映射范围。
     * @param {string} scope - 映射范围（可能值：view, controller）
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setScope(scope) {
        this.scope = scope;
        return this;
    }

    /**
     * 设置输入模式条件。
     * @param {string} condition - 输入模式条件（可能值：not_gaze, not_gamepad, gamepad_and_not_gaze）
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setInputModeCondition(condition) {
        this.input_mode_condition = condition;
        return this;
    }

    /**
     * 设置是否忽略输入范围。
     * @param {boolean} ignore - 是否忽略输入范围
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setIgnoreInputScope(ignore = false) {
        this.ignore_input_scope = ignore;
        return this;
    }

    /**
     * 设置是否消耗事件。
     * @param {boolean} consume - 是否消耗事件
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setConsumeEvent(consume = false) {
        this.consume_event = consume;
        return this;
    }

    /**
     * 设置是否处理选择事件。
     * @param {boolean} handle - 是否处理选择事件
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setHandleSelect(handle = false) {
        this.handle_select = handle;
        return this;
    }

    /**
     * 设置是否处理取消选择事件。
     * @param {boolean} handle - 是否处理取消选择事件
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setHandleDeselect(handle = false) {
        this.handle_deselect = handle;
        return this;
    }

    /**
     * 设置是否在首次拒绝后处理按钮释放事件。
     * @param {boolean} handle - 是否处理按钮释放事件
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setButtonUpRightOfFirstRefusal(handle = false) {
        this.button_up_right_of_first_refusal = handle;
        return this;
    }
}