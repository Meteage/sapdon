import fs from "node:fs";
import path from "node:path";
import { BlockAPI, BlockComponent, ItemAPI, ItemCategory, ItemComponent, registry, Label, Text, Image, Sprite, StackPanel } from '@sapdon/core'
import { BlockWire } from "./lib/wire.js";

// === item_group 分割 ===
const GROUP_SOURCE = "sapdon:itemGroup.name.source"; // 电源/信号源
const GROUP_GATE = "sapdon:itemGroup.name.gate";     // 逻辑门
const GROUP_BUS = "sapdon:itemGroup.name.bus";       // 位宽总线
const GROUP_PORT = "sapdon:itemGroup.name.port";     // 端口
const GROUP_CHIP = "sapdon:itemGroup.name.chip";     // 可编程芯片
const GROUP_TOOL = "sapdon:itemGroup.name.tool";     // 工具

const wire = new BlockWire("sapdon:wire","construction",[{stateTag:0,textures:["wire"]}], { group: GROUP_SOURCE });

const onSignal = BlockAPI.createBlock("sapdon:on_signal","construction",[{stateTag:0,textures:["on"]}], { group: GROUP_SOURCE })
onSignal.addComponent(BlockComponent.setTags(["signal_source"]))

const offSignal = BlockAPI.createBlock("sapdon:off_signal","construction",[{stateTag:0,textures:["off"]}], { group: GROUP_SOURCE })
offSignal.addComponent(BlockComponent.setTags(["signal_source"]))

const andGate = BlockAPI.createRotatableBlock("sapdon:and_gate","construction",["and","default","output","input","input","input"], { group: GROUP_GATE });

const orGate = BlockAPI.createRotatableBlock("sapdon:or_gate","construction",["or","default","output","input","input","input"], { group: GROUP_GATE });

const notGate = BlockAPI.createRotatableBlock("sapdon:not_gate","construction",["not","default","output","input","default","default"], { group: GROUP_GATE });

const chip = BlockAPI.createRotatableBlock("sapdon:chip","construction",["chip-unload","default","default","default","input","output"], { group: GROUP_CHIP });
chip.registerState("sapdon:loaded", [0,1])
chip.addPermutation("q.block_state('sapdon:loaded') == 1", BlockComponent.setMaterialInstances({
    "up": { "texture": "chip" },
    "down": { "texture": "default" },
    "east": { "texture": "default" },
    "west": { "texture": "default" },
    "south": { "texture": "input" },
    "north": { "texture": "output" }
}))

const splitter = BlockAPI.createRotatableBlock("sapdon:splitter","construction",["splitter","default","output","input","default","output"], { group: GROUP_BUS });

const merger = BlockAPI.createRotatableBlock("sapdon:merger","construction",["merger","default","output","input","input","default"], { group: GROUP_BUS });

// 1bit 寄存器：模型朝北时 北=W(写)、西=D(待写值)、东=Q(锁存输出)
const reg = BlockAPI.createRotatableBlock("sapdon:register","construction",["reg","default","output","input","default","input"], { group: GROUP_CHIP });

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

const display = BlockAPI.createBlock("sapdon:display","construction",[{stateTag:0,textures:["t0"]}], { group: GROUP_PORT })
display.registerState("sapdon:powered", [0,1])
display.addPermutation("q.block_state('sapdon:powered') == 0", BlockComponent.setMaterialInstances(facesTex("t0")))
display.addPermutation("q.block_state('sapdon:powered') == 1", BlockComponent.setMaterialInstances(facesTex("t1")))

const switchBlock = BlockAPI.createBlock("sapdon:switch","construction",[{stateTag:0,textures:["s0"]}], { group: GROUP_SOURCE })
switchBlock.registerState("sapdon:powered", [0,1])
switchBlock.addPermutation("q.block_state('sapdon:powered') == 0", BlockComponent.setMaterialInstances(facesTex("s0")))
switchBlock.addPermutation("q.block_state('sapdon:powered') == 1", BlockComponent.setMaterialInstances(facesTex("s1")))

// 端口贴图：保留 alpha_test（数字有透明留白），但关闭 face_dimming/ambient_occlusion=0 的自发光，
// 使终端不带"发光"效果、随环境光照正常明暗。
function portFacesTex(texture) {
    const instances = {};
    for (const side of ["*", "up", "down", "north", "south", "east", "west"]) {
        instances[side] = {
            texture,
            render_method: "alpha_test"
        };
    }
    return instances;
}

// 端口方块：单一方块 + sapdon:num 状态(0~9) 控制数字贴图，方块可旋转。
// 端口号由 debug_tool 点按循环切换（0→1→…→9→0）。
const inputPort = BlockAPI.createRotatableBlock("sapdon:input_port", "construction", Array(6).fill("input_port_0"), { group: GROUP_PORT });
inputPort.addComponent(BlockComponent.setTags(["input_port"]));
inputPort.registerState("sapdon:num", { values: { min: 0, max: 9 } });
for (let i = 1; i <= 9; i++) {
    inputPort.addPermutation(`q.block_state('sapdon:num') == ${i}`, BlockComponent.setMaterialInstances(portFacesTex(`input_port_${i}`)));
}

const outputPort = BlockAPI.createRotatableBlock("sapdon:output_port", "construction", Array(6).fill("output_port_0"), { group: GROUP_PORT });
outputPort.addComponent(BlockComponent.setTags(["output_port"]));
outputPort.registerState("sapdon:num", { values: { min: 0, max: 9 } });
for (let i = 1; i <= 9; i++) {
    outputPort.addPermutation(`q.block_state('sapdon:num') == ${i}`, BlockComponent.setMaterialInstances(portFacesTex(`output_port_${i}`)));
}

ItemAPI.createItem("sapdon:debug_tool", ItemCategory.Equipment, "degtool", {
    maxStackSize: 1,
    group: GROUP_TOOL,
    formatVersion: "1.21.90",
}).addComponent(
    ItemComponent.combineComponents(
        ItemComponent.setDisplayName("Debug Tool"),
        ItemComponent.setHandEquipped(true),
        ItemComponent.setCustomComponents(["sapdon:debug_tool"])
    )
)

ItemAPI.createItem("sapdon:logic_tool", ItemCategory.Equipment, "chipitem", {
    maxStackSize: 64,
    group: GROUP_TOOL,
    formatVersion: "1.21.90",
}).addComponent(
    ItemComponent.combineComponents(
        ItemComponent.setDisplayName("电路存储芯片"),
        ItemComponent.setCustomComponents(["sapdon:logic_tool"])
    )
)

ItemAPI.createItem("sapdon:wire_item", ItemCategory.Construction, "wireitem", {
    maxStackSize: 64,
    group: GROUP_SOURCE,
    formatVersion: "1.21.90",
}).addComponent(
    ItemComponent.setBlockPlacer("sapdon:wire")
)


// === 创造菜单物品分类（group + item_catalog）===
const inputPorts = ["sapdon:input_port"];
const outputPorts = ["sapdon:output_port"];

ItemAPI.createItemCatalog()
    .addGroup("construction", [
        "sapdon:wire",
        "sapdon:on_signal",
        "sapdon:off_signal",
        "sapdon:switch",
    ], { icon: "sapdon:switch", name: GROUP_SOURCE })
    .addGroup("construction", [
        "sapdon:and_gate",
        "sapdon:or_gate",
        "sapdon:not_gate",
    ], { icon: "sapdon:and_gate", name: GROUP_GATE })
    .addGroup("construction", [
        "sapdon:splitter",
        "sapdon:merger",
    ], { icon: "sapdon:splitter", name: GROUP_BUS })
    .addGroup("construction", [
        ...inputPorts,
        ...outputPorts,
        "sapdon:display",
    ], { icon: "sapdon:input_port", name: GROUP_PORT })
    .addGroup("construction", [
        "sapdon:chip",
        "sapdon:register",
    ], { icon: "sapdon:chip", name: GROUP_CHIP })
    .addGroup("equipment", [
        "sapdon:debug_tool",
        "sapdon:logic_tool",
    ], { icon: "sapdon:logic_tool", name: GROUP_TOOL })
    .register()

registry.submit()
