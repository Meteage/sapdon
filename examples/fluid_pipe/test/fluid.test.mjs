// fluidCore v2 引擎核心测试副本（镜像 scripts/fluidCore.ts，改引擎须同步本副本）
// 运行: node --test test/fluid.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

// === 镜像 constants ===
const WATER_POT = 1;
const SINK_POT = -1;
const FULL_TANK_POT = 0;
const PUMP_DELTA = 4;
const TANK_MAX = 32;
const UP_COST = 1;
const FRONT_SPEED = 2;
const EPS = 0.02;

const END_SOURCE = "source";
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
        if (isPipe) {
            const soak = graph.soaked(key);
            if (soak) ends.push(soak);
        }
        const nbrs = [];
        for (const face of ["north", "south", "east", "west", "up", "down"]) {
            const nb = graph.neighborKey(key, face);
            if (!nb) continue;
            if (visited.has(nb)) { nbrs.push(nb); continue; }
            if (graph.isPipe(nb)) { nbrs.push(nb); queue.push(nb); continue; }
            if (graph.isValveOpen(nb)) { nbrs.push(nb); queue.push(nb); continue; }
            if (isPipe) {
                const end = graph.describeEnd(key, face);
                if (end) ends.push(end);
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
        for (const seg of segments.values()) {
            for (const e of seg.ends) {
                if (e.kind === END_SOURCE) {
                    const before = seg.pot.get(e.pipeKey);
                    spreadFrom(seg, e.pipeKey, WATER_POT);
                    if (before !== seg.pot.get(e.pipeKey)) changed = true;
                }
                if (e.kind === END_TANK) {
                    const t = tanks.get(e.deviceKey);
                    if (t && t.level >= TANK_MAX) {
                        const before = seg.pot.get(e.pipeKey);
                        spreadFrom(seg, e.pipeKey, FULL_TANK_POT);
                        if (before !== seg.pot.get(e.pipeKey)) changed = true;
                    }
                }
            }
        }
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

function segHasOpenDrain(seg) {
    for (const e of seg.ends) {
        if (e.kind === END_OPEN) {
            const p = seg.pot.get(e.pipeKey) ?? SINK_POT;
            if (p > SINK_POT + EPS) return true;
        }
    }
    return false;
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

function tickFlow(segments, tanks, pumps) {
    const tankDeltas = new Map();
    let drain = 0;
    for (const seg of segments.values()) {
        // 水覆盖：路径 + 路径顺序 + 前沿渐进逼近势覆盖（写入 seg 逻辑状态）
        const path = potCovered(seg);
        const anchor = seg.hi ? seg.hi.pipeKey : (seg.pipes[0] ?? null);
        if (anchor) seg.order = bfsPathOrder(anchor, seg, path);
        const target = path.size;
        let front = seg.front;
        if (target > front) front = Math.min(target, front + FRONT_SPEED);
        else if (target < front) front = Math.max(target, front - FRONT_SPEED);
        seg.front = front;
        seg.covered = coveredOf(seg, front);
        for (const e of seg.ends) {
            const p = seg.pot.get(e.pipeKey) ?? SINK_POT;
            if (e.kind === END_OPEN && p > SINK_POT + EPS) drain++;
            if (e.kind === END_TANK) {
                const t = tanks.get(e.deviceKey);
                if (!t) continue;
                const port = t.level >= TANK_MAX ? FULL_TANK_POT : SINK_POT;
                if (t.level < TANK_MAX && p > port + EPS) {
                    tankDeltas.set(e.deviceKey, (tankDeltas.get(e.deviceKey) ?? 0) + 1);
                } else if (t.level >= TANK_MAX && segHasOpenDrain(seg)) {
                    tankDeltas.set(e.deviceKey, (tankDeltas.get(e.deviceKey) ?? 0) - 1);
                }
            }
            if (e.kind === END_PUMP_IN && pumps.get(e.deviceKey)?.on) {
                const pIn = seg.pot.get(e.pipeKey);
                const hasTankWater = seg.ends.some((te) => te.kind === END_TANK && (tanks.get(te.deviceKey)?.level ?? 0) > 0);
                if (pIn != null || hasTankWater) {
                    drain++;
                    for (const te of seg.ends) {
                        if (te.kind === END_TANK && te.deviceKey !== e.deviceKey) {
                            const t = tanks.get(te.deviceKey);
                            if (t && t.level > 0) {
                                tankDeltas.set(te.deviceKey, (tankDeltas.get(te.deviceKey) ?? 0) - 1);
                            }
                        }
                    }
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
test("水=1，水平传播不衰减", () => {
    const seg = makeSeg("s1", ["0,10,0", "0,10,1"], [endOf("0,10,0", END_SOURCE)]);
    const segments = new Map([["s1", seg]]);
    computePotential(segments, new Map(), new Map());
    assert.equal(seg.pot.get("0,10,0"), 1);
    assert.equal(seg.pot.get("0,10,1"), 1);
});

test("向上每格势 -1", () => {
    const seg = makeSeg("s1", ["0,10,0", "0,11,0", "0,12,0"], [endOf("0,10,0", END_SOURCE)]);
    computePotential(new Map([["s1", seg]]), new Map(), new Map());
    assert.equal(seg.pot.get("0,10,0"), 1);
    assert.equal(seg.pot.get("0,11,0"), 0);
    assert.equal(seg.pot.get("0,12,0"), -1);
});

test("向下/水平传播不减势", () => {
    const seg = makeSeg("s1", ["0,10,0", "0,9,0", "0,8,0"], [endOf("0,10,0", END_SOURCE)]);
    computePotential(new Map([["s1", seg]]), new Map(), new Map());
    assert.equal(seg.pot.get("0,9,0"), 1);
    assert.equal(seg.pot.get("0,8,0"), 1);
});

test("空气端子 -1 汇：势> -1 流失", () => {
    const seg = makeSeg("s1", ["0,10,0", "0,10,1"], [endOf("0,10,0", END_SOURCE), endOf("0,10,1", END_OPEN)]);
    const segments = new Map([["s1", seg]]);
    computePotential(segments, new Map(), new Map());
    const r = tickFlow(segments, new Map(), new Map());
    assert.equal(r.drain, 1);
    assert.equal(seg.front, 0); // 仅泡水+空气端 → 段无效，不渲染
});

test("墙端不流失", () => {
    const seg = makeSeg("s1", ["0,10,0", "0,10,1"], [endOf("0,10,0", END_SOURCE), endOf("0,10,1", END_WALL)]);
    const segments = new Map([["s1", seg]]);
    computePotential(segments, new Map(), new Map());
    const r = tickFlow(segments, new Map(), new Map());
    assert.equal(r.drain, 0);
});

test("泵造势：输出段势 = 固定 +Δ（并联，输入侧有水才吐）", () => {
    const inSeg = makeSeg("in", ["0,10,0", "0,10,1"], [endOf("0,10,0", END_SOURCE), endOf("0,10,1", END_PUMP_IN, "pump")]);
    const outSeg = makeSeg("out", ["0,10,2", "0,10,3"], [endOf("0,10,2", END_PUMP_OUT, "pump"), endOf("0,10,3", END_OPEN)]);
    const segments = new Map([["in", inSeg], ["out", outSeg]]);
    const pumps = new Map([["pump", { on: true }]]);
    computePotential(segments, new Map(), pumps);
    assert.equal(inSeg.pot.get("0,10,1"), 1);
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

test("泵抽罐：输入段罐液位下降、输出段流失", () => {
    const inSeg = makeSeg("in", ["0,10,0", "0,10,1"], [endOf("0,10,0", END_TANK, "tank"), endOf("0,10,1", END_PUMP_IN, "pump")]);
    const outSeg = makeSeg("out", ["0,10,2", "0,10,3"], [endOf("0,10,2", END_PUMP_OUT, "pump"), endOf("0,10,3", END_OPEN)]);
    const segments = new Map([["in", inSeg], ["out", outSeg]]);
    const tanks = new Map([["tank", { level: 10 }]]);
    const pumps = new Map([["pump", { on: true }]]);
    computePotential(segments, tanks, pumps);
    const r = tickFlow(segments, tanks, pumps);
    assert.equal(r.tankDeltas.get("tank"), -1); // 泵抽罐
    assert.ok(r.drain >= 1); // 泵吸水 + 输出流失
});

test("罐 32 格：未满吸入、满停止、满罐重力排水", () => {
    // 未满：水源灌入
    const seg1 = makeSeg("s1", ["0,10,0", "0,10,1"], [endOf("0,10,0", END_SOURCE), endOf("0,10,1", END_TANK, "tank")]);
    let tanks = new Map([["tank", { level: 10 }]]);
    let segments = new Map([["s1", seg1]]);
    computePotential(segments, tanks, new Map());
    let r = tickFlow(segments, tanks, new Map());
    assert.equal(r.tankDeltas.get("tank"), 1);

    // 满：停止吸入（level=32 不吸）
    tanks = new Map([["tank", { level: TANK_MAX }]]);
    segments = new Map([["s1", seg1]]);
    computePotential(segments, tanks, new Map());
    r = tickFlow(segments, tanks, new Map());
    assert.equal(r.tankDeltas.get("tank"), undefined);

    // 满罐 + 空气：重力排水（满罐势 0 传播，空气 -1 流失 → 罐 -1）
    const seg2 = makeSeg("s2", ["0,10,0", "0,10,1"], [endOf("0,10,0", END_TANK, "tank"), endOf("0,10,1", END_OPEN)]);
    tanks = new Map([["tank", { level: TANK_MAX }]]);
    segments = new Map([["s2", seg2]]);
    computePotential(segments, tanks, new Map());
    r = tickFlow(segments, tanks, new Map());
    assert.equal(r.tankDeltas.get("tank"), -1);
    assert.equal(r.drain, 1);

    // 未满罐 + 空气：罐是汇(-1) 不传播 → 空气端势 -1 不流失、罐不吸不排
    const seg3 = makeSeg("s3", ["0,10,0", "0,10,1"], [endOf("0,10,0", END_TANK, "tank"), endOf("0,10,1", END_OPEN)]);
    tanks = new Map([["tank", { level: 16 }]]);
    segments = new Map([["s3", seg3]]);
    computePotential(segments, tanks, new Map());
    r = tickFlow(segments, tanks, new Map());
    assert.equal(r.tankDeltas.get("tank"), undefined);
    assert.equal(r.drain, 0);
});

test("三通阀透传：输入侧势 → 输出侧", () => {
    const inSeg = makeSeg("in", ["0,10,0", "0,10,1"], [endOf("0,10,0", END_SOURCE), endOf("0,10,1", END_VALVE_IN, "v3")]);
    const outSeg = makeSeg("out", ["0,10,2", "0,10,3"], [endOf("0,10,2", END_VALVE_OUT, "v3"), endOf("0,10,3", END_OPEN)]);
    const segments = new Map([["in", inSeg], ["out", outSeg]]);
    computePotential(segments, new Map(), new Map());
    assert.equal(outSeg.pot.get("0,10,2"), 1);
    assert.equal(outSeg.pot.get("0,10,3"), 1);
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

test("前沿回落：势消失后水渐渐退干（势驱动）", () => {
    const seg = makeSeg("s1", ["0,10,0", "0,10,1", "0,10,2", "0,10,3", "0,10,4"], [endOf("0,10,0", END_PUMP_OUT, "pump"), endOf("0,10,4", END_TANK, "tank")]);
    const segments = new Map([["s1", seg]]);
    const pumps = new Map([["pump", { on: true, soaked: true }]]);
    computePotential(segments, new Map(), pumps);
    let r = tickFlow(segments, new Map(), pumps);
    assert.equal(seg.front, 2);

    // 泵停（势消失）→ 前沿每 tick -FRONT_SPEED 直到 0
    pumps.set("pump", { on: false, soaked: true });
    computePotential(segments, new Map(), pumps);
    r = tickFlow(segments, new Map(), pumps);
    assert.equal(seg.front, 0);
    r = tickFlow(segments, new Map(), pumps);
    assert.equal(seg.front, 0);
});

test("potCovered：只含势 > -1 的管道（有效段）", () => {
    const seg = makeSeg("s1", ["0,10,0", "0,13,0", "0,16,0"], [endOf("0,10,0", END_PUMP_OUT, "pump"), endOf("0,16,0", END_TANK, "tank")]);
    const segments = new Map([["s1", seg]]);
    const pumps = new Map([["pump", { on: true, soaked: true }]]);
    computePotential(segments, new Map(), pumps);
    assert.deepEqual([...potCovered(seg)].sort(), ["0,10,0", "0,13,0"]); // 0,16 势=-2 不含
});

test("有效管道判定：孤立/仅泡水/仅空气端段无效", () => {
    const iso = makeSeg("s1", ["0,10,0"], [endOf("0,10,0", END_OPEN)]);
    assert.equal(segValid(iso), false);

    const soak = makeSeg("s2", ["0,10,0"], [endOf("0,10,0", END_SOURCE)]);
    assert.equal(segValid(soak), false); // 泡水不算输入

    const airEnd = makeSeg("s3", ["0,10,0"], [endOf("0,10,0", END_PUMP_OUT, "pump"), endOf("0,10,0", END_OPEN)]);
    assert.equal(segValid(airEnd), false); // 空气不算输出

    const valid = makeSeg("s4", ["0,10,0"], [endOf("0,10,0", END_PUMP_OUT, "pump"), endOf("0,10,0", END_TANK, "tank")]);
    assert.equal(segValid(valid), true);

    const valv = makeSeg("s5", ["0,10,0"], [endOf("0,10,0", END_VALVE_OUT, "v3"), endOf("0,10,0", END_TANK, "tank")]);
    assert.equal(segValid(valv), true);
});

test("仅泡水段：势场有水但 potCovered 为空（不渲染）", () => {
    const seg = makeSeg("s1", ["0,10,0", "0,10,1"], [endOf("0,10,0", END_SOURCE)]);
    const segments = new Map([["s1", seg]]);
    computePotential(segments, new Map(), new Map());
    assert.equal(seg.pot.get("0,10,1"), 1); // 势确实传播
    assert.equal(potCovered(seg).size, 0);   // 但段无效 → 不渲染
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
        soaked() { return null; },
        describeEnd(pipeKey, face) {
            const nb = this.neighborKey(pipeKey, face);
            if (!nb) return null;
            const end = { key: `${pipeKey}#${face}`, pipeKey, face, kind: END_WALL };
            const t = layout[nb]?.type ?? nb;
            if (t === "tank") { end.kind = END_TANK; end.deviceKey = nb; }
            else if (t === "open") end.kind = END_OPEN;
            else if (t === "pump") {
                const side = oppositeFace(face); // 泵的哪一面朝管道
                end.kind = side === "up" ? END_PUMP_OUT : (side === "down" ? END_PUMP_IN : END_WALL);
                end.deviceKey = nb;
            } else if (t === "source") end.kind = END_SOURCE;
            return end;
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
    assert.equal(g.describeEnd("pTop", "down").kind, END_PUMP_OUT);
    assert.equal(g.describeEnd("pBot", "up").kind, END_PUMP_IN);
    assert.equal(g.describeEnd("pSide", "north").kind, END_WALL);
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

test("oppositeFace", () => {
    assert.equal(oppositeFace("north"), "south");
    assert.equal(oppositeFace("up"), "down");
});

test("coveredOf 按前沿覆盖", () => {
    const seg = makeSeg("s1", ["0,10,0", "0,10,1", "0,10,2"], []);
    seg.order = bfsOrder("0,10,2", seg);
    assert.deepEqual([...coveredOf(seg, 2)].sort(), ["0,10,1", "0,10,2"]);
});
