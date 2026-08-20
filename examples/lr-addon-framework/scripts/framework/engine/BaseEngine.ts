// ===== L-R framework :: engine/BaseEngine.ts (MC) =====
// 可继承基类：提供“连接块系统”的通用生命周期——
//   段表/连接块索引 / 事件重建 / 加载后渐进重建 / 连接块手臂写回 /
//   小状态分块持久化 / 按需心跳 / worldLoad 恢复。
// 子系统只需实现：graph(FloodGraph)、registerDevice、tickSettle(settle+render)、
//   isActiveIn、encode/decode、connectState、类型判定。
//
// 继承它即可快速实现“电力 / 流体”等连接-源-功能-消费-储量系统。

import { world, system, Block } from "@minecraft/server";
import { Segment, SegEnd, FloodGraph, floodSegment, FACES } from "../core/graph.js";
import { blockKey, getBlockByKey, getAdjacent } from "./world.js";
import type { Logger } from "./log.js";

export abstract class BaseEngine<Saved = unknown> {
    readonly id: string;
    protected log: Logger;
    protected tickInterval = 20;   // 心跳间隔（tick）
    protected pendingBatch = 64;   // 加载后渐进重建每 tick 批数
    protected saveKey: string;     // 动态属性 key
    protected ver = 1;
    protected chunk = 24000;

    // ---- 表 ----
    segments = new Map<string, Segment>();
    connectorSeg = new Map<string, string>(); // connectorKey -> segId
    pending = new Set<string>();              // 加载后待重建连接块
    stale = new Set<string>();                // 失效连接块

    // ---- 子系统必须实现 ----
    abstract get connectorTypeId(): string;
    abstract get graph(): FloodGraph;
    abstract isDeviceTypeId(typeId: string): boolean;
    abstract connectState(face: string): string;               // 连接块手臂方块状态 id
    abstract registerDevice(block: Block): void;
    abstract destroyDevice(key: string): void;
    abstract tickSettle(deviceSegs: Map<string, string[]>): void; // L 结算 + R 渲染
    abstract isActiveIn(): boolean;                              // 是否有进行中的工作
    abstract encode(): Saved;                                    // 小状态序列化
    abstract decode(data: Saved): void;

    constructor(id: string, opts: { saveKey: string; logger: Logger; tickInterval?: number }) {
        this.id = id;
        this.saveKey = opts.saveKey;
        this.log = opts.logger;
        if (opts.tickInterval) this.tickInterval = opts.tickInterval;
    }

    isConnectorType(typeId: string) { return typeId === this.connectorTypeId; }
    isPart(typeId: string) { return this.isConnectorType(typeId) || this.isDeviceTypeId(typeId); }

    setRuntimeLog(on: boolean) { this.log.setRuntime(on); }
    logInfo(...args: unknown[]) { this.log.info(...args); }

    // ---- 结构重建 ----
    rebuildAround(anchor: Block | string) {
        const anchorKey = typeof anchor === "string" ? anchor : blockKey(anchor);
        const affected = new Set<string>();
        const collect = (key: string) => {
            const b = getBlockByKey(key);
            if (!b) return;
            if (b.typeId === this.connectorTypeId) affected.add(key);
            for (const face of FACES) {
                const nb = getAdjacent(b, face);
                if (nb && nb.typeId === this.connectorTypeId) affected.add(blockKey(nb));
            }
        };
        collect(anchorKey);

        const dirty = new Set<string>();
        for (const k of affected) { const sid = this.connectorSeg.get(k); if (sid != null) dirty.add(sid); }
        for (const sid of dirty) {
            const seg = this.segments.get(sid);
            if (!seg) continue;
            for (const k of seg.connectors) this.connectorSeg.delete(k);
            this.segments.delete(sid);
        }

        const flooded = new Set<string>();
        for (const key of affected) {
            if (this.connectorSeg.has(key) || flooded.has(key)) continue;
            const b = getBlockByKey(key);
            if (!b || b.typeId !== this.connectorTypeId) continue;
            const seg = floodSegment(key, this.graph, `${this.id}s${this.segSeq()}`);
            this.segments.set(seg.id, seg);
            for (const k of seg.connectors) { this.connectorSeg.set(k, seg.id); flooded.add(k); }
        }
        this.writeConnectors(affected);
    }

    // 写回连接块手臂状态（相邻为连接块或设备 → 该面手臂=1）
    writeConnectors(keys: Iterable<string>) {
        for (const key of keys) {
            const b = getBlockByKey(key);
            if (!b || b.typeId !== this.connectorTypeId) continue;
            let perm = b.permutation;
            let changed = false;
            for (const face of FACES) {
                const nb = getAdjacent(b, face);
                const conn = nb && this.isPart(nb.typeId) ? 1 : 0;
                const st = this.connectState(face);
                if ((perm.getState(st as any) as number ?? 0) !== conn) { perm = perm.withState(st as any, conn); changed = true; }
            }
            if (changed) { try { b.setPermutation(perm); } catch (e) { this.log.err("writeConnectors", e); } }
        }
    }

    rebuildPending() {
        if (!this.pending.size) return;
        let n = 0;
        for (const k of [...this.pending]) {
            if (n >= this.pendingBatch) break;
            n++;
            const b = getBlockByKey(k);
            if (!b || (b as { isLoaded?: boolean }).isLoaded === false) continue;
            if (b.typeId !== this.connectorTypeId) { this.pending.delete(k); continue; }
            this.rebuildAround(k);
        }
        for (const k of [...this.pending]) if (this.connectorSeg.has(k)) this.pending.delete(k);
    }
    rebuildStale() {
        if (!this.stale.size) return;
        const keys = [...this.stale];
        this.stale.clear();
        for (const k of keys) this.rebuildAround(k);
    }

    private _segCount = 0;
    protected segSeq() { return ++this._segCount; }

    // 从段端点重算 deviceKey -> 相邻段 id[]
    buildDeviceSegs(): Map<string, string[]> {
        const ds = new Map<string, string[]>();
        for (const [sid, seg] of this.segments) {
            for (const e of seg.ends) {
                if (!e.deviceKey) continue;
                let list = ds.get(e.deviceKey);
                if (!list) { list = []; ds.set(e.deviceKey, list); }
                if (!list.includes(sid)) list.push(sid);
            }
        }
        return ds;
    }

    // ---- 心跳（事件驱动，空闲自动停）----
    private heartbeatId: number | undefined;
    ensureHeartbeat() {
        if (this.heartbeatId === undefined) this.heartbeatId = system.runInterval(() => this.heartbeatLoop(), this.tickInterval);
    }
    private heartbeatLoop() {
        try { this.tick(); } catch (e) { this.log.err("tick", e); }
        if (!this.isActiveIn()) this.stopHeartbeat();
    }
    private stopHeartbeat() {
        if (this.heartbeatId !== undefined) {
            try { system.clearRun(this.heartbeatId); } catch { /* ignore */ }
            this.heartbeatId = undefined;
        }
    }

    // ---- 主循环骨架 ----
    protected tick() {
        this.rebuildPending();
        const deviceSegs = this.buildDeviceSegs();
        this.tickSettle(deviceSegs);       // 子系统：settle + render + 粒子
        this.rebuildStale();
    }

    // ---- 持久化（小状态分块）----
    private loaded = true; // 默认放行（新建即允许保存）；加载后仍保持 true
    save() {
        try {
            const data = this.encode() as object & { v?: number; _w: string[] };
            const wires = new Set<string>(this.pending);
            for (const k of this.connectorSeg.keys()) wires.add(k);
            const body: any = { v: this.ver, _w: [...wires], ...(data as object) };
            const json = JSON.stringify(body);
            if (json.length <= this.chunk) { world.setDynamicProperty(this.saveKey, json); this.clearChunks(0); }
            else {
                const n = Math.ceil(json.length / this.chunk);
                world.setDynamicProperty(this.saveKey, JSON.stringify({ _chunks: n }));
                for (let i = 0; i < n; i++) world.setDynamicProperty(`${this.saveKey}#${i}`, json.slice(i * this.chunk, (i + 1) * this.chunk));
                this.clearChunks(n);
            }
        } catch (e) { this.log.err("save", e); }
    }
    load(): boolean {
        try {
            const raw = world.getDynamicProperty(this.saveKey);
            let json: string | null = null;
            if (typeof raw === "string") {
                if (raw.startsWith("{")) {
                    const meta = JSON.parse(raw);
                    if (meta && meta._chunks) {
                        let parts = "";
                        for (let i = 0; i < meta._chunks; i++) { const p = world.getDynamicProperty(`${this.saveKey}#${i}`); if (typeof p === "string") parts += p; }
                        json = parts;
                    } else json = raw;
                } else json = raw;
            }
            if (!json) return true; // 无存档也算“已加载”，允许随后保存
            const data = JSON.parse(json);
            if (!data) return true;
            if (data.v !== this.ver) { this.log.log(`load: version mismatch (${data.v} vs ${this.ver}), 丢弃旧存档`); return true; }
            this.segments.clear(); this.connectorSeg.clear(); this.pending.clear();
            for (const w of data._w || []) this.pending.add(w);
            this.decode(data);
            this.loaded = true;
            return true;
        } catch (e) { this.log.err("load", e); return false; }
    }
    private clearChunks(from: number) {
        for (let i = from; i < 32; i++) {
            try { if (world.getDynamicProperty(`${this.saveKey}#${i}`) != null) world.setDynamicProperty(`${this.saveKey}#${i}`, undefined); } catch { break; }
        }
    }

    // 通用事件绑定（放置/破坏/加载）——子系统在 index 里按 typeId 分发；这里提供便捷
    bindWorldLifecycle() {
        world.afterEvents.worldLoad.subscribe(() => { this.load(); this.ensureHeartbeat(); });
    }
}