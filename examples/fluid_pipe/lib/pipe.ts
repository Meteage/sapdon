import { BlockComponent, BlockAPI } from '@sapdon/core';

export const SIDES = ["north", "south", "east", "west", "up", "down"] as const;
export const CORE_STATE = "fluid_pipe:core";

function material(texture: string, renderMethod: string = "alpha_test", tint?: string) {
    const m: any = { texture, ambient_occlusion: 0, face_dimming: false, render_method: renderMethod };
    if (tint) m.tint_method = tint;
    return m;
}

// 流体管道方块：几何 fluid_pipe.geo.json 按面引用命名材质——
// 外层玻璃骨（pipe/up/north/...）= "pipe"（pipe_glass 玻璃），
// 内层水骨（flow/up2/...）= "fluid"（fluid_water 灰色流动纹理，游戏 tint_method:water 染色，翻书）。
// wiki 要求：同一方块的所有 material instance 必须用同一 render_method（混用 alpha_test+blend 时
// blend 被忽略，水按 alpha_test 裁剪 = 看起来不透明）。因此全部用 blend。
// 用 createGeometryBlock（无 variant permutation），材质实例直接生效。
export class BlockPipe {
    block: any;

    constructor(identifier: string, category: string, options: any = {}) {
        const block = BlockAPI.createGeometryBlock(identifier, category, "geometry.fluid_pipe", {
            "*": material("pipe_glass", "blend"),
            pipe: material("pipe_glass", "blend"),
            fluid: material("fluid_water", "blend", "water"),
        }, options);

        const bone_visibility: Record<string, string> = {};
        for (const side of SIDES) {
            block.registerState(`pipe_connect:${side}`, [0, 1]);
            bone_visibility[side] = `q.block_state('pipe_connect:${side}') == 1`;
            bone_visibility[`${side}2`] = `q.block_state('${CORE_STATE}') == 1 && q.block_state('pipe_connect:${side}') == 1`;
        }
        block.registerState(CORE_STATE, [0, 1]);
        bone_visibility["core2"] = `q.block_state('${CORE_STATE}') == 1`;

        // 选择/碰撞箱：本游戏版本 selection_box 与 collision_box 均不支持 Molang，
        // 用 64 个 permutation 枚举 6 方向连接组合，写死数字箱体（中心 4x4x4，臂伸到 ±8），与几何骨一致
        const SIDES6 = ["north", "south", "east", "west", "up", "down"];
        for (let mask = 0; mask < 64; mask++) {
            const on: Record<string, boolean> = {};
            for (let i = 0; i < 6; i++) on[SIDES6[i]] = ((mask >> i) & 1) === 1;
            const cond = SIDES6.map((s) => `q.block_state('pipe_connect:${s}') == ${on[s] ? 1 : 0}`).join(" && ");
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

        // 覆盖 GeometryBlock 默认 geometry 组件（补 bone_visibility）；判定箱 + 可含水（waterlogging）
        block.addComponent(
            BlockComponent.combineComponents(
                BlockComponent.setGeometry('geometry.fluid_pipe', { bone_visibility }),
                BlockComponent.setLiquidDetection({
                    detection_rules: [
                        {
                            liquid_type: "water",
                            can_contain_liquid: true,
                            on_liquid_touches: "no_reaction",
                            stops_liquid_flowing_from_direction: ["up", "down", "north", "south", "east", "west"],
                        },
                    ],
                })
            )
        );

        this.block = block;
    }
}
