import { BasicEntity } from "./basicEntity.js";
import { ClientEntity } from "./clientEntity.js";
export class Entity {
    constructor(identifier, texture, options = {}, behData, resData) {
        // 创建行为实体和客户端实体
        this.identifier = identifier;
        this.behavior = new BasicEntity(identifier, options, behData);
        this.resource = new ClientEntity(identifier, resData);
        this.resource.addTexture("default", texture);
    }
}
