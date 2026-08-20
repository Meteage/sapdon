// ===== systems/power :: 电力系统引擎（继承 BaseEngine）====
// 只需实现基类的接口即可得到完整生命周期：建段/重建/持久化/心跳/加载恢复全由基类负责。

import { Block, world } from "@minecraft/server";
import { BaseEngine } from "../../framework/engine/BaseEngine.js";
import { FloodGraph, SegEnd } from "../../framework/core/graph.js";
import { blockKey, getBlockByKey, getAdjacent } from "../../framework/engine/world.js";
import { settlePower, GenState, BattState, BATTERY_MAX } from "../../framework/core/power-settle.js";
import { Logger } from "../../framework/engine/log.js";

const WIRE = "lrf:wire";
const GEN = "lrf:coal_gen";
const SOLAR = "lrf:solar";
const FURNACE = "lrf:furnace";
const BATTERY = "lrf:battery";
const DEVICE_TYPES = [GEN, SOLAR, FURNACE, BATTERY];
const CONNECT = (f: string) => `lrf:connect:${f}`;
const POWERED = "lrf:powered";
const BURN = "lrf:burning";
const BATT_LEVEL = "lrf:level";

const graph: FloodGraph = {
    isConnector: (k) => getBlockByKey(k)?.typeId === WIRE,
    neighborKey: (k, face) => { const b = getBlockByKey(k); if (!b) return null; const nb = getAdjacent(b, face); return nb ? blockKey(nb) : null; },
    describeEnd: (wireKey, face): SegEnd | null => {
        const b = getBlockByKey(wireKey); if (!b) return null;
        const nb = getAdjacent(b, face); if (!nb) return null;
        if (nb.typeId === WIRE) return null;
        const end: SegEnd = { key: `${wireKey}#${face}`, connectorKey: wireKey, face, kind: "wall" };
        switch (nb.typeId) {
            case GEN: end.kind = "gen"; end.deviceKey = blockKey(nb); break;
            case SOLAR: end.kind = "solar"; end.deviceKey = blockKey(nb); break;
            case FURNACE: end.kind = "furnace"; end.deviceKey = blockKey(nb); break;
            case BATTERY: end.kind = "battery"; end.deviceKey = blockKey(nb); break;
            case "minecraft:air": end.kind = "open"; break;
            default: return null;
        }
        return end;
    },
};

function sunlightFactor(): number {
    const t = world.getTimeOfDay();
    if (t >= 13000 && t < 23000) return 0;
    return 1;
}

export class PowerEngine extends BaseEngine<{ v?: number; g: string[][]; b: string[]; f: string[] }> {
    readonly gens = new Map<string, GenState>();
    readonly bats = new Map<string, BattState>();
    readonly furnaceInput = new Map<string, boolean>();
    readonly solarKeys = new Set<string>();
    sunlight = 1;

    constructor(logger: Logger) {
        super("power", { saveKey: "lrf:power", logger });
    }
    get connectorTypeId() { return WIRE; }
    get graph() { return graph; }
    isDeviceTypeId(t: string) { return DEVICE_TYPES.includes(t); }
    connectState(f: string) { return CONNECT(f); }

    registerDevice(block: Block) {
        const k = blockKey(block);
        switch (block.typeId) {
            case GEN: this.gens.set(k, { burnTicks: 0, fuel: 0 }); break;
            case SOLAR: this.solarKeys.add(k); break;
            case FURNACE: this.furnaceInput.set(k, false); break;
            case BATTERY: this.bats.set(k, { level: 0 }); break;
        }
    }
    destroyDevice(key: string) { this.gens.delete(key); this.solarKeys.delete(key); this.furnaceInput.delete(key); this.bats.delete(key); }

    feedCoal(key: string): number {
        let g = this.gens.get(key);
        if (!g) { g = { burnTicks: 0, fuel: 0 }; this.gens.set(key, g); }
        g.fuel! += 1;
        return g.fuel!;
    }
    setFurnaceInput(key: string, has: boolean): void { this.furnaceInput.set(key, has); }

    tickSettle(deviceSegs: Map<string, string[]>): void {
        this.sunlight = sunlightFactor();
        // 供能源（煤炭耗尽自动续燃）
        for (const g of this.gens.values()) { if (g.burnTicks <= 0 && (g.fuel ?? 0) > 0) { g.fuel!--; g.burnTicks = 10; } }
        settlePower({
            gens: this.gens, bats: this.bats, relays: new Map(), furnaceHasInput: this.furnaceInput,
            solarKeys: this.solarKeys, deviceSegs, sunlight: this.sunlight, dt: this.tickInterval / 20,
            segPowered: (sid, powered) => { const s = this.segments.get(sid); if (s) s.powered = powered; },
        });
        this.render(deviceSegs);
    }

    private setState(key: string, state: string, want: number) {
        const b = getBlockByKey(key); if (!b) return;
        try {
            const cur = (b.permutation.getState(state as any) as number ?? -1);
            if (cur !== want) { b.setPermutation(b.permutation.withState(state as any, want)); }
        } catch (e) { this.stale.add(key); }
    }
    private render(deviceSegs: Map<string, string[]>) {
        for (const seg of this.segments.values()) {
            const w = seg.powered ? 1 : 0;
            for (const c of seg.connectors) { const b = getBlockByKey(c); if (!b || b.typeId !== WIRE) { this.stale.add(c); continue; } this.setState(c, POWERED, w); }
        }
        const devPowered = (k: string) => (deviceSegs.get(k) ?? []).some((sid) => this.segments.get(sid)?.powered);
        for (const [k, g] of this.gens) this.setState(k, BURN, g.burnTicks > 0 ? 1 : 0);
        for (const [k, lv] of this.bats) {
            const want = Math.max(0, Math.min(15, Math.round(lv.level * 15 / BATTERY_MAX)));
            this.setState(k, BATT_LEVEL, want);
        }
        for (const k of deviceSegs.keys()) { const b = getBlockByKey(k); if (!b) continue; if (b.typeId === FURNACE) this.setState(k, POWERED, devPowered(k) ? 1 : 0); }
    }

    isActiveIn(): boolean {
        if (this.pending.size || this.stale.size) return true;
        for (const g of this.gens.values()) if (g.burnTicks > 0) return true;
        for (const v of this.furnaceInput.values()) if (v) return true;
        if (this.sunlight > 0) for (const b of this.bats.values()) if (b.level < BATTERY_MAX) return true;
        return false;
    }

    encode(): any { return { g: [...this.gens].map(([k, s]) => [k, s.burnTicks, s.fuel || 0]), b: [...this.bats].map(([k, s]) => [k, s.level]), f: [...this.furnaceInput].map(([k, v]) => [k, v ? 1 : 0]), s: [...this.solarKeys] }; }
    decode(data: any): void {
        this.gens.clear(); this.bats.clear(); this.furnaceInput.clear(); this.solarKeys.clear();
        for (const it of data.g || []) { const [k, burn, fuel] = it; this.gens.set(k, { burnTicks: burn || 0, fuel: fuel || 0 }); }
        for (const it of data.b || []) { const [k, lvl] = it; this.bats.set(k, { level: lvl || 0 }); }
        for (const it of data.f || []) { const [k, v] = it; this.furnaceInput.set(k, (v || 0) === 1); }
        for (const k of data.s || []) this.solarKeys.add(k);
    }
}