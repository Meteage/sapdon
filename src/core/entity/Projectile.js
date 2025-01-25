import { EntityComponent } from "./componets/EntityComponet.js";
import { NativeEntity } from "./NativeEntity.js";

export class Projectile extends NativeEntity{
    constructor(identifier, options = {}) {
        super(identifier,"minecraft:snowball", options);

        this.addComponent(
            EntityComponent.combineComponents(
                EntityComponent.setPhysics(true, true),
                EntityComponent.setPushable(true, true),
                EntityComponent.setCollisionBox(0.25, 0.25),
            )   
        );
    }
    toJson() {
       
        return super.toJson();
    }
}