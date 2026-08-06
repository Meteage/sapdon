import { world, system } from "@minecraft/server";

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

export const FACES = ["north", "south", "east", "west", "up", "down"];
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

function dbg(msg) {
    if (DEBUG) world.sendMessage(msg);
}

const nodes = new Map();

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

function keyOf(dim, x, y, z) {
    return `${dim}:${x},${y},${z}`;
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

export function recomputeWire(wireBlock) {
    if (!wireBlock || wireBlock.typeId !== WIRE_TYPE) return;
    for (const face of FACES) {
        const stateKey = `wire_connect:${face}`;
        const neighbor = getAdjacent(wireBlock, capitalize(face));
        const value = isCircuit(neighbor.typeId) ? 1 : 0;
        const current = wireBlock.permutation.getState(stateKey) ?? 0;
        if (current !== value) {
            wireBlock.setPermutation(wireBlock.permutation.withState(stateKey, value));
        }
    }
}

export function recomputeAdjacentWires(block) {
    for (const face of FACES) {
        const neighbor = getAdjacent(block, capitalize(face));
        if (neighbor && neighbor.typeId === WIRE_TYPE) {
            recomputeWire(neighbor);
        }
    }
}

export function registerNode(block) {
    const loc = block.location;
    const node = {
        key: nodeKey(block),
        dim: block.dimension.id,
        loc: { x: loc.x, y: loc.y, z: loc.z },
        type: block.typeId,
        powered: 0,
        conn: {},
    };
    if (block.typeId === SWITCH_TYPE || block.typeId === DISPLAY_TYPE) {
        node.powered = block.permutation.getState(POWER_STATE) ?? 0;
    }
    if (isGate(block.typeId)) {
        node.facing = block.permutation.getState("minecraft:cardinal_direction") ?? "north";
    }
    if (block.typeId === WIRE_TYPE) {
        syncWireConn(node, block);
    }
    nodes.set(node.key, node);
    return node;
}

export function unregisterNode(block) {
    nodes.delete(nodeKey(block));
}

function syncWireConn(node, block) {
    for (const face of FACES) {
        const connected = (block.permutation.getState(`wire_connect:${face}`) ?? 0) === 1;
        let nbKey = null;
        if (connected) {
            const nb = getAdjacent(block, capitalize(face));
            if (isCircuit(nb.typeId)) nbKey = nodeKey(nb);
        }
        node.conn[face] = nbKey;
    }
}

export function rebuildAround(block) {
    const queue = [block];
    const seen = new Set();
    let count = 0;
    while (queue.length && count < 1000) {
        const b = queue.shift();
        const k = nodeKey(b);
        if (seen.has(k)) continue;
        seen.add(k);
        if (!isCircuit(b.typeId)) continue;
        registerNode(b);
        count++;
        for (const face of FACES) {
            const nb = getAdjacent(b, capitalize(face));
            if (isCircuit(nb.typeId)) queue.push(nb);
        }
    }
    propagate();
}

function nodeAtOffset(node, face) {
    const { x, y, z } = node.loc;
    let k;
    switch (face) {
        case "north": k = keyOf(node.dim, x, y, z - 1); break;
        case "south": k = keyOf(node.dim, x, y, z + 1); break;
        case "east": k = keyOf(node.dim, x + 1, y, z); break;
        case "west": k = keyOf(node.dim, x - 1, y, z); break;
        case "up": k = keyOf(node.dim, x, y + 1, z); break;
        case "down": k = keyOf(node.dim, x, y - 1, z); break;
    }
    return nodes.get(k);
}

function gateInput(node, face) {
    const nb = nodeAtOffset(node, face);
    if (!nb || nb.type !== WIRE_TYPE) return 0;
    if (nb.conn[oppositeFace(face)] !== node.key) return 0;
    return nb.powered;
}

function computePowered(node) {
    const type = node.type;
    if (type === "sapdon:on_signal") return 1;
    if (type === "sapdon:off_signal") return 0;
    if (type === SWITCH_TYPE) return node.powered;
    if (type === DISPLAY_TYPE) {
        let v = 0;
        for (const face of FACES) {
            const nb = nodeAtOffset(node, face);
            if (nb && nb.type === WIRE_TYPE && nb.conn[oppositeFace(face)] === node.key) {
                v = v || nb.powered;
            }
        }
        return v ? 1 : 0;
    }
    if (type === WIRE_TYPE) {
        let v = 0;
        for (const face of FACES) {
            const nbKey = node.conn[face];
            if (!nbKey) continue;
            const nb = nodes.get(nbKey);
            if (!nb) continue;
            if (nb.type === WIRE_TYPE || isSource(nb.type)) {
                v = v || nb.powered;
            } else if (isGate(nb.type) && oppositeFace(face) === gateOutputFace(nb.facing)) {
                v = v || nb.powered;
            }
        }
        return v ? 1 : 0;
    }
    if (isGate(type)) {
        const out = gateOutputFace(node.facing);
        const inputFaces = type === "sapdon:not_gate"
            ? [notInputFace(node.facing)]
            : FACES_HORIZ.filter((f) => f !== out);
        const inputs = inputFaces.map((f) => gateInput(node, f));
        if (type === "sapdon:and_gate") return inputs.every(Boolean) ? 1 : 0;
        if (type === "sapdon:or_gate") return inputs.some(Boolean) ? 1 : 0;
        if (type === "sapdon:not_gate") return inputs[0] ? 0 : 1;
    }
    return 0;
}

function shortKey(k) {
    if (!k) return "none";
    return k.split(":")[2];
}

function debugDump() {
    dbg(`[circuit] ========== propagate (${nodes.size} nodes) ==========`);
    for (const node of nodes.values()) {
        const { x, y, z } = node.loc;
        const loc = `(${x},${y},${z})`;
        const name = node.type.split(":")[1];
        if (isGate(node.type)) {
            const out = gateOutputFace(node.facing);
            const inputFaces = node.type === "sapdon:not_gate"
                ? [notInputFace(node.facing)]
                : FACES_HORIZ.filter((f) => f !== out);
            const detail = inputFaces.map((f) => {
                const nb = nodeAtOffset(node, f);
                const isWire = nb && nb.type === WIRE_TYPE;
                const matched = isWire && nb.conn[oppositeFace(f)] === node.key;
                const p = isWire ? nb.powered : "-";
                return `${f}:${nb ? nb.type.split(":")[1] : "air"}=${p}${matched ? "" : "(unconn)"}`;
            }).join(" ");
            dbg(`[circuit] ${name}@${loc} facing=${node.facing} out=${out} in[${detail}] => ${computePowered(node)}`);
        } else if (node.type === DISPLAY_TYPE) {
            const wires = [];
            for (const face of FACES) {
                const nb = nodeAtOffset(node, face);
                if (nb && nb.type === WIRE_TYPE && nb.conn[oppositeFace(face)] === node.key) {
                    wires.push(`${face}:${nb.powered}`);
                }
            }
            dbg(`[circuit] display@${loc} <- [${wires.join(" ")}] => ${computePowered(node)}`);
        } else if (node.type === WIRE_TYPE) {
            const conns = Object.entries(node.conn).filter(([f, k]) => k)
                .map(([f, k]) => `${f}:${shortKey(k)}`).join(" ");
            dbg(`[circuit] wire@${loc} conn[${conns}] = ${node.powered}`);
        } else {
            dbg(`[circuit] ${name}@${loc} = ${node.powered}`);
        }
    }
}

export function propagate() {
    const changed = new Set();
    let anyChange = true;
    let iterations = 0;
    while (anyChange && iterations < 20) {
        anyChange = false;
        for (const node of nodes.values()) {
            const v = computePowered(node);
            if (v !== node.powered) {
                node.powered = v;
                anyChange = true;
                changed.add(node.key);
            }
        }
        iterations++;
    }
    applyChanges(changed);
    if (DEBUG && changed.size > 0) {
        dbg(`[circuit] changed ${changed.size} node(s), iterations=${iterations}`);
    }
    debugDump();
}

function applyChanges(changed) {
    for (const key of changed) {
        const node = nodes.get(key);
        if (!node) continue;
        try {
            const dim = world.getDimension(node.dim);
            const block = dim.getBlock(node.loc);
            if (!block || block.typeId !== node.type) continue;
            const powered = node.powered ? 1 : 0;
            const state = block.permutation.getState(POWER_STATE);
            if (state !== undefined && state !== powered) {
                block.setPermutation(block.permutation.withState(POWER_STATE, powered));
            }
            if (block.typeId === WIRE_TYPE || isGate(block.typeId)) {
                dim.spawnParticle(powered ? FLAME : BUBBLE, {
                    x: node.loc.x + 0.5,
                    y: node.loc.y + 0.5,
                    z: node.loc.z + 0.5,
                });
            }
        } catch (e) {}
    }
    for (const node of nodes.values()) {
        try {
            const dim = world.getDimension(node.dim);
            const block = dim.getBlock(node.loc);
            if (!block || block.typeId !== node.type) continue;
            const powered = node.powered ? 1 : 0;
            const state = block.permutation.getState(POWER_STATE);
            if (state !== undefined && state !== powered) {
                block.setPermutation(block.permutation.withState(POWER_STATE, powered));
            }
        } catch (e) {}
    }
}

system.runInterval(() => {
    for (const node of nodes.values()) {
        if (node.powered && (node.type === WIRE_TYPE || isGate(node.type))) {
            try {
                world.getDimension(node.dim).spawnParticle(FLAME, {
                    x: node.loc.x + 0.5,
                    y: node.loc.y + 0.5,
                    z: node.loc.z + 0.5,
                });
            } catch (e) {}
        }
    }
}, 10);

export function clearNodes() {
    nodes.clear();
}
