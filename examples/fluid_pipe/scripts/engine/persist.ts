// 引擎层 R — 持久化（动态属性分块，异常绝不吞掉）
// v2：不存连接图（段/端点/邻接/前沿全部不入库）——连接图由事件响应重建、加载后按区块渐进洪水重建；
// 只存小状态：设备表（泵开关/罐液位）+ 管道位置（供加载后定位重建）。阀开/关与方向均为方块状态（世界自动持久化）。
// 仅在结构事件（放置/破坏/切换/重建）时调用；运行态（液位流动等）不落盘。
import { world } from "@minecraft/server";
import { SAVE_KEY, CHUNK, VER } from "./const.js";
import { segments, pipeSeg, pumps, tanks, pumpEnds, pendingPipes, pipeCache, tankCache, tickCount } from "./state.js";

let loaded = false; // worldLoad 加载完成后才允许保存（防止启动早期用空表覆盖存档）

export function saveFluid() {
    if (!loaded) return; // 加载完成前不写，防启动早期空表覆盖存档
    try {
        const keys = new Set<string>(pendingPipes);
        for (const k of pipeSeg.keys()) keys.add(k);
        const data = {
            v: VER,
            tanks: [...tanks].map(([k, t]) => [k, t]),
            pumps: [...pumps].map(([k, p]) => [k, p]),
            pipes: [...keys],
        };
        const json = JSON.stringify(data);
        if (json.length <= CHUNK) {
            world.setDynamicProperty(SAVE_KEY, json);
            clearChunks(0);
        } else {
            const n = Math.ceil(json.length / CHUNK);
            world.setDynamicProperty(SAVE_KEY, JSON.stringify({ _chunks: n }));
            for (let i = 0; i < n; i++) {
                world.setDynamicProperty(`${SAVE_KEY}#${i}`, json.slice(i * CHUNK, (i + 1) * CHUNK));
            }
            clearChunks(n);
        }
    } catch (e) {
        console.warn(`[fluid] saveFluid error: ${e && ((e as any).message || String(e)) || e}`);
    }
}

function clearChunks(from: number) {
    for (let i = from; i < 32; i++) {
        try {
            if (world.getDynamicProperty(`${SAVE_KEY}#${i}`) != null) {
                world.setDynamicProperty(`${SAVE_KEY}#${i}`, undefined);
            }
        } catch {
            break;
        }
    }
}

export function loadFluid() {
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
                } else {
                    json = raw;
                }
            } else {
                json = raw;
            }
        }
        if (!json) {
            console.warn(`[diag] loadFluid: no data`);
            return;
        }
        const data = JSON.parse(json);
        if (!data) {
            console.warn(`[diag] loadFluid: invalid data`);
            return;
        }
        pumps.clear();
        tanks.clear();
        segments.clear();
        pipeSeg.clear();
        pumpEnds.clear();
        pendingPipes.clear();
        pipeCache.clear();
        tankCache.clear();
        if (data.v === 1) {
            // v1 迁移：设备表继承，管道位置从旧段成员收集（连接图丢弃，加载后渐进重建）
            for (const [k, p] of data.pumps || []) pumps.set(k, p);
            for (const [k, t] of data.tanks || []) tanks.set(k, t);
            for (const s of data.segs || []) for (const k of s.pipes) pendingPipes.add(k);
        } else if (data.v === VER) {
            for (const [k, p] of data.pumps || []) pumps.set(k, p);
            for (const [k, t] of data.tanks || []) tanks.set(k, t);
            for (const k of data.pipes || []) pendingPipes.add(k);
        } else {
            console.warn(`[diag] loadFluid: version mismatch (${data.v}), 丢弃旧存档`);
            return;
        }
        loaded = true;
        console.warn(`[diag] loadFluid: pendingPipes=${pendingPipes.size} tanks=${tanks.size} pumps=${pumps.size}`);
    } catch (e) {
        console.warn(`[fluid] loadFluid error: ${e && ((e as any).message || String(e)) || e}`);
    }
}

export function fluidPersistDiag() {
    const raw = world.getDynamicProperty(SAVE_KEY);
    let size = 0;
    let chunked = false;
    if (typeof raw === "string") {
        if (raw.startsWith("{")) {
            const meta = JSON.parse(raw);
            if (meta && meta._chunks) {
                chunked = true;
                for (let i = 0; i < meta._chunks; i++) {
                    const p = world.getDynamicProperty(`${SAVE_KEY}#${i}`);
                    if (typeof p === "string") size += p.length;
                }
            } else {
                size = raw.length;
            }
        } else {
            size = raw.length;
        }
    }
    let pipes = pipeSeg.size + pendingPipes.size;
    return { key: SAVE_KEY, size, chunked, segs: segments.size, pipes, pending: pendingPipes.size, tanks: tanks.size, pumps: pumps.size, tickCount };
}