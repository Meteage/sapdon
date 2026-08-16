// 引擎层 R — 主循环：每 20 tick 势求解 + 流动 + 渲染 + 设备存活检查
import { PUMP_TYPE, TANK_TYPE } from "./const.js";
import { getBlockByKey, getAdjacent, isWaterlogged } from "./world.js";
import { segments, tanks, pumps, unregisterDevice, staleKeys, tickCount, incTick } from "./state.js";
import { rebuildPending, rebuildAround, rebuildStale, rebuildPumpEnds } from "./rebuild.js";
import { renderAll } from "./render.js";
import { rlog, isRuntimeLog } from "./log.js";
import { computePotential, TANK_MAX } from "../core/potential.js";
import { tickFlow } from "../core/flow.js";

function applyTankDelta(key: string, d: number) {
    const t = tanks.get(key);
    if (!t) return;
    const nv = Math.max(0, Math.min(TANK_MAX, t.level + d));
    if (nv === t.level) return;
    t.level = nv;
}

// === 主循环：每 20 tick 势求解 + 流动 + 渲染 ===
export function tick() {
    // 0) 加载后渐进重建连接图：pending 管道/阀门按区块逐个洪水（连接图不持久化，靠这里 + 事件重建）
    rebuildPending();

    // 0b) 含水源失效检查：soak 端管道不再含水（被舀走）→ 重建该段
    const needRebuild = new Set<string>();
    for (const seg of segments.values()) {
        for (const e of seg.ends) {
            if (e.face === "soak" && !isWaterlogged(e.pipeKey)) needRebuild.add(e.pipeKey);
        }
    }
    for (const k of needRebuild) rebuildAround(k);

    // 1) v2 势传播场（多源 BFS：水=1 / 空气=-1 / 向上-1 / 泵Δ / 罐弱源）
    computePotential(segments, tanks, pumps);

    // 2) 流动结算：水覆盖（tickFlow 已写入 seg.front/seg.covered）+ 罐吸/排 + 泵抽水 + 流失
    const flow = tickFlow(segments, tanks, pumps);
    for (const [key, d] of flow.tankDeltas) applyTankDelta(key, d);
    if (isRuntimeLog()) {
        for (const seg of segments.values()) {
            const hi = seg.hi ? `${seg.hi.kind}@${(seg.pot.get(seg.hi.pipeKey) ?? -1).toFixed(2)}` : "-";
            rlog(`seg=${seg.id} front=${seg.front.toFixed(1)}/${seg.len} hi=${hi} pot0=${(seg.pot.get(seg.pipes[0]) ?? -1).toFixed(2)}`);
        }
    }
    // 3) 渲染（失效方块记入 staleKeys）
    renderAll();
    // 3b) 重建失效段
    rebuildStale();
    // 4) 无周期保存：仅结构事件（放置/破坏/切换/重建）走 saveFluid 落盘；液位等运行态只存内存
    incTick();
    // 5) 周期刷新泵端点（worldLoad 时区块未加载，pumpEnds 可能为空）+ 泵泡水判定 + 设备存活检查
    if (tickCount % 5 === 0) {
        rebuildPumpEnds();
        for (const [key, p] of [...pumps]) {
            const b = getBlockByKey(key);
            if (!b || b.typeId !== PUMP_TYPE) { unregisterDevice(key); staleKeys.add(key); continue; }
            // 泵泡水：泵自身被水浸没（fluid_container 含水）或相邻 6 面任一为水块 → 直接吐水给输出段
            p.soaked = isWaterlogged(key)
                || ["north", "south", "east", "west", "up", "down"].some((f) => getAdjacent(b, f)?.typeId === "minecraft:water");
        }
        for (const [key] of [...tanks]) {
            const b = getBlockByKey(key);
            if (!b || b.typeId !== TANK_TYPE) { unregisterDevice(key); staleKeys.add(key); }
        }
        rebuildStale();
    }
}