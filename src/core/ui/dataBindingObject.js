/**
 * DataBinding 类
 * 
 * 该类表示数据绑定配置，用于将硬编码值或变量绑定到元素属性。
 * 
 * 属性：
 * - ignored: boolean - 是否忽略绑定（默认值：false）
 * - binding_type: enum - 绑定类型（可能值：global, view, collection, collection_details, none）
 * - binding_name: string - 数据绑定名称或条件的值
 * - binding_name_override: string - 应用 binding_name 值的 UI 元素属性名称
 * - binding_collection_name: string - 要使用的集合名称
 * - binding_collection_prefix: string - 集合前缀
 * - binding_condition: enum - 数据绑定的条件（可能值：always, always_when_visible, visible, once, none, visibility_changed）
 * - source_control_name: string - 要观察其属性值的 UI 元素名称
 * - source_property_name: string - 存储 source_control_name 引用的 UI 元素的属性值
 * - target_property_name: string - 应用 source_property_name 值的 UI 元素属性
 * - resolve_sibling_scope: boolean - 是否允许选择同级元素而非子元素（默认值：false）
 */

export class DataBindingObject {
    constructor() {
        /*
        this.ignored = false;
        this.binding_type = null;
        this.binding_name = '';
        this.binding_name_override = '';
        this.binding_collection_name = '';
        this.binding_collection_prefix = '';
        this.binding_condition = null;
        this.source_control_name = '';
        this.source_property_name = '';
        this.target_property_name = '';
        this.resolve_sibling_scope = false;
        */
    }

    /**
     * 设置是否忽略绑定。
     * @param {boolean} ignored - 是否忽略绑定（默认值：false）
     * @returns {DataBindingObject} 返回当前实例以支持链式调用
     */
    setIgnored(ignored = false) {
        this.ignored = ignored;
        return this;
    }

    /**
     * 设置绑定类型。
     * @param {string} type - 绑定类型（可能值：global, view, collection, collection_details, none）
     * @returns {DataBindingObject} 返回当前实例以支持链式调用
     */
    setBindingType(type) {
        this.binding_type = type;
        return this;
    }

    /**
     * 设置数据绑定名称或条件的值。
     * @param {string} name - 数据绑定名称或条件的值
     * @returns {DataBindingObject} 返回当前实例以支持链式调用
     */
    setBindingName(name) {
        this.binding_name = name;
        return this;
    }

    /**
     * 设置应用 binding_name 值的 UI 元素属性名称。
     * @param {string} nameOverride - 应用 binding_name 值的 UI 元素属性名称
     * @returns {DataBindingObject} 返回当前实例以支持链式调用
     */
    setBindingNameOverride(nameOverride) {
        this.binding_name_override = nameOverride;
        return this;
    }

    /**
     * 设置要使用的集合名称。
     * @param {string} collectionName - 集合名称
     * @returns {DataBindingObject} 返回当前实例以支持链式调用
     */
    setBindingCollectionName(collectionName) {
        this.binding_collection_name = collectionName;
        return this;
    }

    /**
     * 设置集合前缀。
     * @param {string} prefix - 集合前缀
     * @returns {DataBindingObject} 返回当前实例以支持链式调用
     */
    setBindingCollectionPrefix(prefix) {
        this.binding_collection_prefix = prefix;
        return this;
    }

    /**
     * 设置数据绑定的条件。
     * @param {string} condition - 数据绑定的条件（可能值：always, always_when_visible, visible, once, none, visibility_changed）
     * @returns {DataBindingObject} 返回当前实例以支持链式调用
     */
    setBindingCondition(condition) {
        this.binding_condition = condition;
        return this;
    }

    /**
     * 设置要观察其属性值的 UI 元素名称。
     * @param {string} controlName - UI 元素名称
     * @returns {DataBindingObject} 返回当前实例以支持链式调用
     */
    setSourceControlName(controlName) {
        this.source_control_name = controlName;
        return this;
    }

    /**
     * 设置存储 source_control_name 引用的 UI 元素的属性值。
     * @param {string} propertyName - 属性名称
     * @returns {DataBindingObject} 返回当前实例以支持链式调用
     */
    setSourcePropertyName(propertyName) {
        this.source_property_name = propertyName;
        return this;
    }

    /**
     * 设置应用 source_property_name 值的 UI 元素属性。
     * @param {string} propertyName - 属性名称
     * @returns {DataBindingObject} 返回当前实例以支持链式调用
     */
    setTargetPropertyName(propertyName) {
        this.target_property_name = propertyName;
        return this;
    }

    /**
     * 设置是否允许选择同级元素而非子元素。
     * @param {boolean} resolve - 是否允许选择同级元素（默认值：false）
     * @returns {DataBindingObject} 返回当前实例以支持链式调用
     */
    setResolveSiblingScope(resolve = false) {
        this.resolve_sibling_scope = resolve;
        return this;
    }
}