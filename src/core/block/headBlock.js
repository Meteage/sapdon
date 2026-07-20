import { BasicBlock } from "./basicBlock.js";
import { BlockComponent } from "./blockComponent.js";

export class HeadBlock extends BasicBlock {
    constructor(identifier, category, texture, options = {}) {
        super(identifier, category, [texture, texture, texture, texture, texture, texture], options);

        this.registerState("sapdon:head_rotation", { values: { min: 0, max: 15 } });

        this.registerTrait("minecraft:placement_position", {
            enabled_states: ["minecraft:block_face"]
        });

        const { tick_interval = [20, 20] } = options;

        const builtinComponents = ["sapdon:head_rotation"];
        const allCustomComponents = [
            ...builtinComponents,
            ...(options.custom_components || [])
        ];

        const components = [
            BlockComponent.setMaterialInstances({ "*": { texture: texture } }),
            BlockComponent.setGeometry("geometry.head", {
                bone_visibility: {
                    "0": "math.mod(q.block_state('sapdon:head_rotation'), 4) == 0",
                    "22.5": "math.mod(q.block_state('sapdon:head_rotation'), 4) == 1",
                    "45": "math.mod(q.block_state('sapdon:head_rotation'), 4) == 2",
                    "67.5": "math.mod(q.block_state('sapdon:head_rotation'), 4) == 3"
                }
            }),
            BlockComponent.setCollisionBoxCustom([-5, 0, -5], [10, 10, 10]),
            BlockComponent.setSelectionBoxCustom([-5, 0, -5], [10, 10, 10]),
            BlockComponent.setDestructibleByMiningCustom(1),
            BlockComponent.setDestructibleByExplosionCustom(1),
            BlockComponent.setPlacementFilter([
                { allowed_faces: ["up", "south", "north", "west", "east"] }
            ]),
            BlockComponent.setTick(tick_interval),
            BlockComponent.setCustomComponents(allCustomComponents)
        ];

        this.addComponent(BlockComponent.combineComponents(...components));

        this.#addRotationPermutations();
    }

    #addRotationPermutations() {
        this.addPermutation(
            "q.block_state('minecraft:block_face') == 'up'",
            new Map([["sapdon:intercardinal_orientation", { y_rotation_offset: 180 }]])
        );

        this.addPermutation(
            "q.block_state('sapdon:head_rotation') >= 0",
            BlockComponent.setTransformation([0, 0, 0], [1, 1, 1], [0, 0, 0], [0, 180, 0])
        ).addPermutation(
            "q.block_state('sapdon:head_rotation') >= 4",
            BlockComponent.setTransformation([0, 0, 0], [1, 1, 1], [0, 0, 0], [0, 90, 0])
        ).addPermutation(
            "q.block_state('sapdon:head_rotation') >= 8",
            BlockComponent.setTransformation([0, 0, 0], [1, 1, 1], [0, 0, 0], [0, 0, 0])
        ).addPermutation(
            "q.block_state('sapdon:head_rotation') >= 12",
            BlockComponent.setTransformation([0, 0, 0], [1, 1, 1], [0, 0, 0], [0, -90, 0])
        );

        this.addPermutation(
            "q.block_state('minecraft:block_face') == 'north'",
            BlockComponent.setTransformation([0, 0.25, 0.25], [1, 1, 1], [0, 0, 0], [0, 0, 0])
        ).addPermutation(
            "q.block_state('minecraft:block_face') == 'west'",
            BlockComponent.setTransformation([0.25, 0.25, 0], [1, 1, 1], [0, 0, 0], [0, 90, 0])
        ).addPermutation(
            "q.block_state('minecraft:block_face') == 'south'",
            BlockComponent.setTransformation([0, 0.25, -0.25], [1, 1, 1], [0, 0, 0], [0, 180, 0])
        ).addPermutation(
            "q.block_state('minecraft:block_face') == 'east'",
            BlockComponent.setTransformation([-0.25, 0.25, 0], [1, 1, 1], [0, 0, 0], [0, -90, 0])
        );
    }
}
