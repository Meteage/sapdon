import { BasicEntity } from "./BasicEntity.js";
import { NativeEntityData } from "./data/NativeEntityData.js";

export class NativeEntity extends BasicEntity {
    constructor(identifier, proto_id, options = {}) {
        // 修复解构赋值，确保 options 被正确展开
        super(identifier, { ...options, runtime_identifier: proto_id });

        // 获取实体数据
        const entityData = NativeEntityData.getDataById('beh', proto_id)['minecraft:entity'];
        console.log(entityData)
        if (!entityData) {
            throw new Error(`未找到 proto_id 对应的实体数据: ${proto_id}`);
        }

        // 将对象转换为 Map
        this.component_groups = objToMap(entityData.component_groups);
        this.components = objToMap(entityData.components);
        this.events = objToMap(entityData.events);
    }
}

// 将对象转换为 Map
export function objToMap(obj) {
    console.log(obj)
    if (typeof obj !== 'object' || obj === null) {
        return new Map();
    }

    const map = new Map();
    for (const key of Object.keys(obj)) {
        map.set(key, obj[key]);
    }
    return map;
}