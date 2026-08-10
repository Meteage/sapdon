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

// 按给定记录对象落库（保留 uuid/version/mode/table/topo/name/createdAt）。
// uuid 缺失或非法时生成新值；已存在同名记录会更新 name 映射。
export function importLogic(record) {
    if (!record || typeof record !== "object") return null;
    const uuid = typeof record.uuid === "string" && /^[0-9a-fA-F-]{8,}$/.test(record.uuid)
        ? record.uuid
        : generateUuid();
    const name = record.name ? String(record.name) : undefined;
    const rec = {
        uuid,
        version: record.version || LOGIC_VERSION,
        mode: record.mode === "topo" ? "topo" : record.mode === "expr" ? "expr" : "table",
        inputs: Array.isArray(record.inputs) ? record.inputs : [],
        outputs: Array.isArray(record.outputs) ? record.outputs : [],
        table: Array.isArray(record.table) ? record.table : [],
        topo: record.topo || null,
        name,
        createdAt: typeof record.createdAt === "number" ? record.createdAt : Date.now(),
    };
    if (!rec.inputs.length && !rec.topo) return null;
    world.setDynamicProperty(logicKey(uuid), JSON.stringify(rec));

    const reg = readRegistry();
    if (!reg.uuids.includes(uuid)) reg.uuids.push(uuid);
    if (name) {
        const key = normalizeName(name);
        if (key) reg.names[key] = uuid;
    }
    writeRegistry(reg);
    return rec;
}

// ---------- 导入暂存区（突破聊天输入长度上限：分段粘到暂存区最后合并） ----------

const STAGE_PREFIX = "sapdos:logic_stage:";
const STAGE_MAX = 128 * 1024;

export function stageAppend(playerId, text) {
    if (!playerId || !text) return 0;
    const cur = stageRead(playerId);
    const next = cur + text;
    const capped = next.length > STAGE_MAX ? next.slice(0, STAGE_MAX) : next;
    world.setDynamicProperty(`${STAGE_PREFIX}${playerId}`, capped);
    return capped.length;
}

export function stageRead(playerId) {
    if (!playerId) return "";
    return world.getDynamicProperty(`${STAGE_PREFIX}${playerId}`) || "";
}

export function stageClear(playerId) {
    if (!playerId) return;
    world.setDynamicProperty(`${STAGE_PREFIX}${playerId}`, undefined);
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

// 按 uuid/名称删除一条逻辑记录；返回是否删除成功
export function deleteLogic(ref) {
    if (!ref) return false;
    const rec = resolveRef(ref);
    if (!rec) return false;
    const reg = readRegistry();

    world.setDynamicProperty(logicKey(rec.uuid), undefined);
    reg.uuids = reg.uuids.filter((u) => u !== rec.uuid);
    if (rec.name) {
        const key = normalizeName(rec.name);
        if (key && reg.names[key] === rec.uuid) delete reg.names[key];
    }
    writeRegistry(reg);
    return true;
}

export function clearLogic() {
    const reg = readRegistry();
    for (const uuid of reg.uuids) {
        world.setDynamicProperty(logicKey(uuid), undefined);
    }
    writeRegistry({ names: {}, uuids: [] });
    return reg.uuids.length;
}

export function resolveRef(ref) {
    return getLogicByUuid(ref) || getLogicByName(ref);
}
