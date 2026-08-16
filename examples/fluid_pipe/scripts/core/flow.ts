// 逻辑层 L — 流动结算：前沿推进 / 罐吸排 / 泵抽水 / 流失 + 前沿渲染辅助（不依赖 @minecraft/server）
// 势传播见 potential.ts；改这里须同步 test/fluid.test.mjs 副本。

import {
    END_OPEN,
    END_TANK,
    END_PUMP_IN,
    END_PUMP_OUT,
    END_VALVE_IN,
    END_VALVE_OUT,
    type Segment,
    type SegEnd,
    type TankState,
    type PumpState,
} from "./graph.js";
import { SINK_POT, FULL_TANK_POT, TANK_MAX, EPS } from "./potential.js";

export const FRONT_SPEED = 2;    // 水前沿推进（格 / 20 tick）

export interface TickResult {
    tankDeltas: Map<string, number>;   // 罐 level 增减
    drain: number;                     // 空气流失端点数
}

// === 每 20 tick 流动结算：水覆盖（前沿渐进逼近势覆盖）+ 罐吸/排 + 泵抽水 + 流失 ===
// 水状态（front/covered）直接写入 Segment（逻辑层状态），引擎只读同步到方块。
export function tickFlow(
    segments: Map<string, Segment>,
    tanks: Map<string, TankState>,
    pumps: Map<string, PumpState>,
): TickResult {
    const tankDeltas = new Map<string, number>();
    let drain = 0;

    for (const seg of segments.values()) {
        // 1) 水流通路径（连接所有输入/输出端点的最小子树，死胡同支路剔除）+ 路径顺序
        const path = potCovered(seg);
        const anchor = seg.hi ? seg.hi.pipeKey : (seg.pipes[0] ?? null);
        if (anchor) seg.order = bfsPathOrder(anchor, seg, path);

        // 2) 前沿渐进逼近势覆盖数（可涨可落）
        const target = path.size;
        let front = seg.front;
        if (target > front) front = Math.min(target, front + FRONT_SPEED);
        else if (target < front) front = Math.max(target, front - FRONT_SPEED);
        seg.front = front;
        seg.covered = coveredOf(seg, front);

        // 端点结算
        for (const e of seg.ends) {
            const p = seg.pot.get(e.pipeKey) ?? SINK_POT;
            if (e.kind === END_OPEN && p > SINK_POT + EPS) {
                drain++; // 势 > -1 → 流失
            }
            if (e.kind === END_TANK) {
                const t = tanks.get(e.deviceKey!);
                if (!t) continue;
                const port = t.level >= TANK_MAX ? FULL_TANK_POT : SINK_POT;
                if (t.level < TANK_MAX && p > port + EPS) {
                    // 未满且段势高于罐端口势(-1) → 吸入
                    tankDeltas.set(e.deviceKey!, (tankDeltas.get(e.deviceKey!) ?? 0) + 1);
                } else if (t.level >= TANK_MAX && segHasOpenDrain(seg)) {
                    // 满罐（势 0 源）：下游存在空气流失 → 重力排水
                    tankDeltas.set(e.deviceKey!, (tankDeltas.get(e.deviceKey!) ?? 0) - 1);
                }
            }
            if (e.kind === END_PUMP_IN && pumps.get(e.deviceKey!)?.on) {
                // 泵输入口（势 -Δ 强汇）：段内有水（源传播到达 或 段内罐有液）→ 泵吸水
                const pIn = seg.pot.get(e.pipeKey);
                const hasTankWater = seg.ends.some((te) => te.kind === END_TANK && (tanks.get(te.deviceKey!)?.level ?? 0) > 0);
                if (pIn != null || hasTankWater) {
                    drain++; // 泵吸水
                    for (const te of seg.ends) {
                        if (te.kind === END_TANK && te.deviceKey !== e.deviceKey) {
                            const t = tanks.get(te.deviceKey!);
                            if (t && t.level > 0) {
                                tankDeltas.set(te.deviceKey!, (tankDeltas.get(te.deviceKey!) ?? 0) - 1);
                            }
                        }
                    }
                }
            }
        }
    }

    return { tankDeltas, drain };
}

// 段内是否存在正在流失的空气端（满罐重力排水判定）
function segHasOpenDrain(seg: Segment): boolean {
    for (const e of seg.ends) {
        if (e.kind === END_OPEN) {
            const p = seg.pot.get(e.pipeKey) ?? SINK_POT;
            if (p > SINK_POT + EPS) return true;
        }
    }
    return false;
}

// 从锚点 BFS 生成成员顺序（渲染水前沿用；由 bfsPathOrder 替代——只沿水流通路径排序）
export function bfsOrder(anchor: string, seg: Segment): string[] {
    const out: string[] = [];
    const visited = new Set<string>();
    const q = [anchor];
    while (q.length) {
        const k = q.shift()!;
        if (visited.has(k)) continue;
        visited.add(k);
        out.push(k);
        for (const n of seg.adj.get(k) ?? []) {
            if (!visited.has(n)) q.push(n);
        }
    }
    return out;
}

// 有效管道判定：段必须同时具有输入端点（泵输出/阀门输出）与输出端点（罐/阀门输入/泵输入）才算有效
export const INPUT_ENDS = [END_PUMP_OUT, END_VALVE_OUT];
export const OUTPUT_ENDS = [END_TANK, END_VALVE_IN, END_PUMP_IN];

export function segValid(seg: Segment): boolean {
    return seg.ends.some((e) => INPUT_ENDS.includes(e.kind))
        && seg.ends.some((e) => OUTPUT_ENDS.includes(e.kind));
}

// 段内水流通路径 = 连接所有输入/输出端点的最小管道子树 ∧ 势 > -1（死胡同支路被叶剥除剔除）
export function potCovered(seg: Segment): Set<string> {
    const out = new Set<string>();
    if (!segValid(seg)) return out;
    // 端点管道：携带输入/输出端点的管道是路径终点（不可剥除）
    const endPipes = new Set(seg.ends
        .filter((e) => INPUT_ENDS.includes(e.kind) || OUTPUT_ENDS.includes(e.kind))
        .map((e) => e.pipeKey));
    // 叶剥除：反复移除"非端点且邻居 ≤1"的管道 → 剩下恰好是连接所有端点的最小子树
    const alive = new Set<string>(seg.pipes);
    let changed = true;
    while (changed) {
        changed = false;
        for (const key of [...alive]) {
            if (endPipes.has(key)) continue;
            const nbrs = (seg.adj.get(key) ?? []).filter((n) => alive.has(n));
            if (nbrs.length <= 1) { alive.delete(key); changed = true; }
        }
    }
    for (const key of seg.pipes) {
        const p = seg.pot.get(key);
        if (p != null && p > SINK_POT + EPS && alive.has(key)) out.add(key);
    }
    return out;
}

// 沿水流通路径 BFS 排序（渲染渐进填充用；只含路径管道，死胡同支路不进入顺序）
export function bfsPathOrder(anchor: string, seg: Segment, path: Set<string>): string[] {
    const out: string[] = [];
    const visited = new Set<string>();
    const q = [anchor];
    while (q.length) {
        const k = q.shift()!;
        if (visited.has(k)) continue;
        visited.add(k);
        if (path.has(k)) out.push(k);
        for (const n of seg.adj.get(k) ?? []) {
            if (!visited.has(n)) q.push(n);
        }
    }
    return out;
}

// 段的被水覆盖成员集合（渲染依据）
export function coveredOf(seg: Segment, front: number): Set<string> {
    return new Set(seg.order.slice(0, Math.ceil(front)));
}

// 重建后由旧覆盖集合恢复新段的前沿值
export function frontFromCovered(seg: Segment, covered: Set<string>): number {
    let c = 0;
    for (const k of seg.pass) if (covered.has(k)) c++;
    return c;
}