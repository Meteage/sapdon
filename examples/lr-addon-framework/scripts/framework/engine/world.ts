// ===== L-R framework :: engine/world.ts (MC) =====
// 统一方块 key 编解码 / 邻块读取 / 类型判定。

import { world, Block } from "@minecraft/server";

export function blockKey(block: Block): string {
    return `${block.dimension.id}:${block.location.x},${block.location.y},${block.location.z}`;
}
export function keyParts(key: string): { dim: string; x: number; y: number; z: number } | null {
    const m = key.match(/^(.*):(-?\d+),(-?\d+),(-?\d+)$/);
    if (!m) return null;
    return { dim: m[1], x: +m[2], y: +m[3], z: +m[4] };
}
export function getBlockByKey(key: string): Block | null {
    const p = keyParts(key);
    if (!p) return null;
    try { return world.getDimension(p.dim).getBlock({ x: p.x, y: p.y, z: p.z }) ?? null; }
    catch { return null; }
}
function cap(f: string) { return f.charAt(0).toUpperCase() + f.slice(1).toLowerCase(); }
export function getAdjacent(block: Block, face: string): Block | undefined {
    try {
        switch (cap(face)) {
            case "North": return block.north();
            case "South": return block.south();
            case "East": return block.east();
            case "West": return block.west();
            case "Up": return block.above();
            case "Down": return block.below();
        }
    } catch { return undefined; }
    return undefined;
}