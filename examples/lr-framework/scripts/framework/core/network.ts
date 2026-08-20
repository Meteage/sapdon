// ===== L-R framework :: core/network.ts (pure) =====
// 把“共享同一设备的线段”并成 Grid（电网/管网）的并查集工具。
// 耦合规则由系统传入 shouldCouple(deviceKey)。并查集泛型化供 power(继电器) / fluid(阀门) 复用。

export class UnionFind {
    private parent = new Map<string, string>();
    constructor(keys: Iterable<string>) {
        for (const k of keys) this.parent.set(k, k);
    }
    find(x: string): string {
        let r = x;
        while (this.parent.get(r) !== r) r = this.parent.get(r)!;
        while (this.parent.get(x) !== x) { const n = this.parent.get(x)!; this.parent.set(x, r); x = n; }
        return r;
    }
    union(a: string, b: string) {
        const ra = this.find(a), rb = this.find(b);
        if (ra !== rb) this.parent.set(rb, ra);
    }
}

export interface DeviceGridInput {
    deviceSegs: Map<string, string[]>;   // deviceKey -> 相邻段 id[]
    shouldCouple: (deviceKey: string) => boolean; // 该设备是否把其所有相邻段并成一个 Grid
}

// 返回 段 -> grid 根、以及每个 grid 的段集合
export function buildGrids(input: DeviceGridInput): { segGrid: Map<string, string>; gridSegs: Map<string, string[]> } {
    const all = new Set<string>();
    for (const [, ids] of input.deviceSegs) for (const s of ids) all.add(s);
    const uf = new UnionFind(all);
    for (const [dev, ids] of input.deviceSegs) {
        if (ids.length < 2) continue;
        if (!input.shouldCouple(dev)) continue;
        for (let i = 1; i < ids.length; i++) uf.union(ids[0], ids[i]);
    }
    const segGrid = new Map<string, string>();
    const gridSegs = new Map<string, string[]>();
    for (const s of all) {
        const r = uf.find(s);
        segGrid.set(s, r);
        let list = gridSegs.get(r);
        if (!list) { list = []; gridSegs.set(r, list); }
        list.push(s);
    }
    return { segGrid, gridSegs };
}