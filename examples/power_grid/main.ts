import { BlockAPI, BlockComponent, ItemAPI, ItemCategory, ItemComponent, registry } from '@sapdon/core'
import { BlockWire } from './lib/wire.js'

const GROUP_SOURCE = "power_grid:itemGroup.name.source"; // 电线/发电机/太阳能
const GROUP_STORE = "power_grid:itemGroup.name.store";   // 电池（方块菜单分组）
const GROUP_LOAD = "power_grid:itemGroup.name.load";     // 熔炉（方块菜单分组）
const GROUP_CTRL = "power_grid:itemGroup.name.ctrl";     // 继电器/万用表

function facesTex(texture: string) {
    const instances: Record<string, any> = {};
    for (const side of ["*", "up", "down", "north", "south", "east", "west"]) {
        instances[side] = { texture, ambient_occlusion: 0, face_dimming: false, render_method: "alpha_test" };
    }
    return instances;
}

// === 电线 ===
const wire = new BlockWire("power_grid:wire", "construction", { group: GROUP_SOURCE } as any);

// === 燃煤发电机（不吃容器：点煤炭喂煤；burning 状态切发光贴图）===
const generator = BlockAPI.createBlock("power_grid:coal_generator", "construction", [{ stateTag: 0, textures: ["gen_off"] }], { group: GROUP_SOURCE } as any);
generator.registerState("power_grid:burning", [0, 1]);
generator.addPermutation("q.block_state('power_grid:burning') == 1", BlockComponent.setMaterialInstances(facesTex("gen_burn")));

// === 太阳能板（白天日照发电）===
const solar = BlockAPI.createBlock("power_grid:solar", "construction", [{ stateTag: 0, textures: ["solar"] }], { group: GROUP_SOURCE } as any);

// === 电力熔炉（点放原料；powered 状态切发光贴图）===
const furnace = BlockAPI.createBlock("power_grid:electric_furnace", "construction", [{ stateTag: 0, textures: ["furn_off"] }], { group: GROUP_LOAD } as any);
furnace.registerState("power_grid:powered", [0, 1]);
furnace.addPermutation("q.block_state('power_grid:powered') == 1", BlockComponent.setMaterialInstances(facesTex("furn_on")));

// === 电池（power_grid:level 0..15 存电量；level 0 显示空）===
const battery = BlockAPI.createBlock("power_grid:battery", "construction", [{ stateTag: 0, textures: ["batt_on"] }], { group: GROUP_STORE } as any);
battery.registerState("power_grid:level", Array.from({ length: 16 }, (_, i) => i));
battery.addPermutation("q.block_state('power_grid:level') == 0", BlockComponent.setMaterialInstances(facesTex("batt_off")));

// === 继电器（power_grid:on 通/断；power_grid:powered 供电发光状态）===
const relay = BlockAPI.createBlock("power_grid:relay", "construction", [{ stateTag: 0, textures: ["relay_off"] }], { group: GROUP_CTRL } as any);
relay.registerState("power_grid:on", [0, 1]);
relay.registerState("power_grid:powered", [0, 1]);
relay.addPermutation("q.block_state('power_grid:on') == 1", BlockComponent.setMaterialInstances(facesTex("relay_on")));

// === 物品 ===
ItemAPI.createItem("power_grid:wire_item", ItemCategory.Construction, "wire", {
    maxStackSize: 64,
    group: GROUP_SOURCE,
    formatVersion: "1.21.90",
}).addComponent(
    ItemComponent.setBlockPlacer("power_grid:wire")
)

const multimeter = ItemAPI.createItem("power_grid:multimeter", ItemCategory.Equipment, "multimeter", {
    maxStackSize: 1,
    group: GROUP_CTRL,
    formatVersion: "1.21.90",
});
multimeter.addComponent(
    ItemComponent.combineComponents(
        ItemComponent.setDisplayName("万用表"),
        ItemComponent.setHandEquipped(true),
        ItemComponent.setCustomComponents(["power_grid:multimeter"])
    )
);

// === 创造菜单物品分类（仅导线 + 工具；其余设备方块用创造面板/命令放置，不加物品）===
ItemAPI.createItemCatalog()
    .addGroup("construction", [
        "power_grid:wire_item",
    ], { icon: "power_grid:wire_item", name: GROUP_SOURCE })
    .addGroup("equipment", [
        "power_grid:multimeter",
    ], { icon: "power_grid:multimeter", name: GROUP_CTRL })
    .register()

registry.submit()