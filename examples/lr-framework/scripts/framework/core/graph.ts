// ===== L-R framework :: core/graph.ts (pure, no @minecraft/server) =====
// 通用“连接块图”：连接块沿正交相邻洪水连通成段，非连接邻居收为端点。
// 电力（电线/导线）与流体（管道）共用同一套段/端点模型，仅 EndKind 与 FloodGraph 实现不同。

export const FACES = ["north", "south", "east", "west", "up", "down"] as const;

export interface SegEnd {
    key: string;         // `${connectorKey}#${face}` 唯一
    connectorKey: string; // 端点所属的连接块（电线/管道）
    face: string;
    kind: string;        // 系统自定义端点类型（如 "gen" / "tank" / "open"...）
    deviceKey?: string;  // 设备方块 key（发电机/泵/熔炉/罐...）
}

export interface Segment {
    id: string;
    connectors: string[];    // 连接块（电线/管道）key 列表
    ends: SegEnd[];
    powered: boolean;        // 该段结算后的“激活”标志（渲染读取）
    data: Record<string, unknown>; // 系统扩展状态（势场/前沿/宽度等）
}

// 图接口：R 层 world 引擎实现；L 层只依赖它
export interface FloodGraph {
    isConnector(key: string): boolean;                       // 是否连接块（电线/管道）
    neighborKey(key: string, face: string): string | null;   // 相邻块 key（供连接块遍历）
    describeEnd(connectorKey: string, face: string): SegEnd | null; // 非连接邻居的端点
}

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

// 从锚点洪水填充一个段：连接块正交相邻连通，非连接邻居收为端点
export function floodSegment(anchor: string, graph: FloodGraph, segId: string): Segment {
    const connectors: string[] = [];
    const ends: SegEnd[] = [];
    const visited = new Set<string>();
    const queue: string[] = graph.isConnector(anchor) ? [anchor] : [];
    while (queue.length) {
        const key = queue.shift()!;
        if (visited.has(key)) continue;
        visited.add(key);
        connectors.push(key);
        for (const face of FACES) {
            const nb = graph.neighborKey(key, face);
            if (nb && graph.isConnector(nb)) {
                if (!visited.has(nb)) queue.push(nb);
                continue;
            }
            const e = graph.describeEnd(key, face);
            if (e) ends.push(e);
        }
    }
    return { id: segId, connectors, ends, powered: false, data: {} };
}

export function keyY(key: string): number {
    const m = key.match(/^(-?\d+),(-?\d+),(-?\d+)$/);
    return m ? +m[2] : 0;
}
export function keyXZ(key: string): [number, number] {
    const m = key.match(/^(-?\d+),(-?\d+),(-?\d+)$/);
    return m ? [+m[1], +m[3]] : [0, 0];
}