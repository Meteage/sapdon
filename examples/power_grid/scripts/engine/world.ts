// 引擎层 R — 方块读取：key 编解码 / 邻块获取 / 类型判定
import { world, Block } from "@minecraft/server";
import { WIRE_TYPE, DEVICE_TYPES } from "./const.js";

export function isWireType(typeId: string) { return typeId === WIRE_TYPE; }
export function isDeviceType(typeId: string) { return DEVICE_TYPES.includes(typeId); }
export function isPowerType(typeId: string) { return isWireType(typeId) || isDeviceType(typeId); }

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
    try {
        return world.getDimension(p.dim).getBlock({ x: p.x, y: p.y, z: p.z }) ?? null;
    } catch (e) {
        return null;
    }
}

function capitalize(face: string) { return face.charAt(0).toUpperCase() + face.slice(1).toLowerCase(); }

export function getAdjacent(block: Block, face: string): Block | undefined {
    try {
        switch (capitalize(face)) {
            case "North": return block.north();
            case "South": return block.south();
            case "East": return block.east();
            case "West": return block.west();
            case "Up": return block.above();
            case "Down": return block.below();
        }
    } catch (e) {
        return undefined; // 相邻区块未加载 → 按无邻居；加载后由 pending 重建合并
    }
    return undefined;
}