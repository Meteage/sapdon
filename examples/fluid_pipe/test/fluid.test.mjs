// fluidCore v2 引擎核心测试副本（镜像 scripts/fluidCore.ts，改引擎须同步本副本）
// 运行: node --test test/fluid.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

// === 镜像 constants ===
const SINK_POT = -1;
const PUMP_DELTA = 4;
const TANK_MAX = 32;
const UP_COST = 1;
const FRONT_SPEED = 2;
const EPS = 0.02;

const END_OPEN = "open";
const END_WALL = "wall";
const END_TANK = "tank";
const END_PUMP_IN = "pumpIn";
const END_PUMP_OUT = "pumpOut";
const END_VALVE_IN = "valveIn";
const END_VALVE_OUT = "valveOut";

// === 镜像 helpers ===
function oppositeFace(face) {
    switch (face.toLowerCase()) {
        case "north": return "south";
        case "south": return "north";
        case "east": return "west";
        case "west": return "east";
        case "up": return "down";
        case "down": return "up";
    }
    return "up";
}

function keyY(key) {
    const m = key.match(/^(-?\d+),(-?\d+),(-?\d+)$/);
    return m ? +m[2] : 0;
}

function floodSegment(anchor, graph, segId) {
    const queue = [anchor];
    const visited = new Set();
    const pass = [];
    const pipes = [];
    const adj = new Map();
    const ends = [];
    while (queue.length) {
        const key = queue.shift();
        if (visited.has(key)) continue;
        visited.add(key);
        const isPipe = graph.isPipe(key);
        if (isPipe) pipes.push(key);
        pass.push(key);
        const nbrs = [];
        for (const face of ["north", "south", "east", "west", "up", "down"]) {
            const nb = graph.neighborKey(key, face);
            if (!nb) continue;
            if (visited.has(nb)) { nbrs.push(nb); continue; }
            if (graph.isPipe(nb)) { nbrs.push(nb); queue.push(nb); continue; }
            if (graph.isValveOpen(nb)) { nbrs.push(nb); queue.push(nb); continue; }
            if (isPipe) {
                const es = graph.describeEnd(key, face);
                if (es) for (const e of es) ends.push(e);
            }
        }
        adj.set(key, nbrs);
    }
    return { id: segId, pipes, pass, adj, ends, front: 0, len: pass.length, order: [], orderAnchor: "", pot: new Map(), hi: null, lo: null };
}

function spreadInSegment(seg, seedKey, P) {
    const startY = keyY(seedKey);
    const queue = [[seedKey, P]];
    const visited = new Set();
    while (queue.length) {
        const [key, pot] = queue.shift();
        if (visited.has(key)) continue;
        visited.add(key);
        const prev = seg.pot.get(key);
        if (prev == null || pot > prev) seg.pot.set(key, pot);
        const y = keyY(key);
        for (const nb of seg.adj.get(key) ?? []) {
            if (visited.has(nb)) continue;
            const ny = keyY(nb);
            const loss = ny > y ? (ny - y) * UP_COST : 0;
            queue.push([nb, pot - loss]);
        }
    }
}

function computePotential(segments, tanks, pumps) {
    for (const seg of segments.values()) { seg.pot.clear(); seg.hi = null; seg.lo = null; }
    const pumpOuts = [];
    const pumpIns = new Map();
    const valveLinks = [];
    for (const seg of segments.values()) {
        for (const e of seg.ends) {
            if (e.kind === END_PUMP_OUT && pumps.get(e.deviceKey)?.on) {
                pumpOuts.push({ pumpKey: e.deviceKey, outSeg: seg, outEnd: e });
            }
            if (e.kind === END_PUMP_IN) {
                pumpIns.set(e.deviceKey, { inSeg: seg, inEnd: e });
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
    const spreadFrom = (seg, seedKey, P) => { if (P > SINK_POT) spreadInSegment(seg, seedKey, P); };
    const maxIter = segments.size + 2;
    for (let iter = 0; iter < maxIter; iter++) {
        let changed = false;
        for (const out of pumpOuts) {
            const pump = pumps.get(out.pumpKey);
            if (!pump?.on) continue;
            let hasWater = pump.soaked === true;
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
    for (const seg of segments.values()) {
        let hiP = -Infinity, loP = Infinity;
        for (const e of seg.ends) {
            const p = seg.pot.get(e.pipeKey) ?? SINK_POT;
            if (p > hiP) { hiP = p; seg.hi = e; }
            if (p < loP) { loP = p; seg.lo = e; }
        }
    }
}

function bfsOrder(anchor, seg) {
    const out = [];
    const visited = new Set();
    const q = [anchor];
    while (q.length) {
        const k = q.shift();
        if (visited.has(k)) continue;
        visited.add(k);
        out.push(k);
        for (const n of seg.adj.get(k) ?? []) if (!visited.has(n)) q.push(n);
    }
    return out;
}

const INPUT_ENDS = [END_PUMP_OUT, END_VALVE_OUT];
const OUTPUT_ENDS = [END_TANK, END_VALVE_IN, END_PUMP_IN];

function segValid(seg) {
    return seg.ends.some((e) => INPUT_ENDS.includes(e.kind))
        && seg.ends.some((e) => OUTPUT_ENDS.includes(e.kind));
}

function potCovered(seg) {
    const out = new Set();
    if (!segValid(seg)) return out;
    const endPipes = new Set(seg.ends
        .filter((e) => INPUT_ENDS.includes(e.kind) || OUTPUT_ENDS.includes(e.kind))
        .map((e) => e.pipeKey));
    const alive = new Set(seg.pipes);
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

function bfsPathOrder(anchor, seg, path) {
    const out = [];
    const visited = new Set();
    const q = [anchor];
    while (q.length) {
        const k = q.shift();
        if (visited.has(k)) continue;
        visited.add(k);
        if (path.has(k)) out.push(k);
        for (const n of seg.adj.get(k) ?? []) if (!visited.has(n)) q.push(n);
    }
    return out;
}

function coveredOf(seg, front) {
    return new Set(seg.order.slice(0, Math.ceil(front)));
}

const SOURCE_ENDS = [END_PUMP_OUT, END_VALVE_OUT];

function sourceAnchorKey(seg) {
    let best = null;
    let bestP = -Infinity;
    for (const e of seg.ends) {
        if (!SOURCE_ENDS.includes(e.kind)) continue;
        const p = seg.pot.get(e.pipeKey) ?? SINK_POT;
        if (p > bestP) { bestP = p; best = e; }
    }
    return best ? best.pipeKey : null;
}

function tickFlow(segments, tanks, pumps) {
    const tankDeltas = new Map();
    let drain = 0;
    // pass 1：路径 + 段间上游关系（级联闸门用）
    const paths = new Map();
    const targets = new Map();
    const upstreamOf = new Map();
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
                    (upstreamOf.get(sid) ?? upstreamOf.set(sid, []).get(sid)).push(usid);
                }
            }
        }
    }
    // pass 2：主结算
    for (const seg of segments.values()) {
        // 水覆盖：路径 + 路径顺序 + 前沿渐进逼近势覆盖（写入 seg 逻辑状态）
        const path = paths.get(seg.id);
        const anchor = sourceAnchorKey(seg) ?? (seg.hi ? seg.hi.pipeKey : (seg.pipes[0] ?? null));
        if (anchor) seg.order = bfsPathOrder(anchor, seg, path);
        const target = path.size;
        // 级联闸门：无独立源且存在未充满的上游段 → 不进水
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
        for (const e of seg.ends) {
            const p = seg.pot.get(e.pipeKey) ?? SINK_POT;
            if (e.kind === END_OPEN && p > SINK_POT + EPS) drain++;
            if (e.kind === END_TANK) {
                const t = tanks.get(e.deviceKey);
                if (!t) continue;
                // 罐纯吸收：未满且段势高于罐端口势(-1) 且 水前沿已到罐端管道（按可见水）→ 吸入
                if (t.level < TANK_MAX && p > SINK_POT + EPS && seg.covered.has(e.pipeKey)) {
                    tankDeltas.set(e.deviceKey, (tankDeltas.get(e.deviceKey) ?? 0) + 1);
                }
            }
            if (e.kind === END_PUMP_IN && pumps.get(e.deviceKey)?.on) {
                const pIn = seg.pot.get(e.pipeKey);
                if (pIn != null) {
                    drain++; // 泵吸水
                }
            }
        }
    }
    return { tankDeltas, drain };
}

// === 测试数据构造 ===
function endOf(pipeKey, kind, deviceKey) {
    return { key: `${pipeKey}#x`, pipeKey, face: "x", kind, ...(deviceKey ? { deviceKey } : {}) };
}

function makeSeg(id, pipes, ends, opts = {}) {
    const pass = [...pipes];
    const adj = new Map();
    for (let i = 0; i < pass.length; i++) {
        const nbrs = [];
        if (i > 0) nbrs.push(pass[i - 1]);
        if (i < pass.length - 1) nbrs.push(pass[i + 1]);
        adj.set(pass[i], nbrs);
    }
    return { id, pipes, pass, adj, ends, front: opts.front ?? 0, covered: new Set(), len: pass.length, order: [], orderAnchor: "", pot: new Map(), hi: null, lo: null };
}

// 自定义拓扑段（非直线）：pipes 数组 + adj 映射
function makeSegTopo(id, pipes, adj, ends) {
    const pass = [...pipes];
    return { id, pipes, pass, adj, ends, front: 0, covered: new Set(), len: pass.length, order: [], orderAnchor: "", pot: new Map(), hi: null, lo: null };
}

// === 势传播 ===
test("泵势水平传播不衰减", () => {
    const seg = makeSeg("s1", ["0,10,0", "0,10,1"], [endOf("0,10,0", END_PUMP_OUT, "pump")]);
    const segments = new Map([["s1", seg]]);
    const pumps = new Map([["pump", { on: true, soaked: true }]]);
    computePotential(segments, new Map(), pumps);
    assert.equal(seg.pot.get("0,10,0"), PUMP_DELTA);
    assert.equal(seg.pot.get("0,10,1"), PUMP_DELTA);
});

test("向上每格势 -1", () => {
    const seg = makeSeg("s1", ["0,10,0", "0,11,0", "0,12,0"], [endOf("0,10,0", END_PUMP_OUT, "pump")]);
    const pumps = new Map([["pump", { on: true, soaked: true }]]);
    computePotential(new Map([["s1", seg]]), new Map(), pumps);
    assert.equal(seg.pot.get("0,10,0"), PUMP_DELTA);
    assert.equal(seg.pot.get("0,11,0"), PUMP_DELTA - 1);
    assert.equal(seg.pot.get("0,12,0"), PUMP_DELTA - 2);
});

test("向下/水平传播不减势", () => {
    const seg = makeSeg("s1", ["0,10,0", "0,9,0", "0,8,0"], [endOf("0,10,0", END_PUMP_OUT, "pump")]);
    const pumps = new Map([["pump", { on: true, soaked: true }]]);
    computePotential(new Map([["s1", seg]]), new Map(), pumps);
    assert.equal(seg.pot.get("0,9,0"), PUMP_DELTA);
    assert.equal(seg.pot.get("0,8,0"), PUMP_DELTA);
});

test("空气端子 -1 汇：势> -1 流失", () => {
    const seg = makeSeg("s1", ["0,10,0", "0,10,1"], [endOf("0,10,0", END_PUMP_OUT, "pump"), endOf("0,10,1", END_OPEN)]);
    const segments = new Map([["s1", seg]]);
    const pumps = new Map([["pump", { on: true, soaked: true }]]);
    computePotential(segments, new Map(), pumps);
    const r = tickFlow(segments, new Map(), pumps);
    assert.equal(r.drain, 1);
    assert.equal(seg.front, 0); // 仅泵输出+空气端 → 段无效（空气不算输出），不渲染
});

test("墙端不流失", () => {
    const seg = makeSeg("s1", ["0,10,0", "0,10,1"], [endOf("0,10,0", END_PUMP_OUT, "pump"), endOf("0,10,1", END_WALL)]);
    const segments = new Map([["s1", seg]]);
    const pumps = new Map([["pump", { on: true, soaked: true }]]);
    computePotential(segments, new Map(), pumps);
    const r = tickFlow(segments, new Map(), pumps);
    assert.equal(r.drain, 0);
});

test("泵造势：输出段势 = 固定 +Δ（输入侧有水才吐）", () => {
    // 泵A 泡水吐水 → inSeg 有势 → 泵 输入侧有水 → 泵 吐水给 outSeg
    const inSeg = makeSeg("in", ["0,10,0", "0,10,1"], [endOf("0,10,0", END_PUMP_OUT, "pumpA"), endOf("0,10,1", END_PUMP_IN, "pump")]);
    const outSeg = makeSeg("out", ["0,10,2", "0,10,3"], [endOf("0,10,2", END_PUMP_OUT, "pump"), endOf("0,10,3", END_OPEN)]);
    const segments = new Map([["in", inSeg], ["out", outSeg]]);
    const pumps = new Map([["pumpA", { on: true, soaked: true }], ["pump", { on: true }]]);
    computePotential(segments, new Map(), pumps);
    assert.equal(inSeg.pot.get("0,10,1"), PUMP_DELTA);
    assert.equal(outSeg.pot.get("0,10,2"), PUMP_DELTA); // 独立势源 +Δ
    assert.equal(outSeg.pot.get("0,10,3"), PUMP_DELTA);
});

test("泵不凭空造水：输入侧无源不吐", () => {
    const inSeg = makeSeg("in", ["0,10,0", "0,10,1"], [endOf("0,10,0", END_OPEN), endOf("0,10,1", END_PUMP_IN, "pump")]);
    const outSeg = makeSeg("out", ["0,10,2", "0,10,3"], [endOf("0,10,2", END_PUMP_OUT, "pump"), endOf("0,10,3", END_OPEN)]);
    const segments = new Map([["in", inSeg], ["out", outSeg]]);
    const pumps = new Map([["pump", { on: true }]]);
    computePotential(segments, new Map(), pumps);
    assert.equal(inSeg.pot.get("0,10,1"), undefined); // 空气汇不传播
    assert.equal(outSeg.pot.get("0,10,2"), undefined); // 泵不吐
});

test("罐 32 格：未满吸入须水前沿到罐端、满停止（纯吸收，不排水）", () => {
    // 有效段（泵输出 → 4 管 → 罐）：吸水须等水前沿到达罐端管道（严格按可见水）
    const seg = makeSeg("s1", ["0,10,0", "0,10,1", "0,10,2", "0,10,3"], [
        endOf("0,10,0", END_PUMP_OUT, "pump"),
        endOf("0,10,3", END_TANK, "tank"),
    ]);
    const pumps = new Map([["pump", { on: true, soaked: true }]]);
    let tanks = new Map([["tank", { level: 10 }]]);
    let segments = new Map([["s1", seg]]);
    computePotential(segments, tanks, pumps);
    let r = tickFlow(segments, tanks, pumps);
    assert.equal(seg.front, 2); // 前沿未到罐端
    assert.equal(r.tankDeltas.get("tank"), undefined); // 不吸水
    r = tickFlow(segments, tanks, pumps);
    assert.equal(seg.front, 4); // 前沿到罐端
    assert.equal(r.tankDeltas.get("tank"), 1); // 开始吸水

    // 满：停止吸入（level=32 不吸也不排）
    tanks = new Map([["tank", { level: TANK_MAX }]]);
    segments = new Map([["s1", seg]]);
    computePotential(segments, tanks, pumps);
    r = tickFlow(segments, tanks, pumps);
    assert.equal(r.tankDeltas.get("tank"), undefined);

    // 满罐 + 空气：罐纯吸收不排水（罐恒为汇，势不传播 → 空气端不流失）
    const seg2 = makeSeg("s2", ["0,10,0", "0,10,1"], [endOf("0,10,0", END_TANK, "tank"), endOf("0,10,1", END_OPEN)]);
    tanks = new Map([["tank", { level: TANK_MAX }]]);
    segments = new Map([["s2", seg2]]);
    computePotential(segments, tanks, new Map());
    r = tickFlow(segments, tanks, new Map());
    assert.equal(r.tankDeltas.get("tank"), undefined);
    assert.equal(r.drain, 0);

    // 未满罐 + 空气：罐是汇(-1) 不传播 → 空气端势 -1 不流失、罐不吸（段无效无覆盖）
    const seg3 = makeSeg("s3", ["0,10,0", "0,10,1"], [endOf("0,10,0", END_TANK, "tank"), endOf("0,10,1", END_OPEN)]);
    tanks = new Map([["tank", { level: 16 }]]);
    segments = new Map([["s3", seg3]]);
    computePotential(segments, tanks, new Map());
    r = tickFlow(segments, tanks, new Map());
    assert.equal(r.tankDeltas.get("tank"), undefined);
    assert.equal(r.drain, 0);
});

test("三通阀透传：输入侧势 → 输出侧", () => {
    const inSeg = makeSeg("in", ["0,10,0", "0,10,1"], [endOf("0,10,0", END_PUMP_OUT, "pump"), endOf("0,10,1", END_VALVE_IN, "v3")]);
    const outSeg = makeSeg("out", ["0,10,2", "0,10,3"], [endOf("0,10,2", END_VALVE_OUT, "v3"), endOf("0,10,3", END_OPEN)]);
    const segments = new Map([["in", inSeg], ["out", outSeg]]);
    const pumps = new Map([["pump", { on: true, soaked: true }]]);
    computePotential(segments, new Map(), pumps);
    assert.equal(outSeg.pot.get("0,10,2"), PUMP_DELTA);
    assert.equal(outSeg.pot.get("0,10,3"), PUMP_DELTA);
});

test("前沿推进：每 tick +FRONT_SPEED，封顶势覆盖数", () => {
    // 有效段：泵输出(输入) + 罐(输出)，泵泡水吐水
    const seg = makeSeg("s1", ["0,10,0", "0,10,1", "0,10,2", "0,10,3", "0,10,4"], [endOf("0,10,0", END_PUMP_OUT, "pump"), endOf("0,10,4", END_TANK, "tank")]);
    const segments = new Map([["s1", seg]]);
    const pumps = new Map([["pump", { on: true, soaked: true }]]);
    computePotential(segments, new Map(), pumps);
    let r = tickFlow(segments, new Map(), pumps);
    assert.equal(seg.front, 2);
    // 逻辑层水覆盖集合已写入 seg（引擎只读同步）
    assert.deepEqual([...seg.covered].sort(), ["0,10,0", "0,10,1"]);
    r = tickFlow(segments, new Map(), pumps);
    assert.equal(seg.front, 4);
    r = tickFlow(segments, new Map(), pumps);
    assert.equal(seg.front, 5); // 封顶段长
});

test("填充方向：从源向目标（水平段平局不取目标端作锚点）", () => {
    // 水平 泵→管→罐：源/目标端势相同（PUMP_DELTA）。ends 里罐端排第一（目标在前）——
    // 若锚点取 hi 会因平局顺序从罐侧起填（目标→源）。修复后必须从泵（源）侧起填。
    const seg = makeSeg("s1", ["0,10,0", "0,10,1", "0,10,2"], [
        endOf("0,10,2", END_TANK, "tank"),
        endOf("0,10,0", END_PUMP_OUT, "pump"),
    ]);
    const segments = new Map([["s1", seg]]);
    const pumps = new Map([["pump", { on: true, soaked: true }]]);
    computePotential(segments, new Map(), pumps);
    assert.equal(sourceAnchorKey(seg), "0,10,0"); // 锚点=泵输出（源）
    tickFlow(segments, new Map(), pumps);
    // 首轮 front=2：覆盖应为源侧 0,10,0 / 0,10,1，而不是目标侧 0,10,2
    assert.deepEqual([...seg.covered].sort(), ["0,10,0", "0,10,1"]);
});

test("级联：上一级充满后下一级才进水（三段两阀，从源到目标依次传递）", () => {
    const s1 = makeSeg("s1", ["0,10,0", "0,10,1", "0,10,2", "0,10,3", "0,10,4"], [
        endOf("0,10,0", END_PUMP_OUT, "pump"),
        endOf("0,10,4", END_VALVE_IN, "v1"),
    ]);
    const s2 = makeSeg("s2", ["0,10,5", "0,10,6", "0,10,7"], [
        endOf("0,10,5", END_VALVE_OUT, "v1"),
        endOf("0,10,7", END_VALVE_IN, "v2"),
    ]);
    const s3 = makeSeg("s3", ["0,10,8", "0,10,9"], [
        endOf("0,10,8", END_VALVE_OUT, "v2"),
        endOf("0,10,9", END_TANK, "tank"),
    ]);
    const segments = new Map([["s1", s1], ["s2", s2], ["s3", s3]]);
    const pumps = new Map([["pump", { on: true, soaked: true }]]);
    computePotential(segments, new Map(), pumps);
    tickFlow(segments, new Map(), pumps);
    assert.deepEqual([s1.front, s2.front, s3.front], [2, 0, 0]); // 上游未满，下游闸门关闭
    tickFlow(segments, new Map(), pumps);
    assert.deepEqual([s1.front, s2.front, s3.front], [4, 0, 0]);
    tickFlow(segments, new Map(), pumps);
    assert.deepEqual([s1.front, s2.front, s3.front], [5, 2, 0]); // s1 满 → s2 开始进
    // s2 从源侧（阀 v1 侧）起填，未达目标端
    assert.deepEqual([...s2.covered].sort(), ["0,10,5", "0,10,6"]);
    tickFlow(segments, new Map(), pumps);
    assert.deepEqual([s1.front, s2.front, s3.front], [5, 3, 2]); // s2 满 → s3 开始进
});

test("断源后水保留：front 不变、covered 保持（水为存量）", () => {
    const seg = makeSeg("s1", ["0,10,0", "0,10,1", "0,10,2", "0,10,3", "0,10,4"], [endOf("0,10,0", END_PUMP_OUT, "pump"), endOf("0,10,4", END_TANK, "tank")]);
    const segments = new Map([["s1", seg]]);
    const pumps = new Map([["pump", { on: true, soaked: true }]]);
    computePotential(segments, new Map(), pumps);
    let r = tickFlow(segments, new Map(), pumps);
    assert.equal(seg.front, 2);
    r = tickFlow(segments, new Map(), pumps);
    r = tickFlow(segments, new Map(), pumps);
    assert.equal(seg.front, 5); // 满水

    // 泵停（势消失）→ 水保留不退（front 不变、covered 保持）
    pumps.set("pump", { on: false, soaked: true });
    computePotential(segments, new Map(), pumps);
    r = tickFlow(segments, new Map(), pumps);
    assert.equal(seg.front, 5);
    assert.equal(seg.covered.size, 5);
    r = tickFlow(segments, new Map(), pumps);
    assert.equal(seg.front, 5); // 仍保留

    // 泵恢复（重新接源）→ 水保持满（已满无需再推进）
    pumps.set("pump", { on: true, soaked: true });
    computePotential(segments, new Map(), pumps);
    r = tickFlow(segments, new Map(), pumps);
    assert.equal(seg.front, 5);
});

test("potCovered：只含势 > -1 的管道（有效段）", () => {
    const seg = makeSeg("s1", ["0,10,0", "0,13,0", "0,16,0"], [endOf("0,10,0", END_PUMP_OUT, "pump"), endOf("0,16,0", END_TANK, "tank")]);
    const segments = new Map([["s1", seg]]);
    const pumps = new Map([["pump", { on: true, soaked: true }]]);
    computePotential(segments, new Map(), pumps);
    assert.deepEqual([...potCovered(seg)].sort(), ["0,10,0", "0,13,0"]); // 0,16 势=-2 不含
});

test("有效管道判定：孤立/仅空气端段无效", () => {
    const iso = makeSeg("s1", ["0,10,0"], [endOf("0,10,0", END_OPEN)]);
    assert.equal(segValid(iso), false);

    const airEnd = makeSeg("s3", ["0,10,0"], [endOf("0,10,0", END_PUMP_OUT, "pump"), endOf("0,10,0", END_OPEN)]);
    assert.equal(segValid(airEnd), false); // 空气不算输出

    const valid = makeSeg("s4", ["0,10,0"], [endOf("0,10,0", END_PUMP_OUT, "pump"), endOf("0,10,0", END_TANK, "tank")]);
    assert.equal(segValid(valid), true);

    const valv = makeSeg("s5", ["0,10,0"], [endOf("0,10,0", END_VALVE_OUT, "v3"), endOf("0,10,0", END_TANK, "tank")]);
    assert.equal(segValid(valv), true);
});

test("水流通路径：死胡同支路不渲染（泵→主管→闭合支路/阀门支路）", () => {
    // 拓扑：pump──main┬─dead（闭合死路）
    //                 └─valve（阀门输入=输出端）
    const adj = new Map([
        ["m", ["pump", "dead", "valve"]],
        ["pump", ["m"]],
        ["dead", ["m"]],
        ["valve", ["m"]],
    ]);
    const seg = makeSegTopo("s1", ["pump", "m", "dead", "valve"], adj, [
        endOf("pump", END_PUMP_OUT, "pump"),
        endOf("valve", END_VALVE_IN, "v3"),
    ]);
    const segments = new Map([["s1", seg]]);
    const pumps = new Map([["pump", { on: true, soaked: true }]]);
    computePotential(segments, new Map(), pumps);
    const covered = potCovered(seg);
    assert.ok(covered.has("pump"));
    assert.ok(covered.has("m"));
    assert.ok(covered.has("valve"));
    assert.ok(!covered.has("dead")); // 死胡同不渲染

    // 渲染顺序：路径内 BFS（死路不入列）
    const order = bfsPathOrder("pump", seg, covered);
    assert.ok(!order.includes("dead"));
    assert.equal(order.length, 3);
});

test("水流通路径：Y 形双输出（泵→两罐）两分支都渲染", () => {
    const adj = new Map([
        ["pump", ["m"]],
        ["m", ["pump", "t1", "t2"]],
        ["t1", ["m"]],
        ["t2", ["m"]],
    ]);
    const seg = makeSegTopo("s1", ["pump", "m", "t1", "t2"], adj, [
        endOf("pump", END_PUMP_OUT, "pump"),
        endOf("t1", END_TANK, "tank1"),
        endOf("t2", END_TANK, "tank2"),
    ]);
    const segments = new Map([["s1", seg]]);
    const pumps = new Map([["pump", { on: true, soaked: true }]]);
    computePotential(segments, new Map(), pumps);
    const covered = potCovered(seg);
    assert.equal(covered.size, 4); // 泵+主管+两分支全在路径内
});

test("泵泡水吐水：无输入段也输出（泵被水浸没）", () => {
    // 只有输出段（泵输出+罐），无任何泵输入段 → 泵泡水直接吐水
    const outSeg = makeSeg("out", ["0,10,2", "0,10,3"], [endOf("0,10,2", END_PUMP_OUT, "pump"), endOf("0,10,3", END_TANK, "tank")]);
    const segments = new Map([["out", outSeg]]);
    const pumps = new Map([["pump", { on: true, soaked: true }]]);
    computePotential(segments, new Map(), pumps);
    assert.equal(outSeg.pot.get("0,10,2"), PUMP_DELTA);
    assert.equal(outSeg.pot.get("0,10,3"), PUMP_DELTA);

    // 未泡水且无输入段 → 不吐水
    const pumpsDry = new Map([["pump", { on: true }]]);
    computePotential(segments, new Map(), pumpsDry);
    assert.equal(outSeg.pot.get("0,10,2"), undefined);
});

// === 洪水 ===
function makeGraph(layout) {
    return {
        isPipe(key) { return layout[key]?.type === "pipe"; },
        isValveOpen(key) { return layout[key]?.type === "valve" && !!layout[key].open; },
        neighborKey(key, face) { return layout[key]?.links?.[face] ?? null; },
        describeEnd(pipeKey, face) {
            const nb = this.neighborKey(pipeKey, face);
            if (!nb) return [];
            const end = { key: `${pipeKey}#${face}`, pipeKey, face, kind: END_WALL };
            const t = layout[nb]?.type ?? nb;
            if (t === "tank") { end.kind = END_TANK; end.deviceKey = nb; }
            else if (t === "open") end.kind = END_OPEN;
            else if (t === "pump") {
                const side = oppositeFace(face); // 泵的哪一面朝管道
                end.kind = side === "up" ? END_PUMP_OUT : (side === "down" ? END_PUMP_IN : END_WALL);
                end.deviceKey = nb;
            }
            return [end];
        },
    };
}

test("洪水：泵顶=输出/底=输入、侧=墙", () => {
    const g = makeGraph({
        pump: { type: "pump" },
        pTop: { type: "pipe", links: { down: "pump" } },
        pBot: { type: "pipe", links: { up: "pump" } },
        pSide: { type: "pipe", links: { north: "pump" } },
    });
    assert.equal(g.describeEnd("pTop", "down")[0].kind, END_PUMP_OUT);
    assert.equal(g.describeEnd("pBot", "up")[0].kind, END_PUMP_IN);
    assert.equal(g.describeEnd("pSide", "north")[0].kind, END_WALL);
});

test("洪水：开阀透传 / 关阀断段", () => {
    const gOpen = makeGraph({
        p1: { type: "pipe", links: { south: "v1" } },
        v1: { type: "valve", open: true, links: { north: "p1", south: "p2" } },
        p2: { type: "pipe", links: { north: "v1", south: "open" } },
        open: { type: "open" },
    });
    const seg = floodSegment("p1", gOpen, "s1");
    assert.equal(seg.len, 3);

    const gClosed = makeGraph({
        p1: { type: "pipe", links: { south: "v1" } },
        v1: { type: "valve", open: false, links: { north: "p1", south: "p2" } },
        p2: { type: "pipe", links: { north: "v1", south: "open" } },
        open: { type: "open" },
    });
    const segA = floodSegment("p1", gClosed, "s1");
    const segB = floodSegment("p2", gClosed, "s2");
    assert.deepEqual(segA.pass, ["p1"]);
    assert.deepEqual(segB.pass, ["p2"]);
});

test("阀门链直接相连：flood 收集链上多端点 + 势跨链贯通", () => {
    // A—v1—v2—C：v1 输出面贴着 v2 输入面（中间无管道）。引擎 describeEnd 链穿越 →
    // A 段收集 [valveIn(v1), valveIn(v2)]，C 段收集 [valveOut(v2)]，v2 的 link 配对成立。
    const g = {
        isPipe: (k) => ["A", "C"].includes(k),
        isValveOpen: () => false,
        neighborKey(k, face) {
            return { A: { south: "v1" }, v1: { north: "A", south: "v2" }, v2: { north: "v1", south: "C" }, C: { north: "v2", south: "tank" } }[k]?.[face] ?? null;
        },
        describeEnd(pipeKey, face) {
            const nb = this.neighborKey(pipeKey, face);
            if (!nb) return [];
            if (nb === "v1") return [endOf(pipeKey, END_VALVE_IN, "v1"), endOf(pipeKey, END_VALVE_IN, "v2")];
            if (nb === "v2") return [endOf(pipeKey, END_VALVE_OUT, "v2")];
            if (nb === "tank") return [endOf(pipeKey, END_TANK, "tank")];
            return [];
        },
    };
    const segA = floodSegment("A", g, "sA");
    assert.deepEqual(segA.ends.map((e) => `${e.kind}:${e.deviceKey}`).sort(), ["valveIn:v1", "valveIn:v2"]);
    const segC = floodSegment("C", g, "sC");
    assert.deepEqual(segC.ends.map((e) => `${e.kind}:${e.deviceKey}`).sort(), ["tank:tank", "valveOut:v2"]);

    // 势跨链贯通：泵 → A 段 → 罐 C 段
    const pumpSeg = makeSeg("sA", ["A1", "A2", "A3"], [
        endOf("A1", END_PUMP_OUT, "pump"),
        endOf("A3", END_VALVE_IN, "v1"),
        endOf("A3", END_VALVE_IN, "v2"),
    ]);
    const tankSeg = makeSeg("sC", ["C"], [
        endOf("C", END_VALVE_OUT, "v2"),
        endOf("C", END_TANK, "tank"),
    ]);
    const segments = new Map([["sA", pumpSeg], ["sC", tankSeg]]);
    const pumps = new Map([["pump", { on: true, soaked: true }]]);
    computePotential(segments, new Map(), pumps);
    assert.equal(tankSeg.pot.get("C"), PUMP_DELTA); // 链上最末阀 v2 的 link 贯通
    tickFlow(segments, new Map(), pumps);
    assert.equal(pumpSeg.front, 2); // 上游 3 管未满
    assert.equal(tankSeg.front, 0); // 闸门关闭
});

test("oppositeFace", () => {
    assert.equal(oppositeFace("north"), "south");
    assert.equal(oppositeFace("up"), "down");
});

test("coveredOf 按前沿覆盖", () => {
    const seg = makeSeg("s1", ["0,10,0", "0,10,1", "0,10,2"], []);
    seg.order = bfsOrder("0,10,2", seg);
    assert.deepEqual([...coveredOf(seg, 2)].sort(), ["0,10,1", "0,10,2"]);
});
