# 教程：继承 BaseEngine 做第三个系统（机械传动带）

本篇用**"机械传动"系统**做例子，一步步教你把一个新系统"插"进框架。
它会很像电力（源→消费→储量），但概念换成"扭矩(torque)"，方便看出**该系统和电力用的是同一套骨架**。

## 目标系统（五元组）
| 元组 | 机械传动 |
|---|---|
| 连接 | `mech:belt` 传动带 |
| 源 | `mech:waterwheel` 水车（恒产扭矩 40/s） |
| 功能 | `mech:clutch` 离合器（可控桥：合=连通、离=分隔） |
| 消费 | `mech:mill` 磨坊（有料才耗 30/s） |
| 储量 | `mech:flywheel` 飞轮（储 1000，充放） |

结算规则和电力几乎一样，只是常数改叫扭矩。整个系统 = "抄一份 power，改名＋微调"。

---

## 1. 写 L 层结算 `scripts/framework/core/mech-settle.ts`

> 复制 `power-settle.ts`，把 `GEN→WHEEL`、`FURNACE→MILL`、`BATTERY→FLYWHEEL`，去掉太阳能，即可。

```ts
import { buildGrids } from "./network.js";

export const WHEEL_OUTPUT = 40;
export const MILL_DRAW = 30;
export const FLYWHEEL_MAX = 1000;
export const CHARGE_RATE = 60;
export const DISCHARGE_RATE = 60;
export const EPS = 0.001;

export interface WheelState { running: boolean }     // 水车是否在转
export interface FlywheelState { spin: number }      // 0..FLYWHEEL_MAX
export interface ClutchState { open: boolean }       // 离合器：合=连通

export interface MechSettleInput {
    wheels: Map<string, WheelState>;
    flywheels: Map<string, FlywheelState>;
    clutches: Map<string, ClutchState>;
    millHasInput: Map<string, boolean>;
    deviceSegs: Map<string, string[]>;
    dt: number;
    segPowered: (segId: string, powered: boolean) => void;
}

export function settleMech(inp: MechSettleInput): void {
    const shouldCouple = (k: string) => inp.clutches.has(k) ? inp.clutches.get(k)!.open : true;
    const { segGrid } = buildGrids({ deviceSegs: inp.deviceSegs, shouldCouple });

    interface Agg { segs: Set<string>; wheels: WheelState[]; fly: FlywheelState[]; millCount: number }
    const agg = new Map<string, Agg>();
    const getAgg = (r: string): Agg => { let a = agg.get(r); if (!a) { a = { segs: new Set(), wheels: [], fly: [], millCount: 0 }; agg.set(r, a); } return a; };

    for (const [dev, ids] of inp.deviceSegs) {
        if (!ids.length) continue;
        const a = getAgg(segGrid.get(ids[0])!);
        for (const s of ids) a.segs.add(s);
        if (inp.wheels.has(dev)) a.wheels.push(inp.wheels.get(dev)!);
        else if (inp.flywheels.has(dev)) a.fly.push(inp.flywheels.get(dev)!);
        else if (inp.millHasInput.has(dev)) { if (inp.millHasInput.get(dev) !== false) a.millCount++; }
    }

    for (const a of agg.values()) {
        let torque = 0;
        for (const w of a.wheels) if (w.running) torque += WHEEL_OUTPUT;
        const load = a.millCount * MILL_DRAW;

        const energized = torque > EPS || a.fly.some((f) => f.spin > EPS);
        let powered: boolean;
        if (!energized) powered = false;
        else if (torque >= load - EPS) {
            let surplus = torque - load; powered = true;
            for (const f of a.fly) { const add = Math.min(CHARGE_RATE, surplus); if (add > 0) { f.spin = Math.min(FLYWHEEL_MAX, f.spin + add); surplus -= add; } }
        } else {
            const deficit = load - torque; let rem = deficit;
            for (const f of a.fly) { const give = Math.min(rem, DISCHARGE_RATE, f.spin); f.spin -= give; rem -= give; }
            powered = rem <= EPS;
        }
        for (const sid of a.segs) inp.segPowered(sid, powered);
    }
}
```

> 对比一下：它和 `power-settle.ts` 结构完全同构——**这正说明"新系统 = 继承基类 + 换一个纯结算"**。

## 2. 写 R 层引擎 `scripts/systems/mech/engine.ts`（继承 BaseEngine）

```ts
import { Block } from "@minecraft/server";
import { BaseEngine } from "../../framework/engine/BaseEngine.js";
import { FloodGraph, SegEnd } from "../../framework/core/graph.js";
import { blockKey, getBlockByKey, getAdjacent } from "../../framework/engine/world.js";
import { settleMech, WheelState, FlywheelState, ClutchState, FLYWHEEL_MAX } from "../../framework/core/mech-settle.js";
import { Logger } from "../../framework/engine/log.js";

const BELT = "mech:belt";
const WHEEL = "mech:waterwheel";
const MILL = "mech:mill";
const FLYWHEEL = "mech:flywheel";
const CLUTCH = "mech:clutch";
const DEV = [WHEEL, MILL, FLYWHEEL, CLUTCH];
const CONNECT = (f: string) => `mech:connect:${f}`;
const POWERED = "mech:powered";           // 传动带是否转动
const WHEEL_RUN = "mech:turning";         // 水车是否在转
const FLY = "mech:spin";                  // 飞轮转速档位（0..15）
const SPIN = "mech:spinning";

const graph: FloodGraph = {
    isConnector: (k) => getBlockByKey(k)?.typeId === BELT,
    neighborKey: (k, f) => { const b = getBlockByKey(k); if (!b) return null; const n = getAdjacent(b, f); return n ? blockKey(n) : null; },
    describeEnd: (beltKey, f): SegEnd | null => {
        const b = getBlockByKey(beltKey); if (!b) return null;
        const n = getAdjacent(b, f); if (!n) return null;
        if (n.typeId === BELT) return null;
        const e: SegEnd = { key: `${beltKey}#${f}`, connectorKey: beltKey, face: f, kind: "wall" };
        switch (n.typeId) {
            case WHEEL: e.kind = "wheel"; e.deviceKey = blockKey(n); break;
            case MILL: e.kind = "mill"; e.deviceKey = blockKey(n); break;
            case FLYWHEEL: e.kind = "flywheel"; e.deviceKey = blockKey(n); break;
            case CLUTCH: return null;   // 离合器作为耦合设备
            default: return null;
        }
        return e;
    },
};

export class MechEngine extends BaseEngine<unknown> {
    readonly wheels = new Map<string, WheelState>();
    readonly fly = new Map<string, FlywheelState>();
    readonly clutches = new Map<string, ClutchState>();
    readonly millInput = new Map<string, boolean>();

    constructor(logger: Logger) { super("mech", { saveKey: "mech:data", logger }); }
    get connectorTypeId() { return BELT; }
    get graph() { return graph; }
    isDeviceTypeId(t: string) { return DEV.includes(t); }
    connectState(f: string) { return CONNECT(f); }

    registerDevice(block: Block) {
        const k = blockKey(block);
        switch (block.typeId) {
            case WHEEL: this.wheels.set(k, { running: true }); break;
            case MILL: this.millInput.set(k, false); break;
            case FLYWHEEL: this.fly.set(k, { spin: 0 }); break;
            case CLUTCH: this.clutches.set(k, { open: true }); break;
        }
    }
    destroyDevice(key: string) { this.wheels.delete(key); this.millInput.delete(key); this.fly.delete(key); this.clutches.delete(key); }

    tickSettle(deviceSegs: Map<string, string[]>) {
        settleMech({ wheels: this.wheels, flywheels: this.fly, clutches: this.clutches, millHasInput: this.millInput, deviceSegs, dt: this.tickInterval / 20,
            segPowered: (sid, p) => { const s = this.segments.get(sid); if (s) s.powered = p; } });
        this.render(deviceSegs);
    }

    private st(key: string, state: string, want: number) {
        const b = getBlockByKey(key); if (!b) return;
        try { const c = (b.permutation.getState(state as any) as number ?? -1); if (c !== want) b.setPermutation(b.permutation.withState(state as any, want)); }
        catch { this.stale.add(key); }
    }
    private render(ds: Map<string, string[]>) {
        for (const seg of this.segments.values()) { const w = seg.powered ? 1 : 0; for (const c of seg.connectors) { const b = getBlockByKey(c); if (!b || b.typeId !== BELT) { this.stale.add(c); continue; } this.st(c, POWERED, w); } }
        for (const [k, w] of this.wheels) this.st(k, WHEEL_RUN, w.running ? 1 : 0);
        for (const [k, f] of this.fly) this.st(k, FLY, Math.max(0, Math.min(15, Math.round(f.spin * 15 / FLYWHEEL_MAX))));
        const devOn = (k: string) => (ds.get(k) ?? []).some((sid) => this.segments.get(sid)?.powered);
        for (const k of ds.keys()) { const b = getBlockByKey(k); if (!b) continue; if (b.typeId === MILL) this.st(k, SPIN, devOn(k) ? 1 : 0); }
    }

    isActiveIn(): boolean {
        if (this.pending.size || this.stale.size) return true;
        for (const w of this.wheels.values()) if (w.running) return true;
        for (const v of this.millInput.values()) if (v) return true;
        return false;
    }

    encode(): any { return { w: [...this.wheels].map(([k, s]) => [k, s.running ? 1 : 0]), f: [...this.fly].map(([k, s]) => [k, s.spin]), m: [...this.millInput].map(([k, v]) => [k, v ? 1 : 0]) }; }
    decode(data: any): void {
        this.wheels.clear(); this.fly.clear(); this.millInput.clear(); this.clutches.clear();
        for (const it of data.w || []) this.wheels.set(it[0], { running: (it[1] || 0) === 1 });
        for (const it of data.f || []) this.fly.set(it[0], { spin: it[1] || 0 });
        for (const it of data.m || []) this.millInput.set(it[0], (it[1] || 0) === 1);
    }
}
```

> 有没有发现：这段几乎就是 `scripts/systems/power/engine.ts` 的复制改名字？**这正是这个框架的意义——新系统主要是"换结算 + 改 id"。**

## 3. 声明方块 `main.ts`

在 `main.ts` 末尾加（可直接抄电力那几行，改 id/贴图名）：
```ts
const belt = connectorBlock("mech:belt", "wire_off", "wire_on", "mech:powered", GROUP_M);
const wheel = deviceBlock("mech:waterwheel", "gen_off", "gen_burn", "mech:turning", GROUP_M);
const mill = deviceBlock("mech:mill", "furn_off", "furn_on", "mech:spinning", GROUP_M);
const flywheel = BlockAPI.createBlock("mech:flywheel", "construction", [{ stateTag: 0, textures: ["batt_on"] }], { group: GROUP_M } as any);
flywheel.registerState("mech:spin", Array.from({ length: 16 }, (_, i) => i));
flywheel.addPermutation("q.block_state('mech:spin') == 0", BlockComponent.setMaterialInstances(facesTex("batt_off")));
const clutch = deviceBlock("mech:clutch", "relay_off", "relay_on", "mech:clutch_on", GROUP_M);
```
（`connectorBlock`/`deviceBlock`/`GROUP_M` 都在 `main.ts` 顶部的助手区定义/补充。）

## 4. 接进 `scripts/index.ts`

```ts
import { MechEngine } from "../../systems/mech/engine.js";
const mech = new MechEngine(makeLogger("mech"));
const engines = [power, fluid, mech];

function which(typeId: string) {
    if (power.isPart(typeId)) return power;
    if (fluid.isPart(typeId)) return fluid;
    if (mech.isPart(typeId)) return mech;
    return null;
}
```
在交互分发里加一条（机械/离合器右键开合）：
```ts
if (mech.isPart(b.typeId) && !held.typeId.startsWith("mech:") && !isPlacement(held.typeId)) {
    event.cancel = true; const key = blockKey(b);
    if (b.typeId === "mech:clutch") { defer(() => { /* 切换 open 并 ensureHeartbeat + save */ }); return; }
}
```
> `which()` 已经从"双系统"扩成"三系统"——框架对系统数量无感。

## 5. 测试 `test/mech.test.mjs`

按 `test/power.test.mjs` 抄一份镜像 `settleMech`，断言：
- 水车供能磨坊、飞轮盈余充电、无源段不激活、空磨坊不耗、离器关断分隔。
然后再 `node --test test/mech.test.mjs` 跑绿。

## 6. 收尾
```
npm test && npm run build
```
完成——一个完整的新系统就这样用继承基类"插"进框架。**要再快，就照 scripts/systems/power 复制一份改字段。**

---

## 小结：为什么能这么省
重复的部分（图维护、重建、持久化、心跳、worldLoad）全在 `BaseEngine`，你只需交 **纯结算 + 渲染 + 方块声明 + 镜像测试**。这就是把 sapdon 三个示例抽成框架后的"抄一遍改名字即可作新系统"。