import { BasicEntity } from "./BasicEntity.js";
import { NativeEntityData } from "./data/NativeEntityData.js";

export class NativeEntity extends BasicEntity {
    constructor(identifier, proto_id, options = {}) {
        // 修复解构赋值，确保 options 被正确展开
        super(identifier, 
            { ...options, runtime_identifier: proto_id },
            NativeEntityData.getDataById('beh', proto_id)['minecraft:entity']
        );
    }
}

