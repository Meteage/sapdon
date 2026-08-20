import { BlockComponent, BlockAPI } from '@sapdon/core';

const SIDES = ["north", "south", "east", "west", "up", "down"];

function facesTex(texture: string) {
    const instances: Record<string, any> = {};
    for (const side of ["*", "up", "down", "north", "south", "east", "west"]) {
        instances[side] = { texture, ambient_occlusion: 0, face_dimming: false, render_method: "blend" };
    }
    return instances;
}

// 电力电线：geometry.wire（32x32，与 digitCircuit 同一套连接管几何）
// 6 面 wire_connect:* 手臂 + power_grid:powered 供电发光（换发光材质）。
// 连通性由引擎按正交相邻自动判断，并把结果写回 wire_connect 状态驱动骨显隐。
export class BlockWire {
    block: any;

    constructor(identifier: string, category: string, options: any = {}) {
        // 基础形态 = 未通电（暗色 wire_off）；通电时换发光 wire_on
        const block = BlockAPI.createBlock(identifier, category, [{ stateTag: 0, textures: ["wire_off"] }], options);

        // 连接手臂状态（骨显隐）
        const bone_visibility: Record<string, string> = {};
        for (const side of SIDES) {
            block.registerState(`wire_connect:${side}`, [0, 1]);
            bone_visibility[side] = `q.block_state('wire_connect:${side}') == 1`;
        }
        // 供电发光状态
        block.registerState("power_grid:powered", [0, 1]);
        // 注：中心 core 骨不写进 bone_visibility → 默认始终显示（孤立导线也呈现一小段线芯）。

        // 碰撞/选择箱：枚举 6 方向连接组合，只在有臂的方向给箱体（与 geometry.wire 骨一致）
        for (let mask = 0; mask < 64; mask++) {
            const SIDES6 = ["north", "south", "east", "west", "up", "down"];
            const on: Record<string, boolean> = {};
            for (let i = 0; i < 6; i++) on[SIDES6[i]] = ((mask >> i) & 1) === 1;
            const cond = SIDES6.map((s) => `q.block_state('wire_connect:${s}') == ${on[s] ? 1 : 0}`).join(" && ");
            const o = (v: boolean) => (v ? 1 : 0);
            const origin = [-2 - 6 * o(on.east), 6 - 6 * o(on.down), -2 - 6 * o(on.north)];
            const size = [
                4 + 6 * o(on.east) + 6 * o(on.west),
                4 + 6 * o(on.down) + 6 * o(on.up),
                4 + 6 * o(on.north) + 6 * o(on.south),
            ];
            block.addPermutation(cond, new Map()
                .set("minecraft:selection_box", { origin, size })
                .set("minecraft:collision_box", { origin, size }));
        }

        block.addComponent(
            BlockComponent.combineComponents(
                BlockComponent.setGeometry('geometry.wire', { bone_visibility })
            )
        );

        // 未通电 → 暗色（不激活）；带电 → 发光材质（透传 all bones）
        block.addPermutation("q.block_state('power_grid:powered') == 0", BlockComponent.setMaterialInstances(facesTex("wire_off")));
        block.addPermutation("q.block_state('power_grid:powered') == 1", BlockComponent.setMaterialInstances(facesTex("wire_on")));

        this.block = block;
    }
}