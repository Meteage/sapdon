import { BasicEntity } from "./BasicEntity.js";
import { EntityComponent } from "./EntityComponet.js";

export class Projectile extends BasicEntity{
    constructor(identifier, options = {}) {
        super(identifier, options);

        this.runtime_identifier = "minecraft:snowball";

        this.addComponent(
            EntityComponent.combineComponents(
                EntityComponent.setPhysics(true, true),
                EntityComponent.setPushable(true, true),
                EntityComponent.setCollisionBox(0.25, 0.25),
            )   
        );
    }
    toJson() {
        this.addComponent(
            EntityComponent.setProjectile({
                "on_hit": {
                    "impact_damage": {
                      "filter": "blaze",
                      "damage": 3,
                      "knockback": true
                    },
                    "remove_on_hit": { },
                    "particle_on_hit": {
                      "particle_type": "snowballpoof",
                      "num_particles": 6,
                      "on_entity_hit": true,
                      "on_other_hit": true
                    }
                  },
                  "anchor": 1,
                  "power": 1.5,
                  "gravity": 0.03,
                  "angle_offset": 0.0,
                  "offset": [ 0, -0.1, 0 ]
            })
        );
        return super.toJson();
    }
}