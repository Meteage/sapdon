import { Serializer } from "@utils"

export class AddonAnimationController {
    constructor(format_version,definition){
        this.format_version = format_version;
        this.definition = definition;
    }
    @Serializer
    toObject(){
        return {
            format_version: this.format_version,
            ["animation_controllers"]: this.definition
        }
    }
}

export class AddonAnimationStateMachine {
    constructor(identifier) {
        this.identifier = identifier; // 状态机的唯一标识符（例如 "helicopter.blade"）
        this.namespace = identifier.split(":")[0]; // 标识符的命名空间部分（冒号前的部分）
        this.name = identifier.split(":")[1]; // 标识符的名称部分（冒号后的部分）

        // 状态机属性
        this.initialState = null; // 状态机的初始状态
        this.states = new Map(); // 使用 Map 存储所有状态，键为状态名，值为状态数据
    }

    /**
     * 设置状态机的初始状态。
     * @param {string} stateName - 初始状态的名称。
     * @returns {AddonAnimationStateMachine} - 返回实例以支持链式调用。
     */
    setInitialState(stateName) {
        this.initialState = stateName;
        return this; // 支持链式调用
    }

    /**
     * 添加一个新状态到状态机。
     * @param {string} stateName - 状态的名称。
     * @param {string[]} animations - 该状态播放的动画列表。
     * @returns {AddonAnimationStateMachine} - 返回实例以支持链式调用。
     */
    addState(stateName, animations = []) {
        this.states.set(stateName, {
            animations: animations, // 该状态的动画列表
            transitions: [] // 该状态的过渡条件列表
        });
        return this; // 支持链式调用
    }

    /**
     * 添加一个状态之间的过渡条件。
     * @param {string} fromState - 过渡的起始状态名称。
     * @param {string} toState - 过渡的目标状态名称。
     * @param {string} condition - 触发过渡的条件（例如 "q.is_on_ground"）。
     * @returns {AddonAnimationStateMachine} - 返回实例以支持链式调用。
     */
    addTransition(fromState, toState, condition) {
        if (!this.states.has(fromState)) {
            throw new Error(`状态 "${fromState}" 不存在。`);
        }
        const state = this.states.get(fromState);
        state.transitions.push({
            [toState]: condition // 添加过渡条件
        });
        return this; // 支持链式调用
    }

    /**
     * 将整个状态机转换为 JSON 兼容的对象。
     * @returns {object} - 包含格式版本的完整动画控制器定义。
     */
    @Serializer
    toObject() {
        return {
            [`controller.animation.${this.namespace}.${this.name}`]:{
                initial_state: this.initialState,
                states: Object.fromEntries(this.states)
            }
        };
    }
}