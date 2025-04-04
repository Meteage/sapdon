export class AddonEntity {
    /**
     * 实体类
     * @param {string} format_version 格式版本
     * @param {AddonEntityDefinition} definitions 实体定义
     */
    constructor(format_version: string, definitions: AddonEntityDefinition);
    format_version: string;
    definitions: AddonEntityDefinition;
    /**
     * 将对象转换为 JSON 格式
     * @returns {Object} JSON 对象
     */
    toJson(): Object;
}
export class AddonEntityDefinition {
    /**
     * 实体定义类
     * @param {AddonEntityDescription} description 实体描述
     * @param {Object} components 实体组件
     */
    constructor(description: AddonEntityDescription, components?: Object, component_groups?: {}, events?: {});
    description: AddonEntityDescription;
    components: Object;
    component_groups: {};
    events: {};
}
export class AddonEntityDescription {
    /**
     * 实体描述类
     * @param {string} identifier 实体标识符
     * @param {boolean} is_spawnable 是否可生成
     * @param {boolean} is_summonable 是否可召唤
     * @param {string} runtime_identifier 复刻标识符
     */
    constructor(identifier: string, is_spawnable: boolean | undefined, is_summonable: boolean | undefined, properties: {} | undefined, runtime_identifier: string);
    identifier: string;
    is_spawnable: boolean;
    is_summonable: boolean;
    properties: {};
    runtime_identifier: string;
}
