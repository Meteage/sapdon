import fs from "node:fs";
import path from "node:path";
import { BlockAPI, BlockComponent, ItemAPI, ItemCategory, ItemComponent, registry, NeoGuidebook, NeoGuidebookPage } from '@sapdon/core'
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

// 端口方块：0-9 数字标记，可旋转（朝向对应数字，便于组合出多数字端口号）
const PORT_DIGITS = Array.from({ length: 10 }, (_, i) => i);
for (const i of PORT_DIGITS) {
    const tex = [`input_port_${i}`, `input_port_${i}`, `input_port_${i}`, `input_port_${i}`, `input_port_${i}`, `input_port_${i}`];
    const inputPort = BlockAPI.createRotatableBlock(`sapdon:input_port_${i}`, "construction", tex, { group: GROUP_PORT });
    inputPort.addComponent(BlockComponent.setTags(["input_port"]));
    const outTex = [`output_port_${i}`, `output_port_${i}`, `output_port_${i}`, `output_port_${i}`, `output_port_${i}`, `output_port_${i}`];
    const outputPort = BlockAPI.createRotatableBlock(`sapdon:output_port_${i}`, "construction", outTex, { group: GROUP_PORT });
    outputPort.addComponent(BlockComponent.setTags(["output_port"]));
}

ItemAPI.createItem("sapdon:debug_tool", ItemCategory.Equipment, "stick", {
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

ItemAPI.createItem("sapdon:logic_tool", ItemCategory.Equipment, "iron_ingot", {
    maxStackSize: 64,
    group: GROUP_TOOL,
    formatVersion: "1.21.90",
}).addComponent(
    ItemComponent.combineComponents(
        ItemComponent.setDisplayName("电路存储芯片"),
        ItemComponent.setCustomComponents(["sapdon:logic_tool"])
    )
)

// === 游戏内指导手册（sapdon:guidebook）===
ItemAPI.createItem("sapdon:guidebook", ItemCategory.Equipment, "book_writable", {
    maxStackSize: 1,
    group: GROUP_TOOL,
    formatVersion: "1.21.90",
}).addComponent(
    ItemComponent.combineComponents(
        ItemComponent.setDisplayName("digitCircuit 指导手册"),
        ItemComponent.setInteractButton("打开手册"),
        ItemComponent.setHandEquipped(true),
        ItemComponent.setCustomComponents(["sapdon:guidebook"])
    )
)

const guidebook = new NeoGuidebook("sapdon:guidebook", "ui/", [320, 207], {
    debug: false,
    buttons: { prev: { visible: true }, next: { visible: true }, home: { visible: true }, close: { visible: true } },
    textures: {
        homeDefault: "textures/ui/book_shiftleft_default",
        homeHover: "textures/ui/book_shiftleft_hover",
        homePressed: "textures/ui/book_shiftleft_pressed",
    },
})

// 封面（左）+ 目录（右）
const cover = new NeoGuidebookPage("cover")
    .addEmptySpace(["100%", "8%"])
    .addBookTitleBar("digitCircuit\n    使用指导手册", ["100%", "18%"])
    .addEmptySpace(["100%", "4%"])
    .addBookText("Minecraft 基岩版数字电路 Addon（sapdon 框架示例）。\n\n涵盖：导线、逻辑门、位宽总线、可编程芯片、寄存器。", ["100%", "46%"])

const toc = new NeoGuidebookPage("toc")
    .addChapters([
        { chapter_name: "方块总览", chapter_texture: "textures/items/iron_ingot" },
        { chapter_name: "工具与门朝向", chapter_texture: "textures/items/stick" },
        { chapter_name: "电路搭建", chapter_texture: "textures/items/brick" },
        { chapter_name: "可编程芯片", chapter_texture: "textures/items/repeater" },
        { chapter_name: "命令与分享", chapter_texture: "textures/items/writable_book" },
        { chapter_name: "位宽与寄存器", chapter_texture: "textures/items/redstone" },
        { chapter_name: "调试排障", chapter_texture: "textures/items/iron_pickaxe" },
        { chapter_name: "示例：4 位全加器", chapter_texture: "textures/items/redstone_torch_on" },
    ])
    .buildChapterList()

guidebook.addDoublePageStack("page_index0", cover.getPanel(), toc.getPanel())

// 方块总览（双页）
const blocksLeft = new NeoGuidebookPage("blocksLeft")
    .addEmptySpace(["100%", "4%"])
    .addCategoryTitle("方块总览（上）", ["100%", "12%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "信号源：on_signal（恒1） / off_signal（恒0）\n开关：switch（可切换 0/1）\n导线：wire（瞬时传播、可分支）\n\n逻辑门：and_gate / or_gate / not_gate（可旋转）\n\n显示：display（有信号即亮）",
        ["100%", "70%"]
    )

const blocksRight = new NeoGuidebookPage("blocksRight")
    .addEmptySpace(["100%", "4%"])
    .addCategoryTitle("方块总览（下）", ["100%", "12%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "位宽：splitter（分线） / merger（合并）\n\n寄存器：register（1bit 电平锁存）\n\n可编程芯片：chip（装载逻辑后工作）\n\n端口：input_port_0~9 / output_port_0~9（可旋转组合多位端口号）",
        ["100%", "70%"]
    )

guidebook.addDoublePageStack("page_index1", blocksLeft.getPanel(), blocksRight.getPanel())

// 工具与门朝向（双页）
const toolsLeft = new NeoGuidebookPage("toolsLeft")
    .addEmptySpace(["100%", "4%"])
    .addCategoryTitle("工具", ["100%", "12%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "debug_tool（木棍）：点击开关切换、点击导线查看网络、点击门查看各面信号、点击线/方块间切换连接面。\n\nlogic_tool（铁锭）：点输入端口=保存逻辑；点芯片=装载逻辑。",
        ["100%", "70%"]
    )

const toolsRight = new NeoGuidebookPage("toolsRight")
    .addEmptySpace(["100%", "4%"])
    .addCategoryTitle("门朝向约定", ["100%", "12%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "门模型朝北（yaw=0）时：东=输出，其余三个水平面=输入；NOT 门输入面=西。\n\n输出面 east 随旋转变化：朝北东出、朝西北出、朝南西出、朝东南出。",
        ["100%", "70%"]
    )

guidebook.addDoublePageStack("page_index2", toolsLeft.getPanel(), toolsRight.getPanel())

// 电路搭建（双页）
const buildLeft = new NeoGuidebookPage("buildLeft")
    .addEmptySpace(["100%", "4%"])
    .addCategoryTitle("搭建步骤", ["100%", "12%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "① 布线：放导线/信号源/门，导线按点击面自动连通。\n② 接端口：每路外部输入/输出接 input_port_* / output_port_*。\n③ 调试：debug_tool 点击各器件看信号。",
        ["100%", "70%"]
    )

const buildRight = new NeoGuidebookPage("buildRight")
    .addEmptySpace(["100%", "4%"])
    .addCategoryTitle("保存与装载", ["100%", "12%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "保存：手持 logic_tool 点任意输入端口 → 自动编译 → 返还绑定 uuid 的工具。\n\n装载：右键已绑定 logic_tool 点 chip（南=输入，北=输出）。\n\n取回：潜行右键已加载芯片。",
        ["100%", "70%"]
    )

guidebook.addDoublePageStack("page_index3", buildLeft.getPanel(), buildRight.getPanel())

// 可编程芯片（双页）
const chipLeft = new NeoGuidebookPage("chipLeft")
    .addEmptySpace(["100%", "4%"])
    .addCategoryTitle("可编程芯片", ["100%", "12%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "未加载贴图 chip-unload，已加载 chip。\n\n南面输入逐位分配数值，北面输出汇总为 outMask。\n\n两种记录模式：\ntable（输入≤8）：真值表查表。\ntopo（输入>8）：直接存电路拓扑，运行时仿真，支持寄存器。",
        ["100%", "70%"]
    )

const chipRight = new NeoGuidebookPage("chipRight")
    .addEmptySpace(["100%", "4%"])
    .addCategoryTitle("芯片端口约定", ["100%", "12%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "输入端（南面）：按记录把数值逐位分配给各输入端子。\n输出端（北面）：汇总为数值 outMask。\n\n芯片输出 = 逻辑记录的输出位宽。",
        ["100%", "70%"]
    )

guidebook.addDoublePageStack("page_index4", chipLeft.getPanel(), chipRight.getPanel())

// 命令与分享（双页）
const cmdLeft = new NeoGuidebookPage("cmdLeft")
    .addEmptySpace(["100%", "4%"])
    .addCategoryTitle("命令一览（上）", ["100%", "12%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "logic_list：列出已保存逻辑\nlogic_info <ref>：查看真值表\nlogic_test <ref> <mask>：手动测试\nlogic_dump [radius]：转储电路状态\nlogic_log <on|off>：运行期诊断日志\nlogic_export <ref>：导出记录全文",
        ["100%", "70%"]
    )

const cmdRight = new NeoGuidebookPage("cmdRight")
    .addEmptySpace(["100%", "4%"])
    .addCategoryTitle("命令一览（下）", ["100%", "12%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "logic_stage <text>：分段粘贴导入内容\nlogic_stage_clear：清空暂存\nlogic_import [name]：合并为记录\nlogic_item <ref>：绑定到手持工具\nlogic_clear <all|ref>：删除记录\n\n分享流程见 README 第 6 节。",
        ["100%", "70%"]
    )

guidebook.addDoublePageStack("page_index5", cmdLeft.getPanel(), cmdRight.getPanel())

// 位宽与寄存器（双页）
const busLeft = new NeoGuidebookPage("busLeft")
    .addEmptySpace(["100%", "4%"])
    .addCategoryTitle("位宽与数值语义", ["100%", "12%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "信号以“网络（net）”为单位传播，net 携带位宽与数值。\nnetValue = 网络上所有驱动组件最大值（>0 视为通）。\n\non/off/switch/门/端口 = 1 bit；\n分线直通 = max(0, 输入位宽-1)，分出 = 1；\n合并输出 = 输入位宽+1。",
        ["100%", "70%"]
    )

const busRight = new NeoGuidebookPage("busRight")
    .addEmptySpace(["100%", "4%"])
    .addCategoryTitle("寄存器（1bit 锁存）", ["100%", "12%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "朝北时：北=W（写）、西=D（待写值）、东=Q（锁存输出）。\n\nW=1 → 写 store=D；W=0 → 保持；Q≡store。\n\n无自动 tick，靠开关等交互触发传播推进；store 随电路保存/加载持久化。",
        ["100%", "70%"]
    )

guidebook.addDoublePageStack("page_index6", busLeft.getPanel(), busRight.getPanel())

// 调试排障 + 示例（双页）
const debugLeft = new NeoGuidebookPage("debugLeft")
    .addEmptySpace(["100%", "4%"])
    .addCategoryTitle("调试与排障", ["100%", "12%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "logic_log on 开启 [rt] 运行期日志（写 ContentLog*.txt）。\ndebug_tool 点击导线/门/分线器查看各面信号。\n\n常见问题：\n· 门恒 0/1 → 检查未用面是否接常数。\n· 芯片恒 0 → 用 logic_info 确认记录存在。",
        ["100%", "70%"]
    )

const exRight = new NeoGuidebookPage("exRight")
    .addEmptySpace(["100%", "4%"])
    .addCategoryTitle("示例：4 位全加器", ["100%", "12%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "tools/ 下含完整记录 JSON + 导入指令 + 生成器。\n\n接口：in = A | (B<<4)\nout = S | (Cout<<4)\n\nmode=topo 行波进位，含进位输出。",
        ["100%", "70%"]
    )

guidebook.addDoublePageStack("page_index7", debugLeft.getPanel(), exRight.getPanel())

// 生成页面 id 清单供运行时导航（构建器拼接 JS，因此输出 .js 而非 .json）
const pageIds = guidebook.getPageIds()
fs.writeFileSync(
    path.join(process.cwd(), "scripts", "guide_pages.js"),
    "export const PAGE_IDS = " + JSON.stringify(pageIds, null, 2) + ";\n"
)

// === 创造菜单物品分类（group + item_catalog）===
const inputPorts = [];
for (let i = 0; i <= 9; i++) inputPorts.push(`sapdon:input_port_${i}`);
const outputPorts = [];
for (let i = 0; i <= 9; i++) outputPorts.push(`sapdon:output_port_${i}`);

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
    ], { icon: "sapdon:input_port_1", name: GROUP_PORT })
    .addGroup("construction", [
        "sapdon:chip",
        "sapdon:register",
    ], { icon: "sapdon:chip", name: GROUP_CHIP })
    .addGroup("equipment", [
        "sapdon:debug_tool",
        "sapdon:logic_tool",
        "sapdon:guidebook",
    ], { icon: "sapdon:logic_tool", name: GROUP_TOOL })
    .register()

registry.submit()
