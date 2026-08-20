// ===== L-R framework :: core/fluid-settle.ts (pure) =====
// 流体系统结算：段通过“打开阀门”并成管网；有运行的泵且有汇（罐/空气）即流动；
// 流动中罐吸水（level 递增封顶）。
// 简化势模型（整网平势，不做逐格高度梯度），可测试；要逐格势场可在此基础上按 graph 连通度扩展。

import { buildGrids } from "./network.js";

export const TANK_MAX = 32;     // 罐容量
export const TANK_RATE = 1;     // 罐吸入速率 格/s
export const EPS = 0.001;

export interface PumpState { on: boolean; fed?: boolean }
export interface TankState { level: number }
export interface ValveState { open: boolean }

export interface FluidSettleInput {
    pumps: Map<string, PumpState>;
    tanks: Map<string, TankState>;
    valves: Map<string, ValveState>;
    deviceSegs: Map<string, string[]>;   // pump/tank/valve -> 相邻段 id[]
    endsBySeg: Map<string, import("./graph.js").SegEnd[]>; // 每段端点（供找泵/罐/空气）
    dt: number;
    segPowered: (segId: string, powered: boolean) => void;
}

export function settleFluid(inp: FluidSettleInput): void {
    const shouldCouple = (k: string) => inp.valves.has(k) && inp.valves.get(k)!.open;
    const { gridSegs } = buildGrids({ deviceSegs: inp.deviceSegs, shouldCouple });

    for (const [, segs] of gridSegs) {
        // 汇总本网格的泵输出端/罐/空气端
        let pumpOut = false;
        const tankEnds: Array<{ deviceKey: string }> = [];
        let openEnd = false;
        for (const sid of segs) {
            const ends = inp.endsBySeg.get(sid) ?? [];
            for (const e of ends) {
                if (e.kind === "pumpOut" && e.deviceKey && inp.pumps.get(e.deviceKey)?.on) pumpOut = true;
                else if (e.kind === "tank" && e.deviceKey) tankEnds.push({ deviceKey: e.deviceKey });
                else if (e.kind === "open") openEnd = true;
            }
        }
        const tankCanAbsorb = tankEnds.some((t) => (inp.tanks.get(t.deviceKey)?.level ?? TANK_MAX) < TANK_MAX - EPS);
        const flowing = pumpOut && (tankCanAbsorb || openEnd);

        for (const sid of segs) inp.segPowered(sid, flowing);

        if (flowing) {
            for (const t of tankEnds) {
                const tank = inp.tanks.get(t.deviceKey);
                if (!tank) continue;
                if (tank.level < TANK_MAX) tank.level = Math.min(TANK_MAX, tank.level + TANK_RATE * inp.dt);
            }
        }
    }
}