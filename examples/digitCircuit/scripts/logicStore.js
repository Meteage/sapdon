import { world } from "@minecraft/server";

const LOGIC_PREFIX = "sapdos:circuit_logic:";
const REGISTRY_KEY = "sapdos:circuit_logic_registry";
const LOGIC_VERSION = 1;

export function generateUuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function normalizeName(name) {
    return (name || "").trim().toLowerCase();
}

function readRegistry() {
    const raw = world.getDynamicProperty(REGISTRY_KEY);
    if (!raw) return { names: {}, uuids: [] };
    try {
        const reg = JSON.parse(raw);
        return { names: reg.names || {}, uuids: Array.isArray(reg.uuids) ? reg.uuids : [] };
    } catch (e) {
        return { names: {}, uuids: [] };
    }
}

function writeRegistry(reg) {
    world.setDynamicProperty(REGISTRY_KEY, JSON.stringify(reg));
}

function logicKey(uuid) {
    return `${LOGIC_PREFIX}${uuid}`;
}

export function saveLogic(data) {
    const uuid = generateUuid();
    const record = {
        uuid,
        version: LOGIC_VERSION,
        mode: data.mode || "table",
        inputs: data.inputs || [],
        outputs: data.outputs || [],
        table: data.table || [],
        topo: data.topo || null,
        name: data.name ? String(data.name) : undefined,
        createdAt: Date.now(),
    };
    world.setDynamicProperty(logicKey(uuid), JSON.stringify(record));

    const reg = readRegistry();
    reg.uuids.push(uuid);
    if (record.name) {
        const key = normalizeName(record.name);
        if (key) reg.names[key] = uuid;
    }
    writeRegistry(reg);
    return record;
}

export function getLogicByUuid(uuid) {
    if (!uuid) return null;
    const raw = world.getDynamicProperty(logicKey(uuid));
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

export function getLogicByName(name) {
    const key = normalizeName(name);
    if (!key) return null;
    const reg = readRegistry();
    const uuid = reg.names[key];
    return uuid ? getLogicByUuid(uuid) : null;
}

export function listLogic() {
    const reg = readRegistry();
    const out = [];
    for (const uuid of reg.uuids) {
        const rec = getLogicByUuid(uuid);
        if (rec) out.push(rec);
    }
    return out;
}
