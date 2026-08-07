import { world, system, MolangVariableMap } from "@minecraft/server";

export const WIRE_TYPE = "sapdon:wire";
export const SWITCH_TYPE = "sapdon:switch";
export const DISPLAY_TYPE = "sapdon:display";

export const GATE_TYPES = ["sapdon:and_gate", "sapdon:or_gate", "sapdon:not_gate"];
export const SOURCE_TYPES = ["sapdon:on_signal", "sapdon:off_signal", SWITCH_TYPE];

export const CIRCUIT_TYPES = [
    WIRE_TYPE,
    DISPLAY_TYPE,
    SWITCH_TYPE,
    ...GATE_TYPES,
    "sapdon:on_signal",
    "sapdon:off_signal",
];

const FACES = ["north", "south", "east", "west", "up", "down"];
const FACES_HORIZ = ["north", "south", "east", "west"];

const DEBUG = true;

// 门模型旋转后，输出/输入在世界坐标中的实际朝向
// 模型：上=or, 下=default, 东=output, 西/南/北=input (yaw0)
// yaw: north=0 west=90 south=180 east=-90 (顺时针俯视)
function gateOutputFace(facing) {
    switch (facing) {
        case "north": return "east";
        case "west": return "north";
        case "south": return "west";
        case "east": return "south";
    }
    return "east";
}

function notInputFace(facing) {
    switch (facing) {
        case "north": return "west";
        case "west": return "south";
        case "south": return "east";
        case "east": return "north";
    }
    return "west";
}

const POWER_STATE = "sapdon:powered";
const FLAME = "minecraft:basic_flame_particle";
const BUBBLE = "minecraft:basic_bubble_particle";

// 粒子为中心点往上偏移 0.2 格的位置
function particleLoc(x, y, z) {
    return { x: x + 0.5, y: y + 0.7, z: z + 0.5 };
}

// 向粒子注入 direction，避免 basic_bubble 报未知变量 .z 的 Molang 错误
function particleMap() {
    const m = new MolangVariableMap();
    m.setVector3("variable.direction", { x: 0, y: 1, z: 0 });
    return m;
}

function dbg(msg) {
    if (DEBUG) world.sendMessage(msg);
}

// 逻辑组件表：只存真正有状态的方块（信号源/开关/门/显示灯）
const components = new Map();
// 导线网络：导线本身不存逻辑状态，仅以连通块(Net)的形式表达"连接"关系
const nets = new Map();
const netLookup = new Map();
let netSeq = 0;

export function isCircuit(typeId) {
    return CIRCUIT_TYPES.includes(typeId);
}

export function isGate(typeId) {
    return GATE_TYPES.includes(typeId);
}

export function isSource(typeId) {
    return SOURCE_TYPES.includes(typeId);
}

function nodeKey(block) {
    const loc = block.location;
    return `${block.dimension.id}:${loc.x},${loc.y},${loc.z}`;
}

function getBlockByKey(key) {
    const m = key.match(/^(.*):(-?\d+),(-?\d+),(-?\d+)$/);
    if (!m) return null;
    const dimId = m[1];
    const x = +m[2];
    const y = +m[3];
    const z = +m[4];
    try {
        return world.getDimension(dimId).getBlock({ x, y, z });
    } catch (e) {
        return null;
    }
}

function capitalize(face) {
    return face.charAt(0).toUpperCase() + face.slice(1);
}

export function getAdjacent(block, face) {
    const f = face ? face.charAt(0).toUpperCase() + face.slice(1).toLowerCase() : "Up";
    switch (f) {
        case "North": return block.north();
        case "South": return block.south();
        case "East": return block.east();
        case "West": return block.west();
        case "Up": return block.above();
        case "Down": return block.below();
    }
    return block.above();
}

export function oppositeFace(face) {
    const f = face ? face.toLowerCase() : "";
    switch (f) {
        case "north": return "south";
        case "south": return "north";
        case "east": return "west";
        case "west": return "east";
        case "up": return "down";
        case "down": return "up";
    }
    return "up";
}

// 对共享连接边设置状态：导线-导线时同时设置两端手臂，器件-导线时只设置导线端
export function setWireEdge(wireBlock, face, value) {
    if (!wireBlock || wireBlock.typeId !== WIRE_TYPE) return;
    const stateKey = `wire_connect:${face.toLowerCase()}`;
    const current = wireBlock.permutation.getState(stateKey) ?? 0;
    if (current !== value) {
        wireBlock.setPermutation(wireBlock.permutation.withState(stateKey, value));
    }
    const nb = getAdjacent(wireBlock, capitalize(face));
    if (nb && nb.typeId === WIRE_TYPE) {
        const nbKey = `wire_connect:${oppositeFace(face)}`;
        if ((nb.permutation.getState(nbKey) ?? 0) !== value) {
            nb.setPermutation(nb.permutation.withState(nbKey, value));
        }
    }
}

// 放置导线：只在“点击面”对应的连接面上建立连接（若该面相邻是可连接块才连，不再自动连全部面）
export function connectWireOnPlacement(wireBlock, face) {
    if (!wireBlock || wireBlock.typeId !== WIRE_TYPE) return;
    const neighbor = getAdjacent(wireBlock, capitalize(face));
    const value = isCircuit(neighbor.typeId) ? 1 : 0;
    setWireEdge(wireBlock, face, value);
}

// 破坏方块时：断开相邻导线指向该位置的手臂（只断连，不自动连）
export function disconnectNeighborWires(block) {
    for (const face of FACES) {
        const nb = getAdjacent(block, capitalize(face));
        if (!nb || nb.typeId !== WIRE_TYPE) continue;
        const stateKey = `wire_connect:${oppositeFace(face)}`;
        if ((nb.permutation.getState(stateKey) ?? 0) === 1) {
            nb.setPermutation(nb.permutation.withState(stateKey, 0));
        }
    }
}

// ---------- 导线网络（Net） ----------

function wireConnectState(block, face) {
    return (block.permutation.getState(`wire_connect:${face.toLowerCase()}`) ?? 0) === 1;
}

// 两相邻导线是否导通：共享面的两个状态都为 1
function wiresConnected(a, face) {
    const nb = getAdjacent(a, capitalize(face));
    if (!nb || nb.typeId !== WIRE_TYPE) return false;
    const f = face.toLowerCase();
    return wireConnectState(a, f) && wireConnectState(nb, oppositeFace(f));
}

// 收集与 anchor 相邻的导线连通块（不限导通状态，用于局部重分区）
function collectWireCluster(anchor) {
    const cluster = new Set();
    const queue = [];
    if (anchor.typeId === WIRE_TYPE) queue.push(anchor);
    for (const face of FACES) {
        const nb = getAdjacent(anchor, capitalize(face));
        if (nb && nb.typeId === WIRE_TYPE) queue.push(nb);
    }
    while (queue.length) {
        const w = queue.shift();
        const k = nodeKey(w);
        if (cluster.has(k)) continue;
        cluster.add(k);
        for (const face of FACES) {
            const nb = getAdjacent(w, capitalize(face));
            if (nb && nb.typeId === WIRE_TYPE) queue.push(nb);
        }
    }
    return cluster;
}

// 从某导线按导通状态洪水填充，得到一个 Net 的导线集合
function floodWireNet(startBlock) {
    const result = new Set();
    const queue = [startBlock];
    while (queue.length) {
        const b = queue.shift();
        const k = nodeKey(b);
        if (result.has(k)) continue;
        result.add(k);
        for (const face of FACES) {
            const nb = getAdjacent(b, capitalize(face));
            if (!nb || nb.typeId !== WIRE_TYPE) continue;
            if (!wiresConnected(b, face)) continue;
            queue.push(nb);
        }
    }
    return result;
}

// 为 Net 挂接组件端子：导线 arm 朝向的相邻组件 = 该组件在该面上的端子
function attachTermsForNet(net, touched) {
    for (const wireKey of net.wires) {
        const block = getBlockByKey(wireKey);
        if (!block || block.typeId !== WIRE_TYPE) continue;
        for (const face of FACES) {
            if (!wireConnectState(block, face)) continue;
            const nb = getAdjacent(block, capitalize(face));
            if (!nb || nb.typeId === WIRE_TYPE || !isCircuit(nb.typeId)) continue;
            const compKey = nodeKey(nb);
            const termFace = oppositeFace(face);
            net.terms.set(`${compKey}|${termFace}`, { compKey, face: termFace });
            touched.add(compKey);
        }
    }
}

// 增量维护：围绕 anchor 局部重分区导线网络，并刷新受影响组件的端子
export function recomputeNetAround(anchor) {
    const touched = new Set();
    const cluster = collectWireCluster(anchor);
    const affected = new Set();

    for (const wireKey of cluster) {
        const netId = netLookup.get(wireKey);
        if (netId === undefined) continue;
        const net = nets.get(netId);
        if (!net) continue;
        affected.add(netId);
        net.wires.delete(wireKey);
        netLookup.delete(wireKey);
    }

    for (const netId of affected) {
        const net = nets.get(netId);
        if (!net) continue;
        for (const { compKey } of net.terms.values()) touched.add(compKey);
        if (net.wires.size === 0) {
            nets.delete(netId);
        } else {
            net.terms.clear();
            attachTermsForNet(net, touched);
        }
    }

    for (const wireKey of cluster) {
        if (netLookup.has(wireKey)) continue;
        const wireBlock = getBlockByKey(wireKey);
        if (!wireBlock || wireBlock.typeId !== WIRE_TYPE) continue;
        const wireSet = floodWireNet(wireBlock);
        const net = { id: `net${netSeq++}`, wires: wireSet, terms: new Map() };
        nets.set(net.id, net);
        for (const k of wireSet) netLookup.set(k, net.id);
        attachTermsForNet(net, touched);
    }

    for (const compKey of touched) refreshComponentNetFaces(compKey);
}

// ---------- 组件注册 ----------

function refreshComponentNetFaces(compKey) {
    const comp = components.get(compKey);
    if (!comp) return;
    const block = getBlockByKey(comp.key);
    comp.netByFace = {};
    comp.directByFace = {};
    if (!block) return;
    for (const face of FACES) {
        const nb = getAdjacent(block, capitalize(face));
        if (!nb || nb.typeId !== WIRE_TYPE || !wireConnectState(nb, oppositeFace(face))) {
            comp.netByFace[face] = null;
        } else {
            comp.netByFace[face] = netLookup.get(nodeKey(nb)) ?? null;
        }
        if (nb && nb.typeId !== WIRE_TYPE && isCircuit(nb.typeId)) {
            comp.directByFace[face] = nodeKey(nb);
        } else {
            comp.directByFace[face] = null;
        }
    }
}

export function registerComponent(block) {
    if (!isCircuit(block.typeId) || block.typeId === WIRE_TYPE) return null;
    const loc = block.location;
    const comp = {
        key: nodeKey(block),
        dim: block.dimension.id,
        loc: { x: loc.x, y: loc.y, z: loc.z },
        type: block.typeId,
        powered: 0,
    };
    if (block.typeId === SWITCH_TYPE || block.typeId === DISPLAY_TYPE) {
        comp.powered = block.permutation.getState(POWER_STATE) ?? 0;
    }
    if (isGate(block.typeId)) {
        comp.facing = block.permutation.getState("minecraft:cardinal_direction") ?? "north";
    }
    components.set(comp.key, comp);
    refreshComponentNetFaces(comp.key);
    return comp;
}

export function unregisterComponent(block) {
    const comp = components.get(nodeKey(block));
    if (!comp) return;
    components.delete(comp.key);
    for (const net of nets.values()) {
        for (const termKey of [...net.terms.keys()]) {
            if (termKey.startsWith(comp.key + "|")) net.terms.delete(termKey);
        }
    }
}

export function rebuildAround(block) {
    recomputeNetAround(block);
    const queue = [block];
    const seen = new Set();
    let count = 0;
    while (queue.length && count < 1000) {
        const b = queue.shift();
        const k = nodeKey(b);
        if (seen.has(k)) continue;
        seen.add(k);
        if (!isCircuit(b.typeId)) continue;
        if (b.typeId !== WIRE_TYPE) registerComponent(b);
        count++;
        for (const face of FACES) {
            const nb = getAdjacent(b, capitalize(face));
            if (isCircuit(nb.typeId)) queue.push(nb);
        }
    }
    propagate();
}

// ---------- 信号求解 ----------

// 组件的输出面：信号源/开关=所有面；门=输出面；显示灯无输出
function isOutputFace(comp, face) {
    if (comp.type === SWITCH_TYPE || comp.type === "sapdon:on_signal" || comp.type === "sapdon:off_signal") {
        return true;
    }
    if (isGate(comp.type)) {
        return face === gateOutputFace(comp.facing);
    }
    return false;
}

// 组件的输入面：门=输入面；显示灯=所有面
function inputFacesOf(comp) {
    if (comp.type === DISPLAY_TYPE) return FACES;
    if (isGate(comp.type)) {
        if (comp.type === "sapdon:not_gate") return [notInputFace(comp.facing)];
        return FACES_HORIZ.filter((f) => f !== gateOutputFace(comp.facing));
    }
    return [];
}

// Net 信号 = 挂在其上所有输出端子的组件 powered 做 OR
function netSignal(netId) {
    const net = nets.get(netId);
    if (!net) return 0;
    for (const { compKey, face } of net.terms.values()) {
        const comp = components.get(compKey);
        if (!comp || !comp.powered) continue;
        if (isOutputFace(comp, face)) return 1;
    }
    return 0;
}

function faceNetSignal(comp, face) {
    const directKey = comp.directByFace ? comp.directByFace[face] : null;
    if (directKey) {
        const nbComp = components.get(directKey);
        if (nbComp && isOutputFace(nbComp, oppositeFace(face))) return nbComp.powered;
    }
    const netId = comp.netByFace ? comp.netByFace[face] : null;
    if (!netId) return 0;
    return netSignal(netId);
}

function computePowered(comp) {
    const type = comp.type;
    if (type === "sapdon:on_signal") return 1;
    if (type === "sapdon:off_signal") return 0;
    if (type === SWITCH_TYPE) return comp.powered;
    if (type === DISPLAY_TYPE) {
        let v = 0;
        for (const face of FACES) v = v || faceNetSignal(comp, face);
        return v ? 1 : 0;
    }
    if (isGate(type)) {
        const inputs = inputFacesOf(comp).map((f) => faceNetSignal(comp, f));
        if (type === "sapdon:and_gate") return inputs.every(Boolean) ? 1 : 0;
        if (type === "sapdon:or_gate") return inputs.some(Boolean) ? 1 : 0;
        if (type === "sapdon:not_gate") return inputs[0] ? 0 : 1;
    }
    return 0;
}

function debugDump() {
    dbg(`[circuit] ========== propagate (${components.size} comps, ${nets.size} nets) ==========`);
    for (const comp of components.values()) {
        const { x, y, z } = comp.loc;
        const loc = `(${x},${y},${z})`;
        const name = comp.type.split(":")[1];
        if (isGate(comp.type)) {
            const out = gateOutputFace(comp.facing);
            const detail = inputFacesOf(comp).map((f) => `${f}:${faceNetSignal(comp, f)}`).join(" ");
            dbg(`[circuit] ${name}@${loc} facing=${comp.facing} out=${out} in[${detail}] => ${computePowered(comp)}`);
        } else if (comp.type === DISPLAY_TYPE) {
            const detail = FACES.map((f) => `${f}:${faceNetSignal(comp, f)}`).join(" ");
            dbg(`[circuit] display@${loc} <- [${detail}] => ${computePowered(comp)}`);
        } else {
            dbg(`[circuit] ${name}@${loc} = ${comp.powered}`);
        }
    }
    for (const net of nets.values()) {
        const terms = [...net.terms.values()].map((t) => {
            const c = components.get(t.compKey);
            const p = c && c.powered ? "^1" : "";
            return `${t.face}:${c ? c.type.split(":")[1] : "?"}${p}`;
        }).join(" ");
        dbg(`[circuit] net${net.id} wires=${net.wires.size} signal=${netSignal(net.id)} terms[${terms}]`);
    }
}

export function propagate() {
    const changed = new Set();
    let anyChange = true;
    let iterations = 0;
    while (anyChange && iterations < 20) {
        anyChange = false;
        for (const comp of components.values()) {
            const v = computePowered(comp);
            if (v !== comp.powered) {
                comp.powered = v;
                anyChange = true;
                changed.add(comp.key);
            }
        }
        iterations++;
    }
    applyChanges(changed);
    if (DEBUG && changed.size > 0) {
        dbg(`[circuit] changed ${changed.size} component(s), iterations=${iterations}`);
    }
    debugDump();
}

function applyChanges(changed) {
    for (const key of changed) {
        const comp = components.get(key);
        if (!comp) continue;
        try {
            const dim = world.getDimension(comp.dim);
            const block = dim.getBlock(comp.loc);
            if (!block || block.typeId !== comp.type) continue;
            const powered = comp.powered ? 1 : 0;
            const state = block.permutation.getState(POWER_STATE);
            if (state !== undefined && state !== powered) {
                block.setPermutation(block.permutation.withState(POWER_STATE, powered));
            }
            if (isGate(block.typeId)) {
                dim.spawnParticle(powered ? FLAME : BUBBLE, particleLoc(comp.loc.x, comp.loc.y, comp.loc.z), particleMap());
            }
        } catch (e) {}
    }
    for (const comp of components.values()) {
        try {
            const dim = world.getDimension(comp.dim);
            const block = dim.getBlock(comp.loc);
            if (!block || block.typeId !== comp.type) continue;
            const powered = comp.powered ? 1 : 0;
            const state = block.permutation.getState(POWER_STATE);
            if (state !== undefined && state !== powered) {
                block.setPermutation(block.permutation.withState(POWER_STATE, powered));
            }
        } catch (e) {}
    }
}

system.runInterval(() => {
    for (const net of nets.values()) {
        if (!netSignal(net.id)) continue;
        for (const wireKey of net.wires) {
            const block = getBlockByKey(wireKey);
            if (!block) continue;
            try {
                block.dimension.spawnParticle(FLAME, particleLoc(block.location.x, block.location.y, block.location.z), particleMap());
            } catch (e) {}
        }
    }
    for (const comp of components.values()) {
        if (comp.powered && isGate(comp.type)) {
            try {
                world.getDimension(comp.dim).spawnParticle(FLAME, particleLoc(comp.loc.x, comp.loc.y, comp.loc.z), particleMap());
            } catch (e) {}
        }
    }
}, 10);

export function clearNodes() {
    components.clear();
    nets.clear();
    netLookup.clear();
}

// ---------- 电路数据持久化（世界动态属性） ----------

const CIRCUIT_PROP = "sapdos:circuit_data";
const CIRCUIT_VER = 2;

// 保存"已求解的内存模型"（components/nets/netLookup）到世界动态属性

export function saveCircuit() {
    const comps = [];
    for (const comp of components.values()) {
        comps.push({
            k: comp.key,
            t: comp.type,
            x: comp.loc.x,
            y: comp.loc.y,
            z: comp.loc.z,
            d: comp.dim,
            p: comp.powered,
            f: comp.facing || "north",
            nb: comp.netByFace || {},
            db: comp.directByFace || {},
        });
    }
    const netArr = [];
    for (const net of nets.values()) {
        netArr.push({
            k: net.id,
            w: [...net.wires],
            t: [...net.terms.values()].map((term) => [term.compKey, term.face]),
        });
    }
    const data = { v: CIRCUIT_VER, netSeq, comps, nets: netArr };
    try {
        world.setDynamicProperty(CIRCUIT_PROP, JSON.stringify(data));
    } catch (e) {}
}

export function loadCircuit() {
    clearNodes();
    const raw = world.getDynamicProperty(CIRCUIT_PROP);
    if (!raw) return;
    let data;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        return;
    }
    if (!data || data.v !== CIRCUIT_VER || !Array.isArray(data.comps)) return;

    // 原样恢复内存模型：不重新推导，不触碰方块，不调用 propagate
    for (const c of data.comps) {
        components.set(c.k, {
            key: c.k,
            dim: c.d,
            loc: { x: c.x, y: c.y, z: c.z },
            type: c.t,
            powered: c.p,
            facing: c.f,
            netByFace: c.nb || {},
            directByFace: c.db || {},
        });
    }
    for (const n of data.nets) {
        const net = { id: n.k, wires: new Set(n.w), terms: new Map() };
        for (const [compKey, face] of n.t) {
            net.terms.set(`${compKey}|${face}`, { compKey, face });
        }
        nets.set(net.id, net);
        for (const w of net.wires) netLookup.set(w, net.id);
    }
    if (typeof data.netSeq === "number") netSeq = data.netSeq;
}
