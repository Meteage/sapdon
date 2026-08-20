// ===== L-R framework :: core/power-settle.ts (pure) =====
// 电力系统结算：把共享设备的段并成电网（继电器可控），网格级 供/需/电池 结算。
// 提取自 sapdon/examples/power_grid 的 settle，泛化到框架。

import { buildGrids } from "./network.js";

export const GEN_OUTPUT = 40;      // 每台运行发电机产出 /s
export const SOLAR_OUTPUT = 10;    // 每块太阳能满日照产出 /s
export const FURNACE_DRAW = 30;    // 每台有料熔炉耗电 /s
export const BATTERY_MAX = 1000;   // 电池容量
export const CHARGE_RATE = 60;     // 电池充电 /s
export const DISCHARGE_RATE = 60;  // 电池放电 /s
export const EPS = 0.001;

export interface GenState { burnTicks: number; fuel?: number }
export interface BattState { level: number }
export interface RelayState { open: boolean }

export interface PowerSettleInput {
    gens: Map<string, GenState>;
    bats: Map<string, BattState>;
    relays: Map<string, RelayState>;
    furnaceHasInput: Map<string, boolean>;
    solarKeys: Set<string>;
    deviceSegs: Map<string, string[]>;
    sunlight: number;   // 0..1
    dt: number;         // 步长 /s
    segPowered: (segId: string, powered: boolean) => void;
}

export function settlePower(inp: PowerSettleInput): void {
    const shouldCouple = (k: string) => inp.relays.has(k) ? inp.relays.get(k)!.open : true;
    const { segGrid, gridSegs } = buildGrids({ deviceSegs: inp.deviceSegs, shouldCouple });

    interface Agg { segs: Set<string>; gens: GenState[]; bats: BattState[]; furnaceCount: number; solarCount: number }
    const agg = new Map<string, Agg>();
    const getAgg = (r: string): Agg => {
        let a = agg.get(r);
        if (!a) { a = { segs: new Set(), gens: [], bats: [], furnaceCount: 0, solarCount: 0 }; agg.set(r, a); }
        return a;
    };
    for (const [dev, ids] of inp.deviceSegs) {
        if (!ids.length) continue;
        const a = getAgg(segGrid.get(ids[0])!);
        for (const s of ids) a.segs.add(s);
        if (inp.gens.has(dev)) a.gens.push(inp.gens.get(dev)!);
        else if (inp.bats.has(dev)) a.bats.push(inp.bats.get(dev)!);
        else if (inp.furnaceHasInput.has(dev)) { if (inp.furnaceHasInput.get(dev) !== false) a.furnaceCount++; }
        else if (inp.solarKeys.has(dev)) a.solarCount++;
        // relays 已在 buildGrids 里处理耦合，不计入产出/负荷
    }

    void gridSegs;
    for (const a of agg.values()) {
        let gen = 0;
        for (const g of a.gens) {
            g.burnTicks -= inp.dt;
            if (g.burnTicks < 0) g.burnTicks = 0;
            if (g.burnTicks > 0) gen += GEN_OUTPUT;
        }
        gen += a.solarCount * SOLAR_OUTPUT * clamp01(inp.sunlight);
        const load = a.furnaceCount * FURNACE_DRAW;

        // 有可用能源（发电机产出>0 或 电池带点）→ 否则整段不激活（避免无源段 0>=0 空真“有电”）
        const energized = gen > EPS || a.bats.some((b) => b.level > EPS);
        let powered: boolean;
        if (!energized) {
            powered = false;
        } else if (gen >= load - EPS) {
            let surplus = gen - load;
            powered = true;
            for (const b of a.bats) { const add = Math.min(CHARGE_RATE, surplus); if (add > 0) { b.level = Math.min(BATTERY_MAX, b.level + add); surplus -= add; } }
        } else {
            const deficit = load - gen;
            let remaining = deficit;
            for (const b of a.bats) { const give = Math.min(remaining, DISCHARGE_RATE, b.level); b.level -= give; remaining -= give; }
            powered = remaining <= EPS;
        }
        for (const sid of a.segs) inp.segPowered(sid, powered);
    }
}

function clamp01(x: number): number { return x < 0 ? 0 : x > 1 ? 1 : x; }