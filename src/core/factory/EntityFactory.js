import { BasicEntity } from "../entity/BasicEntity.js";
import { ClientEntity } from "../entity/ClientEntity.js";
import { Entity } from "../entity/Entity.js";
import { NativeEntity } from "../entity/NativeEntity.js";
import { Projectile } from "../entity/Projectile.js";
import { GRegistry } from "../GRegistry.js";

const registerEntity = (behData, resData) => {
    // 如果 behData 存在且不为空，则注册行为数据
    if (behData && Object.keys(behData).length > 0) {
        GRegistry.register(behData.identifier.replace(":", "_"), "behavior", "entities/", behData);
    }

    // 如果 resData 存在且不为空，则注册资源数据
    if (resData && Object.keys(resData).length > 0) {
        GRegistry.register(resData.identifier.replace(":", "_"), "resource", "entity/", resData);
    }
};

export const EntityAPI = {
    /**
     * 创建一个原生实体。
     * @param {string} identifier - 实体的唯一标识符。
     * @param {string} proto_id - 实体的原型 ID。
     * @param {string} texture - 实体的纹理。
     * @param {Object} options - 额外选项。
     * @returns {{ behavior: BasicEntity, resource: ClientEntity }} 包含行为数据和资源数据的对象。
     */
    createNativeEntity: function (identifier, proto_id, options = {}) {
        if (!identifier || !proto_id ) {
            throw new Error("必须提供 identifier、proto_id 和 texture。");
        }

        const nativeEntity = new NativeEntity(identifier, proto_id, options);
        registerEntity(nativeEntity.entity, nativeEntity.client_entity);
        return {
            behavior: nativeEntity.entity,
            resource: nativeEntity.client_entity,
        };
    },

    /**
     * 创建一个普通实体。
     * @param {string} identifier - 实体的唯一标识符。
     * @param {string} texture - 实体的纹理。
     * @param {Object} behData - 实体的行为数据。
     * @param {Object} resData - 实体的资源数据。
     * @param {Object} options - 额外选项。
     * @returns {{ behavior: BasicEntity, resource: ClientEntity }} 包含行为数据和资源数据的对象。
     */
    createEntity: function (identifier, texture, behData, resData, options = {}) {
        if (!identifier || !texture) {
            throw new Error("必须提供 identifier 和 texture。");
        }

        const entity = new Entity(identifier, texture, behData, resData, options);
        registerEntity(entity.entity, entity.client_entity);
        return {
            behavior: entity.entity,
            resource: entity.client_entity,
        };
    },

    /**
     * 创建一个投射物实体。
     * @param {string} identifier - 投射物的唯一标识符。
     * @param {string} texture - 投射物的纹理。
     * @param {Object} options - 额外选项。
     * @returns {{ behavior: BasicEntity, resource: ClientEntity }} 包含行为数据和资源数据的对象。
     */
    createProjectile: function (identifier, texture, options = {}) {
        if (!identifier || !texture) {
            throw new Error("必须提供 identifier 和 texture。");
        }

        const entity = new Projectile(identifier, texture, options);
        registerEntity(entity.entity, entity.client_entity);
        return {
            behavior: entity.entity,
            resource: entity.client_entity,
        };
    },
};