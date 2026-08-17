// 引擎层 R — 洪水分段图（读世界方块）：实现 core/graph 的 FloodGraph 接口
import { Block } from "@minecraft/server";
import { PIPE_TYPE, PUMP_TYPE, TANK_TYPE, VALVE_TYPE, VALVE3_TYPE, CARDINAL_STATE, FACING_STATE, VALVE_OPEN_STATE, VALVE3_DIR_STATE } from "./const.js";
import { getBlockByKey, getAdjacent, blockKey } from "./world.js";
import {
    oppositeFace,
    END_WALL,
    END_TANK,
    END_PUMP_IN,
    END_PUMP_OUT,
    END_VALVE_IN,
    END_VALVE_OUT,
    END_OPEN,
    type SegEnd,
} from "../core/graph.js";

// 旋转方块局部参考系面 → 世界面（模型"北"面朝 facing 方向；水平 4 向 + 上/下 6 向）
const ROT_FACE: Record<string, Record<string, string>> = {
    north: { north: "north", south: "south", east: "east", west: "west", up: "up", down: "down" },
    west: { north: "west", south: "east", east: "north", west: "south", up: "up", down: "down" },
    south: { north: "south", south: "north", east: "west", west: "east", up: "up", down: "down" },
    east: { north: "east", south: "west", east: "south", west: "north", up: "up", down: "down" },
    up: { north: "up", south: "down", east: "east", west: "west", up: "south", down: "north" },
    down: { north: "down", south: "up", east: "east", west: "west", up: "north", down: "south" },
};

export function rotFace(facing: string, local: string): string {
    return (ROT_FACE[facing] ?? ROT_FACE.north)[local] ?? local;
}

export function facingOf(nb: Block): string {
    return (nb.permutation.getState(FACING_STATE as any) as string)
        ?? (nb.permutation.getState(CARDINAL_STATE as any) as string)
        ?? "north";
}

// 开阀自身参考系输入/输出 局部面（单阀：西入东出；三通：西入 dir 出）；关/指向输入 → null（墙）
function openValveIO(block: Block): { in: string; out: string } | null {
    const t = block.typeId;
    if (t === VALVE_TYPE) {
        const open = (block.permutation.getState(VALVE_OPEN_STATE as any) as number ?? 1) === 1;
        if (!open) return null;
        return { in: "west", out: "east" };
    }
    if (t === VALVE3_TYPE) {
        const dir = (block.permutation.getState(VALVE3_DIR_STATE as any) as string) ?? "east";
        if (dir === "west") return null; // 指向输入 = 全关
        return { in: "west", out: dir };
    }
    return null;
}

// 开阀在世界坐标系下的输入/输出面（含旋转）
function valveWorldIO(block: Block): { in: string; out: string } | null {
    const io = openValveIO(block);
    if (!io) return null;
    const facing = facingOf(block);
    return { in: rotFace(facing, io.in), out: rotFace(facing, io.out) };
}

// 阀门链终端端点：沿链走到管道/阀门外的首个方块，把它的端点挂到起始管道上（空气=开放、泵顶底/罐顶=设备端、其余=墙）
function terminalEnd(pipeKey: string, face: string, nb: Block): SegEnd | null {
    const end: SegEnd = { key: `${pipeKey}#${face}`, pipeKey, face, kind: END_WALL };
    const t = nb.typeId;
    const side = oppositeFace(face);
    if (t === "minecraft:air") {
        end.kind = END_OPEN;
    } else if (t === PUMP_TYPE) {
        // 泵局部参考系：顶=输出、底=输入（随 facing 旋转映射到世界面）
        const out = rotFace(facingOf(nb), "up");
        const inn = rotFace(facingOf(nb), "down");
        end.kind = side === out ? END_PUMP_OUT : (side === inn ? END_PUMP_IN : END_WALL);
        end.deviceKey = blockKey(nb);
    } else if (t === TANK_TYPE) {
        if (side === "up") { end.kind = END_TANK; end.deviceKey = blockKey(nb); }
    }
    return end.kind === END_WALL ? null : end;
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
    describeEnd(pipeKey: string, face: string): SegEnd[] {
        const b = getBlockByKey(pipeKey);
        if (!b) return [];
        const nb = getAdjacent(b, face);
        if (!nb) return [];
        const end: SegEnd = { key: `${pipeKey}#${face}`, pipeKey, face, kind: END_WALL };
        const t = nb.typeId;
        const side = oppositeFace(face); // 设备/外界朝向管道的那一面

        if (t === PUMP_TYPE) {
            // 泵局部参考系：顶=输出、底=输入（随 facing 旋转映射到世界面）
            const out = rotFace(facingOf(nb), "up");
            const inn = rotFace(facingOf(nb), "down");
            end.kind = side === out ? END_PUMP_OUT : (side === inn ? END_PUMP_IN : END_WALL);
            end.deviceKey = blockKey(nb);
            return [end];
        }
        if (t === TANK_TYPE) {
            // v2：储液罐仅顶面可连接管道（纯吸收汇）
            if (side === "up") { end.kind = END_TANK; end.deviceKey = blockKey(nb); }
            return [end];
        }
        if (t === "minecraft:air") { end.kind = END_OPEN; return [end]; }
        if (t !== VALVE_TYPE && t !== VALVE3_TYPE) return [end]; // 墙/其他（水块=墙，不供水）

        // 开阀：沿链穿越（阀门可直接首尾相连，中间无需管道）
        const io = valveWorldIO(nb);
        if (!io) return [end]; // 关阀 = 墙
        const mk = (kind: SegEnd["kind"], deviceKey?: string): SegEnd =>
            ({ key: `${pipeKey}#${face}`, pipeKey, face, kind, ...(deviceKey ? { deviceKey } : {}) });

        if (side === io.in) {
            // 管道在阀的输入面 → 前向走（沿输出面）：链上每级开阀补 valveIn，终端挂源/汇
            const ends: SegEnd[] = [mk(END_VALVE_IN, blockKey(nb))];
            let cur: Block | undefined = nb;
            while (cur) {
                const curIO = valveWorldIO(cur);
                if (!curIO) break; // 关阀 → 墙，链断
                const next = getAdjacent(cur, curIO.out);
                if (!next) break;
                const nt = next.typeId;
                if (nt === VALVE_TYPE || nt === VALVE3_TYPE) {
                    if (!valveWorldIO(next)) break; // 关阀 → 墙
                    ends.push(mk(END_VALVE_IN, blockKey(next)));
                    cur = next;
                    continue;
                }
                if (nt === PIPE_TYPE) break; // 对侧管道的 flood 自行收边
                const term = terminalEnd(pipeKey, face, next);
                if (term) ends.push(term);
                break;
            }
            return ends;
        }

        if (side === io.out) {
            // 管道在阀的输出面 → 后向走（沿输入面找源/汇，链上中间阀不补端点）
            const ends: SegEnd[] = [mk(END_VALVE_OUT, blockKey(nb))];
            let cur: Block | undefined = nb;
            while (cur) {
                const curIO = valveWorldIO(cur);
                if (!curIO) break;
                const next = getAdjacent(cur, curIO.in);
                if (!next) break;
                const nt = next.typeId;
                if (nt === VALVE_TYPE || nt === VALVE3_TYPE) {
                    if (!valveWorldIO(next)) break;
                    cur = next;
                    continue;
                }
                if (nt === PIPE_TYPE) break;
                const term = terminalEnd(pipeKey, face, next);
                if (term) ends.push(term);
                break;
            }
            return ends;
        }

        return [end]; // 阀侧面不参与
    },
};