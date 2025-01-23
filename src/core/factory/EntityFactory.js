import { ClientEntity } from "../entity/ClientEntity.js";
import { Projectile } from "../entity/Projectile.js";
import { GRegistry } from "../registry.js"

export const EntityAPI = {
    registerEntity:function(entity){
        GRegistry.register(entity.identifier.replace(":", "_"), "behavior", "entities/", entity);
    },
    createProjectile:function(identifier,texture, options = {}){
        const entity = new Projectile(identifier,options);
        const client_enity = new ClientEntity(identifier)
        .addTexture("default",texture)
        .addMaterial("default","snowball")
        .addGeometry("default","geometry.item_sprite")
        .addRenderController("controller.render.item_sprite")
        .addAnimation("flying","animation.actor.billboard")
        .setScript( "animate", ["flying"])
        
        this.registerEntity(entity);
        GRegistry.register(client_enity.identifier.replace(":", "_"), "resource", "entity/", client_enity);
        return entity;
    }
}