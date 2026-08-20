// 引擎层 R — 内存模型：段表 / 设备表 / 索引 / 装配失效集合 + 设备注册与开关
// 连接图重建见 rebuild.ts；渲染见 render.ts；结算见 tick.ts；持久化见 persist.ts。
import { Block } from "@minecraft/server";
import { COAL_GEN_TYPE, SOLAR_TYPE, FURNACE_TYPE, BATTERY_TYPE, RELAY_TYPE, GEN_BURN_STATE, RELAY_ON_STATE } from "./const.js";
import { blockKey } from "./world.js";
import { logErr } from "./log.js";
import type { Segment } from "../core/graph.js";

// === 内存表 ===
export const segments = new Map<string, Segment>();          // segId -> Segment（L 层）
export const wireSeg = new Map<string, string>();            // wireKey -> segId

// 设备表（小状态，持久化）
export const generators = new Map<string, { burnTicks: number; fuel: number }>(); // 燃烧剩余秒 + 已喂煤炭数
export const batteries = new Map<string, { level: number }>();      // 0..BATTERY_MAX
export const furnaces = new Map<string, { progress: number; input: string | undefined; hasInput: boolean }>(); // 熔炼进度 + 待熔原料 + 是否计入负荷
export const solars = new Map<string, {}>();                         // 存在即产（日照决定）
export const relays = new Map<string, { open: boolean }>();          // 继电器开/关

/** 加载后待重建的电线/设备位置（区块未加载时挂起，逐批洪水重建连接图） */
export const pendingWires = new Set<string>();

export const staleKeys = new Set<string>(); // 渲染发现失效 → tick 末尾重建所在段

let segSeq = 0;
export let tickCount = 0;
export let sunlightNow = 1; // 最近一次结算的日照因子（诊断用）

export function incTick() { tickCount++; }
export function setSunlight(v: number) { sunlightNow = v; }
export function nextSegId() { return `s${++segSeq}`; }

// 从段端点重算 deviceKey -> 相邻段 id[]（每 tick settle 前重建）
export function buildDeviceSegs(): Map<string, string[]> {
    const ds = new Map<string, string[]>();
    for (const [sid, seg] of segments) {
        for (const e of seg.ends) {
            if (!e.deviceKey) continue;
            let list = ds.get(e.deviceKey);
            if (!list) { list = []; ds.set(e.deviceKey, list); }
            if (!list.includes(sid)) list.push(sid);
        }
    }
    return ds;
}

export function unregisterDevice(key: string) {
    generators.delete(key);
    batteries.delete(key);
    furnaces.delete(key);
    solars.delete(key);
    relays.delete(key);
}

// === 设备注册 ===
export function registerGenerator(block: Block) {
    generators.set(blockKey(block), { burnTicks: 0, fuel: 0 });
    writeGenBurn(block, 0);
}

export function registerSolar(block: Block) {
    solars.set(blockKey(block), {});
}

export function registerFurnace(block: Block) {
    furnaces.set(blockKey(block), { progress: 0, input: undefined, hasInput: false });
}

export function registerBattery(block: Block) {
    batteries.set(blockKey(block), { level: 0 });
}

export function registerRelay(block: Block) {
    const open = (block.permutation.getState(RELAY_ON_STATE as any) as number ?? 1) === 1;
    relays.set(blockKey(block), { open });
}

// 喂煤（手持煤炭点击发电机）：发电记录不存在时自动建立（防止放置早于脚本注册的漏注册）
// 返回新燃料数；燃烧时间由 tick.refuelGenerators 在有存煤时续燃。
export function feedGenerator(block: Block): number {
    const key = blockKey(block);
    let g = generators.get(key);
    if (!g) { g = { burnTicks: 0, fuel: 0 }; generators.set(key, g); }
    g.fuel += 1;
    return g.fuel;
}

// 放入熔炉原料（手持可熔炼物品点击电炉）：返回是否成功放入
export function setFurnaceInput(block: Block, itemType: string): boolean {
    const f = furnaces.get(blockKey(block));
    if (!f) return false;
    if (f.input) return false; // 已有原料在熔
    f.input = itemType;
    f.hasInput = true;
    f.progress = 0;
    return true;
}

// === 开关切换 ===
export function toggleRelay(block: Block): boolean {
    const key = blockKey(block);
    const cur = (block.permutation.getState(RELAY_ON_STATE as any) as number ?? 1) === 1;
    const next = cur ? 0 : 1;
    try { block.setPermutation(block.permutation.withState(RELAY_ON_STATE as any, next)); } catch (e) { logErr("toggleRelay", e); }
    const r = relays.get(key);
    if (r) r.open = next === 1;
    return next === 1;
}

function writeGenBurn(block: Block, v: number) {
    try {
        const cur = block.permutation.getState(GEN_BURN_STATE as any) as number ?? 0;
        if (cur !== v) block.setPermutation(block.permutation.withState(GEN_BURN_STATE as any, v));
    } catch (e) { logErr("writeGenBurn", e); }
}