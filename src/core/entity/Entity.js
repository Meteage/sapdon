import { BasicEntity } from "./BasicEntity.js";
import { ClientEntity } from "./ClientEntity.js";

export class Entity {
    /**
     * 
     * @param {*} identifier 
     * @param {*} texture 
     * @param {*} behData 
     * @param {*} resData 
     * @param {*} options 
     */
    constructor(identifier, texture, behData, resData, options = {}) {
        // 创建行为实体和客户端实体
        this.identifier = identifier;
        this.entity = new BasicEntity(identifier, options, behData);
        this.client_entity = new ClientEntity(identifier, resData).addTexture("default", texture);
    }
}