import { BasicBlock } from "./basicBlock.js";
import { BlockComponent } from "./blockComponent.js";

export class FenceBlock extends BasicBlock {
    constructor(identifier, category, textures_arr, options = {}) {
        super(identifier, category, textures_arr, options);

        const { leashable } = options;

        const components = [
            BlockComponent.setGeometry("geometry.fence"),
            BlockComponent.setCollisionBoxCustom([-6, 0, -6], [12, 16, 12]),
            BlockComponent.setSelectionBoxCustom([-6, 0, -6], [12, 16, 12]),
            BlockComponent.setSupport("fence"),
            BlockComponent.setConnectionRule("all"),
            BlockComponent.setDestructibleByMiningCustom(2),
            BlockComponent.setDestructibleByExplosionCustom(3)
        ];

        if (leashable) {
            components.push(BlockComponent.setLeashable());
        }

        this.addComponent(BlockComponent.combineComponents(...components));
    }
}
