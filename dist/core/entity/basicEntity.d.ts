export class BasicEntity {
    /**
     * 构造函数
     * @param {string} identifier - 实体的唯一标识符
     * @param {Object} options - 配置选项
     * @param {boolean} [options.is_spawnable=true] - 是否可生成
     * @param {boolean} [options.is_summonable=true] - 是否可召唤
     * @param {string} [options.runtime_identifier] - 复刻标识符
     * @param {Object} data - 继承的数据
     * @param {Object} [data.components={}] - 继承的组件
     * @param {Object} [data.component_groups={}] - 继承的组件组
     * @param {Object} [data.events={}] - 继承的事件
     */
    constructor(identifier: string, options?: {
        is_spawnable?: boolean | undefined;
        is_summonable?: boolean | undefined;
        runtime_identifier?: string | undefined;
    }, data?: {
        components?: Object | undefined;
        component_groups?: Object | undefined;
        events?: Object | undefined;
    });
    identifier: string;
    is_spawnable: boolean;
    is_summonable: boolean;
    runtime_identifier: string | undefined;
    properties: Map<string, any>;
    components: Map<string, any>;
    component_groups: Map<string, any>;
    events: Map<string, any>;
    /**
     * 添加属性到实体
     * @param {string} name 属性名称
     * @param {Object} value 属性值
     * @returns
     */
    addProperty(name: string, value: Object): this;
    /**
     * 移除属性
     * @param {string} name 属性名称
     * @returns
     */
    removeProperty(name: string): this;
    /**
     * 移除所有属性
     * @returns
     */
    clearProperties(): this;
    /**
     * 添加事件到实体
     * @param {string} name - 事件名称
     * @param {Map} eventMap - 事件的键值对 Map
     * @returns {BasicEntity} - 返回当前实例以支持链式调用
     */
    addEvent(name: string, eventMap: Map<any, any>): BasicEntity;
    /**
     * 删除事件
     * @param {string} name - 事件名称
     * @returns {BasicEntity} - 返回当前实例以支持链式调用
     */
    removeEvent(name: string): BasicEntity;
    /**
     * 清除所有事件
     * @returns {BasicEntity} - 返回当前实例以支持链式调用
     */
    clearEvents(): BasicEntity;
    /**
     * 添加组件组到实体
     * @param {string} name - 组件组名称
     * @param {Map} componentMap - 组件组的键值对 Map
     * @returns {BasicEntity} - 返回当前实例以支持链式调用
     */
    addComponentGroup(name: string, componentMap: Map<any, any>): BasicEntity;
    /**
     * 删除组件组
     * @param {string} name - 组件组名称
     * @returns {BasicEntity} - 返回当前实例以支持链式调用
     */
    removeComponentGroup(name: string): BasicEntity;
    /**
     * 清除所有组件组
     * @returns {BasicEntity} - 返回当前实例以支持链式调用
     */
    clearComponentGroups(): BasicEntity;
    /**
     * 添加组件到实体
     * @param {Map} componentMap - 组件的键值对 Map
     * @returns {BasicEntity} - 返回当前实例以支持链式调用
     */
    addComponent(componentMap: Map<any, any>): BasicEntity;
    /**
     * 删除组件
     * @param {string} key - 组件名称
     * @returns {BasicEntity} - 返回当前实例以支持链式调用
     */
    removeComponent(key: string): BasicEntity;
    /**
     * 清除所有组件
     * @returns {BasicEntity} - 返回当前实例以支持链式调用
     */
    clearComponents(): BasicEntity;
    /**
     * 清除所有数据
     */
    clearAll(): this;
    /**
     * 将实体转换为 JSON 格式
     * @returns {Object} - 返回 JSON 格式的实体数据
     */
    toJson(): Object;
}
