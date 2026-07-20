import { BasicBlock } from "./basicBlock.js";
import { BlockComponent } from "./blockComponent.js";

export class GlassBlock extends BasicBlock {
    constructor(identifier, category, texture, options = {}) {
        super(identifier, category, [texture, texture, texture, texture, texture, texture], options);

        const { geometry, culling } = options;

        const components = [
            BlockComponent.setLightDampening(0),
            BlockComponent.setDestructibleByMiningCustom(0.3),
            BlockComponent.setDestructibleByExplosionCustom(0.3),
            BlockComponent.setMaterialInstances({
                "down": { texture, render_method: "blend" },
                "up": { texture, render_method: "blend" },
                "north": { texture, render_method: "blend" },
                "east": { texture, render_method: "blend" },
                "south": { texture, render_method: "blend" },
                "west": { texture, render_method: "blend" }
            })
        ];

        if (geometry) {
            const geoOptions = {};
            if (culling) geoOptions.culling = culling;
            components.push(BlockComponent.setGeometry(geometry, geoOptions));
        }

        this.addComponent(BlockComponent.combineComponents(...components));
    }
}
