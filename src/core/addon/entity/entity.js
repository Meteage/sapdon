export class AddonEntity {
    /**
     * 实体类
     * @param {string} format_version 格式版本
     * @param {AddonEntityDefinition} definitions 实体定义
     */
    constructor(format_version, definitions) {
        this.format_version = format_version;
        this.definitions = definitions;
    }

    /**
     * 将对象转换为 JSON 格式
     * @returns {Object} JSON 对象
     */
    toJson() {
        return {
            format_version: this.format_version,
            ["minecraft:entity"]: this.definitions
        };
    }
}

export class AddonEntityDefinition {
    /**
     * 实体定义类
     * @param {AddonEntityDescription} description 实体描述
     * @param {Object} components 实体组件
     */
    constructor(description, components = {}) {
        this.description = description;
        this.components = components; // 修正拼写错误
    }
}

export class AddonEntityDescription {
    /**
     * 实体描述类
     * @param {string} identifier 实体标识符
     * @param {boolean} is_spawnable 是否可生成
     * @param {boolean} is_summonable 是否可召唤
     * @param {string} runtime_identifier 复刻标识符
     */
    constructor(identifier, is_spawnable = false, is_summonable = false, runtime_identifier) {
        this.identifier = identifier;
        this.is_spawnable = is_spawnable;
        this.is_summonable = is_summonable;
        this.runtime_identifier = runtime_identifier;
    }
}