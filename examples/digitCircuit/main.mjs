import fs from "node:fs";
import path from "node:path";
import { BlockAPI, BlockComponent, ItemAPI, ItemCategory, ItemComponent, registry, NeoGuidebook, NeoGuidebookPage, Label, Text, Image, Sprite, StackPanel } from '@sapdon/core'
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
    .addBookTitleBar("digitCircuit使用指导手册 \n       by Meteage", ["100%", "18%"])
    .addEmptySpace(["100%", "4%"])
    .addBookText("Minecraft 基岩版数字电路 Addon。\n\n涵盖：导线、逻辑门、位宽总线、可编\n\n程芯片、寄存器。", ["100%", "46%"])

const toc = new NeoGuidebookPage("toc")
    .addChapters([
        { chapter_name: "方块总览", chapter_texture: "textures/items/iron_ingot" },
        { chapter_name: "工具与门朝向", chapter_texture: "textures/items/stick" },
        { chapter_name: "电路搭建", chapter_texture: "textures/items/brick" },
        { chapter_name: "可编程芯片", chapter_texture: "textures/items/repeater" },
        { chapter_name: "命令与分享", chapter_texture: "textures/items/writable_book" },
        { chapter_name: "位宽与寄存器", chapter_texture: "textures/items/redstone" },
    ])
    .buildChapterList()

guidebook.addDoublePageStack("page_index0", cover.getPanel(), toc.getPanel())

// === 方块总览分类页（子目录）：右=5 个子分类列表 ===
const blocksNavLeft = new NeoGuidebookPage("blocksNavLeft")
    .addEmptySpace(["100%", "4%"])
    .addCategoryTitle("方块总览", ["100%", "12%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "点右侧分类，\n看图标、逻辑、\n各面出/入语义。",
        ["100%", "70%"]
    )

const blocksNavRight = new NeoGuidebookPage("blocksNavRight")
    .addChapters([
        { chapter_name: "信号源", chapter_texture: "textures/blocks/on" },
        { chapter_name: "逻辑门", chapter_texture: "textures/blocks/and" },
        { chapter_name: "Bus 分线/合并", chapter_texture: "textures/blocks/splitter" },
        { chapter_name: "可编程芯片", chapter_texture: "textures/blocks/chip-unload" },
        { chapter_name: "端口与显示", chapter_texture: "textures/blocks/input_port_1" },
    ])
    .buildChapterList("sub")

guidebook.addDoublePageStack("page_index1", blocksNavLeft.getPanel(), blocksNavRight.getPanel())

// list 单行：图标 + 名字 + 一句话（静态展示，不跳转）
function iconRow(tex, name, desc) {
    return new StackPanel(undefined, undefined)
        .setOrientation("horizontal")
        .addStack(["16%", "100%"],
            new Image("icon", undefined)
                .setSprite(new Sprite().setTexture(`textures/blocks/${tex}`))
        )
        .addStack(["84%", "100%"],
            new Label("row_text", undefined)
                .setText(new Text()
                    .setText(`${name}\n${desc}`)
                    .setColor([0, 0, 0])
                    .setTextAlignment("left")
                )
        )
}

// === 子分类页：左=list 图标+名字+一句话，右=面朝向说明（返回用 prev）===
function makeSubCategory(pageId, title, rows, faces) {
    const left = new NeoGuidebookPage(pageId + "L")
        .addEmptySpace(["100%", "3%"])
        .addCategoryTitle(title, ["100%", "10%"])
        .addDivider(["100%", "2%"])

    const rowH = rows.length > 3 ? 14 : 18
    rows.forEach((r) => {
        left.addStack(["100%", `${rowH}%`], iconRow(r.tex, r.name, r.desc))
    })

    const right = new NeoGuidebookPage(pageId + "R")
        .addEmptySpace(["100%", "3%"])
        .addCategoryTitle("输入/输出面", ["100%", "10%"])
        .addDivider(["100%", "2%"])
        .addBookText(faces, ["100%", "70%"])

    guidebook.addDoublePageStack(pageId, left.getPanel(), right.getPanel())
}

// 信号源（on/off/switch/wire）
makeSubCategory("page_source", "信号源", [
    { tex: "on", name: "on_signal", desc: "恒输出 1" },
    { tex: "off", name: "off_signal", desc: "恒输出 0" },
    { tex: "s0", name: "switch", desc: "点按切 0/1" },
    { tex: "wire", name: "wire", desc: "瞬时传 可分支" },
], "源/开关：所有面皆输出，\n任意面接导线即可。\n\nwire 无朝向，全向连通。")

// 逻辑门（and/or/not）
makeSubCategory("page_gate", "逻辑门", [
    { tex: "and", name: "and_gate", desc: "全 1 出 1" },
    { tex: "or", name: "or_gate", desc: "任一 1 出 1" },
    { tex: "not", name: "not_gate", desc: "取反" },
], "朝北(朝向0)：东=输出，\n西/南/北=输入。\n\nNOT 门输入面=西。\n\n旋转后输出面随动：\n北→东出，西→北出，\n南→西出，东→南出。")

// Bus（分线器/合并器）
makeSubCategory("page_bus", "Bus 分线/合并", [
    { tex: "splitter", name: "splitter", desc: "N位→1分出+N-1直通" },
    { tex: "merger", name: "merger", desc: "拼接+1位成N+1" },
], "splitter 朝北：\n西=输入，北=分出(1)，\n东=直通(N-1)。\n\nmerger 朝北：\n西=Nbit输入，南=+1，\n东=N+1输出。")

// 可编程芯片（chip/register）
makeSubCategory("page_chip", "可编程芯片", [
    { tex: "chip-unload", name: "chip(未装)", desc: "默认贴图" },
    { tex: "chip", name: "chip(已装)", desc: "装载逻辑后工作" },
    { tex: "reg", name: "register", desc: "1bit 电平锁存" },
], "chip 朝北：北=输出，\n南=输入(逐位分配)。\n\nregister 朝北：\n东=Q，西=D，北=W。")

// 端口与显示（input/output/display）
makeSubCategory("page_port", "端口与显示", [
    { tex: "input_port_1", name: "input_port", desc: "外部输入 1bit" },
    { tex: "output_port_1", name: "output_port", desc: "外部输出 1bit" },
    { tex: "t0", name: "display", desc: "有信号即亮" },
], "端口：透明透传，\n所有面皆输出。\n\n端口号 0~9：手持\ndebug_tool 点击循环\n切换，方块可旋转。\n\ndisplay：全面输入。")

// 工具与门朝向（双页）
const toolsLeft = new NeoGuidebookPage("toolsLeft")
    .addEmptySpace(["100%", "4%"])
    .addCategoryTitle("工具", ["100%", "12%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "debug_tool(木棍)：\n点开关→切换\n点导线→看网络\n点门→看各面\n点线块→换连接\n\nlogic_tool(铁锭)：\n点输入口=保存\n点 chip=装载",
        ["100%", "70%"]
    )

const toolsRight = new NeoGuidebookPage("toolsRight")
    .addEmptySpace(["100%", "4%"])
    .addCategoryTitle("门朝向约定", ["100%", "12%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "朝北(yaw=0)：\n东=输出\n西/南/北=输入\nNOT 输入面=西\n\n转后输出面：\n朝北→东 朝西→北\n朝南→西 朝东→南",
        ["100%", "80%"]
    )

guidebook.addDoublePageStack("page_index2", toolsLeft.getPanel(), toolsRight.getPanel())

// 电路搭建（双页）
const buildLeft = new NeoGuidebookPage("buildLeft")
    .addEmptySpace(["100%", "4%"])
    .addCategoryTitle("搭建步骤", ["100%", "12%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "① 布线：\n放导线/信号源/门\n导线按点击面自动连通\n② 接端口：\n每路输入/输出\n接 input/output_port\n③ 调试：\ndebug_tool 点击器件查看",
        ["100%", "80%"]
    )

const buildRight = new NeoGuidebookPage("buildRight")
    .addEmptySpace(["100%", "4%"])
    .addCategoryTitle("保存与装载", ["100%", "12%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "保存：手持 logic_tool\n点任意输入端口\n→自动编译\n→返还绑定工具\n\n装载：右键已绑定工具\n点 chip（南入北出）\n\n取回：潜行右键芯片",
        ["100%", "80%"]
    )

guidebook.addDoublePageStack("page_index3", buildLeft.getPanel(), buildRight.getPanel())

// 可编程芯片（双页）
const chipLeft = new NeoGuidebookPage("chipLeft")
    .addEmptySpace(["100%", "4%"])
    .addCategoryTitle("可编程芯片", ["100%", "12%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "未装载=chip-unload\n已装载=chip\n\n南面输入 逐位分配\n北面输出 outMask\n\n两种模式：\ntable(入≤8)：查表\ntopo(入>8)：存拓扑\n运行时仿真",
        ["100%", "80%"]
    )

const chipRight = new NeoGuidebookPage("chipRight")
    .addEmptySpace(["100%", "4%"])
    .addCategoryTitle("芯片端口约定", ["100%", "12%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "输入端(南面)：\n按记录逐位分配给各端子\n输出端(北面)：\n汇总为数值 outMask\n\n芯片输出=记录的输出位宽",
        ["100%", "80%"]
    )

guidebook.addDoublePageStack("page_index4", chipLeft.getPanel(), chipRight.getPanel())

// 命令与分享（双页）
const cmdLeft = new NeoGuidebookPage("cmdLeft")
    .addEmptySpace(["100%", "4%"])
    .addCategoryTitle("命令一览（上）", ["100%", "12%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "logic_list 列出记录\nlogic_info <ref> 查看\nlogic_test <ref><mask>\nlogic_dump [半径]\nlogic_log <on|off>\nlogic_export <ref>",
        ["100%", "80%"]
    )

const cmdRight = new NeoGuidebookPage("cmdRight")
    .addEmptySpace(["100%", "4%"])
    .addCategoryTitle("命令一览（下）", ["100%", "12%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "logic_stage <text> 暂存\nlogic_stage_clear 清\nlogic_import [name] 合并\nlogic_item <ref> 绑定\nlogic_clear <all|ref>\n\n分享流程见 README",
        ["100%", "80%"]
    )

guidebook.addDoublePageStack("page_index5", cmdLeft.getPanel(), cmdRight.getPanel())

// 位宽与寄存器（双页）
const busLeft = new NeoGuidebookPage("busLeft")
    .addEmptySpace(["100%", "4%"])
    .addCategoryTitle("位宽与数值语义", ["100%", "12%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "信号以网络为单位传播\nnet 携带位宽与数值\nnetValue=最大驱动值\n(>0 即通)\n\non/off/门/端口=1bit\n分线直通=输入宽-1\n分出=1\n合并=输入宽+1",
        ["100%", "80%"]
    )

const busRight = new NeoGuidebookPage("busRight")
    .addEmptySpace(["100%", "4%"])
    .addCategoryTitle("寄存器（1bit 锁存）", ["100%", "12%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "朝北时：\n北=W 写，西=D 待写\n东=Q 锁存输出\n\nW=1 → store=D\nW=0 → 保持\nQ≡store\n\n无自动 tick\n靠交互触发传播\nstore 随存档持久化",
        ["100%", "80%"]
    )

guidebook.addDoublePageStack("page_index6", busLeft.getPanel(), busRight.getPanel())

// 调试排障 + 示例（双页）
const debugLeft = new NeoGuidebookPage("debugLeft")
    .addEmptySpace(["100%", "4%"])
    .addCategoryTitle("调试与排障", ["100%", "12%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "logic_log on 开诊断\n(写 ContentLog*.txt)\ndebug_tool 点导线/门\n/分线器 看各面信号\n\n常见问题：\n· 门恒 0/1\n→ 未用面是否接常数\n· 芯片恒 0\n→ logic_info 查记录",
        ["100%", "80%"]
    )

guidebook.addSinglePageStack("page_index7", debugLeft.getPanel())

// 生成页面 id 清单 + 导航映射供运行时（构建器拼接 JS，因此输出 .js 而非 .json）
const pageIds = guidebook.getPageIds()
const ndx = (id) => pageIds.indexOf(id)

// 每页可点击跳转按钮：binding 键 -> 目标页
// 目录页(item_0..5)、方块总览分类页(sub_0..4)
const PAGE_NAV = {
    page_index0: [
        { key: "item_0_button", target: ndx("page_index1") }, // 方块总览 → 分类页
        { key: "item_1_button", target: ndx("page_index2") }, // 工具与门朝向
        { key: "item_2_button", target: ndx("page_index3") }, // 电路搭建
        { key: "item_3_button", target: ndx("page_index4") }, // 可编程芯片
        { key: "item_4_button", target: ndx("page_index5") }, // 命令与分享
        { key: "item_5_button", target: ndx("page_index6") }, // 位宽与寄存器
    ],
    page_index1: [
        { key: "sub_0_button", target: ndx("page_source") },
        { key: "sub_1_button", target: ndx("page_gate") },
        { key: "sub_2_button", target: ndx("page_bus") },
        { key: "sub_3_button", target: ndx("page_chip") },
        { key: "sub_4_button", target: ndx("page_port") },
    ],
}

// 子分类页的 prev 覆盖：prev 直接回方块总览分类页（而非线性前一页）
const subPages = ["page_source", "page_gate", "page_bus", "page_chip", "page_port"]
const PAGE_PREV = {}
subPages.forEach((id) => { PAGE_PREV[id] = ndx("page_index1") })

fs.writeFileSync(
    path.join(process.cwd(), "scripts", "guide_pages.js"),
    "export const PAGE_IDS = " + JSON.stringify(pageIds, null, 2) + ";\n" +
    "export const PAGE_NAV = " + JSON.stringify(PAGE_NAV, null, 2) + ";\n" +
    "export const PAGE_PREV = " + JSON.stringify(PAGE_PREV, null, 2) + ";\n"
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
        "sapdon:guidebook",
    ], { icon: "sapdon:logic_tool", name: GROUP_TOOL })
    .register()

registry.submit()
