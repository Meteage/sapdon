import { NativeEntity } from "./NativeEntity.js";
export class Projectile extends NativeEntity {
    constructor(identifier, texture_path, options = {}) {
        super(identifier, "minecraft:snowball", options);
        this.client_entity.addTexture("default", texture_path);
    }
}
