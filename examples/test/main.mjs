import { BlockComponent } from "../../src/core/addon/component/blockComponent.js";
import { ItemComponent} from "../../src/core/addon/component/itemComponents.js";
import { BlockAPI } from "../../src/core/factory/BlockFactory.js";
import { ItemAPI } from "../../src/core/factory/ItemFactory.js";


ItemAPI.createItem("sapdon:test_item","items","masterball")
       .addComponent(
            ItemComponent.combineComponents(
                ItemComponent.setDisplayName("大师球"),
                ItemComponent.setMaxStackSize(16),
                ItemComponent.setUseModifiers(0.9,1),
                ItemComponent.setFoodComponent(true,1,1,"minecraft:stick")
            )
       );

ItemAPI.createFood("sapdon:test_food","items","masterball")

BlockAPI.createBlock("sapdon:block", "construction", [
    { stateTag: 1, textures: ["garlic_stage_0"] },
    { stateTag: 2, textures: ["garlic_stage_1"] },
    { stateTag: 3, textures: ["garlic_stage_2"] },
    { stateTag: 4, textures: ["garlic_stage_3"] },
], {
    ambient_occlusion: true,
    face_dimming: true,
    render_method: "alpha_test"
}).addComponent(BlockComponent.setGeometry("geometry.crop"))

const block = BlockAPI.createBasicBlock("sapdon:test_block","construction",
    [
        "compass_block_up",
        "compass_block_down",
        "compass_block_east",
        "compass_block_west",
        "compass_block_south",
        "compass_block_north",
    ]
);
