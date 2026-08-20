// ===== systems/fluid :: 流体管道系统引擎（继承 BaseEngine）====
// 与电力引擎同基类：只需提供 graph/注册/结算/渲染/存读。

import { Block } from "@minecraft/server";
import { BaseEngine } from "../../src/engine/BaseEngine.js";
import { FloodGraph, SegEnd, Segment } from "../../src/core/graph.js";
import { blockKey, getBlockByKey, getAdjacent } from "../../src/engine/world.js";
import { settleFluid, PumpState, TankState, ValveState, TANK_MAX } from "../../src/core/fluid-settle.js";
import { Logger } from "../../src/engine/log.js";

const PIPE = "lrf:pipe";
const PUMP = "lrf:pump";
const TANK = "lrf:tank";
const VALVE = "lrf:valve";
const DEVICE_TYPES = [PUMP, TANK, VALVE];
const CONNECT = (f: string) => `lrf:connect:${f}`;
const FILLED = "lrf:filled";

const graph: FloodGraph = {
    isConnector: (k) => getBlockByKey(k)?.typeId === PIPE,
    neighborKey: (k, face) => { const b = getBlockByKey(k); if (!b) return null; const nb = getAdjacent(b, face); return nb ? blockKey(nb) : null; },
    describeEnd: (pipeKey, face): SegEnd | null => {
        const b = getBlockByKey(pipeKey); if (!b) return null;
        const nb = getAdjacent(b, face); if (!nb) return null;
        if (nb.typeId === PIPE) return null;
        const end: SegEnd = { key: `${pipeKey}#${face}`, connectorKey: pipeKey, face, kind: "wall" };
        switch (nb.typeId) {
            case PUMP: end.kind = "pumpOut"; end.deviceKey = blockKey(nb); break; // 简化：泵单端视为输出源
            case TANK: end.kind = "tank"; end.deviceKey = blockKey(nb); break;
            case VALVE: return null; // 阀门作为耦合设备（deviceSegs 归并），不在此收端
            case "minecraft:air": end.kind = "open"; break;
            default: return null;
        }
        return end;
    },
};

export class FluidEngine extends BaseEngine<unknown> {
    readonly pumps = new Map<string, PumpState>();
    readonly tanks = new Map<string, TankState>();
    readonly valves = new Map<string, ValveState>();

    constructor(logger: Logger) {
        super("fluid", { saveKey: "lrf:fluid", logger });
    }
    get connectorTypeId() { return PIPE; }
    get graph() { return graph; }
    isDeviceTypeId(t: string) { return DEVICE_TYPES.includes(t); }
    connectState(f: string) { return CONNECT(f); }

    registerDevice(block: Block) {
        const k = blockKey(block);
        switch (block.typeId) {
            case PUMP: this.pumps.set(k, { on: true }); break;
            case TANK: this.tanks.set(k, { level: 0 }); break;
            case VALVE: this.valves.set(k, { open: true }); break;
        }
    }
    destroyDevice(key: string) { this.pumps.delete(key); this.tanks.delete(key); this.valves.delete(key); }

    togglePump(key: string): boolean {
        const cur = this.pumps.get(key)?.on;
        this.pumps.set(key, { on: !cur });
        return !cur;
    }
    toggleValve(key: string): boolean {
        const cur = this.valves.get(key)?.open ?? true;
        this.valves.set(key, { open: !cur });
        return !cur;
    }

    tickSettle(deviceSegs: Map<string, string[]>) {
        const endsBySeg = new Map<string, SegEnd[]>();
        for (const [sid, seg] of this.segments) endsBySeg.set(sid, seg.ends);
        settleFluid({
            pumps: this.pumps, tanks: this.tanks, valves: this.valves, deviceSegs, endsBySeg,
            dt: this.tickInterval / 20,
            segPowered: (sid, powered) => { const s = this.segments.get(sid); if (s) s.powered = powered; },
        });
        this.render(deviceSegs);
    }

    private setState(key: string, state: string, want: number) {
        const b = getBlockByKey(key); if (!b) return;
        try {
            const cur = (b.permutation.getState(state as any) as number ?? -1);
            if (cur !== want) b.setPermutation(b.permutation.withState(state as any, want));
        } catch (e) { this.stale.add(key); }
    }
    private render(deviceSegs: Map<string, string[]>) {
        for (const seg of this.segments.values()) {
            const w = seg.powered ? 1 : 0;
            for (const c of seg.connectors) { const b = getBlockByKey(c); if (!b || b.typeId !== PIPE) { this.stale.add(c); continue; } this.setState(c, FILLED, w); }
        }
        // 罐液位（简化到 0..15）
        for (const [k, t] of this.tanks) {
            const want = Math.max(0, Math.min(15, Math.round(t.level * 15 / TANK_MAX)));
            this.setState(k, FILLED, want > 0 ? 1 : 0);
        }
        void deviceSegs;
    }

    isActiveIn(): boolean {
        if (this.pending.size || this.stale.size) return true;
        for (const p of this.pumps.values()) if (p.on) return true;
        for (const t of this.tanks.values()) if (t.level < TANK_MAX) return true;
        return false;
    }

    encode(): any { return { p: [...this.pumps].map(([k, v]) => [k, v.on ? 1 : 0]), t: [...this.tanks].map(([k, v]) => [k, v.level]), val: [...this.valves].map(([k, v]) => [k, v.open ? 1 : 0]) }; }
    decode(data: any): void {
        this.pumps.clear(); this.tanks.clear(); this.valves.clear();
        for (const it of data.p || []) { const [k, on] = it; this.pumps.set(k, { on: (on || 0) === 1 }); }
        for (const it of data.t || []) { const [k, lvl] = it; this.tanks.set(k, { level: lvl || 0 }); }
        for (const it of data.val || []) { const [k, open] = it; this.valves.set(k, { open: (open || 1) === 1 }); }
    }
}

export { Segment }; // 保持类型导出便利