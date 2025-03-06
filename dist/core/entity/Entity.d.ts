export class Entity {
    /**
     *
     * @param {*} identifier
     * @param {*} texture
     * @param {*} behData
     * @param {*} resData
     * @param {*} options
     */
    constructor(identifier: any, texture: any, behData: any, resData: any, options?: any);
    identifier: any;
    entity: BasicEntity;
    client_entity: import("../addon/entity/client_entity.js").AddonClientEntityDescription;
}
import { BasicEntity } from "./BasicEntity.js";
