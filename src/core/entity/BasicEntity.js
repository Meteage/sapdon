import { AddonEntity, AddonEntityDefinition, AddonEntityDescription } from "../addon/entity/entity";

export class BasicEntity {
    constructor(identifier, options = {}) {
        const { is_spawnable = true, is_summonable = true } = options;
        this.identifier = identifier;
        this.is_spawnable = is_spawnable;
        this.is_summonable = is_summonable;
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
                    this.is_summonable
                ),
                Object.fromEntries(this.components)
            )
        );
    }
}