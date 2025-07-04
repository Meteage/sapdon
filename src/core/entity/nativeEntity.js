import { BasicEntity } from "./basicEntity.js";
import { ClientEntity } from "./clientEntity.js";
import { NativeEntityData } from "./data/nativeEntityData.js";

export class NativeEntity {
    constructor(identifier, proto_id, options = {}) {
        try {
            // 获取行为数据
            const behData = NativeEntityData.getDataById("beh", proto_id)?.["minecraft:entity"];
            if (!behData) {
                
                throw new Error(`Behavior data not found for proto_id: ${proto_id}`);
            }

            // 获取资源数据
            const resData = NativeEntityData.getDataById("res", proto_id)?.["minecraft:client_entity"]?.["description"];
            if (!resData) {
                throw new Error(`Resource data not found for proto_id: ${proto_id}`);
            }
            options["runtime_identifier"] = proto_id;

            // 创建行为实体和客户端实体
            this.identifier = identifier;
            this.behavior = new BasicEntity(identifier, options, behData);
            this.resource = new ClientEntity(identifier, resData);
            
        } catch (error) {
            console.error(`Failed to create NativeEntity ${identifier}:`, error);
            throw error; // 抛出错误，避免继续执行
        }
    }
}