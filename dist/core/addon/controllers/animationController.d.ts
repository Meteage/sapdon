export class AddonAnimationController {
    constructor(format_version: any, definition: any);
    format_version: any;
    definition: any;
    toJson(): {
        format_version: any;
        animation_controllers: any;
    };
}
export class AddonAnimationStateMachine {
    constructor(identifier: any);
    identifier: any;
    namespace: any;
    name: any;
    initialState: string | null;
    states: Map<any, any>;
    /**
     * 设置状态机的初始状态。
     * @param {string} stateName - 初始状态的名称。
     * @returns {AddonAnimationStateMachine} - 返回实例以支持链式调用。
     */
    setInitialState(stateName: string): AddonAnimationStateMachine;
    /**
     * 添加一个新状态到状态机。
     * @param {string} stateName - 状态的名称。
     * @param {string[]} animations - 该状态播放的动画列表。
     * @returns {AddonAnimationStateMachine} - 返回实例以支持链式调用。
     */
    addState(stateName: string, animations?: string[]): AddonAnimationStateMachine;
    /**
     * 添加一个状态之间的过渡条件。
     * @param {string} fromState - 过渡的起始状态名称。
     * @param {string} toState - 过渡的目标状态名称。
     * @param {string} condition - 触发过渡的条件（例如 "q.is_on_ground"）。
     * @returns {AddonAnimationStateMachine} - 返回实例以支持链式调用。
     */
    addTransition(fromState: string, toState: string, condition: string): AddonAnimationStateMachine;
    /**
     * 将整个状态机转换为 JSON 兼容的对象。
     * @returns {object} - 包含格式版本的完整动画控制器定义。
     */
    toJson(): object;
}
