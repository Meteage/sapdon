// 逻辑层 L — 段图：节点 / 端点 / 段结构与洪水分段（不依赖 @minecraft/server）
// 势模型常量与传播场见 potential.ts；流动结算与前沿见 flow.ts。
// Node 测试镜像见 test/fluid.test.mjs（改这里须同步测试副本）

export const END_SOURCE = "source";   // 浸润水源
export const END_OPEN = "open";       // 对空气（汇 -1）
export const END_WALL = "wall";       // 封闭端
export const END_TANK = "tank";       // 储液罐（端口势按液位）
export const END_PUMP_IN = "pumpIn";  // 泵输入口（底面）
export const END_PUMP_OUT = "pumpOut"; // 泵输出口（顶面）
export const END_VALVE_IN = "valveIn";  // 三通阀输入（南面）
export const END_VALVE_OUT = "valveOut"; // 三通阀输出（东/北/西，状态选择）

export type EndKind = typeof END_SOURCE | typeof END_OPEN | typeof END_WALL | typeof END_TANK
    | typeof END_PUMP_IN | typeof END_PUMP_OUT | typeof END_VALVE_IN | typeof END_VALVE_OUT;

export interface SegEnd {
    key: string;         // `${pipeKey}#${face}` 唯一
    pipeKey: string;     // 端点所在的管道方块
    face: string;
    kind: EndKind;
    deviceKey?: string;  // tank / pump / valve3 的方块 key
}

export interface Segment {
    id: string;
    pipes: string[];     // 管道方块 key（"dim:x,y,z" 可解析 y）
    pass: string[];      // 段成员：管道 + 打开的阀门
    adj: Map<string, string[]>; // passKey -> 相邻 passKey
    ends: SegEnd[];
    front: number;       // 水前沿覆盖数（0..len，逻辑层 tickFlow 更新）
    covered: Set<string>; // 段内含水管道集合（逻辑层每 20 tick 计算，引擎只读同步）
    len: number;         // pass.length
    order: string[];     // 从高势锚点 BFS 的成员顺序（渲染：水流通路径内排序）
    orderAnchor: string;
    orderAnchorPath?: Set<string>; // 生成 order 时对应的水流通路径（路径变化时重排）
    pot: Map<string, number>; // v2：段内每格势（传播场）
    hi: SegEnd | null;   // 段内最高势端点
    lo: SegEnd | null;   // 段内最低势端点
}

export interface TankState { level: number }   // 0..32
export interface PumpState { on: boolean; soaked?: boolean }  // soaked=泵自身被水浸没（直接吐水）

export interface FloodGraph {
    isPipe(key: string): boolean;
    isValveOpen(key: string): boolean;
    neighborKey(key: string, face: string): string | null;
    describeEnd(pipeKey: string, face: string): SegEnd | null;
    soaked(pipeKey: string): SegEnd | null;
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

export const FACES = ["north", "south", "east", "west", "up", "down"];

// 从锚点洪水填充段：管道与打开的阀门可通行，其余面收集为端点
export function floodSegment(anchor: string, graph: FloodGraph, segId: string): Segment {
    const queue: string[] = [anchor];
    const visited = new Set<string>();
    const pass: string[] = [];
    const pipes: string[] = [];
    const adj = new Map<string, string[]>();
    const ends: SegEnd[] = [];

    while (queue.length) {
        const key = queue.shift()!;
        if (visited.has(key)) continue;
        visited.add(key);
        const isPipe = graph.isPipe(key);
        if (isPipe) pipes.push(key);
        pass.push(key);
        if (isPipe) {
            const soak = graph.soaked(key);
            if (soak) ends.push(soak);
        }
        const nbrs: string[] = [];
        for (const face of FACES) {
            const nb = graph.neighborKey(key, face);
            if (!nb) continue;
            if (visited.has(nb)) {
                nbrs.push(nb);
                continue;
            }
            if (graph.isPipe(nb)) { nbrs.push(nb); queue.push(nb); continue; }
            if (graph.isValveOpen(nb)) { nbrs.push(nb); queue.push(nb); continue; }
            if (isPipe) {
                const end = graph.describeEnd(key, face);
                if (end) ends.push(end);
            }
        }
        adj.set(key, nbrs);
    }

    return {
        id: segId, pipes, pass, adj, ends, front: 0, covered: new Set<string>(), len: pass.length,
        order: [], orderAnchor: "", pot: new Map(), hi: null, lo: null,
    };
}

export function keyY(key: string): number {
    const m = key.match(/^(-?\d+),(-?\d+),(-?\d+)$/);
    return m ? +m[2] : 0;
}

export function keyXZ(key: string): [number, number] {
    const m = key.match(/^(-?\d+),(-?\d+),(-?\d+)$/);
    return m ? [+m[1], +m[3]] : [0, 0];
}