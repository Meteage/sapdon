// 引擎层 R — 主循环：每 20 tick 势求解 + 流动 + 渲染 + 设备存活检查
import { PUMP_TYPE, TANK_TYPE } from "./const.js";
import { getBlockByKey, getAdjacent, isWaterlogged, keyParts } from "./world.js";
import { segments, tanks, pumps, pumpEnds, unregisterDevice, staleKeys, tickCount, incTick } from "./state.js";
import { rebuildPending, rebuildAround, rebuildStale, rebuildPumpEnds } from "./rebuild.js";
import { renderAll } from "./render.js";
import { rlog, isRuntimeLog } from "./log.js";
import { computePotential, TANK_MAX } from "../core/potential.js";
import { tickFlow } from "../core/flow.js";
import { END_VALVE_IN, END_VALVE_OUT } from "../core/graph.js";

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

    // 1) v2 势传播场（唯一独立源：泵输出 +Δ；空气/罐为汇；向上-1；三通透传）
    computePotential(segments, tanks, pumps);

    // 2) 流动结算：水覆盖（tickFlow 已写入 seg.front/seg.covered）+ 罐吸水 + 泵抽水 + 流失
    const flow = tickFlow(segments, tanks, pumps);
    for (const [key, d] of flow.tankDeltas) applyTankDelta(key, d);
    if (isRuntimeLog()) {
        for (const seg of segments.values()) {
            const hi = seg.hi ? `${seg.hi.kind}@${(seg.pot.get(seg.hi.pipeKey) ?? -1).toFixed(2)}` : "-";
            const ends = seg.ends.map((e) => `${e.face}:${e.kind}${e.deviceKey ? "#" + e.deviceKey.split(":")[1] : ""}`).join(",");
            const p0 = keyParts(seg.pipes[0]);
            const p1 = keyParts(seg.pipes[seg.pipes.length - 1]);
            const at = `${p0 ? p0.x + "," + p0.y + "," + p0.z : "?"}->${p1 ? p1.x + "," + p1.y + "," + p1.z : "?"}`;
            rlog(`seg=${seg.id} f=${seg.front.toFixed(1)}/${seg.len} hi=${hi} pot0=${(seg.pot.get(seg.pipes[0]) ?? -1).toFixed(2)} ends=[${ends}] @${at}`);
        }
        // 阀门透传链：valveIn 段(势) → valveOut 段（inPot=-1 说明断链/上游无势）
        for (const seg of segments.values()) {
            for (const e of seg.ends) {
                if (e.kind !== END_VALVE_IN) continue;
                for (const oseg of segments.values()) {
                    for (const oe of oseg.ends) {
                        if (oe.kind === END_VALVE_OUT && oe.deviceKey === e.deviceKey) {
                            const inPot = seg.pot.get(e.pipeKey) ?? -1;
                            rlog(`link ${seg.id}(valveIn=${inPot.toFixed(2)}) -> ${oseg.id}(valveOut)`);
                        }
                    }
                }
            }
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
            // 泵供水源：输入口（底面）接触水块（泵自身被水浸也算）→ 直接吐水给输出段；
            // 侧/顶面接触水不算——入水口断开（底面无水）即停水
            p.soaked = isWaterlogged(key)
                || getAdjacent(b, "down")?.typeId === "minecraft:water";
        }
        for (const [key] of [...tanks]) {
            const b = getBlockByKey(key);
            if (!b || b.typeId !== TANK_TYPE) { unregisterDevice(key); staleKeys.add(key); }
        }
        if (isRuntimeLog()) {
            for (const [key, p] of [...pumps]) {
                const b = getBlockByKey(key);
                const pe = pumpEnds.get(key);
                rlog(`pump ${b ? `@${b.location.x},${b.location.y},${b.location.z}` : key} on=${p.on} soaked=${p.soaked} in=${pe?.in ? "pipe" : "none"} out=${pe?.out ? "pipe" : "none"}`);
            }
        }
        rebuildStale();
    }
}