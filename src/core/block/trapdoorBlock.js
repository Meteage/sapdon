import { BasicBlock } from "./basicBlock.js";
import { BlockComponent } from "./blockComponent.js";

export class TrapdoorBlock extends BasicBlock {
    constructor(identifier, category, texture, options = {}) {
        super(identifier, category, [texture, texture, texture, texture, texture, texture], options);

        this.registerState("sapdon:open", { values: [false, true] });

        this.registerTrait("minecraft:placement_direction", {
            enabled_states: ["minecraft:cardinal_direction"],
            y_rotation_offset: 180
        });
        this.registerTrait("minecraft:placement_position", {
            enabled_states: ["minecraft:vertical_half"]
        });

        this.addComponent(
            BlockComponent.combineComponents(
                BlockComponent.setGeometry("geometry.trapdoor"),
                BlockComponent.setDestructibleByMiningCustom(3),
                BlockComponent.setDestructibleByExplosionCustom(3),
                BlockComponent.setMaterialInstances({
                    "down": { texture, render_method: "blend" },
                    "up": { texture, render_method: "blend" },
                    "north": { texture, render_method: "blend" },
                    "east": { texture, render_method: "blend" },
                    "south": { texture, render_method: "blend" },
                    "west": { texture, render_method: "blend" }
                })
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
        const openStates = [false, true];

        for (const dir of directions) {
            for (const half of halves) {
                for (const open of openStates) {
                    const condition = `q.block_state('minecraft:vertical_half') == '${half}' && q.block_state('minecraft:cardinal_direction') == '${dir.name}' && q.block_state('sapdon:open') == ${open}`;

                    let collisionOrigin;
                    let collisionSize;

                    if (!open) {
                        const yPos = half === "top" ? 14 : 0;
                        collisionOrigin = [-8, yPos, -8];
                        collisionSize = [16, 2, 16];
                    } else {
                        switch (dir.name) {
                            case "north":
                                collisionOrigin = [-8, 0, -8];
                                collisionSize = [16, 16, 2];
                                break;
                            case "south":
                                collisionOrigin = [-8, 0, 6];
                                collisionSize = [16, 16, 2];
                                break;
                            case "east":
                                collisionOrigin = [6, 0, -8];
                                collisionSize = [2, 16, 16];
                                break;
                            case "west":
                                collisionOrigin = [-8, 0, -8];
                                collisionSize = [2, 16, 16];
                                break;
                        }
                    }

                    this.addPermutation(condition,
                        BlockComponent.combineComponents(
                            BlockComponent.setCollisionBoxCustom(collisionOrigin, collisionSize),
                            BlockComponent.setSelectionBoxCustom(collisionOrigin, collisionSize),
                            BlockComponent.setTransformation([0, 0, 0], [1, 1, 1], [0, 0, 0], dir.rotation)
                        )
                    );
                }
            }
        }
    }
}
