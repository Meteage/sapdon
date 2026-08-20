// 引擎层 R — 渲染：线段带电/设备状态写方块状态
// 结算结果（seg.powered / 电池电量 / 发电机燃烧 / 太阳能日照）由本层只读同步到方块状态。
import { Block } from "@minecraft/server";
import { WIRE_TYPE, COAL_GEN_TYPE, SOLAR_TYPE, FURNACE_TYPE, BATTERY_TYPE, RELAY_TYPE,
         POWER_STATE, GEN_BURN_STATE, SOLAR_STATE, BATTERY_LEVEL_STATE } from "./const.js";
import { getBlockByKey, blockKey } from "./world.js";
import { segments, staleKeys, sunlightNow, generators, batteries } from "./state.js";
import { BATTERY_MAX } from "../core/settle.js";

const BATTERY_LEVELS = 15; // 电池电量 0..15（16 状态上限）

function writeState(b: Block, stateId: string, want: number) {
    try {
        const cur = (b.permutation.getState(stateId as any) as number ?? -1);
        if (cur !== want) b.setPermutation(b.permutation.withState(stateId as any, want));
    } catch (e) {
        staleKeys.add(blockKey(b));
    }
}

// 设备是否带电（任一相邻段已通电）
function poweredOfDevice(deviceSegs: Map<string, string[]>, key: string): boolean {
    const list = deviceSegs.get(key);
    if (!list) return false;
    for (const sid of list) { const s = segments.get(sid); if (s && s.powered) return true; }
    return false;
}

export function renderAll(deviceSegs: Map<string, string[]>) {
    // 电线带电（发光贴图 swap）
    for (const seg of segments.values()) {
        const want = seg.powered ? 1 : 0;
        for (const key of seg.pipes) {
            const b = getBlockByKey(key);
            if (!b || b.typeId !== WIRE_TYPE) { staleKeys.add(key); continue; }
            writeState(b, POWER_STATE, want);
        }
    }
    // 电池电量（0..15 液位）
    for (const [key, batt] of batteries) {
        const b = getBlockByKey(key);
        if (!b || b.typeId !== BATTERY_TYPE) { staleKeys.add(key); continue; }
        const want = Math.max(0, Math.min(BATTERY_LEVELS, Math.round(batt.level * BATTERY_LEVELS / BATTERY_MAX)));
        writeState(b, BATTERY_LEVEL_STATE, want);
    }
    // 发电机燃烧贴图
    for (const [key, g] of generators) {
        const b = getBlockByKey(key);
        if (!b || b.typeId !== COAL_GEN_TYPE) { staleKeys.add(key); continue; }
        writeState(b, GEN_BURN_STATE, g.burnTicks > 0 ? 1 : 0);
    }
    // 太阳能日照 + 熔炉/继电器带电
    for (const [key] of deviceSegs) {
        const b = getBlockByKey(key);
        if (!b) { staleKeys.add(key); continue; }
        const t = b.typeId;
        if (t === SOLAR_TYPE) writeState(b, SOLAR_STATE, sunlightNow > 0.2 ? 1 : 0);
        else if (t === FURNACE_TYPE || t === RELAY_TYPE) writeState(b, POWER_STATE, poweredOfDevice(deviceSegs, key) ? 1 : 0);
    }
}