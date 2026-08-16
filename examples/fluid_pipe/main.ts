import { BlockAPI, BlockComponent, ItemAPI, ItemCategory, ItemComponent, registry, FlipbookTextures } from '@sapdon/core'
import { BlockPipe } from './lib/pipe.js'

const GROUP_FLUID = "fluid_pipe:itemGroup.name.fluid"; // 管道/泵/罐/阀门
const GROUP_TOOLS = "fluid_pipe:itemGroup.name.tools"; // 扳手

function facesTex(texture: string) {
    const instances: Record<string, any> = {};
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

// === 流体管道（几何按面引用命名材质：外层玻璃 "pipe"、内层水 "fluid"）===
const pipe = new BlockPipe("fluid_pipe:fluid_pipe", "construction", { group: GROUP_FLUID } as any);

// === 泵（可旋转：顶面=输出口、底面=输入口，侧面=机身）===
function pumpFaces(body: string) {
    const f = facesTex(body);
    f.up = facesTex("output").up;
    f.down = facesTex("input").down;
    return f;
}

const pump = BlockAPI.createRotatableBlock("fluid_pipe:pump", "construction", ["output", "input", "off", "off", "off", "off"], { group: GROUP_FLUID } as any);
pump.registerState("fluid_pipe:on", [0, 1]);
// 覆盖基础材质（补 render_method alpha_test）+ 顶=输出/底=输入指示
pump.addComponent(BlockComponent.setMaterialInstances(pumpFaces("off")));
pump.addPermutation("q.block_state('fluid_pipe:on') == 1", BlockComponent.setMaterialInstances(pumpFaces("on")));

// === 储液罐（fluid_tank_v2 模型：整块玻璃 16³ + 状态 n → n×15×15 水体；仅顶面可连管道）===
function tankMaterial(texture: string) {
    return { texture, ambient_occlusion: 0, face_dimming: false, render_method: "blend" };
}

const tank = BlockAPI.createGeometryBlock("fluid_pipe:tank", "construction", "geometry.fluid_tank_v2", {
    "*": tankMaterial("glass"),
    // 灰色流动纹理 + 游戏 tint_method:water 接口染色（按生物群系水色）
    water: { texture: "tank_water", tint_method: "water", ambient_occlusion: 0, face_dimming: false, render_method: "blend" },
}, { group: GROUP_FLUID } as any);
tank.registerState("fluid_pipe:level", Array.from({ length: 16 }, (_, i) => i));

// 覆盖几何（fluid_tank_v2：状态 n → 单块 n×15×15 水体，同刻只显一块）
const tankBoneVis: Record<string, string> = {};
for (let n = 1; n <= 15; n++) {
    tankBoneVis[`w${n}`] = `q.block_state('fluid_pipe:level') == ${n}`;
}
tank.addComponent(
    BlockComponent.combineComponents(
        BlockComponent.setGeometry("geometry.fluid_tank_v2", { bone_visibility: tankBoneVis })
    )
);

// === 单方向阀门（可旋转：放置时玩家可转，西/东为自身参考系；扳手只切顶面箭头 →=开/↑=关，与三通同款统一箭头，方块朝向不动）===
function valveFaces(top: string) {
    const f = facesTex("v_body");
    f.up = facesTex(top).up;
    f.east = facesTex("output").east;
    f.west = facesTex("input").west;
    return f;
}

const valve = BlockAPI.createRotatableBlock("fluid_pipe:valve", "construction", ["v3t_east", "v_body", "output", "input", "v_body", "v_body"], { group: GROUP_FLUID } as any);
valve.registerState("fluid_pipe:open", [1, 0]);
valve.addComponent(BlockComponent.setMaterialInstances(valveFaces("v3t_east")));
valve.addPermutation("q.block_state('fluid_pipe:open') == 0", BlockComponent.setMaterialInstances(valveFaces("v3t_north")));

// === 三通阀（自身参考系：西=输入，北/东/南=输出口（三面恒显 output 符号）；dir∈{east,south,west,north} 指示当前输出方向，dir=west 指向输入=全关；顶面单箭头指示）===
const v3Dirs = ["east", "south", "west", "north"];
const v3Faces: Record<string, Record<string, string>> = {
    east: { up: "v3t_east", down: "off", east: "output", west: "input", south: "output", north: "output" },
    south: { up: "v3t_south", down: "off", east: "output", west: "input", south: "output", north: "output" },
    west: { up: "v3t_west", down: "off", east: "output", west: "input", south: "output", north: "output" },
    north: { up: "v3t_north", down: "off", east: "output", west: "input", south: "output", north: "output" },
};

function v3Mi(faces: Record<string, string>) {
    const mi: Record<string, any> = {};
    for (const side of ["up", "down", "east", "west", "south", "north"]) {
        mi[side] = { texture: faces[side], ambient_occlusion: 0, face_dimming: false, render_method: "alpha_test" };
    }
    return mi;
}

const valve3 = BlockAPI.createRotatableBlock("fluid_pipe:valve3", "construction", ["v3t_east", "off", "output", "input", "output", "output"], { group: GROUP_FLUID } as any);
valve3.registerState("fluid_pipe:dir", ["east", "south", "west", "north"]);
// 基础材质 = 默认 dir=east 配置（东=输出口），保证默认状态正确显示 output 贴图
valve3.addComponent(BlockComponent.setMaterialInstances(v3Mi(v3Faces.east)));
for (const d of v3Dirs) {
    valve3.addPermutation(`q.block_state('fluid_pipe:dir') == '${d}'`, BlockComponent.setMaterialInstances(v3Mi(v3Faces[d])));
}

// === 物品（仅管道 + 扳手；泵/罐/阀门块保留定义，通过命令使用）===
ItemAPI.createItem("fluid_pipe:pipe_item", ItemCategory.Items, "pipeitem", {
    maxStackSize: 64,
    group: GROUP_FLUID,
    formatVersion: "1.21.90",
}).addComponent(
    ItemComponent.setBlockPlacer("fluid_pipe:fluid_pipe")
)

// === 管道扳手：点阀门切换开/关、点泵切换运行/停止、点管道查看段诊断 ===
ItemAPI.createItem("fluid_pipe:wrench", ItemCategory.Equipment, "wrench", {
    maxStackSize: 1,
    group: GROUP_TOOLS,
    formatVersion: "1.21.90",
}).addComponent(
    ItemComponent.combineComponents(
        ItemComponent.setDisplayName("管道扳手"),
        ItemComponent.setHandEquipped(true),
        ItemComponent.setCustomComponents(["fluid_pipe:wrench"])
    )
)

// === 管道内水翻书（water_flow_grey 灰色流动纹理 32 帧，游戏 tint_method:water 染色）===
FlipbookTextures.registerFlipbookTexture("fluid_water", "textures/blocks/fluid_water", 2);
// === 储液罐水翻书（water_still_grey 灰色静水纹理 32 帧，游戏 tint_method:water 染色）===
FlipbookTextures.registerFlipbookTexture("tank_water", "textures/blocks/tank_water", 2);

// === 创造菜单物品分类 ===
ItemAPI.createItemCatalog()
    .addGroup("items", [
        "fluid_pipe:fluid_pipe",
    ], { icon: "fluid_pipe:fluid_pipe", name: GROUP_FLUID })
    .addGroup("equipment", [
        "fluid_pipe:wrench",
    ], { icon: "fluid_pipe:wrench", name: GROUP_TOOLS })
    .register()

registry.submit()
