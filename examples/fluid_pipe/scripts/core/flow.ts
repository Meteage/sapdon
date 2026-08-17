// 逻辑层 L — 流动结算：前沿推进 / 罐吸水 / 泵抽水 / 流失 + 前沿渲染辅助（不依赖 @minecraft/server）
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
import { SINK_POT, TANK_MAX, EPS } from "./potential.js";

export const FRONT_SPEED = 2;    // 水前沿推进（格 / 20 tick）

export interface TickResult {
    tankDeltas: Map<string, number>;   // 罐 level 增减
    drain: number;                     // 空气流失端点数
}

// 源类端点（渲染填充从源向目标推进的锚点依据）：
// 泵输出、单阀输出（上游耦合传入）。罐/空气/泵输入是汇，不做锚点。
export const SOURCE_ENDS = [END_PUMP_OUT, END_VALVE_OUT];

// 渲染 BFS 锚点：取势最高的源端点（水平段上源/目标势相同，若取 hi 会因平局顺序变成从目标填充）
export function sourceAnchorKey(seg: Segment): string | null {
    let best: SegEnd | null = null;
    let bestP = -Infinity;
    for (const e of seg.ends) {
        if (!SOURCE_ENDS.includes(e.kind)) continue;
        const p = seg.pot.get(e.pipeKey) ?? SINK_POT;
        if (p > bestP) { bestP = p; best = e; }
    }
    return best ? best.pipeKey : null;
}

// === 每 20 tick 流动结算：水覆盖（前沿渐进逼近势覆盖）+ 罐吸/排 + 泵抽水 + 流失 ===
// 水状态（front/covered）直接写入 Segment（逻辑层状态），引擎只读同步到方块。
// 级联填充：阀门喂水的下游段，只有上游段充满（front >= target）后才开始进水——从源到目标依次传递。
export function tickFlow(
    segments: Map<string, Segment>,
    tanks: Map<string, TankState>,
    pumps: Map<string, PumpState>,
): TickResult {
    const tankDeltas = new Map<string, number>();
    let drain = 0;

    // pass 1：每段水流通路径 + 段间上游关系（END_VALVE_OUT 与别段 END_VALVE_IN 同 deviceKey = 上游段）
    const paths = new Map<string, Set<string>>();
    const targets = new Map<string, number>();
    const upstreamOf = new Map<string, string[]>();
    for (const seg of segments.values()) {
        const path = potCovered(seg);
        paths.set(seg.id, path);
        targets.set(seg.id, path.size);
    }
    for (const [sid, seg] of segments) {
        for (const e of seg.ends) {
            if (e.kind !== END_VALVE_OUT) continue;
            for (const [usid, useg] of segments) {
                if (usid === sid) continue;
                if (useg.ends.some((oe) => oe.kind === END_VALVE_IN && oe.deviceKey === e.deviceKey)) {
                    const list = upstreamOf.get(sid) ?? [];
                    list.push(usid);
                    upstreamOf.set(sid, list);
                }
            }
        }
    }

    // pass 2：主结算
    for (const seg of segments.values()) {
        // 1) 水流通路径（连接所有输入/输出端点的最小子树，死胡同支路剔除）+ 路径顺序
        const path = paths.get(seg.id)!;
        const anchor = sourceAnchorKey(seg) ?? (seg.hi ? seg.hi.pipeKey : (seg.pipes[0] ?? null));
        if (anchor) seg.order = bfsPathOrder(anchor, seg, path);

        // 2) 前沿渐进逼近势覆盖数（可涨可落）
        const target = path.size;
        // 级联闸门：段无独立源（仅靠阀门上游喂水）时，需上游全部充满才允许进水
        const independent = seg.ends.some((e) => e.kind === END_PUMP_OUT);
        const gated = !independent && (upstreamOf.get(seg.id) ?? []).some((usid) => {
            const u = segments.get(usid);
            return !!u && u.front < (targets.get(usid) ?? 0);
        });
        let front = seg.front;
        if (!gated && target > front) front = Math.min(target, front + FRONT_SPEED);
        // 水为存量：target 变小（断源/势消失/关阀）时 front 保留不自动退水，
        // covered 同样保留（水不消失，仅停止流动）；能推进/保持满时按路径重算覆盖
        seg.front = front;
        if (target >= front && seg.order.length) {
            seg.covered = coveredOf(seg, front);
        }

        // 端点结算
        for (const e of seg.ends) {
            const p = seg.pot.get(e.pipeKey) ?? SINK_POT;
            if (e.kind === END_OPEN && p > SINK_POT + EPS) {
                drain++; // 势 > -1 → 流失
            }
            if (e.kind === END_TANK) {
                const t = tanks.get(e.deviceKey!);
                if (!t) continue;
                // 罐纯吸收：未满且段势高于罐端口势(-1) 且 水前沿已到罐端管道（严格按可见水）→ 吸入
                if (t.level < TANK_MAX && p > SINK_POT + EPS && seg.covered.has(e.pipeKey)) {
                    tankDeltas.set(e.deviceKey!, (tankDeltas.get(e.deviceKey!) ?? 0) + 1);
                }
            }
            if (e.kind === END_PUMP_IN && pumps.get(e.deviceKey!)?.on) {
                // 泵输入口（势 -Δ 强汇）：段内势到达（上游供水）→ 泵吸水
                const pIn = seg.pot.get(e.pipeKey);
                if (pIn != null) {
                    drain++; // 泵吸水
                }
            }
        }
    }

    return { tankDeltas, drain };
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