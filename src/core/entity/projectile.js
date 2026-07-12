import { NativeEntity } from "./nativeEntity.js";

export class Projectile extends NativeEntity{
    constructor(identifier, texture_path, options = {}) {
        super(identifier, "minecraft:snowball",  options);
        this.resource.addTexture("default",texture_path);
    }
}