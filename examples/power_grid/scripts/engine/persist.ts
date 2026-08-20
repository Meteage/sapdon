// 引擎层 R — 持久化（动态属性分块，异常绝不吞掉）
// 只存小状态：设备表（发电机燃烧剩余/电池电量/熔炉进度/太阳能/继电器位置）+ 电线位置（供加载后重建）；
// 线/继电器开关为方块状态（世界自动持久化）。图与电量场不落盘，加载后 rebuildPending 渐进重建。
// 仅结构事件（放置/破坏/开关/重建）时调用；运行态（熔炼/充电）不落盘。
import { world } from "@minecraft/server";
import { SAVE_KEY, CHUNK, VER } from "./const.js";
import { segments, wireSeg, generators, batteries, furnaces, solars, relays, pendingWires, tickCount } from "./state.js";

let loaded = false; // worldLoad 完成后才允许保存（防启动早期空表覆盖存档）

export function savePower() {
    if (!loaded) return;
    try {
        const wireKeys = new Set<string>(pendingWires);
        for (const k of wireSeg.keys()) wireKeys.add(k);
        const data = {
            v: VER,
            generators: [...generators].map(([k, g]) => [k, g.burnTicks, g.fuel]),
            batteries: [...batteries].map(([k, b]) => [k, b.level]),
            furnaces: [...furnaces].map(([k, f]) => [k, f.progress, f.input]),
            solars: [...solars.keys()],
            relays: [...relays.keys()],
            wires: [...wireKeys],
        };
        const json = JSON.stringify(data);
        if (json.length <= CHUNK) {
            world.setDynamicProperty(SAVE_KEY, json);
            clearChunks(0);
        } else {
            const n = Math.ceil(json.length / CHUNK);
            world.setDynamicProperty(SAVE_KEY, JSON.stringify({ _chunks: n }));
            for (let i = 0; i < n; i++) world.setDynamicProperty(`${SAVE_KEY}#${i}`, json.slice(i * CHUNK, (i + 1) * CHUNK));
            clearChunks(n);
        }
    } catch (e) {
        console.warn(`[power] savePower error: ${e && ((e as { message?: string }).message || String(e)) || e}`);
    }
}

function clearChunks(from: number) {
    for (let i = from; i < 32; i++) {
        try {
            if (world.getDynamicProperty(`${SAVE_KEY}#${i}`) != null) world.setDynamicProperty(`${SAVE_KEY}#${i}`, undefined);
        } catch { break; }
    }
}

export function loadPower() {
    // 放行保存闸门：无论是否有存档，只要执行过加载流程就允许后续 savePower 落盘。
    // 否则“新世界无存档”时若提前 return，loaded 恒为 false，整个会话都不落盘，
    // 退出重进后设备表为空（无粒子、不供电）。
    loaded = true;
    try {
        const raw = world.getDynamicProperty(SAVE_KEY);
        let json: string | null = null;
        if (typeof raw === "string") {
            if (raw.startsWith("{")) {
                const meta = JSON.parse(raw);
                if (meta && meta._chunks) {
                    let parts = "";
                    for (let i = 0; i < meta._chunks; i++) {
                        const p = world.getDynamicProperty(`${SAVE_KEY}#${i}`);
                        if (typeof p === "string") parts += p;
                    }
                    json = parts;
                } else json = raw;
            } else json = raw;
        }
        if (!json) { console.warn(`[power] loadPower: no data`); return; }
        const data = JSON.parse(json);
        if (!data) { console.warn(`[power] loadPower: invalid data`); return; }
        generators.clear(); batteries.clear(); furnaces.clear(); solars.clear(); relays.clear();
        segments.clear(); wireSeg.clear(); pendingWires.clear();
        if (data.v === VER) {
            for (const [k, burn, fuel] of data.generators || []) generators.set(k, { burnTicks: burn || 0, fuel: fuel || 0 });
            for (const [k, lvl] of data.batteries || []) batteries.set(k, { level: lvl || 0 });
            for (const [k, prg, input] of data.furnaces || []) furnaces.set(k, { progress: prg || 0, input: input || undefined, hasInput: !!input });
            for (const k of data.solars || []) solars.set(k, {});
            for (const k of data.relays || []) relays.set(k, { open: true });
            for (const k of data.wires || []) pendingWires.add(k);
        } else {
            console.warn(`[power] loadPower: version mismatch (${data.v}), 丢弃旧存档`);
            return;
        }
        loaded = true;
        console.warn(`[power] loadPower: wires=${pendingWires.size} gens=${generators.size} bats=${batteries.size} fur=${furnaces.size}`);
    } catch (e) {
        console.warn(`[power] loadPower error: ${e && ((e as { message?: string }).message || String(e)) || e}`);
    }
}

export function powerPersistDiag() {
    const raw = world.getDynamicProperty(SAVE_KEY);
    let size = 0, chunked = false;
    if (typeof raw === "string") {
        if (raw.startsWith("{")) {
            const meta = JSON.parse(raw);
            if (meta && meta._chunks) {
                chunked = true;
                for (let i = 0; i < meta._chunks; i++) {
                    const p = world.getDynamicProperty(`${SAVE_KEY}#${i}`);
                    if (typeof p === "string") size += p.length;
                }
            } else size = raw.length;
        } else size = raw.length;
    }
    return { key: SAVE_KEY, size, chunked, segs: segments.size, wires: wireSeg.size + pendingWires.size, pending: pendingWires.size, gens: generators.size, bats: batteries.size, fur: furnaces.size, solars: solars.size, relays: relays.size, tick: tickCount };
}