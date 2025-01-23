import { AddonEntity, AddonEntityDefinition, AddonEntityDescription } from "../addon/entity/entity.js";

export class BasicEntity {
    /**
     * 构造函数
     * @param {string} identifier - 实体的唯一标识符
     * @param {Object} options - 配置选项
     * @param {boolean} [options.is_spawnable=true] - 是否可生成
     * @param {boolean} [options.is_summonable=true] - 是否可召唤
     * @param {string} [options.runtime_identifier] - 复刻标识符
     */
    constructor(identifier, options = {}) {
        const { is_spawnable = true, is_summonable = true } = options;

        // 参数验证
        if (typeof identifier !== 'string' || !identifier) {
            throw new Error('identifier must be a non-empty string.');
        }
        if (options.runtime_identifier && typeof options.runtime_identifier !== 'string') {
            throw new Error('runtime_identifier must be a string.');
        }

        this.identifier = identifier;
        this.is_spawnable = is_spawnable;
        this.is_summonable = is_summonable;
        this.runtime_identifier = options.runtime_identifier;
        this.components = new Map();
    }

    /**
     * 添加组件到实体
     * @param {Map} componentMap - 组件键值对的 Map 对象
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
     * 将实体转换为 JSON 格式
     * @returns {AddonEntity} - 返回 AddonEntity 实例
     */
    toJson() {
        return new AddonEntity(
            "1.16.0",
            new AddonEntityDefinition(
                new AddonEntityDescription(
                    this.identifier,
                    this.is_spawnable,
                    this.is_summonable,
                    this.runtime_identifier
                ),
                Object.fromEntries(this.components)
            )
        ).toJson();
    }
}