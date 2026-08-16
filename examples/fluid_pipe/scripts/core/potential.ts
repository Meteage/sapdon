// 逻辑层 L — 势模型：常量 / 端点势 / 段内传播 / 全局势传播场（不依赖 @minecraft/server）
// 流动结算见 flow.ts；改这里须同步 test/fluid.test.mjs 副本。
//
// 势模型（设计文档）：
//   - 源：水中端子=1；泵输出口=输入侧势+Δ；罐(level>0)=弱源 level/32
//   - 汇：空气端子=-1（流失）；未满罐=-1（吸入）；满罐=0（停吸）
//   - 传播：沿连接图 BFS，向上每格势 -1，水平/向下不变
//   - 流动判定：可用势 > 目标所需势
//   - 罐：0..32 格液位

import {
    END_SOURCE,
    END_OPEN,
    END_WALL,
    END_TANK,
    END_PUMP_IN,
    END_PUMP_OUT,
    END_VALVE_IN,
    END_VALVE_OUT,
    keyY,
    type Segment,
    type SegEnd,
    type TankState,
    type PumpState,
} from "./graph.js";

export const WATER_POT = 1;      // 水中端子初始势
export const SINK_POT = -1;      // 空气端子 / 未满罐端口势
export const FULL_TANK_POT = 0;  // 满罐端口势
export const PUMP_DELTA = 4;     // 泵造势（可抬 4 格高度）
export const TANK_MAX = 32;      // 罐满格数
export const UP_COST = 1;        // 向上每格势损失
export const EPS = 0.02;         // 势差阈值

// 端点的可用势（供流动判定）
export function endPortPot(end: SegEnd, tanks: Map<string, TankState>, pumps: Map<string, PumpState>): number {
    switch (end.kind) {
        case END_SOURCE: return WATER_POT;
        case END_OPEN: return SINK_POT;
        case END_WALL: return 0;
        case END_TANK: {
            const t = tanks.get(end.deviceKey!);
            return (t && t.level >= TANK_MAX) ? FULL_TANK_POT : SINK_POT; // 满=0（源，重力排水）/ 未满=-1（汇，吸入）
        }
        case END_PUMP_IN: return pumps.get(end.deviceKey!)?.on ? -PUMP_DELTA : 0;
        case END_PUMP_OUT: return pumps.get(end.deviceKey!)?.on ? PUMP_DELTA : 0;
        default: return 0; // valveIn / valveOut 由耦合传播决定
    }
}

// === 段内传播：从 seedKey（段成员）以入口势 P 扩散，向上每格 -UP_COST ===
function spreadInSegment(seg: Segment, seedKey: string, P: number) {
    const startY = keyY(seedKey);
    const queue: Array<[string, number]> = [[seedKey, P]];
    const visited = new Set<string>();
    while (queue.length) {
        const [key, pot] = queue.shift()!;
        if (visited.has(key)) continue;
        visited.add(key);
        const prev = seg.pot.get(key);
        if (prev == null || pot > prev) seg.pot.set(key, pot);
        const y = keyY(key);
        for (const nb of seg.adj.get(key) ?? []) {
            if (visited.has(nb)) continue;
            const ny = keyY(nb);
            const loss = ny > y ? (ny - y) * UP_COST : 0; // 向上每格 -1，向下/水平不变
            queue.push([nb, pot - loss]);
        }
    }
}

// === 势传播场：多源 BFS + 泵/三通耦合固定点 ===
export function computePotential(
    segments: Map<string, Segment>,
    tanks: Map<string, TankState>,
    pumps: Map<string, PumpState>,
): void {
    for (const seg of segments.values()) {
        seg.pot.clear();
        seg.hi = null;
        seg.lo = null;
    }

    // 段间设备边：泵输出端（输入侧有水 或 泵泡水才吐）；三通（输入段→输出段）
    const pumpOuts: Array<{ pumpKey: string; outSeg: Segment; outEnd: SegEnd }> = [];
    const pumpIns = new Map<string, { inSeg: Segment; inEnd: SegEnd }>();
    const valveLinks: Array<{ inSeg: Segment; outSeg: Segment }> = [];

    for (const seg of segments.values()) {
        for (const e of seg.ends) {
            if (e.kind === END_PUMP_OUT && pumps.get(e.deviceKey!)?.on) {
                pumpOuts.push({ pumpKey: e.deviceKey!, outSeg: seg, outEnd: e });
            }
            if (e.kind === END_PUMP_IN) {
                pumpIns.set(e.deviceKey!, { inSeg: seg, inEnd: e });
            }
            if (e.kind === END_VALVE_IN) {
                for (const oseg of segments.values()) {
                    for (const oe of oseg.ends) {
                        if (oe.kind === END_VALVE_OUT && oe.deviceKey === e.deviceKey) {
                            valveLinks.push({ inSeg: seg, outSeg: oseg });
                        }
                    }
                }
            }
        }
    }

    const spreadFrom = (seg: Segment, seedKey: string, P: number) => {
        if (P > SINK_POT) spreadInSegment(seg, seedKey, P);
    };

    // 固定点迭代：水/满罐源传播 → 泵输出造势（输入侧有水才吐）→ 三通透传
    const maxIter = segments.size + 2;
    for (let iter = 0; iter < maxIter; iter++) {
        let changed = false;

        // 1) 源：水中端子=1、满罐=0（重力排水源）
        for (const seg of segments.values()) {
            for (const e of seg.ends) {
                if (e.kind === END_SOURCE) {
                    const before = seg.pot.get(e.pipeKey);
                    spreadFrom(seg, e.pipeKey, WATER_POT);
                    if (before !== seg.pot.get(e.pipeKey)) changed = true;
                }
                if (e.kind === END_TANK) {
                    const t = tanks.get(e.deviceKey!);
                    if (t && t.level >= TANK_MAX) {
                        const before = seg.pot.get(e.pipeKey);
                        spreadFrom(seg, e.pipeKey, FULL_TANK_POT);
                        if (before !== seg.pot.get(e.pipeKey)) changed = true;
                    }
                }
            }
        }

        // 2) 泵输出口造势 +Δ（独立势源；输入侧有水 或 泵自身泡水才吐，防凭空造水）
        for (const out of pumpOuts) {
            const pump = pumps.get(out.pumpKey);
            if (!pump?.on) continue;
            let hasWater = pump.soaked === true; // 泵泡水（被水浸没）→ 直接可抽
            if (!hasWater) {
                const inp = pumpIns.get(out.pumpKey);
                hasWater = !!inp && inp.inSeg.pot.get(inp.inEnd.pipeKey) != null;
            }
            if (hasWater) {
                const before = out.outSeg.pot.get(out.outEnd.pipeKey);
                spreadFrom(out.outSeg, out.outEnd.pipeKey, PUMP_DELTA);
                if (before !== out.outSeg.pot.get(out.outEnd.pipeKey)) changed = true;
            }
        }

        // 3) 三通阀：输入侧势 → 输出侧（不衰减）
        for (const link of valveLinks) {
            let inPot = -Infinity;
            for (const e of link.inSeg.ends) {
                if (e.kind === END_VALVE_IN) {
                    const p = link.inSeg.pot.get(e.pipeKey);
                    if (p != null && p > inPot) inPot = p;
                }
            }
            if (inPot > -Infinity) {
                for (const oe of link.outSeg.ends) {
                    if (oe.kind === END_VALVE_OUT) {
                        const before = link.outSeg.pot.get(oe.pipeKey);
                        spreadFrom(link.outSeg, oe.pipeKey, inPot);
                        if (before !== link.outSeg.pot.get(oe.pipeKey)) changed = true;
                    }
                }
            }
        }

        if (!changed) break;
    }

    // hi/lo 端点（每段最高/最低势端点，front 方向依据）
    for (const seg of segments.values()) {
        let hiP = -Infinity, loP = Infinity;
        for (const e of seg.ends) {
            const p = seg.pot.get(e.pipeKey) ?? SINK_POT;
            if (p > hiP) { hiP = p; seg.hi = e; }
            if (p < loP) { loP = p; seg.lo = e; }
        }
    }
}