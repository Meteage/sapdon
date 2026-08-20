// 逻辑层 L — 电网结算：把共享设备的段并成 Grid，再网格级全局能量结算（不依赖 @minecraft/server）
// 段图见 graph.ts；Node 测试镜像见 test/power.test.mjs（改这里须同步测试副本）
//
// 结算规则（网格级全局，稳压电网直觉）：
//   gen  = Σ 运行中发电机产出 + Σ 太阳能板产出(sunlight)
//   load = Σ 电炉耗电
//   gen >= load  → 全部通电，电池充电 min(chargeRate, 盈余)（上限 MAX）
//   gen <  load  → 电池放电补缺 min(缺口, dischargeRate, 余量)；仍缺 → 断电（褐灯）
//   发电机燃烧时间 :dt 递减，耗光即停机（太阳能不耗燃料）

// ---- 常量（调参记得同步测试副本）----
export const GEN_OUTPUT = 40;        // 燃煤发电机产出 / s
export const SOLAR_OUTPUT = 10;      // 太阳能板满日照产出 / s
export const FURNACE_DRAW = 30;      // 电力熔炉耗电 / s
export const BATTERY_MAX = 1000;     // 电池容量
export const CHARGE_RATE = 60;       // 电池充电速率 / s
export const DISCHARGE_RATE = 60;    // 电池放电速率 / s
export const EPS = 0.001;

export interface GeneratorState { burnTicks: number }  // 剩余燃烧秒数；>0 视为发电中
export interface BatteryState { level: number }        // 0..BATTERY_MAX
export interface FurnaceState { hasInput?: boolean }   // 是否有待熔原料；空炉不算负荷，不耗电
export interface SolarState { }                        // 仅占位
export interface RelayState { open: boolean }          // 继电器：true=导通(合并两侧)

export interface SettleInput {
    generators: Map<string, GeneratorState>;
    batteries: Map<string, BatteryState>;
    furnaces: Map<string, FurnaceState>;
    solars: Map<string, SolarState>;
    relays: Map<string, RelayState>;
    deviceSegs: Map<string, string[]>; // deviceKey -> 相邻段 id[]（对外部提供）
    sunlight: number;                  // 0..1（日照因子）
    dt: number;                        // 步长时间 / s
}

interface GridAgg {
    segIds: Set<string>;
    gens: GeneratorState[];
    bats: BatteryState[];
    furnaceCount: number;
    solarCount: number;
}

class UF {
    parent = new Map<string, string>();
    constructor(keys: string[]) { for (const k of keys) this.parent.set(k, k); }
    find(x: string): string {
        let r = x;
        while (this.parent.get(r) !== r) r = this.parent.get(r)!;
        let p = x;
        while (this.parent.get(p) !== p) { const n = this.parent.get(p)!; this.parent.set(p, r); p = n; }
        return r;
    }
    union(a: string, b: string) {
        const ra = this.find(a), rb = this.find(b);
        if (ra !== rb) this.parent.set(rb, ra);
    }
}

// 电网结算：写入各段 powered + 更新发电机 burnTicks / 电池 level
export function settle(input: SettleInput, segPowered: (segId: string, powered: boolean) => void): void {
    const { generators, batteries, furnaces, solars, relays, deviceSegs, sunlight, dt } = input;

    // ---- 1) 并 Grid：共享设备的段为一格；继电器 open 才并，closed=屏障 ----
    const uf = new UF(deviceSegs.size ? [...new Set([...deviceSegs.values()].flat())] : []);
    const kinds = new Map<string, string>(); // deviceKey -> kind
    for (const [dev, segIds] of deviceSegs) {
        if (segIds.length < 2) continue;
        const isRelay = relays.has(dev);
        if (isRelay && !relays.get(dev)!.open) continue; // 关继电器不并
        for (let i = 1; i < segIds.length; i++) uf.union(segIds[0], segIds[i]);
    }

    // ---- 2) 汇总每 Grid 的设备 ----
    const agg = new Map<string, GridAgg>();
    const addAgg = (root: string): GridAgg => {
        let a = agg.get(root);
        if (!a) { a = { segIds: new Set(), gens: [], bats: [], furnaceCount: 0, solarCount: 0 }; agg.set(root, a); }
        return a;
    };
    for (const [dev, segIds] of deviceSegs) {
        if (relays.has(dev)) {
            if (!relays.get(dev)!.open) continue; // 关继电器不参与任何 Grid
            // 开继电器仅作连通桥，不产电不耗电
            const root = uf.find(segIds[0]);
            if (segIds[0]) addAgg(root).segIds.add(segIds[0]);
            for (const s of segIds) addAgg(root).segIds.add(s);
            continue;
        }
        const root = uf.find(segIds[0]);
        const a = addAgg(root);
        for (const s of segIds) a.segIds.add(s);
        if (generators.has(dev)) a.gens.push(generators.get(dev)!);
        else if (batteries.has(dev)) a.bats.push(batteries.get(dev)!);
        else if (furnaces.has(dev)) { if (furnaces.get(dev)!.hasInput !== false) a.furnaceCount++; }
        else if (solars.has(dev)) a.solarCount++;
    }

    // ---- 3) 逐 Grid 结算 ----
    for (const a of agg.values()) {
        // 发电机：燃烧时间递减；>0 视为发电
        let gen = 0;
        for (const g of a.gens) {
            g.burnTicks -= dt;
            if (g.burnTicks < 0) g.burnTicks = 0;
            if (g.burnTicks > 0) gen += GEN_OUTPUT;
        }
        // 太阳能：按全局日照产出
        gen += a.solarCount * SOLAR_OUTPUT * clamp01(sunlight);

        const load = a.furnaceCount * FURNACE_DRAW;

        // 是否有可用能源（发电机产出 >0 或 电池有电）→ 没有则整段不激活（无源线段不显示“有电”）
        const energized = gen > EPS || a.bats.some((b) => b.level > EPS);

        let powered: boolean;
        if (!energized) {
            powered = false; // 无源无负荷：既没发电机也没带电池 → 暗（不激活），避免 0>=0 空真
        } else if (gen >= load - EPS) {
            // 供电富余：全部通电，电池充电
            let surplus = gen - load;
            powered = true;
            for (const b of a.bats) {
                const add = Math.min(CHARGE_RATE, surplus);
                if (add > 0) { b.level = Math.min(BATTERY_MAX, b.level + add); surplus -= add; }
            }
        } else {
            // 供电不足：电池放电补缺
            const deficit = load - gen;
            let remaining = deficit;
            for (const b of a.bats) {
                const give = Math.min(remaining, DISCHARGE_RATE, b.level);
                b.level -= give;
                remaining -= give;
            }
            powered = remaining <= EPS;
        }

        for (const sid of a.segIds) segPowered(sid, powered);
    }
}

function clamp01(x: number): number {
    return x < 0 ? 0 : x > 1 ? 1 : x;
}