import { world, system, MolangVariableMap } from "@minecraft/server";
import { getLogicByUuid } from "./logicStore.js";

export const WIRE_TYPE = "sapdon:wire";
export const SWITCH_TYPE = "sapdon:switch";
export const DISPLAY_TYPE = "sapdon:display";
export const CHIP_TYPE = "sapdon:chip";
export const SPLITTER_TYPE = "sapdon:splitter";
export const MERGE_TYPE = "sapdon:merger";

export const GATE_TYPES = ["sapdon:and_gate", "sapdon:or_gate", "sapdon:not_gate"];
export const SOURCE_TYPES = ["sapdon:on_signal", "sapdon:off_signal", SWITCH_TYPE];

export const INPUT_PORT_PREFIX = "sapdon:input_port_";
export const OUTPUT_PORT_PREFIX = "sapdon:output_port_";
const PORT_RANGE = Array.from({ length: 8 }, (_, i) => i + 1);
export const INPUT_PORT_TYPES = PORT_RANGE.map((i) => `${INPUT_PORT_PREFIX}${i}`);
export const OUTPUT_PORT_TYPES = PORT_RANGE.map((i) => `${OUTPUT_PORT_PREFIX}${i}`);

export const CIRCUIT_TYPES = [
    WIRE_TYPE,
    DISPLAY_TYPE,
    SWITCH_TYPE,
    ...GATE_TYPES,
    "sapdon:on_signal",
    "sapdon:off_signal",
    ...INPUT_PORT_TYPES,
    ...OUTPUT_PORT_TYPES,
    CHIP_TYPE,
    SPLITTER_TYPE,
    MERGE_TYPE,
];

const FACES = ["north", "south", "east", "west", "up", "down"];
const FACES_HORIZ = ["north", "south", "east", "west"];

const DEBUG = false;

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

// 分线器：模型朝北时 西=输入，东=直通输出(N-1)，北=分出输出(1)
// 随 facing 旋转后，各逻辑面在世界坐标中的朝向
function splitterFaces(facing) {
    return {
        input: oppositeFace(gateOutputFace(facing)),
        through: gateOutputFace(facing),
        split: facing,
    };
}

// 合并器：模型朝北时 西=Nbit输入，南=+1输入，东=N+1输出
function mergeFaces(facing) {
    return {
        west: oppositeFace(gateOutputFace(facing)),
        south: oppositeFace(facing),
        out: gateOutputFace(facing),
    };
}

// 可编程芯片：模型自身参考系 北=输出、南=输入
// 输入值（南面对应 N 位组合）按芯片存储的真值表映射到输出值（北面 M 位）
function chipFaces(facing) {
    return {
        output: facing,
        input: oppositeFace(facing),
    };
}

// 芯片记录：{ inputs:[端口序号], outputs:[端口序号], table:[[inNum,outMask],...] }
// 输入数值 → 表内匹配行 → 输出 outMask；无匹配行输出 0
function chipLookup(comp, inVal) {
    const rec = comp.logicUuid ? getLogicByUuid(comp.logicUuid) : null;
    if (!rec || !Array.isArray(rec.table)) return 0;
    const row = rec.table.find((r) => r[0] === inVal);
    return row ? (row[1] || 0) : 0;
}

const POWER_STATE = "sapdon:powered";
const FLAME = "minecraft:basic_flame_particle";
const BUBBLE = "minecraft:basic_bubble_particle";
const ERROR_PARTICLE = "minecraft:heart_particle";

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

// 运行期调试日志（console.warn 可靠写入 ContentLog 文件）；供 /sapdon:logic_log on|off 开关
let LOG_RUNTIME = false;
export function setRuntimeLog(on) { LOG_RUNTIME = !!on; }
function rLog(...args) {
    if (!LOG_RUNTIME) return;
    const msg = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
    console.warn("[rt] " + msg);
}

// 逻辑组件表：只存真正有状态的方块（信号源/开关/门/显示灯）
const components = new Map();
// 导线网络：导线本身不存逻辑状态，仅以连通块(Net)的形式表达"连接"关系
const nets = new Map();
const netLookup = new Map();
// 本轮求解中被基础门判为"输入位宽>1"的错误面集合（用于播报错粒子）
const errorFaces = new Set();
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

// 端口方块：边界标识 + 信号透传（按 typeId 前缀区分输入/输出）
export function isInputPort(typeId) {
    return typeId.startsWith(INPUT_PORT_PREFIX);
}

export function isOutputPort(typeId) {
    return typeId.startsWith(OUTPUT_PORT_PREFIX);
}

export function isPort(typeId) {
    return isInputPort(typeId) || isOutputPort(typeId);
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
        const net = { id: `net${netSeq++}`, wires: wireSet, terms: new Map(), width: 1, value: 0 };
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
    const previous = components.get(nodeKey(block));
    const comp = {
        key: nodeKey(block),
        dim: block.dimension.id,
        loc: { x: loc.x, y: loc.y, z: loc.z },
        type: block.typeId,
        powered: 0,
        // 重建时保留已绑定的芯片逻辑，避免 rebuildAround 重置
        logicUuid: previous && previous.logicUuid ? previous.logicUuid : "",
    };
    if (block.typeId === SWITCH_TYPE || block.typeId === DISPLAY_TYPE) {
        comp.powered = block.permutation.getState(POWER_STATE) ?? 0;
    }
    if (isGate(block.typeId) || block.typeId === SPLITTER_TYPE || block.typeId === MERGE_TYPE || block.typeId === CHIP_TYPE) {
        comp.facing = block.permutation.getState("minecraft:cardinal_direction") ?? "north";
    }
    if (components.has(comp.key)) {
        dbg(`[reg] +dup ${block.typeId.split(":")[1]}@(${loc.x},${loc.y},${loc.z})`);
    } else {
        dbg(`[reg] +${block.typeId.split(":")[1]}@(${loc.x},${loc.y},${loc.z})`);
    }
    components.set(comp.key, comp);
    refreshComponentNetFaces(comp.key);
    return comp;
}

export function unregisterComponent(block) {
    const comp = components.get(nodeKey(block));
    if (!comp) return;
    dbg(`[reg] -${block.typeId.split(":")[1]}@(${block.location.x},${block.location.y},${block.location.z})`);
    components.delete(comp.key);
    for (const net of nets.values()) {
        for (const termKey of [...net.terms.keys()]) {
            if (termKey.startsWith(comp.key + "|")) net.terms.delete(termKey);
        }
    }
}

// 把某条已保存逻辑（uuid）绑定到 chip 方块对应的组件；返回组件或 null
export function bindChipLogic(block, logicUuid) {
    if (!block || block.typeId !== CHIP_TYPE || !logicUuid) return null;
    const rec = getLogicByUuid(logicUuid);
    if (!rec) return null;
    let comp = components.get(nodeKey(block));
    if (!comp) comp = registerComponent(block);
    if (!comp) return null;
    comp.logicUuid = rec.uuid;
    comp.facing = block.permutation.getState("minecraft:cardinal_direction") ?? comp.facing ?? "north";
    setChipState(block, 1);
    return comp;
}

// 从 chip 方块取回绑定逻辑（清空组件 logicUuid 并置为未加载）；返回原 uuid 或 null
export function unbindChipLogic(block) {
    if (!block || block.typeId !== CHIP_TYPE) return null;
    const comp = components.get(nodeKey(block));
    const uuid = (comp && comp.logicUuid) || "";
    if (comp) comp.logicUuid = "";
    setChipState(block, 0);
    return uuid || null;
}

// 写回 chip 方块的加载状态贴图（0=chip-unload，1=chip）
export function setChipState(block, loaded) {
    const v = loaded ? 1 : 0;
    const cur = block.permutation.getState("sapdon:loaded") ?? 0;
    if (cur !== v) {
        block.setPermutation(block.permutation.withState("sapdon:loaded", v));
    }
}

export function rebuildAround(block) {
    recomputeNetAround(block);
    const queue = [block];
    const seen = new Set();
    let count = 0;
    let visitLog = 0;
    while (queue.length && count < 1000) {
        const b = queue.shift();
        const k = nodeKey(b);
        if (seen.has(k)) continue;
        seen.add(k);
        if (!isCircuit(b.typeId)) continue;
        if (visitLog < 300) {
            const n = b.typeId.split(":")[1];
            dbg(`[rebuild] visit ${n}@(${b.location.x},${b.location.y},${b.location.z})`);
            visitLog++;
        }
        if (b.typeId !== WIRE_TYPE) registerComponent(b);
        count++;
        for (const face of FACES) {
            const nb = getAdjacent(b, capitalize(face));
            if (isCircuit(nb.typeId)) queue.push(nb);
        }
    }
    dbg(`[rebuild] done visited=${visitLog === 300 ? ">=300" : visitedLog(seen)}`);
    propagate();
}

function visitedLog(seen) {
    return seen.size;
}

// ---------- 信号求解 ----------

// 组件的输出面：信号源/开关=所有面；门=输出面；分线器=直通+分出；合并器=东输出面；端口=所有面；显示灯无输出
function isOutputFace(comp, face) {
    if (comp.type === SWITCH_TYPE || comp.type === "sapdon:on_signal" || comp.type === "sapdon:off_signal") {
        return true;
    }
    if (isGate(comp.type)) {
        return face === gateOutputFace(comp.facing);
    }
    if (comp.type === SPLITTER_TYPE) {
        const f = splitterFaces(comp.facing);
        return face === f.through || face === f.split;
    }
    if (comp.type === MERGE_TYPE) {
        return face === mergeFaces(comp.facing).out;
    }
    if (comp.type === CHIP_TYPE) {
        return face === chipFaces(comp.facing).output;
    }
    if (isPort(comp.type)) {
        // 端口为透明透传节点：所有面都输出，使相连导线网络能读其 powered
        return true;
    }
    return false;
}

// 组件的输入面：门=输入面；显示灯=所有面
function inputFacesOf(comp) {
    if (comp.type === DISPLAY_TYPE) return FACES;
    if (comp.type === SPLITTER_TYPE) return [splitterFaces(comp.facing).input];
    if (comp.type === MERGE_TYPE) return [mergeFaces(comp.facing).west, mergeFaces(comp.facing).south];
    if (comp.type === CHIP_TYPE) return [chipFaces(comp.facing).input];
    if (isGate(comp.type)) {
        if (comp.type === "sapdon:not_gate") return [notInputFace(comp.facing)];
        return FACES_HORIZ.filter((f) => f !== gateOutputFace(comp.facing));
    }
    return [];
}

// Net 数值 = 网络上所有输出端子的组件数值取「最大」（单驱动典型；布尔输入兼容）
function netValue(netId) {
    const net = nets.get(netId);
    return net ? (net.value ?? 0) : 0;
}

// 组件在某个输出面上发出的数值：
// - 门/开关/源/端口=1bit（powered 0/1）
// - 分线器：直通=输入>>1（N-1 位），分出=输入&1（1 位）
// - 合并器：输出 = (西<<1) | 南（把 +1 位拼接为 N+1 位新值）
function compValueFor(comp, face) {
    if (!comp) return 0;
    if (comp.type === SPLITTER_TYPE) {
        const f = splitterFaces(comp.facing);
        const inv = faceNetValue(comp, f.input);
        if (face === f.through) return inv >> 1;
        if (face === f.split) return inv & 1;
        return 0;
    }
    if (comp.type === MERGE_TYPE) {
        const m = mergeFaces(comp.facing);
        if (face === m.out) {
            const w = faceNetValue(comp, m.west);
            const s = faceNetValue(comp, m.south);
            return (w << 1) | s;
        }
        return 0;
    }
    if (comp.type === CHIP_TYPE) {
        const f = chipFaces(comp.facing);
        if (face === f.output) {
            const inv = faceNetValue(comp, f.input);
            return chipLookup(comp, inv);
        }
        return 0;
    }
    return comp.powered ? 1 : 0;
}

function netSignal(netId) {
    return netValue(netId);
}

// 组件某面上读取的数值（直连邻件输出数值 / 所属 net 数值）
function faceNetValue(comp, face) {
    const directKey = comp.directByFace ? comp.directByFace[face] : null;
    if (directKey) {
        const nbComp = components.get(directKey);
        if (nbComp && isOutputFace(nbComp, oppositeFace(face))) {
            return compValueFor(nbComp, oppositeFace(face));
        }
        return 0;
    }
    const netId = comp.netByFace ? comp.netByFace[face] : null;
    if (!netId) return 0;
    return netValue(netId);
}

// 布尔视角：某面是否带电（数值>0）
function faceNetSignal(comp, face) {
    return faceNetValue(comp, face) ? 1 : 0;
}

// 迭代求各 net 数值（固定点：合并器/分线器输出数值依赖其输入数值）
function recomputeNetValues() {
    for (let i = 0; i < nets.size + 2; i++) {
        let changed = false;
        for (const net of nets.values()) {
            let v = 0;
            for (const { compKey, face } of net.terms.values()) {
                const comp = components.get(compKey);
                if (!comp || !isOutputFace(comp, face)) continue;
                if (isOutputPort(comp.type)) continue;
                const nv = compValueFor(comp, face);
                if (nv > v) v = nv;
            }
            if (v !== net.value) {
                net.value = v;
                changed = true;
            }
        }
        if (!changed) break;
        if (LOG_RUNTIME) rLog(`recomputeValues iter${i}: ${[...nets.values()].map((n) => `${n.id}=${n.value}`).join(" ")}`);
    }
}

function computePowered(comp) {
    const type = comp.type;
    if (type === "sapdon:on_signal") return 1;
    if (type === "sapdon:off_signal") return 0;
    if (type === SWITCH_TYPE) return comp.powered;
    if (type === DISPLAY_TYPE || isPort(type)) {
        // 显示灯 / 端口：读六面信号做 OR
        let v = 0;
        for (const face of FACES) v = v || faceNetSignal(comp, face);
        return v ? 1 : 0;
    }
    if (type === SPLITTER_TYPE) {
        // 分线器：输入面信号透传（直通/分出输出值由 compValueFor 决定）
        const f = splitterFaces(comp.facing);
        const inSig = faceNetValue(comp, f.input);
        const inW = faceNetWidth(comp, f.input);
        const r = inSig ? 1 : 0;
        if (LOG_RUNTIME) rLog(`splitter@${comp.key} facing=${comp.facing} input=${f.input} inVal=${inSig}@${inW}bit => ${r}`);
        return r;
    }
    if (type === MERGE_TYPE) {
        // 合并器：西=Nbit 值，南=+1 位，东输出 = (西<<1) | 南
        const f = mergeFaces(comp.facing);
        const wVal = faceNetValue(comp, f.west);
        const sVal = faceNetValue(comp, f.south);
        const wW = faceNetWidth(comp, f.west);
        const sW = faceNetWidth(comp, f.south);
        const r = (wVal << 1) | sVal;
        if (LOG_RUNTIME) rLog(`merger@${comp.key} facing=${comp.facing} west=${f.west}:${wVal}@${wW}bit south=${f.south}:${sVal}@${sW}bit => out=${r}`);
        return r;
    }
    if (type === CHIP_TYPE) {
        // 芯片：南面输入值查真值表 → 北面输出值（有绑定逻辑且输出>0 才通电）
        const f = chipFaces(comp.facing);
        const inVal = faceNetValue(comp, f.input);
        const outVal = chipLookup(comp, inVal);
        const r = outVal ? 1 : 0;
        if (LOG_RUNTIME) rLog(`chip@${comp.key} facing=${comp.facing} input=${f.input}:${inVal} => out=${outVal} powered=${r}`);
        return r;
    }
    if (isGate(type)) {
        const faces = inputFacesOf(comp);
        const inputs = faces.map((f) => faceNetSignal(comp, f));
        // 基础门：任一输入位宽 >1 即报错（输入按 0 处理，并记录错误面）
        for (const f of faces) {
            if (faceNetWidth(comp, f) > 1) errorFaces.add(`${comp.key}|${f}`);
        }
        if (faces.some((f) => faceNetWidth(comp, f) > 1)) {
            if (LOG_RUNTIME) rLog(`gate ${type}@${comp.key} WIDTH_ERROR faces=[${faces.map((f) => `${f}:${faceNetWidth(comp, f)}bit`).join(" ")}] => 0`);
            return 0;
        }
        if (LOG_RUNTIME && inputs.some(Boolean)) {
            rLog(`gate ${type}@${comp.key} in=[${faces.map((f, i) => `${f}:${inputs[i]}`).join(" ")}] => ${type === "sapdon:and_gate" ? inputs.every(Boolean) ? 1 : 0 : type === "sapdon:or_gate" ? inputs.some(Boolean) ? 1 : 0 : inputs[0] ? 0 : 1}`);
        }
        if (type === "sapdon:and_gate") return inputs.every(Boolean) ? 1 : 0;
        if (type === "sapdon:or_gate") return inputs.some(Boolean) ? 1 : 0;
        if (type === "sapdon:not_gate") return inputs[0] ? 0 : 1;
    }
    return 0;
}

function faceSignalSource(comp, face) {
    const netId = comp.netByFace ? comp.netByFace[face] : null;
    const directKey = comp.directByFace ? comp.directByFace[face] : null;
    const sig = faceNetSignal(comp, face);
    if (netId) return `net${netId}(${sig})`;
    if (directKey) {
        const d = components.get(directKey);
        return `direct:${d ? d.type.split(":")[1] : "?"}(${sig})`;
    }
    return `none(${sig})`;
}

// ---------- 位宽（N-bit 总线）模型 ----------
// 导线携带位宽数据：source/门=1位；分线器东直通=N-1、北分出=1；合并器东出=N+1

// 组件某面输出的位宽（仅输出面有意义）
function outputWidthOf(comp, face) {
    if (comp.type === SPLITTER_TYPE) {
        const f = splitterFaces(comp.facing);
        if (face === f.through) return Math.max(0, faceNetWidth(comp, f.input) - 1);
        if (face === f.split) return faceNetWidth(comp, f.input) >= 1 ? 1 : 0;
        return 1;
    }
    if (comp.type === MERGE_TYPE) {
        const m = mergeFaces(comp.facing);
        if (face === m.out) return faceNetWidth(comp, m.west) + 1;
        return 1;
    }
    if (comp.type === CHIP_TYPE) {
        // 芯片输出宽度 = 逻辑记录输出位数（无绑定记录按 1）
        const rec = comp.logicUuid ? getLogicByUuid(comp.logicUuid) : null;
        return rec && Array.isArray(rec.outputs) ? (rec.outputs.length || 1) : 1;
    }
    return 1;
}

// 组件某面上的信号位宽（读 net 位宽 / 直接相邻组件输出位宽）
function faceNetWidth(comp, face) {
    const directKey = comp.directByFace ? comp.directByFace[face] : null;
    if (directKey) {
        const d = components.get(directKey);
        if (d) return outputWidthOf(d, oppositeFace(face));
    }
    const netId = comp.netByFace ? comp.netByFace[face] : null;
    const net = nets.get(netId);
    return net ? (net.width ?? 1) : 1;
}

// 每帧迭代求各 net 位宽（固定点：分线/合并依赖输入位宽）
function recomputeNetWidths() {
    for (let i = 0; i < nets.size + 2; i++) {
        let changed = false;
        for (const net of nets.values()) {
            let w = 1;
            for (const { compKey, face } of net.terms.values()) {
                const comp = components.get(compKey);
                if (!comp || !isOutputFace(comp, face)) continue;
                const ow = outputWidthOf(comp, face);
                if (ow > w) w = ow;
            }
            if (w !== net.width) {
                net.width = w;
                changed = true;
            }
        }
        if (!changed) break;
        if (LOG_RUNTIME) rLog(`recomputeWidths iter${i}: ${[...nets.values()].map((n) => `${n.id}=${n.width}`).join(" ")}`);
    }
}

// 运行期诊断：打印某个组件的各面信号/位宽（用于 /sapdon:logic_log on 调试）
export function debugComponent(compKey) {
    const comp = components.get(compKey);
    if (!comp) return null;
    const faces = FACES.map((f) => {
        const sig = faceNetSignal(comp, f);
        const w = faceNetWidth(comp, f);
        const directKey = comp.directByFace ? comp.directByFace[f] : null;
        const netId = comp.netByFace ? comp.netByFace[f] : null;
        const src = directKey ? `direct:${directKey}` : netId ? `net:${netId}` : "none";
        return `${f}:${sig}@${w}bit(${src})`;
    });
    const facesStr = faces.join(" ");
    const logicStr = comp.type === CHIP_TYPE ? (comp.logicUuid ? ` logicUuid=${comp.logicUuid}` : " logic=none") : "";
    rLog(`dbgComp ${comp.type}@${comp.key} facing=${comp.facing} powered=${comp.powered} out=${comp.powered}${logicStr} | ${facesStr}`);
    return { type: comp.type, key: comp.key, facing: comp.facing, powered: comp.powered, logicUuid: comp.logicUuid, faces: facesStr };
}

// 单个导线块的六面状态 + 邻居类型（审计用）
function wireFaceDetail(wireBlock) {
    const parts = FACES.map((f) => {
        const st = (wireBlock.permutation.getState(`wire_connect:${f}`) ?? 0);
        const nb = getAdjacent(wireBlock, capitalize(f));
        return `${f}${st ? "^" : " "}=${nb ? nb.typeId.split(":")[1] : "?"}`;
    });
    return `[${parts.join(" ")}]`;
}

function dumpState(label, center, radius) {
    dbg(`[${label}] ====== state (${components.size} comps, ${nets.size} nets) ======`);
    for (const comp of components.values()) {
        if (center && dist2(comp.loc, center) > radius * radius) continue;
        const loc = `(${comp.loc.x},${comp.loc.y},${comp.loc.z})`;
        const name = comp.type.split(":")[1];
        let detail;
        if (isGate(comp.type)) {
            const out = gateOutputFace(comp.facing);
            detail = `facing=${comp.facing} out=${out} in=[${inputFacesOf(comp).map((f) => `${f}:${faceSignalSource(comp, f)}`).join(" ")}]`;
        } else if (comp.type === DISPLAY_TYPE || isPort(comp.type)) {
            detail = `faces=[${FACES.map((f) => `${f}:${faceSignalSource(comp, f)}`).join(" ")}]`;
        } else {
            detail = "src";
        }
        dbg(`[${label}] comp ${name}@${loc} powered=${comp.powered} ${detail} => ${computePowered(comp)}`);
    }
    for (const net of nets.values()) {
        if (center) {
            const near = [...net.wires].some((w) => {
                const b = getBlockByKey(w);
                return b && center && dist2({ x: b.location.x, y: b.location.y, z: b.location.z }, center) <= radius * radius;
            }) || [...net.terms.values()].some((t) => {
                const c = components.get(t.compKey);
                return c && dist2(c.loc, center) <= radius * radius;
            });
            if (!near) continue;
        }
        const terms = [...net.terms.values()].map((t) => {
            const c = components.get(t.compKey);
            if (!c) return `${t.face}:MISSING_COMP`;
            return `${t.face}:${c.type.split(":")[1]}${c.powered ? "^1" : "^0"}`;
        }).join(" ");
        dbg(`[${label}] net${net.id} wires=${net.wires.size} width=${net.width} value=${net.value} terms[${terms}]`);
    }
}

function dist2(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz;
}

function debugDump() {
    dumpState("prop", null, null);
    // 导线面状态审计：逐个导线打印
    for (const net of nets.values()) {
        for (const w of net.wires) {
            const b = getBlockByKey(w);
            if (!b) {
                dbg(`[prop] wire @${w} UNREADABLE`);
                continue;
            }
            dbg(`[prop] wire @(${b.location.x},${b.location.y},${b.location.z}) ${wireFaceDetail(b)}`);
        }
    }
}

// 供调试工具：查询某导线所属网络的位宽/信号/端子详情
export function describeWireNet(wireBlock) {
    if (!wireBlock || wireBlock.typeId !== WIRE_TYPE) return null;
    recomputeNetWidths();
    recomputeNetValues();
    const netId = netLookup.get(nodeKey(wireBlock));
    if (netId === undefined) {
        const r1 = { netId: null, width: 1, signal: 0, value: 0, wires: 0, terms: [] };
        if (LOG_RUNTIME) rLog(`wire ${nodeKey(wireBlock)} NOT IN ANY NET`);
        return r1;
    }
    const net = nets.get(netId);
    if (!net) {
        const r2 = { netId: null, width: 1, signal: 0, value: 0, wires: 0, terms: [] };
        if (LOG_RUNTIME) rLog(`wire ${nodeKey(wireBlock)} net ${netId} missing`);
        return r2;
    }
    const terms = [...net.terms.values()].map((t) => {
        const c = components.get(t.compKey);
        return `${t.face}:${c ? c.type.split(":")[1] : "?"}${c && c.powered ? "^1" : "^0"}`;
    });
    const info = { netId, width: net.width ?? 1, signal: netSignal(net.id), value: net.value, wires: net.wires.size, terms };
    if (LOG_RUNTIME) rLog(`wire ${nodeKey(wireBlock)} => net=${info.netId} width=${info.width}bit value=${info.value} wires=${info.wires} terms=[${terms.join(" ")}]`);
    return info;
}

// 导出：按玩家位置/半径转储（供 !logic dump）
export function dumpCircuit(center, radius) {
    if (center) {
        dbg(`[dump] center=(${center.x},${center.y},${center.z}) radius=${radius ?? 32}`);
        dumpState("dump", center, radius ?? 32);
    } else {
        dumpState("dump", null, null);
    }
    for (const net of nets.values()) {
        for (const w of net.wires) {
            const b = getBlockByKey(w);
            if (!b) continue;
            dbg(`[dump] wire @(${b.location.x},${b.location.y},${b.location.z}) ${wireFaceDetail(b)}`);
        }
    }
}

export function propagate() {
    recomputeNetWidths();
    errorFaces.clear();
    const changed = new Set();
    let anyChange = true;
    let iterations = 0;
    while (anyChange && iterations < 20) {
        anyChange = false;
        recomputeNetValues();
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
    spawnErrorParticles();
    if (DEBUG && changed.size > 0) {
        dbg(`[circuit] changed ${changed.size} component(s), iterations=${iterations}`);
    }
    debugDump();
}

// 在错误面上播放心形错误粒子（基础门输入位宽>1）
function spawnErrorParticles() {
    for (const termKey of errorFaces) {
        const sep = termKey.lastIndexOf("|");
        if (sep < 0) continue;
        const compKey = termKey.slice(0, sep);
        const face = termKey.slice(sep + 1);
        const comp = components.get(compKey);
        if (!comp || !face) continue;
        try {
            const dim = world.getDimension(comp.dim);
            const block = dim.getBlock(comp.loc);
            if (!block || block.typeId !== comp.type) continue;
            const nb = getAdjacent(block, capitalize(face));
            const at = nb ? { x: nb.location.x, y: nb.location.y, z: nb.location.z } : comp.loc;
            dim.spawnParticle(ERROR_PARTICLE, particleLoc(at.x, at.y, at.z), particleMap());
        } catch (e) {}
    }
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

// ---------- 纯逻辑编译（真值表，独立于内存模型，实时读实际方块） ----------

const MAX_LOGIC_INPUTS = 8;

// 编译调试开关：设为 true 可在真值表生成时打印每一步
let LOG_COMPILE = false;
export function setCompileLog(on) { LOG_COMPILE = !!on; }
function cLog(...args) {
    if (LOG_COMPILE) {
        const msg = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
        console.warn("[compile] " + msg);
        try { world.sendMessage(msg.slice(0, 200)); } catch (e) {}
    }
}

// 从起点沿实际电路方块做连通 BFS，返回 key->block 映射
function scanRegion(startBlock) {
    const blocks = new Map();
    const queue = [startBlock];
    while (queue.length) {
        const b = queue.shift();
        const k = nodeKey(b);
        if (blocks.has(k)) continue;
        blocks.set(k, b);
        for (const face of FACES) {
            const nb = getAdjacent(b, capitalize(face));
            if (!nb || !isCircuit(nb.typeId)) continue;
            queue.push(nb);
        }
    }
    return blocks;
}

function isWireBlock(b) {
    return b.typeId === WIRE_TYPE;
}

// 打印辅助
function describeBlock(b) {
    if (!b) return null;
    return {
        key: nodeKey(b),
        type: b.typeId,
        pos: `${b.location.x},${b.location.y},${b.location.z}`,
        facing: isGate(b.typeId) ? (b.permutation.getState("minecraft:cardinal_direction") ?? null) : undefined,
        powered: b.permutation.getState(POWER_STATE) ?? undefined,
    };
}

// 从某导线按实时 wire_connect 状态洪水填充出一个 net 的导线集合
function freshFloodNet(startWire) {
    const out = new Set();
    const q = [startWire];
    while (q.length) {
        const w = q.shift();
        const k = nodeKey(w);
        if (out.has(k)) continue;
        out.add(k);
        for (const face of FACES) {
            const nb = getAdjacent(w, capitalize(face));
            if (!nb || !isWireBlock(nb)) continue;
            if (wireConnectState(w, face) && wireConnectState(nb, oppositeFace(face))) q.push(nb);
        }
    }
    cLog(`floodNet from ${nodeKey(startWire)} => ${out.size} wires:`, [...out].join(","));
    return out;
}

// 针对原始方块当场重建：nets + 每根导线的 net 归属
function freshNets(blocks) {
    const netOfWire = new Map();
    const netsMap = new Map();
    let netSeq = 0;
    for (const b of blocks.values()) {
        if (!isWireBlock(b)) continue;
        if (netOfWire.has(nodeKey(b))) continue;
        const wires = freshFloodNet(b);
        const net = { id: `net${netSeq++}`, wires, terms: new Map(), width: 1, value: 0 };
        netsMap.set(net.id, net);
        for (const wk of wires) netOfWire.set(wk, net.id);
    }
    cLog(`nets built: ${netsMap.size}`, [...netsMap.keys()].join(","));
    return { netsMap, netOfWire };
}

// 为 net 挂接端口/器件端子（读实际相邻方块）
function freshAttach(net, blocks) {
    for (const wk of net.wires) {
        const b = blocks.get(wk);
        if (!b) continue;
        for (const face of FACES) {
            if (!wireConnectState(b, face)) continue;
            const nb = getAdjacent(b, capitalize(face));
            if (!nb || nb.typeId === WIRE_TYPE || !isCircuit(nb.typeId)) continue;
            const ck = nodeKey(nb);
            net.terms.set(`${ck}|${oppositeFace(face)}`, { compKey: ck, face: oppositeFace(face) });
        }
    }
    cLog(`net ${net.id}: ${net.wires.size} wires, ${net.terms.size} terms ->`, [...net.terms.values()].map((t) => `${t.compKey}@${t.face}`).join(","));
}

// 为每个器件方块重建 netByFace / directByFace（读实际相邻）
function freshComponents(blocks, netOfWire) {
    const comps = new Map();
    for (const b of blocks.values()) {
        if (isWireBlock(b)) continue;
        let powered = 0;
        if (b.typeId === SWITCH_TYPE || b.typeId === DISPLAY_TYPE) powered = b.permutation.getState(POWER_STATE) ?? 0;
        if (b.typeId === "sapdon:on_signal") powered = 1;
        const facing = isGate(b.typeId) || b.typeId === SPLITTER_TYPE || b.typeId === MERGE_TYPE ? (b.permutation.getState("minecraft:cardinal_direction") ?? "north") : undefined;
        const c = { key: nodeKey(b), type: b.typeId, facing, powered, nets: {}, directs: {} };
        for (const face of FACES) {
            const nb = getAdjacent(b, capitalize(face));
            if (nb && nb.typeId === WIRE_TYPE && wireConnectState(nb, oppositeFace(face))) {
                c.nets[face] = netOfWire.get(nodeKey(nb)) ?? null;
            } else if (nb && nb.typeId !== WIRE_TYPE && isCircuit(nb.typeId)) {
                c.directs[face] = nodeKey(nb);
            }
        }
        comps.set(c.key, c);
    }
    cLog(`components built: ${comps.size}`, [...comps.values()].map((cp) => `${cp.type}@${cp.key} nets=${JSON.stringify(cp.nets)} directs=${JSON.stringify(cp.directs)} powered=${cp.powered}`).join(" | "));
    return comps;
}

function freshOutputFace(c, face) {
    if (c.type === SWITCH_TYPE || c.type === "sapdon:on_signal" || c.type === "sapdon:off_signal") return true;
    if (isGate(c.type)) return face === gateOutputFace(c.facing);
    if (c.type === SPLITTER_TYPE) {
        const f = splitterFaces(c.facing);
        return face === f.through || face === f.split;
    }
    if (c.type === MERGE_TYPE) return face === mergeFaces(c.facing).out;
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
        if (!c || !c.powered) continue;
        if (isOutputPort(c.type)) continue;
        if (freshOutputFace(c, face)) return 1;
    }
    return 0;
}

function freshFaceSignal(c, face, netsMap, comps) {
    const dk = c.directs[face];
    if (dk) {
        const d = comps.get(dk);
        if (d && freshOutputFace(d, oppositeFace(face))) return d.powered;
    }
    const netId = c.nets[face];
    if (!netId) return 0;
    return freshNetSignal(netId, netsMap, comps);
}

// 在内存 fresh 模型上迭代求各 net 位宽（固定点）
function freshOutputWidth(c, face, netsMap, comps) {
    if (c.type === SPLITTER_TYPE) {
        const f = splitterFaces(c.facing);
        if (face === f.through) return Math.max(0, freshFaceWidth(c, f.input, netsMap, comps) - 1);
        if (face === f.split) return freshFaceWidth(c, f.input, netsMap, comps) >= 1 ? 1 : 0;
        return 1;
    }
    if (c.type === MERGE_TYPE) {
        const m = mergeFaces(c.facing);
        if (face === m.out) return freshFaceWidth(c, m.west, netsMap, comps) + 1;
        return 1;
    }
    return 1;
}

function freshFaceWidth(c, face, netsMap, comps) {
    const dk = c.directs[face];
    if (dk) {
        const d = comps.get(dk);
        if (d) return freshOutputWidth(d, oppositeFace(face), netsMap, comps);
    }
    const netId = c.nets[face];
    const net = netId ? netsMap.get(netId) : null;
    return net ? (net.width ?? 1) : 1;
}

function recomputeFreshNetWidths(netsMap, comps) {
    for (let i = 0; i < netsMap.size + 2; i++) {
        let changed = false;
        for (const net of netsMap.values()) {
            let w = 1;
            for (const { compKey, face } of net.terms.values()) {
                const c = comps.get(compKey);
                if (!c || !freshOutputFace(c, face)) continue;
                const ow = freshOutputWidth(c, face, netsMap, comps);
                if (ow > w) w = ow;
            }
            if (w !== net.width) {
                net.width = w;
                changed = true;
            }
        }
        if (!changed) break;
    }
}

function freshGateWidthError(c, netsMap, comps) {
    if (!isGate(c.type)) return null;
    const faces = freshGateInputs(c);
    for (const face of faces) {
        if (freshFaceWidth(c, face, netsMap, comps) > 1) return face;
    }
    return null;
}

function freshCompute(c, netsMap, comps) {
    const t = c.type;
    if (t === "sapdon:on_signal") return 1;
    if (t === "sapdon:off_signal") return 0;
    if (t === SWITCH_TYPE) return c.powered;
    if (t === DISPLAY_TYPE || isPort(t)) {
        let v = 0;
        for (const face of FACES) v = v || freshFaceSignal(c, face, netsMap, comps);
        return v ? 1 : 0;
    }
    if (t === SPLITTER_TYPE) {
        const f = splitterFaces(c.facing);
        return freshFaceSignal(c, f.input, netsMap, comps) ? 1 : 0;
    }
    if (t === MERGE_TYPE) {
        const m = mergeFaces(c.facing);
        return (freshFaceSignal(c, m.west, netsMap, comps) || freshFaceSignal(c, m.south, netsMap, comps)) ? 1 : 0;
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

// 从某一输入端子出发，扫描真实连通电路：生成输入-输出映射真值表
// 完全独立于运行时内存模型（components/nets），只读实际方块状态。
// 返回 { inputs:[端口序号], outputs:[端口序号], table:[[inMask,outMask],...] } 或 { error }
export function compileLogic(clickedInputPort) {
    if (!clickedInputPort) return { error: "no circuit" };
    cLog("=== compileLogic start, clicked:", nodeKey(clickedInputPort), describeBlock(clickedInputPort) && describeBlock(clickedInputPort).pos);

    const blocks = scanRegion(clickedInputPort);
    cLog("region blocks:", blocks.size, [...blocks.values()].map(describeBlock).map((b) => Object.values(b).join("|")).join(" ; "));
    if (!blocks.size) return { error: "no circuit found" };

    const { netsMap, netOfWire } = freshNets(blocks);
    for (const net of netsMap.values()) freshAttach(net, blocks);
    const comps = freshComponents(blocks, netOfWire);

    const inputs = [];
    const outputs = [];
    for (const c of comps.values()) {
        const num = portNumber(c.type);
        if (num === null) continue;
        (isInputPort(c.type) ? inputs : outputs).push({ c, num });
    }
    inputs.sort((a, b) => a.num - b.num);
    outputs.sort((a, b) => a.num - b.num);
    cLog(`inputs=[${inputs.map((p) => p.num).join(",")}] outputs=[${outputs.map((p) => p.num).join(",")}]`);

    if (!inputs.length) return { error: "«no input port in circuit»" };
    if (inputs.length > MAX_LOGIC_INPUTS) return { error: `«too many inputs (>${MAX_LOGIC_INPUTS})»` };

    recomputeFreshNetWidths(netsMap, comps);
    cLog("net widths:", [...netsMap.values()].map((n) => `${n.id}=${n.width}`).join(" "));
    for (const c of comps.values()) {
        const bad = freshGateWidthError(c, netsMap, comps);
        if (!bad) continue;
        const loc = `${c.key}`;
        cLog(`  !!! ${c.type}@${loc} input face ${bad} width>1 -> error (输入按0处理)`);
    }

    const table = [];
    const total = 1 << inputs.length;
    for (let mask = 0; mask < total; mask++) {
        for (let i = 0; i < inputs.length; i++) inputs[i].c.powered = (mask >> i) & 1;
        let changed = true;
        let it = 0;
        while (changed && it < 32) {
            changed = false;
            for (const c of comps.values()) {
                if (isInputPort(c.type)) continue;
                const before = c.powered;
                const v = freshCompute(c, netsMap, comps);
                if (v !== c.powered) { c.powered = v; changed = true; }
                cLog(`  iter${it} mask${mask} ${c.type}@${c.key} ${before}->${v}`);
            }
            it++;
        }
        let outMask = 0;
        for (let j = 0; j < outputs.length; j++) if (outputs[j].c.powered) outMask |= 1 << j;
        table.push([mask, outMask]);
        cLog(`mask=${mask} => outMask=${outMask}`);
    }
    cLog("=== table:", JSON.stringify(table), "===");

    return {
        inputs: inputs.map((p) => p.num),
        outputs: outputs.map((p) => p.num),
        table,
    };
}

// 从端口 typeId 解析出端口序号（null 表示非端口）
function portNumber(typeId) {
    if (isInputPort(typeId)) {
        const v = /_(\d+)$/.exec(typeId);
        return v ? Number(v[1]) : null;
    }
    if (isOutputPort(typeId)) {
        const v = /_(\d+)$/.exec(typeId);
        return v ? Number(v[1]) : null;
    }
    return null;
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
            lu: comp.logicUuid || "",
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
            logicUuid: c.lu || "",
        });
    }
    for (const n of data.nets) {
        const net = { id: n.k, wires: new Set(n.w), terms: new Map(), width: 1, value: 0 };
        for (const [compKey, face] of n.t) {
            net.terms.set(`${compKey}|${face}`, { compKey, face });
        }
        nets.set(net.id, net);
        for (const w of net.wires) netLookup.set(w, net.id);
    }
    if (typeof data.netSeq === "number") netSeq = data.netSeq;
}
