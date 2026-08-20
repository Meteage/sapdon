// 逻辑层 L — 段图：电线连通段 + 设备端点（不依赖 @minecraft/server）
// 结算见 settle.ts；Node 测试镜像见 test/power.test.mjs（改这里须同步测试副本）
//
// 模型：电线沿正交相邻自动连通（如同流体管道），设备做端点。
// 电网由 settle.ts 用 union-find 把"共享同一设备"的段并成 Grid（继电器 on 时才并）。

export const END_GEN = "gen";       // 燃煤发电机
export const END_SOLAR = "solar";   // 太阳能板
export const END_FURNACE = "furnace"; // 电力熔炉（消费）
export const END_BATTERY = "battery"; // 电池（储量）
export const END_RELAY = "relay";   // 继电器（功能/可控桥）
export const END_OPEN = "open";     // 对外空气（诊断用）
export const END_WALL = "wall";     // 对墙/世界外（诊断用）

export type EndKind = typeof END_GEN | typeof END_SOLAR | typeof END_FURNACE
    | typeof END_BATTERY | typeof END_RELAY | typeof END_OPEN | typeof END_WALL;

export interface SegEnd {
    key: string;         // `${wireKey}#${face}` 唯一
    wireKey: string;     // 端点所在的电线方块
    face: string;
    kind: EndKind;
    deviceKey?: string;  // gen/solar/furnace/battery/relay 的方块 key
}

export interface Segment {
    id: string;
    pipes: string[];     // 电线方块 key（"dim:x,y,z"）
    ends: SegEnd[];
    powered: boolean;    // 由 settle 写入；渲染只读
}

// 洪水分段的图接口（R 层 world 引擎实现）
export interface FloodGraph {
    isWire(key: string): boolean;
    neighborKey(key: string, face: string): string | null; // 供电线-电线遍历
    describeEnd(wireKey: string, face: string): SegEnd | null; // 非电线邻居的设备/空气/墙端点
}

export const FACES = ["north", "south", "east", "west", "up", "down"];

export function oppositeFace(face: string): string {
    switch (face.toLowerCase()) {
        case "north": return "south";
        case "south": return "north";
        case "east": return "west";
        case "west": return "east";
        case "up": return "down";
        case "down": return "up";
    }
    return "up";
}

// 从锚点（电线）洪水填充段：电线正交相邻连通，非电线邻居收为端点
export function floodSegment(anchor: string, graph: FloodGraph, segId: string): Segment {
    const pipes: string[] = [];
    const ends: SegEnd[] = [];
    const visited = new Set<string>();
    const queue: string[] = graph.isWire(anchor) ? [anchor] : [];
    while (queue.length) {
        const key = queue.shift()!;
        if (visited.has(key)) continue;
        visited.add(key);
        pipes.push(key);
        for (const face of FACES) {
            const nb = graph.neighborKey(key, face);
            if (nb && graph.isWire(nb)) {
                if (!visited.has(nb)) queue.push(nb);
                continue;
            }
            // 非电线邻居（设备/空气/墙/世界外）
            const e = graph.describeEnd(key, face);
            if (e) ends.push(e);
        }
    }
    return { id: segId, pipes, ends, powered: false };
}

export function keyY(key: string): number {
    const m = key.match(/^(-?\d+),(-?\d+),(-?\d+)$/);
    return m ? +m[2] : 0;
}