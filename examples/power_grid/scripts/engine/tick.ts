// 引擎层 R — 主循环：每 20 tick 日照 + 电网结算 + 渲染 + 发电燃料补给 + 熔炉熔炼 + 设备存活检查
import { world, ItemStack, MolangVariableMap, system } from "@minecraft/server";
import { COAL_GEN_TYPE, SOLAR_TYPE, FURNACE_TYPE, BATTERY_TYPE, RELAY_TYPE,
         COAL_BURN_SECONDS, TICK_INTERVAL } from "./const.js";
import { getBlockByKey } from "./world.js";
import { segments, generators, batteries, furnaces, solars, relays, pendingWires,
         staleKeys, incTick, buildDeviceSegs, setSunlight, sunlightNow } from "./state.js";
import { rebuildPending, rebuildStale } from "./rebuild.js";
import { renderAll } from "./render.js";
import { rlog, logErr, isRuntimeLog } from "./log.js";
import { settle, type SettleInput, BATTERY_MAX } from "../core/settle.js";

export const SMELT_TIME = 10;     // 熔炼一个物品所需秒当量
export const SMELT_RATE = 1;      // 炉子能量推进速率 / s

// 电炉配方（输入 -> 输出）
export const SMELT_RECIPES: Record<string, string> = {
    "minecraft:raw_iron": "minecraft:iron_ingot",
    "minecraft:raw_gold": "minecraft:gold_ingot",
    "minecraft:raw_copper": "minecraft:copper_ingot",
    "minecraft:iron_ore": "minecraft:iron_ingot",
    "minecraft:gold_ore": "minecraft:gold_ingot",
    "minecraft:copper_ore": "minecraft:copper_ingot",
    "minecraft:cobblestone": "minecraft:stone",
};

// 白昼日照因子（0..1）：夜晚 0，白天 1（近似；可加黎明/黄昏斜坡）
export function computeSunlight(): number {
    const t = world.getTimeOfDay();
    if (t >= 13000 && t < 23000) return 0; // 夜
    return 1; // 昼
}

function dtSeconds(tickInterval: number) { return tickInterval / 20; }

// 通电设备集合（供熔炉）
function poweredDevices(deviceSegs: Map<string, string[]>): Set<string> {
    const out = new Set<string>();
    for (const [key, list] of deviceSegs) {
        for (const sid of list) { const s = segments.get(sid); if (s && s.powered) { out.add(key); break; } }
    }
    return out;
}

// 发电机燃料补给：燃烧耗尽且有存煤 → 消耗 1 个煤炭续燃
function refuelGenerators(): void {
    for (const [key, g] of generators) {
        if (g.burnTicks > 0 || g.fuel <= 0) continue;
        const b = getBlockByKey(key);
        if (!b || b.typeId !== COAL_GEN_TYPE) { staleKeys.add(key); continue; }
        g.fuel -= 1;
        g.burnTicks = COAL_BURN_SECONDS;
    }
}

// 电炉熔炼：带电且有原料 → 推进度；进度满 → 产出真实物品（memory 槽，点击放入原料）
function smeltFurnaces(poweredDev: Set<string>): void {
    for (const [key, f] of furnaces) {
        f.hasInput = !!f.input; // 决定该炉是否计入电网负荷（空炉不耗电）
        const b = getBlockByKey(key);
        if (!b || b.typeId !== FURNACE_TYPE) { staleKeys.add(key); continue; }
        if (!poweredDev.has(key) || !f.input) { f.progress = 0; continue; } // 断电或无料停熔
        const recipe = SMELT_RECIPES[f.input];
        if (!recipe) { f.progress = 0; f.input = undefined; continue; }
        f.progress += SMELT_RATE * dtSeconds(TICK_INTERVAL);
        if (f.progress >= SMELT_TIME) {
            // 产出物品实体在方块上方
            try {
                b.dimension.spawnItem(new ItemStack(recipe, 1), { x: b.location.x + 0.5, y: b.location.y + 1.2, z: b.location.z + 0.5 });
            } catch (e) { logErr("smelt spawn", e); }
            f.input = undefined;
            f.hasInput = false;
            f.progress = 0;
        }
    }
}

// 设备存活检查（外力移除/类型变化 → 注销 + 记失效）
// 注意：区块未加载时 getBlockByKey 可能暂时返回 null/未就绪——绝对不能因此删设备，
// 否则重进世界（worldLoad 后区块未加载）会清空设备表，导致不再供电/不再有状态粒子。
function pruneDevices(): void {
    const check = (map: Map<string, unknown>, typeId: string, key: string, isLoaded: (b: ReturnType<typeof getBlockByKey>) => boolean) => {
        const b = getBlockByKey(key);
        if (!b || isLoaded(b) === false) return; // 区块未加载 → 跳过，留待下个 tick
        if (b.typeId !== typeId) { map.delete(key); staleKeys.add(key); }
    };
    const isLoaded = (b: ReturnType<typeof getBlockByKey>) => (b as { isLoaded?: boolean } | null)?.isLoaded !== false;
    for (const key of [...generators.keys()]) check(generators, COAL_GEN_TYPE, key, isLoaded);
    for (const key of [...solars.keys()]) check(solars, SOLAR_TYPE, key, isLoaded);
    for (const key of [...furnaces.keys()]) check(furnaces, FURNACE_TYPE, key, isLoaded);
    for (const key of [...batteries.keys()]) check(batteries, BATTERY_TYPE, key, isLoaded);
    for (const key of [...relays.keys()]) check(relays, RELAY_TYPE, key, isLoaded);
}

// === 状态粒子：在“正常工作的设备”头顶 1 格放粒子，便于观察 ===
// 燃煤发电机烧→火焰；太阳能日照→烟；电炉熔炼→岩浆；电池有电→电火花；继电器导通带电→气泡
function spawnStatusParticles(poweredDev: Set<string>): void {
    function emit(key: string, particle: string) {
        const b = getBlockByKey(key);
        if (!b) return;
        try {
            const vars = new MolangVariableMap();
            vars.setVector3("variable.direction", { x: 0, y: 1, z: 0 });
            b.dimension.spawnParticle(particle, { x: b.location.x + 0.5, y: b.location.y + 1.1, z: b.location.z + 0.5 }, vars);
        } catch (e) { /* 视觉层，忽略 */ }
    }
    for (const [k, g] of generators) if (g.burnTicks > 0) emit(k, "minecraft:basic_flame_particle");      // 烧煤
    for (const k of solars.keys()) if (sunlightNow > 0.2) emit(k, "minecraft:basic_smoke_particle");       // 日照产电
    for (const [k, f] of furnaces) if (poweredDev.has(k) && f.input && f.progress > 0) emit(k, "minecraft:lava_particle"); // 熔炼中
    for (const [k, b] of batteries) if (b.level > 0.5) emit(k, "minecraft:electric_spark_particle");       // 有电量
    for (const [k, r] of relays) if (r.open && poweredDev.has(k)) emit(k, "minecraft:basic_bubble_particle"); // 导通带载
}

// === 按需心跳：事件驱动优先，尽量少跑 tick ===
// 只有_确实有进行中/待结算的工作_才启动 1s 心跳；空闲（无燃烧、无待熔料、无待充电池、无待重建）
// 就停掉整个 interval，世界静止时不 tick。任何世界事件（放置/破坏/喂料/开关/重进）会调用 ensureHeartbeat() 唤醒。
let heartbeatId: number | undefined;

// 是否有正在进行的"时间相关"工作（决定心跳继续还是停）
function isActive(): boolean {
    if (pendingWires.size > 0 || staleKeys.size > 0) return true;  // 待渐近重建/待失效重建
    for (const g of generators.values()) if (g.burnTicks > 0) return true; // 烧煤：消耗+可能充电，需持续
    for (const f of furnaces.values()) if (f.input) return true;          // 有待熔原料（含等电）
    if (sunlightNow > 0) for (const b of batteries.values()) if (b.level < BATTERY_MAX) return true; // 白天可充电
    return false;
}

function heartbeatLoop() {
    try { tick(); } catch (e) { logErr("tick", e); }
    if (!isActive()) stopHeartbeat(); // 工作做完即停，不再空转
}

export function ensureHeartbeat() {
    if (heartbeatId === undefined) {
        heartbeatId = system.runInterval(heartbeatLoop, TICK_INTERVAL);
    }
}
function stopHeartbeat() {
    if (heartbeatId !== undefined) {
        try { system.clearRun(heartbeatId); } catch (e) { /* ignore */ }
        heartbeatId = undefined;
    }
}

// === 主循环：每 20 tick ===
export function tick() {
    try {
        // 0) 加载后渐进重建（世界加载时区块未加载，逐批洪水重建连接图）
        rebuildPending();

        // 1) 日照 + 设备对账
        setSunlight(computeSunlight());
        pruneDevices();

        // 2) 电网结算（纯逻辑 L 层；写 seg.powered）
        const deviceSegs = buildDeviceSegs();
        const input: SettleInput = {
            generators, batteries, furnaces, solars, relays, deviceSegs,
            sunlight: sunlightNow, dt: dtSeconds(TICK_INTERVAL),
        };
        settle(input, (segId, powered) => {
            const s = segments.get(segId);
            if (s) s.powered = powered;
        });

        // 3) 发电燃料补给 + 电炉熔炼
        refuelGenerators();
        smeltFurnaces(poweredDevices(deviceSegs));

        // 4) 渲染（同步方块状态）
        renderAll(deviceSegs);

        // 4b) 状态粒子（头顶 1 格，标识正常工作设备）
        spawnStatusParticles(poweredDevices(deviceSegs));

        // 5) 失效段重建
        rebuildStale(staleKeys);

        if (isRuntimeLog()) {
            for (const [sid, seg] of segments) {
                rlog(`seg=${sid} wires=${seg.pipes.length} powered=${seg.powered} ends=[${seg.ends.map((e) => `${e.face}:${e.kind}${e.deviceKey ? "#" + e.deviceKey : ""}`).join(",")}]`);
            }
            for (const [k, g] of generators) { const b = getBlockByKey(k); rlog(`gen ${b ? `@${b.location.x},${b.location.y},${b.location.z}` : k} burn=${g.burnTicks.toFixed(2)}`); }
            for (const [k, bt] of batteries) rlog(`batt ${k} level=${bt.level.toFixed(1)}`);
        }
        incTick();
    } catch (e) {
        logErr("tick", e);
    }
}