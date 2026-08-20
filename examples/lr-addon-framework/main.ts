// ===== lr-addon-framework :: main.ts（声明式方块/物品，构建时由 sapdon CLI 执行）====
// 仅声明（不 import @minecraft/server / 不 import 运行时引擎），供构建生成 dev/ JSON。
// 两部分：电力系统块（wire/gen/solar/furnace/battery）+ 流体系统块（pipe/pump/tank/valve）。

import { BlockAPI, BlockComponent, ItemAPI, ItemCategory, ItemComponent, registry } from '@sapdon/core'

const GROUP_P = "lrf:group.name.power"; // 电力
const GROUP_F = "lrf:group.name.fluid"; // 流体

function facesTex(texture: string) {
    const m: Record<string, any> = {};
    for (const s of ["*", "up", "down", "north", "south", "east", "west"]) m[s] = { texture, ambient_occlusion: 0, face_dimming: false, render_method: "alpha_test" };
    return m;
}

// 连接块助手：6 面 connect 状态（引擎 writeConnectors 写回）+ 激活状态（powered/filled）发光贴图
function connectorBlock(id: string, offTex: string, onTex: string, activeState: string, group: string) {
    const b = BlockAPI.createBlock(id, "construction", [{ stateTag: 0, textures: [offTex] }], { group } as any);
    for (const s of ["north", "south", "east", "west", "up", "down"]) b.registerState(`lrf:connect:${s}`, [0, 1]);
    b.registerState(activeState, [0, 1]);
    b.addPermutation(`q.block_state('${activeState}') == 0`, BlockComponent.setMaterialInstances(facesTex(offTex)));
    b.addPermutation(`q.block_state('${activeState}') == 1`, BlockComponent.setMaterialInstances(facesTex(onTex)));
    return b;
}
// 设备块助手：可带 0/1 开关态换贴图
function deviceBlock(id: string, baseTex: string, onTex: string | null, stateName: string, group: string) {
    const b = BlockAPI.createBlock(id, "construction", [{ stateTag: 0, textures: [baseTex] }], { group } as any);
    if (onTex && stateName) {
        b.registerState(stateName, [0, 1]);
        b.addPermutation(`q.block_state('${stateName}') == 1`, BlockComponent.setMaterialInstances(facesTex(onTex)));
    }
    return b;
}

// ============ 电力系统 ============
const wire = connectorBlock("lrf:wire", "wire_off", "wire_on", "lrf:powered", GROUP_P);
const coalGen = deviceBlock("lrf:coal_gen", "gen_off", "gen_burn", "lrf:burning", GROUP_P);
const solar = deviceBlock("lrf:solar", "solar", null, "", GROUP_P);
const furnace = deviceBlock("lrf:furnace", "furn_off", "furn_on", "lrf:powered", GROUP_P);
const battery = BlockAPI.createBlock("lrf:battery", "construction", [{ stateTag: 0, textures: ["batt_on"] }], { group: GROUP_P } as any);
battery.registerState("lrf:level", Array.from({ length: 16 }, (_, i) => i));
battery.addPermutation("q.block_state('lrf:level') == 0", BlockComponent.setMaterialInstances(facesTex("batt_off")));

// ============ 流体系统 ============
const pipe = connectorBlock("lrf:pipe", "pipe_glass", "glass", "lrf:filled", GROUP_F);
const pump = deviceBlock("lrf:pump", "glass", "relay_on", "lrf:pump_on", GROUP_F);
const tank = deviceBlock("lrf:tank", "pipe_glass", null, "", GROUP_F);
const valve = deviceBlock("lrf:valve", "relay_off", "relay_on", "lrf:valve_on", GROUP_F);

// ============ 物品（仅连接块可放置；设备走创造面板/命令）============
ItemAPI.createItem("lrf:wire_item", ItemCategory.Construction, "wire", { maxStackSize: 64, group: GROUP_P, formatVersion: "1.21.90" })
    .addComponent(ItemComponent.setBlockPlacer("lrf:wire"));
ItemAPI.createItem("lrf:pipe_item", ItemCategory.Construction, "pipe", { maxStackSize: 64, group: GROUP_F, formatVersion: "1.21.90" })
    .addComponent(ItemComponent.setBlockPlacer("lrf:pipe"));

ItemAPI.createItemCatalog()
    .addGroup("construction", ["lrf:wire_item"], { icon: "lrf:wire_item", name: GROUP_P })
    .addGroup("construction", ["lrf:pipe_item"], { icon: "lrf:pipe_item", name: GROUP_F })
    .register();

registry.submit()