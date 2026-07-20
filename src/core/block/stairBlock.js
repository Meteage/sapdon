import { BasicBlock } from "./basicBlock.js";
import { BlockComponent } from "./blockComponent.js";

export class StairBlock extends BasicBlock {
    constructor(identifier, category, textures_arr, options = {}) {
        super(identifier, category, textures_arr, options);

        this.registerTrait("minecraft:placement_direction", {
            enabled_states: ["minecraft:cardinal_direction"],
            y_rotation_offset: 180
        });
        this.registerTrait("minecraft:placement_position", {
            enabled_states: ["minecraft:vertical_half"]
        });

        this.addComponent(
            BlockComponent.combineComponents(
                BlockComponent.setGeometry("geometry.stair"),
                BlockComponent.setDestructibleByMiningCustom(2),
                BlockComponent.setDestructibleByExplosionCustom(3),
                BlockComponent.setSupport("stair")
            )
        );

        this.#addPermutations();
    }

    #addPermutations() {
        const directions = [
            { name: "north", rotation: [0, 0, 0] },
            { name: "south", rotation: [0, 180, 0] },
            { name: "east",  rotation: [0, 90, 0] },
            { name: "west",  rotation: [0, -90, 0] }
        ];
        const halves = ["bottom", "top"];

        for (const dir of directions) {
            for (const half of halves) {
                const yOffset = half === "top" ? 8 : 0;
                const condition = `q.block_state('minecraft:vertical_half') == '${half}' && q.block_state('minecraft:cardinal_direction') == '${dir.name}'`;

                this.addPermutation(condition,
                    BlockComponent.combineComponents(
                        BlockComponent.setCollisionBoxCustom([-8, yOffset, -8], [16, 8, 16]),
                        BlockComponent.setSelectionBoxCustom([-8, yOffset, -8], [16, 8, 16]),
                        BlockComponent.setTransformation([0, 0, 0], [1, 1, 1], [0, 0, 0], dir.rotation)
                    )
                );
            }
        }
    }
}
