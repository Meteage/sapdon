/**
 * ClientEntity 类，用于表示客户端实体。
 * 继承自 AddonClientEntityDescription，并扩展了实体的数据加载和 JSON 序列化功能。
 */
export class ClientEntity extends AddonClientEntityDescription {
    /**
     * 构造函数，用于创建一个客户端实体实例。
     *
     * @param {string} identifier - 实体的唯一标识符。
     * @param {Object} data - 实体的初始数据，默认为空对象。
     */
    constructor(identifier: string, data?: any);
    /**
     * 将当前实体实例转换为 JSON 格式。
     *
     * @returns {Object} - 表示实体的 JSON 对象。
     */
    toJson(): any;
}
import { AddonClientEntityDescription } from "../addon/entity/client_entity.js";
