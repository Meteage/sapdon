// 引擎层 R — 内存模型：设备表 / 段索引 / 缓存 / 渲染失效集合 + 设备注册与开关
// 连接图重建见 rebuild.ts；渲染见 render.ts；持久化见 persist.ts。
import { Block } from "@minecraft/server";
import { PUMP_ON_STATE, VALVE_OPEN_STATE, VALVE3_DIR_STATE } from "./const.js";
import { blockKey } from "./world.js";
import { logErr } from "./log.js";
import type { Segment, SegEnd, TankState, PumpState } from "../core/graph.js";

// === 内存表 ===
export const segments = new Map<string, Segment>();
export const pumps = new Map<string, PumpState>();
export const tanks = new Map<string, TankState>();
export const pipeSeg = new Map<string, string>(); // passKey -> segId
export const pumpEnds = new Map<string, { in: { segId: string; end: SegEnd | null } | null; out: { segId: string; end: SegEnd | null } | null }>();
/** 加载后待重建的管道/阀门位置（区块未加载时挂起，逐批洪水重建连接图） */
export const pendingPipes = new Set<string>();

let segSeq = 0;
export let tickCount = 0;

export function incTick() { tickCount++; }
/** 渲染时发现失效方块（外力移除/类型变化，未经 playerBreakBlock）→ 记入，tick 末尾重建对应段 */
export const staleKeys = new Set<string>();
export const pipeCache = new Map<string, number>();
export const tankCache = new Map<string, number>();

export function nextSegId() { return `s${++segSeq}`; }

export function unregisterDevice(key: string) {
    pumps.delete(key);
    tanks.delete(key);
    pipeCache.delete(key);
    tankCache.delete(key);
}

// === 设备注册 ===
export function registerPump(block: Block) {
    const key = blockKey(block);
    pumps.set(key, { on: true, soaked: false }); // soaked 由 tick 周期刷新（泵泡水判定）
    try {
        block.setPermutation(block.permutation.withState(PUMP_ON_STATE as any, 1));
    } catch (e) { logErr("registerPump", e); }
}

export function registerTank(block: Block) {
    tanks.set(blockKey(block), { level: 0 });
}

// === 开关切换 ===
export function togglePump(block: Block): boolean {
    const key = blockKey(block);
    const cur = (block.permutation.getState(PUMP_ON_STATE as any) as number ?? 0) === 1;
    const next = cur ? 0 : 1;
    try { block.setPermutation(block.permutation.withState(PUMP_ON_STATE as any, next)); } catch (e) { logErr("togglePump", e); }
    const p = pumps.get(key);
    if (p) p.on = next === 1;
    return next === 1;
}

/** 单方向阀门扳手：切换开/关（只换顶面箭头 ⟷/↕，方块朝向不动） */
export function toggleValve(block: Block): boolean {
    const cur = (block.permutation.getState(VALVE_OPEN_STATE as any) as number ?? 1) === 1;
    const next = cur ? 0 : 1;
    try { block.setPermutation(block.permutation.withState(VALVE_OPEN_STATE as any, next)); } catch (e) { logErr("toggleValve", e); }
    return next === 1;
}

/** 三通阀扳手：方向顺时针 90° 循环 east→south→west→north；west=指向输入=全关 */
export function cycleValve3(block: Block): string {
    const cur = (block.permutation.getState(VALVE3_DIR_STATE as any) as string) ?? "east";
    const next = cur === "east" ? "south" : cur === "south" ? "west" : cur === "west" ? "north" : "east";
    try { block.setPermutation(block.permutation.withState(VALVE3_DIR_STATE as any, next)); } catch (e) { logErr("cycleValve3", e); }
    return next;
}