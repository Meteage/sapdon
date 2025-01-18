import { AddonClientEntity } from "../entity/client_entity.js";

export class AddonAttachable extends AddonClientEntity{
      /**
     * 可附着物类 继承客户端实体
     * @param {string} format_version 格式版本
     * @param {AddonClientEntityDefinition} definitions 实体定义
     */
      constructor(format_version, definitions) {
        super(format_version, definitions);
    }

    /**
     * 将对象转换为 JSON 格式
     * @returns {Object} JSON 对象
     */
    toJson() {
        return {
            format_version: this.format_version,
            ["minecraft:attachable"]: this.definitions
        };
    }
}