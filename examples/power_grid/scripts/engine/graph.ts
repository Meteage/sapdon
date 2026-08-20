// 引擎层 R — 洪水分段图（读世界方块）：实现 core/graph 的 FloodGraph 接口
import { WIRE_TYPE, COAL_GEN_TYPE, SOLAR_TYPE, FURNACE_TYPE, BATTERY_TYPE, RELAY_TYPE } from "./const.js";
import { getBlockByKey, getAdjacent, blockKey } from "./world.js";
import {
    END_GEN, END_SOLAR, END_FURNACE, END_BATTERY, END_RELAY, END_OPEN, END_WALL,
    type SegEnd,
} from "../core/graph.js";

function deviceKindOf(typeId: string): string | null {
    switch (typeId) {
        case COAL_GEN_TYPE: return END_GEN;
        case SOLAR_TYPE: return END_SOLAR;
        case FURNACE_TYPE: return END_FURNACE;
        case BATTERY_TYPE: return END_BATTERY;
        case RELAY_TYPE: return END_RELAY;
        default: return null;
    }
}

export const graph = {
    isWire(key: string) {
        const b = getBlockByKey(key);
        return !!b && b.typeId === WIRE_TYPE;
    },
    neighborKey(key: string, face: string): string | null {
        const b = getBlockByKey(key);
        if (!b) return null;
        const nb = getAdjacent(b, face);
        if (!nb) return null; // 区块未加载 / 世界外：按无邻居
        return blockKey(nb);
    },
    describeEnd(wireKey: string, face: string): SegEnd | null {
        const b = getBlockByKey(wireKey);
        if (!b) return null;
        const nb = getAdjacent(b, face);
        if (!nb) return null; // 世界外
        if (nb.typeId === WIRE_TYPE) return null; // 电线由 flood 自行连通
        const end: SegEnd = { key: `${wireKey}#${face}`, wireKey, face, kind: END_WALL };
        const k = deviceKindOf(nb.typeId);
        if (k) { end.kind = k as SegEnd["kind"]; end.deviceKey = blockKey(nb); }
        else if (nb.typeId === "minecraft:air") end.kind = END_OPEN;
        return end;
    },
};