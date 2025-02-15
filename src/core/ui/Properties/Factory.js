/**
 * Factory 类
 * 
 * 该类表示一个工厂控件，用于管理子控件的名称和 ID。
 * 
 * 属性：
 * - control_name: string - 工厂的子控件名
 * - control_ids: object - 工厂的子控件 ID 对象组
 */

export class Factory {
    constructor() {
        
        /*
        this.control_name = '';
        this.control_ids = {};
        */
    }
    /**
     * 设置工厂的名。
     * @param {string} name - 名（格式：name）
     * @returns {Factory} 返回当前实例以支持链式调用
     */
    setName(name) {
        if(!this.factory) this.factory = {};
        this.factory.name = name;
        return this;
    }

    /**
     * 设置工厂的子控件名。
     * @param {string} name - 子控件名（格式：namespace.controls_name）
     * @returns {Factory} 返回当前实例以支持链式调用
     */
    setControlName(name) {
        if(!this.factory) this.factory = {};
        this.factory.control_name = name;
        return this;
    }

    /**
     * 设置工厂的子控件 ID 对象组。
     * @param {object} ids - 子控件 ID 对象组
     * @returns {Factory} 返回当前实例以支持链式调用
     */
    setControlIds(ids) {
        if(!this.factory) this.factory = {};
        this.factory.control_ids = ids;
        return this;
    }

    /**
     * 添加一个子控件 ID。
     * @param {string} key - 子控件的键名
     * @param {string} value - 子控件的 ID 值
     * @returns {Factory} 返回当前实例以支持链式调用
     */
    addControlId(key, value) {
        if(!this.factory) this.factory = {};
        this.factory.control_ids[key] = value;
        return this;
    }
}