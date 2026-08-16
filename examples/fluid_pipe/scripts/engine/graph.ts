// 引擎层 R — 洪水分段图（读世界方块）：实现 core/graph 的 FloodGraph 接口
import { Block } from "@minecraft/server";
import { PIPE_TYPE, PUMP_TYPE, TANK_TYPE, VALVE_TYPE, VALVE3_TYPE, CARDINAL_STATE, VALVE_OPEN_STATE, VALVE3_DIR_STATE } from "./const.js";
import { getBlockByKey, getAdjacent, blockKey, isWaterlogged } from "./world.js";
import {
    oppositeFace,
    END_WALL,
    END_TANK,
    END_PUMP_IN,
    END_PUMP_OUT,
    END_VALVE_IN,
    END_VALVE_OUT,
    END_SOURCE,
    END_OPEN,
    type SegEnd,
} from "../core/graph.js";

// 旋转方块局部参考系面 → 世界面（模型旋转：north=0°、west=+90°、south=180°、east=-90°）
const ROT_FACE: Record<string, Record<string, string>> = {
    north: { north: "north", south: "south", east: "east", west: "west" },
    west: { north: "west", south: "east", east: "north", west: "south" },
    south: { north: "south", south: "north", east: "west", west: "east" },
    east: { north: "east", south: "west", east: "south", west: "north" },
};

function rotFace(facing: string, local: string): string {
    return (ROT_FACE[facing] ?? ROT_FACE.north)[local] ?? local;
}

function facingOf(nb: Block): string {
    return (nb.permutation.getState(CARDINAL_STATE as any) as string) ?? "north";
}

export const graph = {
    isPipe(key: string) {
        const b = getBlockByKey(key);
        return !!b && b.typeId === PIPE_TYPE;
    },
    isValveOpen(key: string) {
        return false; // v3：阀门均为端点设备（定向输入/输出），不再作为段内可通行成员
    },
    neighborKey(key: string, face: string): string | null {
        const b = getBlockByKey(key);
        if (!b) return null;
        const nb = getAdjacent(b, face);
        if (!nb) return null;
        return blockKey(nb);
    },
    describeEnd(pipeKey: string, face: string): SegEnd | null {
        const b = getBlockByKey(pipeKey);
        if (!b) return null;
        const nb = getAdjacent(b, face);
        if (!nb) return null;
        const end: SegEnd = { key: `${pipeKey}#${face}`, pipeKey, face, kind: END_WALL };
        const t = nb.typeId;
        const side = oppositeFace(face); // 设备/外界朝向管道的那一面
        if (t === PUMP_TYPE) {
            // v2：泵顶面=输出口（高压）、底面=输入口（低压），侧面不参与
            end.kind = side === "up" ? END_PUMP_OUT : (side === "down" ? END_PUMP_IN : END_WALL);
            end.deviceKey = blockKey(nb);
        } else if (t === TANK_TYPE) {
            // v2：储液罐仅顶面可连接管道
            if (side === "up") {
                end.kind = END_TANK;
                end.deviceKey = blockKey(nb);
            }
        } else if (t === VALVE_TYPE) {
            // v3.1：单方向阀门 自身参考系 西=输入、东=输出；开/关=fluid_pipe:open（扳手只转顶面箭头，朝向不动）
            const open = (nb.permutation.getState(VALVE_OPEN_STATE as any) as number ?? 1) === 1;
            if (open) {
                const facing = facingOf(nb);
                const wIn = rotFace(facing, "west");
                const wOut = rotFace(facing, "east");
                if (side === wIn) {
                    end.kind = END_VALVE_IN;
                    end.deviceKey = blockKey(nb);
                } else if (side === wOut) {
                    end.kind = END_VALVE_OUT;
                    end.deviceKey = blockKey(nb);
                }
            }
        } else if (t === VALVE3_TYPE) {
            // v3：三通阀 自身参考系 西=输入，北/东/南=输出；dir=west（指向输入）=全关
            const facing = facingOf(nb);
            const dir = (nb.permutation.getState(VALVE3_DIR_STATE as any) as string) ?? "east";
            if (dir !== "west") {
                const wIn = rotFace(facing, "west");
                const wOut = rotFace(facing, dir);
                if (side === wIn) {
                    end.kind = END_VALVE_IN;
                    end.deviceKey = blockKey(nb);
                } else if (side === wOut) {
                    end.kind = END_VALVE_OUT;
                    end.deviceKey = blockKey(nb);
                }
            }
        } else if (t === "minecraft:water") {
            end.kind = END_SOURCE;
        } else if (t === "minecraft:air") {
            end.kind = END_OPEN;
        }
        return end;
    },
    soaked(pipeKey: string): SegEnd | null {
        if (!isWaterlogged(pipeKey)) return null;
        return { key: `${pipeKey}#soak`, pipeKey, face: "soak", kind: END_SOURCE };
    },
};