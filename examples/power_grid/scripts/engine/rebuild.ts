// 引擎层 R — 结构重建：放置/破坏/开关时重分段 + 写回连接手臂 + 加载后渐进重建
import { Block } from "@minecraft/server";
import { WIRE_TYPE, PENDING_BATCH, CONNECT } from "./const.js";
import { getBlockByKey, getAdjacent, blockKey, keyParts, isPowerType } from "./world.js";
import { segments, wireSeg, pendingWires, nextSegId } from "./state.js";
import { graph } from "./graph.js";
import { rlog, logErr } from "./log.js";
import { FACES, floodSegment, type Segment } from "../core/graph.js";

// 把每根电线的 6 面连接手臂写回方块状态（驱动几何骨显隐）：
// 相邻为电线或设备 → 该面手臂=1，否则 0。连通语义即正交相邻（与 flood 一致）。
export function writeWireConn(wireKeys: Iterable<string>) {
    for (const key of wireKeys) {
        const b = getBlockByKey(key);
        if (!b || b.typeId !== WIRE_TYPE) continue;
        let perm = b.permutation;
        let changed = false;
        for (const face of FACES) {
            const nb = getAdjacent(b, face);
            const conn = nb && isPowerType(nb.typeId) ? 1 : 0;
            const st = CONNECT(face);
            if ((perm.getState(st as any) as number ?? 0) !== conn) {
                perm = perm.withState(st as any, conn);
                changed = true;
            }
        }
        if (changed) {
            try { b.setPermutation(perm); } catch (e) { logErr("writeWireConn", e); }
        }
    }
}

// 结构重建（放置/破坏/继电器开关）：锚点及其 6 邻电线重分段
export function rebuildAround(anchor: Block | string) {
    const anchorKey = typeof anchor === "string" ? anchor : blockKey(anchor);

    // 1) 受影响电线 = 锚点本身 + 6 邻电线
    const affected = new Set<string>();
    const collect = (key: string) => {
        const b = getBlockByKey(key);
        if (!b) return;
        if (b.typeId === WIRE_TYPE) affected.add(key);
        for (const face of FACES) {
            const nb = getAdjacent(b, face);
            if (nb && nb.typeId === WIRE_TYPE) affected.add(blockKey(nb));
        }
    };
    collect(anchorKey);

    // 2) 摘除受影响旧段
    const dirtySegs = new Set<string>();
    for (const key of affected) { const sid = wireSeg.get(key); if (sid != null) dirtySegs.add(sid); }
    for (const sid of dirtySegs) {
        const seg = segments.get(sid);
        if (!seg) continue;
        for (const k of seg.pipes) wireSeg.delete(k);
        segments.delete(sid);
    }

    // 3) 重新 flood（电线正交连通；flooded 立即登记防重叠段）
    const newSegs: Segment[] = [];
    const flooded = new Set<string>();
    for (const key of affected) {
        if (wireSeg.has(key) || flooded.has(key)) continue;
        const b = getBlockByKey(key);
        if (!b || b.typeId !== WIRE_TYPE) continue;
        const seg = floodSegment(key, graph, nextSegId());
        segments.set(seg.id, seg);
        for (const k of seg.pipes) { wireSeg.set(k, seg.id); flooded.add(k); }
        newSegs.push(seg);
    }

    // 3b) 写回受影响电线的连接手臂（几何骨显隐）
    writeWireConn(affected);

    const at = [...affected].slice(0, 4).map((k) => { const p = keyParts(k); return p ? `${p.x},${p.y},${p.z}` : "?"; }).join(";");
    rlog(`rebuild: affected=${affected.size} dirtySegs=${dirtySegs.size} segs=${segments.size} @${at}`);
}

// 加载后渐进重建：每 tick 处理一批 pending 电线（64 个），区块加载后洪水入段
export function rebuildPending() {
    if (!pendingWires.size) return;
    let n = 0;
    for (const k of [...pendingWires]) {
        if (n >= PENDING_BATCH) break;
        n++;
        const b = getBlockByKey(k);
        if (!b || (b as { isLoaded?: boolean }).isLoaded === false) continue; // 区块未加载稍后重试
        const t = b.typeId;
        if (t !== WIRE_TYPE) { pendingWires.delete(k); continue; } // 方块已不存在
        rebuildAround(k);
    }
    for (const k of [...pendingWires]) {
        if (wireSeg.has(k)) pendingWires.delete(k);
    }
}

// 失效方块重建：consume staleKeys → 重建所在段（tick 末尾调用）
export function rebuildStale(staleKeys: Set<string>) {
    if (!staleKeys.size) return;
    const keys = [...staleKeys];
    staleKeys.clear();
    for (const k of keys) rebuildAround(k);
}