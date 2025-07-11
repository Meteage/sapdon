import { AddonClientEntity, AddonClientEntityDefinition, AddonClientEntityDescription } from "../addon/entity/clientEntity.js";
import { Serializer, serialize } from "../../utils/index.js"

/**
 * ClientEntity 类，用于表示客户端实体。
 * 继承自 AddonClientEntityDescription，并扩展了实体的数据加载和 JSON 序列化功能。
 */
export class ClientEntity extends AddonClientEntityDescription {
    static entities = new Map()

    /**
     * @param {string} identifier 
     * @returns {ClientEntity}
     */
    static getEntity(identifier) {
        return this.entities.get(identifier)
    }

    /**
     * 构造函数，用于创建一个客户端实体实例。
     * 
     * @param {string} identifier - 实体的唯一标识符。
     * @param {Object} data - 实体的初始数据，默认为空对象。
     */
    constructor(identifier, data = {}) {
        // 调用父类构造函数，初始化实体的标识符
        super(identifier);

        // 遍历传入的数据对象，将属性赋值到当前实例
        const keys = Object.keys(data);
        keys.forEach((key) => {
            // 跳过 "identifier" 属性，因为已经在父类中处理
            if (key === "identifier") return;

            // 将数据对象的属性赋值到当前实例
            this[key] = data[key];
        });

        // 将当前实体实例存储到静态实体集合中
        ClientEntity.entities.set(this.identifier, this);
    }

    /**
     * 将当前实体实例转换为 JSON 格式。
     * 
     * @returns {Object} - 表示实体的 JSON 对象。
     */
    @Serializer
    toObject() {
        // 创建一个 AddonClientEntity 实例，包含实体定义和版本信息
        return serialize(new AddonClientEntity(
            "1.10.0", // 版本号
            new AddonClientEntityDefinition(this) // 实体定义
        ))
    }
}