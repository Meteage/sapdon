import { BasicEntity } from "./basicEntity.js";
import { ClientEntity } from "./clientEntity.js";

export class Entity {
    /**
     * 
     * @param {string} identifier 
     * @param {string} [texture] 
     * @param {any} [options] 
     * @param {any} [behData] 
     * @param {any} [resData] 
     */
    constructor(identifier, texture, options = {}, behData = {}, resData = {} ) {
        // 创建行为实体和客户端实体
        this.identifier = identifier;
        this.behavior = new BasicEntity(identifier, options, behData);
        this.resource = new ClientEntity(identifier, resData)
        
        if (texture) {
            this.resource.addTexture("default", texture);
        }
    }
}