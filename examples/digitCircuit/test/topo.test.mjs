// 拓扑求值核心单测（node test/topo.test.mjs）
// 复制自 circuit.js 的 buildTopoModel / topoCompute / evalTopo（含 freshFaceSignal 等辅助），
// 因后者依赖 @minecraft/server 无法在 Node 直接 import。改动 engine 这些函数时须同步本文件。
const FACES = ["north", "south", "east", "west", "up", "down"];
const FACES_HORIZ = ["north", "south", "east", "west"];
const SWITCH_TYPE = "sapdon:switch";
const DISPLAY_TYPE = "sapdon:display";
const SPLITTER_TYPE = "sapdon:splitter";
const MERGE_TYPE = "sapdon:merger";
const REGISTER_TYPE = "sapdon:register";
const GATE_TYPES = ["sapdon:and_gate", "sapdon:or_gate", "sapdon:not_gate"];
const INPUT_PORT_TYPE = "sapdon:input_port";
const OUTPUT_PORT_TYPE = "sapdon:output_port";

function isInputPort(t) { return t === INPUT_PORT_TYPE; }
function isOutputPort(t) { return t === OUTPUT_PORT_TYPE; }
function isPort(t) { return isInputPort(t) || isOutputPort(t); }
function isGate(t) { return GATE_TYPES.includes(t); }
function oppositeFace(face) {
    switch (face) { case "north": return "south"; case "south": return "north"; case "east": return "west"; case "west": return "east"; case "up": return "down"; case "down": return "up"; }
    return "up";
}
function gateOutputFace(facing) {
    switch (facing) { case "north": return "east"; case "west": return "north"; case "south": return "west"; case "east": return "south"; }
    return "east";
}
function notInputFace(facing) {
    switch (facing) { case "north": return "west"; case "west": return "south"; case "south": return "east"; case "east": return "north"; }
    return "west";
}
function splitterFaces(facing) { return { input: oppositeFace(gateOutputFace(facing)), through: gateOutputFace(facing), split: facing }; }
function mergeFaces(facing) { return { west: oppositeFace(gateOutputFace(facing)), south: oppositeFace(facing), out: gateOutputFace(facing) }; }
function registerFaces(facing) { return { w: facing, d: oppositeFace(gateOutputFace(facing)), q: gateOutputFace(facing) }; }

function freshOutputFace(c, face) {
    if (c.type === SWITCH_TYPE || c.type === "sapdon:on_signal" || c.type === "sapdon:off_signal") return true;
    if (isGate(c.type)) return face === gateOutputFace(c.facing);
    if (c.type === SPLITTER_TYPE) { const f = splitterFaces(c.facing); return face === f.through || face === f.split; }
    if (c.type === MERGE_TYPE) return face === mergeFaces(c.facing).out;
    if (c.type === REGISTER_TYPE) return face === registerFaces(c.facing).q;
    if (isPort(c.type)) return true;
    return false;
}
function freshGateInputs(c) {
    if (c.type === "sapdon:not_gate") return [notInputFace(c.facing)];
    return FACES_HORIZ.filter((f) => f !== gateOutputFace(c.facing));
}
function freshNetSignal(netId, netsMap, comps) {
    const net = netsMap.get(netId);
    if (!net) return 0;
    for (const { compKey, face } of net.terms.values()) {
        const c = comps.get(compKey);
        if (!c) continue;
        if (isPort(c.type)) {
            // 输出端口不贡献网络值（网络已跨过端口连通，值由真驱动提供）；
            // 输入端口是外部源，照常以 powered 驱动。
            if (isOutputPort(c.type)) continue;
            if (c.powered) return 1;
            continue;
        }
        if (!c.powered) continue;
        if (freshOutputFace(c, face)) return 1;
    }
    return 0;
}
function freshFaceSignal(c, face, netsMap, comps) {
    const dk = c.directs[face];
    if (dk) { const d = comps.get(dk); if (d && freshOutputFace(d, oppositeFace(face))) return d.powered; }
    const netId = c.nets[face];
    if (!netId) return 0;
    return freshNetSignal(netId, netsMap, comps);
}
function freshOutputWidth(c, face, netsMap, comps) {
    if (c.type === SPLITTER_TYPE) {
        const f = splitterFaces(c.facing);
        if (face === f.through) return Math.max(0, freshFaceWidth(c, f.input, netsMap, comps) - 1);
        if (face === f.split) return freshFaceWidth(c, f.input, netsMap, comps) >= 1 ? 1 : 0;
        return 1;
    }
    if (c.type === MERGE_TYPE) { const m = mergeFaces(c.facing); if (face === m.out) return freshFaceWidth(c, m.west, netsMap, comps) + 1; return 1; }
    return 1;
}
function freshFaceWidth(c, face, netsMap, comps) {
    const dk = c.directs[face];
    if (dk) { const d = comps.get(dk); if (d) return freshOutputWidth(d, oppositeFace(face), netsMap, comps); }
    const netId = c.nets[face];
    const net = netId ? netsMap.get(netId) : null;
    return net ? (net.width ?? 1) : 1;
}
function freshGateWidthError(c, netsMap, comps) {
    if (!isGate(c.type)) return null;
    for (const face of freshGateInputs(c)) { if (freshFaceWidth(c, face, netsMap, comps) > 1) return face; }
    return null;
}

// ===== 纯逻辑表达式求值副本（对齐 circuit.js evalExprNodes） =====
function evalExprNodes(expr, inVal) {
    const ev = (node) => {
        if (!node) return 0;
        switch (node[0]) {
            case "c": return node[1];
            case "in": return (inVal >> node[1]) & 1;
            case "not": return ev(node[1]) ? 0 : 1;
            case "and": return ev(node[1]) && ev(node[2]) ? 1 : 0;
            case "or": return ev(node[1]) || ev(node[2]) ? 1 : 0;
        }
        return 0;
    };
    let outMask = 0;
    for (let j = 0; j < expr.length; j++) if (ev(expr[j])) outMask |= 1 << j;
    return outMask;
}
function exprForOutput(c, outFace, bit, ctx) {
    if (!c) return null;
    if (c.type === "sapdon:on_signal") return ["c", 1];
    if (c.type === "sapdon:off_signal") return ["c", 0];
    if (c.type === SWITCH_TYPE) return ["c", c.powered ? 1 : 0];
    if (isInputPort(c.type)) {
        const idx = ctx.inputBitOf.get(c.key);
        if (idx === undefined) return null;
        return ["in", idx];
    }
    if (isOutputPort(c.type)) return null;
    const ck = c.key;
    if (ctx.stack.has(ck)) return null;
    ctx.stack.add(ck);
    let node = null;
    if (isGate(c.type)) {
        const ins = freshGateInputs(c);
        if (c.type === "sapdon:not_gate") {
            node = ["not", exprForFace(c, ins[0], bit, ctx)];
        } else {
            const parts = [];
            for (const f of ins) {
                const sub = exprForFace(c, f, bit, ctx);
                if (sub === null) { node = null; break; }
                parts.push(sub);
            }
            if (parts.length) {
                node = parts[0];
                for (let i = 1; i < parts.length; i++) node = [c.type === "sapdon:and_gate" ? "and" : "or", node, parts[i]];
            }
        }
    } else if (c.type === SPLITTER_TYPE) {
        const f = splitterFaces(c.facing);
        if (outFace === f.through) node = exprForFace(c, f.input, bit + 1, ctx);
        else if (outFace === f.split) node = exprForFace(c, f.input, 0, ctx);
    } else if (c.type === MERGE_TYPE) {
        const m = mergeFaces(c.facing);
        if (outFace === m.out) {
            node = bit === 0 ? exprForFace(c, m.south, 0, ctx) : exprForFace(c, m.west, bit - 1, ctx);
        }
    }
    ctx.stack.delete(ck);
    return node;
}
function exprForFace(c, face, bit, ctx) {
    if (!c) return ["c", 0];
    const dk = c.directs ? c.directs[face] : null;
    if (dk) {
        const d = ctx.comps.get(dk);
        if (d && freshOutputFace(d, oppositeFace(face))) {
            return exprForOutput(d, oppositeFace(face), bit, ctx);
        }
        return null;
    }
    const netId = c.nets ? c.nets[face] : null;
    if (!netId) return ["c", 0];
    if (ctx.netStack.has(netId)) return null;
    ctx.netStack.add(netId);
    const net = ctx.netsMap.get(netId);
    if (!net) { ctx.netStack.delete(netId); return ["c", 0]; }
    let node = null;
    for (const { compKey, face: tf } of net.terms.values()) {
        const d = ctx.comps.get(compKey);
        if (!d || !freshOutputFace(d, tf)) continue;
        if (isOutputPort(d.type)) continue;
        const sub = exprForOutput(d, tf, bit, ctx);
        if (sub !== null) {
            node = node === null ? sub : ["or", node, sub];
        }
    }
    ctx.netStack.delete(netId);
    return node === null ? ["c", 0] : node;
}
function tryBuildExprModel(comps, netsMap, inputs, outputs) {
    const inputBitOf = new Map();
    for (let i = 0; i < inputs.length; i++) inputBitOf.set(inputs[i].c.key, i);
    const ctx = { comps, netsMap, inputBitOf, stack: new Set(), netStack: new Set() };
    const expr = [];
    for (const p of outputs) {
        const c = p.c;
        let node = null;
        for (const face of FACES) {
            const dk = c.directs ? c.directs[face] : null;
            const netId = c.nets ? c.nets[face] : null;
            if (!dk && !netId) continue;
            node = exprForFace(c, face, 0, ctx);
            if (node !== null) break;
        }
        if (node === null) return null;
        expr.push(node);
        ctx.stack.clear();
        ctx.netStack.clear();
    }
    return expr;
}

function buildTopoModel(topo) {
    const comps = new Map();
    const relToLoc = (k) => { const m = /^(-?\d+),(-?\d+),(-?\d+)$/.exec(k); return m ? { x: +m[1], y: +m[2], z: +m[3] } : { x: 0, y: 0, z: 0 }; };
    for (const c of topo.comps) {
        comps.set(c.k, { key: c.k, type: c.t, facing: c.f || "north", powered: c.p || 0, loc: relToLoc(c.k), nets: {}, directs: {} });
    }
    const netsMap = new Map();
    (topo.nets || []).forEach((n, i) => {
        const net = { id: `tn${i}`, wires: new Set((n.wires || []).map((w) => (Array.isArray(w) ? `${w[0]},${w[1]},${w[2]}` : w))), terms: new Map(), width: n.width ?? 1, value: 0 };
        for (const [ck, face] of n.terms || []) net.terms.set(`${ck}|${face}`, { compKey: ck, face });
        netsMap.set(net.id, net);
    });
    for (const c of topo.comps) {
        const comp = comps.get(c.k);
        for (const [face, idx] of Object.entries(c.nets || {})) comp.nets[face] = idx != null && netsMap.has(`tn${idx}`) ? `tn${idx}` : null;
        for (const [face, dk] of Object.entries(c.directs || {})) comp.directs[face] = dk || null;
    }
    const inputOf = new Map((topo.inputs || []).map((p) => [p.k, comps.get(p.k)]));
    const outputOf = new Map((topo.outputs || []).map((p) => [p.k, comps.get(p.k)]));
    return { comps, netsMap, inputOf, outputOf };
}

function topoCompute(c, netsMap, comps, store) {
    const t = c.type;
    if (t === "sapdon:on_signal") return 1;
    if (t === "sapdon:off_signal") return 0;
    if (t === SWITCH_TYPE) return c.powered;
    if (t === DISPLAY_TYPE || isPort(t)) { let v = 0; for (const face of FACES) v = v || freshFaceSignal(c, face, netsMap, comps); return v ? 1 : 0; }
    if (t === SPLITTER_TYPE) { const f = splitterFaces(c.facing); return freshFaceSignal(c, f.input, netsMap, comps) ? 1 : 0; }
    if (t === MERGE_TYPE) { const m = mergeFaces(c.facing); return (freshFaceSignal(c, m.west, netsMap, comps) || freshFaceSignal(c, m.south, netsMap, comps)) ? 1 : 0; }
    if (t === REGISTER_TYPE) {
        const f = registerFaces(c.facing);
        const wSig = freshFaceSignal(c, f.w, netsMap, comps);
        const dVal = freshFaceSignal(c, f.d, netsMap, comps);
        let cur = store[c.key] || 0;
        if (wSig) cur = store[c.key] = dVal ? 1 : 0;
        return cur;
    }
    if (isGate(t)) {
        const ins = freshGateInputs(c).map((f) => freshFaceSignal(c, f, netsMap, comps));
        if (freshGateWidthError(c, netsMap, comps)) return 0;
        if (t === "sapdon:and_gate") return ins.every(Boolean) ? 1 : 0;
        if (t === "sapdon:or_gate") return ins.some(Boolean) ? 1 : 0;
        if (t === "sapdon:not_gate") return ins[0] ? 0 : 1;
    }
    return 0;
}

function evalTopoDebug(compileComp, topo, inVal) {
    if (!topo || !Array.isArray(topo.comps)) return 0;
    if (!compileComp._topoModel) compileComp._topoModel = buildTopoModel(topo);
    const { comps, netsMap, inputOf, outputOf } = compileComp._topoModel;
    const store = compileComp._topoStore || (compileComp._topoStore = {});
    for (let i = 0; i < topo.inputs.length; i++) { const c = inputOf.get(topo.inputs[i].k); if (c) c.powered = (inVal >> i) & 1; }
    let changed = true, it = 0;
    while (changed && it < 32) {
        changed = false;
        for (const c of comps.values()) {
            if (isInputPort(c.type)) continue;
            const before = c.powered;
            const v = topoCompute(c, netsMap, comps, store);
            if (v !== c.powered) { c.powered = v; changed = true; }
        }
        it++;
    }
    let outMask = 0;
    for (let j = 0; j < topo.outputs.length; j++) { const c = outputOf.get(topo.outputs[j].k); if (c && c.powered) outMask |= 1 << j; }
    if (compileComp._dbg) {
        console.log(`inVal=${inVal}`);
        for (const c of comps.values()) console.log(`  ${c.type}@(${c.loc.x},${c.loc.y},${c.loc.z}) p=${c.powered} d=${JSON.stringify(c.directs)}`);
    }
    return outMask;
}
function evalTopo(compileComp, topo, inVal) {
    if (!topo || !Array.isArray(topo.comps)) return 0;
    if (!compileComp._topoModel) compileComp._topoModel = buildTopoModel(topo);
    const { comps, netsMap, inputOf, outputOf } = compileComp._topoModel;
    const store = compileComp._topoStore || (compileComp._topoStore = {});
    for (let i = 0; i < topo.inputs.length; i++) { const c = inputOf.get(topo.inputs[i].k); if (c) c.powered = (inVal >> i) & 1; }
    let changed = true, it = 0;
    while (changed && it < 32) {
        changed = false;
        for (const c of comps.values()) {
            if (isInputPort(c.type)) continue;
            const before = c.powered;
            const v = topoCompute(c, netsMap, comps, store);
            if (v !== c.powered) { c.powered = v; changed = true; }
        }
        it++;
    }
    let outMask = 0;
    for (let j = 0; j < topo.outputs.length; j++) { const c = outputOf.get(topo.outputs[j].k); if (c && c.powered) outMask |= 1 << j; }
    return outMask;
}

// ---- 断言 ----
let pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; console.log(`  PASS ${msg}`); }
    else { fail++; console.error(`  FAIL ${msg}`); }
}

// 用例1: 3输入 AND —— 直接连线（direct）
// in0@(0,0,0) in1@(1,0,1) in2@(1,0,-1) AND@(1,0,0) facing=north(输出east) out@(2,0,0)
// AND 输入面 = west/south/north（除 east）：in0(west), in1(north), in2(south)
{
    const topo = {
        origin: { x: 0, y: 0, z: 0 },
        inputs: [{ num: 0, k: "0,0,0" }, { num: 1, k: "1,0,1" }, { num: 2, k: "1,0,-1" }],
        outputs: [{ num: 2, k: "2,0,0" }],
        comps: [
            { k: "0,0,0", t: "sapdon:input_port", x: 0, y: 0, z: 0, f: "north", nets: {}, directs: { east: "1,0,0" } },
            { k: "1,0,1", t: "sapdon:input_port", x: 1, y: 0, z: 1, f: "north", nets: {}, directs: { south: "1,0,0" } },
            { k: "1,0,-1", t: "sapdon:input_port", x: 1, y: 0, z: -1, f: "north", nets: {}, directs: { north: "1,0,0" } },
            { k: "1,0,0", t: "sapdon:and_gate", x: 1, y: 0, z: 0, f: "north", p: 0, nets: {}, directs: { west: "0,0,0", north: "1,0,1", south: "1,0,-1", east: "2,0,0" } },
            { k: "2,0,0", t: "sapdon:output_port", x: 2, y: 0, z: 0, f: "north", nets: {}, directs: { west: "1,0,0" } },
        ],
        nets: [],
    };
    const comp = {};
    assert(evalTopo(comp, topo, 0) === 0, `AND3(000)=0`);
    assert(evalTopo(comp, topo, 4) === 0, `AND3(100)=0`);
    assert(evalTopo(comp, topo, 3) === 0, `AND3(011)=0`);
    comp._dbg = true;
    assert(evalTopoDebug(comp, topo, 7) === 1, `AND3(111)=1`);
    comp._dbg = false;
    assert(evalTopo(comp, topo, 6) === 0, `AND3(110)=0`);
    assert(evalTopo(comp, topo, 5) === 0, `AND3(101)=0`);
}

// 用例2: 1输入 NOT —— 输入端口@(0,0,0) south 连 not 的 west 面（facing north），not east 连输出端口@(2,0,0)
{
    const topo = {
        origin: { x: 0, y: 0, z: 0 },
        inputs: [{ num: 5, k: "0,0,0" }],
        outputs: [{ num: 1, k: "2,0,0" }],
        comps: [
            { k: "0,0,0", t: "sapdon:input_port", x: 0, y: 0, z: 0, f: "north", nets: {}, directs: { east: "1,0,0" } },
            { k: "1,0,0", t: "sapdon:not_gate", x: 1, y: 0, z: 0, f: "north", p: 0, nets: {}, directs: { west: "0,0,0", east: "2,0,0" } },
            { k: "2,0,0", t: "sapdon:output_port", x: 2, y: 0, z: 0, f: "north", nets: {}, directs: { west: "1,0,0" } },
        ],
        nets: [],
    };
    const comp2 = { _dbg: false };
    assert(evalTopo(comp2, topo, 0) === 1, `NOT(0)=1`);
    assert(evalTopo(comp2, topo, 1) === 0, `NOT(1)=0`);
    assert(evalTopo(comp2, topo, 0) === 1, `NOT(0)=1 (稳定)`);
}

// 用例3: 寄存器 —— W=in0(bit0)@(2,0,3), D=in1(bit1)@(1,0,2)，Q→out@(3,0,2)
{
    const topo = {
        origin: { x: 0, y: 0, z: 0 },
        inputs: [{ num: 0, k: "2,0,3" }, { num: 1, k: "1,0,2" }],
        outputs: [{ num: 3, k: "3,0,2" }],
        comps: [
            { k: "2,0,3", t: "sapdon:input_port", x: 2, y: 0, z: 3, f: "north", nets: {}, directs: { south: "2,0,2" } },
            { k: "1,0,2", t: "sapdon:input_port", x: 1, y: 0, z: 2, f: "north", nets: {}, directs: { east: "2,0,2" } },
            { k: "2,0,2", t: "sapdon:register", x: 2, y: 0, z: 2, f: "north", p: 0, nets: {}, directs: { north: "2,0,3", west: "1,0,2", east: "3,0,2" } },
            { k: "3,0,2", t: "sapdon:output_port", x: 3, y: 0, z: 2, f: "north", nets: {}, directs: { west: "2,0,2" } },
        ],
        nets: [],
    };
    const comp = { _dbg: true };
    assert(evalTopo(comp, topo, 0) === 0, `REG, W0D0 => 0`);
    assert(evalTopoDebug(comp, topo, 3) === 1, `REG, W1D1 write 1 => 1`);
    comp._dbg = false;
    console.log(`store before W0D1:`, JSON.stringify(comp._topoStore));
    comp._dbg = true;
    const r1 = evalTopoDebug(comp, topo, 2);
    comp._dbg = false;
    assert(r1 === 1, `REG, W0D1 keep 1 => ${r1}`);
    assert(evalTopo(comp, topo, 1) === 0, `REG, W1D0 write 0 => 0`);
    assert(evalTopo(comp, topo, 2) === 0, `REG, W0D1 keep 0 => 0`);
    assert(evalTopo(comp, topo, 3) === 1, `REG, W1D1 write back 1 => 1`);
    // store 在 W=0 时持续保持
    assert(evalTopo(comp, topo, 2) === 1, `REG, W0D1 keep 1 => 1`);
}

// 用例4: 输出端口透传（输出端子不传导回归）—— input_port→net0(跨端口连通)→output_port
// 端口穿透后两侧导线属于同一个 net，net 由 input_port 驱动；output_port 读该 net 得值
{
    const topo = {
        origin: { x: 0, y: 0, z: 0 },
        inputs: [{ num: 0, k: "0,0,0" }],
        outputs: [{ num: 1, k: "2,0,0" }],
        comps: [
            { k: "0,0,0", t: "sapdon:input_port", x: 0, y: 0, z: 0, f: "north", p: 0, nets: { east: 0 }, directs: {} },
            { k: "1,0,0", t: "sapdon:output_port", x: 1, y: 0, z: 0, f: "north", p: 0, nets: { west: 0, east: 0 }, directs: {} },
            { k: "2,0,0", t: "sapdon:output_port", x: 2, y: 0, z: 0, f: "north", p: 0, nets: { west: 0 }, directs: {} },
        ],
        nets: [
            { wires: ["0,0,1", "1,0,1"], terms: [["0,0,0", "east"], ["1,0,0", "west"], ["1,0,0", "east"], ["2,0,0", "west"]], width: 1 },
        ],
    };
    // mask=0：input 不驱动 → 输出端口应 0（无自锁残留）
    assert(evalTopo({ _dbg: false }, topo, 0) === 0, `PORT-PASSTHROUGH(0)=0`);
    // mask=1：input 驱动 net0 → 输出端口读到 1
    assert(evalTopo({ _dbg: false }, topo, 1) === 1, `PORT-PASSTHROUGH(1)=1`);
}

// 用例5: 纯逻辑表达式提取 + 求值（expr 模式，>8 输入替代 topo）
{
    const mk = (key, type, facing, nets, directs) => ({ key, type, facing, powered: 0, nets, directs });
    // 半加器：S=XOR, C=AND（输入位：in0=bit0, in1=bit1）
    const comps = new Map();
    comps.set("0,0,0", mk("0,0,0", "sapdon:input_port", "north", {}, { east: "2,0,1" }));
    comps.set("0,0,2", mk("0,0,2", "sapdon:input_port", "north", {}, { south: "2,0,1" }));
    comps.set("2,0,1", mk("2,0,1", "sapdon:and_gate", "north", {}, { west: "0,0,0", south: "0,0,2", north: "9,9,9" }));
    comps.set("9,9,9", mk("9,9,9", "sapdon:on_signal", "north", {}, {}));
    comps.set("3,0,1", mk("3,0,1", "sapdon:output_port", "north", {}, { west: "2,0,1" }));
    const netsMap = new Map();
    const inputs = [{ c: comps.get("0,0,0"), num: 0 }, { c: comps.get("0,0,2"), num: 1 }];
    const outputs = [{ c: comps.get("3,0,1"), num: 0 }];
    const expr = tryBuildExprModel(comps, netsMap, inputs, outputs);
    assert(expr !== null, "EXPR half-adder extract");
    assert(evalExprNodes(expr, 0) === 0 && evalExprNodes(expr, 1) === 0 && evalExprNodes(expr, 2) === 0 && evalExprNodes(expr, 3) === 1, "EXPR AND truth table 0,0,0,1");
    // 多输出：AND + NOT 组合
    comps.set("4,0,1", mk("4,0,1", "sapdon:not_gate", "north", {}, { west: "2,0,1" }));
    comps.set("5,0,1", mk("5,0,1", "sapdon:output_port", "north", {}, { west: "4,0,1" }));
    const outputs2 = [
        { c: comps.get("3,0,1"), num: 0 },
        { c: comps.get("5,0,1"), num: 1 },
    ];
    const expr2 = tryBuildExprModel(comps, netsMap, inputs, outputs2);
    assert(expr2 !== null && expr2.length === 2, "EXPR two outputs");
    // out0 = A&B, out1 = NOT(A&B)；mask=3 -> out0=1, out1=0 -> outMask = 1|(0<<1)=1
    assert(evalExprNodes(expr2, 3) === 1, "EXPR multi-out mask=3 => 1");
    assert(evalExprNodes(expr2, 0) === 2, "EXPR multi-out mask=0 => 2 (0, NOT0=1 << 1)");
}

console.log(`\n${pass} passed, ${fail} fail`);
process.exit(fail ? 1 : 0);