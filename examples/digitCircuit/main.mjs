import { BlockAPI, BlockComponent, ItemAPI, ItemCategory, ItemComponent, registry } from '@sapdon/core'
import { BlockWire } from "./lib/wire.js";

const wire = new BlockWire("sapdon:wire","construction",[{stateTag:0,textures:["wire"]}]);

const onSignal = BlockAPI.createBlock("sapdon:on_signal","construction",[{stateTag:0,textures:["on"]}])
onSignal.addComponent(BlockComponent.setTags(["signal_source"]))

const offSignal = BlockAPI.createBlock("sapdon:off_signal","construction",[{stateTag:0,textures:["off"]}])
offSignal.addComponent(BlockComponent.setTags(["signal_source"]))

const andGate = BlockAPI.createRotatableBlock("sapdon:and_gate","construction",["and","default","output","input","input","input"]);

const orGate = BlockAPI.createRotatableBlock("sapdon:or_gate","construction",["or","default","output","input","input","input"]);

const notGate = BlockAPI.createRotatableBlock("sapdon:not_gate","construction",["not","default","output","input","default","default"]);

function facesTex(texture) {
    const instances = {};
    for (const side of ["*", "up", "down", "north", "south", "east", "west"]) {
        instances[side] = {
            texture,
            ambient_occlusion: 0,
            face_dimming: false,
            render_method: "alpha_test"
        };
    }
    return instances;
}

const display = BlockAPI.createBlock("sapdon:display","construction",[{stateTag:0,textures:["t0"]}])
display.registerState("sapdon:powered", [0,1])
display.addPermutation("q.block_state('sapdon:powered') == 0", BlockComponent.setMaterialInstances(facesTex("t0")))
display.addPermutation("q.block_state('sapdon:powered') == 1", BlockComponent.setMaterialInstances(facesTex("t1")))

const switchBlock = BlockAPI.createBlock("sapdon:switch","construction",[{stateTag:0,textures:["s0"]}])
switchBlock.registerState("sapdon:powered", [0,1])
switchBlock.addPermutation("q.block_state('sapdon:powered') == 0", BlockComponent.setMaterialInstances(facesTex("s0")))
switchBlock.addPermutation("q.block_state('sapdon:powered') == 1", BlockComponent.setMaterialInstances(facesTex("s1")))

ItemAPI.createItem("sapdon:debug_tool", ItemCategory.Equipment, "stick", {
    maxStackSize: 1,
    formatVersion: "1.21.90",
}).addComponent(
    ItemComponent.combineComponents(
        ItemComponent.setDisplayName("Debug Tool"),
        ItemComponent.setHandEquipped(true),
        ItemComponent.setCustomComponents(["sapdon:debug_tool"])
    )
)

registry.submit()
