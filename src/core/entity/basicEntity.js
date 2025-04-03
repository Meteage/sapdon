import { AddonEntity, AddonEntityDefinition, AddonEntityDescription } from "../addon/entity/entity.js";
import { Serializer, serialize } from "../../utils/index.js"

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
    constructor(identifier, options = {}, data = {}) {
        // 参数验证
        if (typeof identifier !== 'string' || !identifier) {
            throw new Error('identifier must be a non-empty string.');
        }
        if (options.runtime_identifier && typeof options.runtime_identifier !== 'string') {
            throw new Error('runtime_identifier must be a string.');
        }

        this.identifier = identifier;
        this.is_spawnable = options.is_spawnable ?? true;
        this.is_summonable = options.is_summonable ?? true;
        this.runtime_identifier = options.runtime_identifier;

        // 初始化 components、component_groups 和 events，确保 data 中的值为对象
        this.properties = data?.description?.properties ?? {};
        this.components = new Map(Object.entries(data.components ?? {}));
        this.component_groups = new Map(Object.entries(data.component_groups ?? {}));
        this.events = new Map(Object.entries(data.events ?? {}));
    }
    /**
     * 添加属性到实体
     * @param {string} name 属性名称
     * @param {Object} value 属性值
     * @returns 
     */
    addProperty(name, value) {
        this.properties[name] = value;
        return this;
    }
    /**
     * 移除属性
     * @param {string} name 属性名称
     * @returns 
     */
    removeProperty(name) {
        delete this.properties[name];
        return this;
    }
    /**
     * 移除所有属性
     * @returns 
     */
    clearProperties() {
        this.properties = {};
        return this;
    }

    /**
     * 添加事件到实体
     * @param {string} name - 事件名称
     * @param {Map} eventMap - 事件的键值对 Map
     * @returns {BasicEntity} - 返回当前实例以支持链式调用
     */
    addEvent(name, eventMap) {
        if (!(eventMap instanceof Map)) {
            throw new Error("eventMap must be an instance of Map.");
        }
        this.events.set(name, eventMap);
        return this;
    }

    /**
     * 删除事件
     * @param {string} name - 事件名称
     * @returns {BasicEntity} - 返回当前实例以支持链式调用
     */
    removeEvent(name) {
        this.events.delete(name);
        return this;
    }

    /**
     * 清除所有事件
     * @returns {BasicEntity} - 返回当前实例以支持链式调用
     */
    clearEvents() {
        this.events.clear();
        return this;
    }

    /**
     * 添加组件组到实体
     * @param {string} name - 组件组名称
     * @param {Map} componentMap - 组件组的键值对 Map
     * @returns {BasicEntity} - 返回当前实例以支持链式调用
     */
    addComponentGroup(name, componentMap) {
        if (!(componentMap instanceof Map)) {
            throw new Error("componentMap must be an instance of Map.");
        }
        this.component_groups.set(name, componentMap);
        return this;
    }

    /**
     * 删除组件组
     * @param {string} name - 组件组名称
     * @returns {BasicEntity} - 返回当前实例以支持链式调用
     */
    removeComponentGroup(name) {
        this.component_groups.delete(name);
        return this;
    }

    /**
     * 清除所有组件组
     * @returns {BasicEntity} - 返回当前实例以支持链式调用
     */
    clearComponentGroups() {
        this.component_groups.clear();
        return this;
    }

    /**
     * 添加组件到实体
     * @param {Map} componentMap - 组件的键值对 Map
     * @returns {BasicEntity} - 返回当前实例以支持链式调用
     */
    addComponent(componentMap) {
        if (!(componentMap instanceof Map)) {
            throw new Error("componentMap must be an instance of Map.");
        }

        for (const [key, value] of componentMap) {
            this.components.set(key, value);
        }
        return this; // 支持链式调用
    }

    /**
     * 删除组件
     * @param {string} key - 组件名称
     * @returns {BasicEntity} - 返回当前实例以支持链式调用
     */
    removeComponent(key) {
        this.components.delete(key);
        return this;
    }

    /**
     * 清除所有组件
     * @returns {BasicEntity} - 返回当前实例以支持链式调用
     */
    clearComponents() {
        this.components.clear();
        return this;
    }

    /**
     * 清除所有数据
     */
    clearAll() {
        this.components.clear();
        this.component_groups.clear();
        this.events.clear();
        return this;
    }

    /**
     * 将实体转换为 JSON 格式
     * @returns {Object} - 返回 JSON 格式的实体数据
     */
    @Serializer
    toObject() {
        return serialize(new AddonEntity(
            "1.16.0",
            new AddonEntityDefinition(
                new AddonEntityDescription(
                    this.identifier,
                    this.is_spawnable,
                    this.is_summonable,
                    this.properties,
                    this.runtime_identifier
                ),
                Object.fromEntries(this.components), // 将 Map 转换为普通对象
                Object.fromEntries(this.component_groups), // 将 Map 转换为普通对象
                Object.fromEntries(this.events) // 将 Map 转换为普通对象
            )
        ))
    }
}