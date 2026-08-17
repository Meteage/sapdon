// 引擎层 R — 结构重建：放置/破坏/阀门切换时重分段 + 写回连接状态 + 加载后渐进重建
import { Block } from "@minecraft/server";
import { PIPE_TYPE, VALVE_TYPE, VALVE3_TYPE, FLUID_TYPES, CONNECT, FLUID_STATE, PENDING_BATCH } from "./const.js";
import { getBlockByKey, getAdjacent, blockKey, keyParts } from "./world.js";
import { segments, pipeSeg, pumps, pumpEnds, pendingPipes, staleKeys, nextSegId } from "./state.js";
import { graph } from "./graph.js";
import { rlog, logErr } from "./log.js";
import { FACES, floodSegment, type Segment } from "../core/graph.js";
import { coveredOf, frontFromCovered } from "../core/flow.js";

let restoreFrontMode = false; // 加载重建时从方块状态恢复水前沿

// === 结构重建（放置/破坏/阀门切换）===
export function rebuildAround(anchor: Block | string) {
    const anchorKey = typeof anchor === "string" ? anchor : blockKey(anchor);

    // 1) 受影响管道 = 锚点本身（管道/阀门）+ 其 6 邻管道
    const affected = new Set<string>();
    const collect = (key: string) => {
        const b = getBlockByKey(key);
        if (!b) return;
        if (b.typeId === PIPE_TYPE || b.typeId === VALVE_TYPE || b.typeId === VALVE3_TYPE) affected.add(key);
        for (const face of FACES) {
            const nb = getAdjacent(b, face);
            if (nb && nb.typeId === PIPE_TYPE) affected.add(blockKey(nb));
        }
    };
    collect(anchorKey);

    // 2) 收集受影响旧段 + 水覆盖集合（前沿随段迁移）
    const dirtySegs = new Set<string>();
    const covered = new Set<string>();
    for (const key of affected) {
        const sid = pipeSeg.get(key);
        if (sid == null || dirtySegs.has(sid)) continue;
        dirtySegs.add(sid);
        const seg = segments.get(sid)!;
        for (const k of coveredOf(seg, seg.front)) covered.add(k);
    }

    // 3) 摘除旧段
    for (const sid of dirtySegs) {
        const seg = segments.get(sid)!;
        for (const k of seg.pass) pipeSeg.delete(k);
        segments.delete(sid);
    }

    // 4) 重新 flood（管道可通行；阀门为端点设备，经 describeEnd 收边）
    // flooded 集合：同一批 affected 里相邻的管道会被前一次 flood 吞并，
    // 立即登记避免重复 flood（否则同一管道落入多个重叠段 → 势复制/水异常）
    const newSegs: Segment[] = [];
    const flooded = new Set<string>();
    for (const key of affected) {
        if (pipeSeg.has(key) || flooded.has(key)) continue;
        const b = getBlockByKey(key);
        if (!b) continue;
        if (b.typeId === PIPE_TYPE) {
            const seg = floodSegment(key, graph, nextSegId());
            if (restoreFrontMode) {
                // 加载重建：从方块持久化的 fluid_pipe:core 状态恢复水前沿与覆盖（mid-game 重建仍走 covered 迁移）
                seg.front = frontFromBlockStates(seg);
                seg.covered = coveredFromBlockStates(seg);
            } else {
                seg.front = frontFromCovered(seg, covered);
                seg.covered = new Set(seg.pipes.filter((k) => covered.has(k)));
            }
            newSegs.push(seg);
            for (const k of seg.pass) flooded.add(k);
        }
    }
    for (const seg of newSegs) {
        segments.set(seg.id, seg);
        for (const k of seg.pass) pipeSeg.set(k, seg.id);
    }

    // 5) 泵端点重挂 + 结构状态写回
    rebuildPumpEnds();
    writePipeStates(newSegs);
    const at = [...affected].slice(0, 4).map((k) => { const p = keyParts(k); return p ? `${p.x},${p.y},${p.z}` : "?"; }).join(";");
    rlog(`rebuild: affected=${affected.size} newSegs=${newSegs.length} segs=${segments.size} @${at}`);
}

// 加载重建时：段的水前沿 = 方块上已持久化的 fluid_pipe:core==1 成员数（块状态随世界存档，无需入库）
function frontFromBlockStates(seg: Segment): number {
    let c = 0;
    for (const k of seg.pass) {
        const b = getBlockByKey(k);
        if (b && (b.permutation.getState(FLUID_STATE as any) as number ?? 0) === 1) c++;
    }
    return c;
}

// 加载重建时：段含水管道集合 = 方块 fluid_pipe:core==1 的管道（与 frontFromBlockStates 一致）
function coveredFromBlockStates(seg: Segment): Set<string> {
    const out = new Set<string>();
    for (const k of seg.pipes) {
        const b = getBlockByKey(k);
        if (b && (b.permutation.getState(FLUID_STATE as any) as number ?? 0) === 1) out.add(k);
    }
    return out;
}

function writePipeStates(segList: Segment[]) {
    for (const seg of segList) {
        for (const key of seg.pipes) {
            const b = getBlockByKey(key);
            if (!b) continue;
            let perm = b.permutation;
            let changed = false;
            for (const face of FACES) {
                const nb = getAdjacent(b, face);
                const conn = nb && FLUID_TYPES.includes(nb.typeId) ? 1 : 0;
                const st = CONNECT(face);
                if (((perm.getState(st as any) as number ?? 0)) !== conn) {
                    perm = perm.withState(st as any, conn);
                    changed = true;
                }
            }
            if (changed) {
                try { b.setPermutation(perm); } catch (e) { logErr("writePipeStates", e); }
            }
        }
    }
}

export function rebuildPumpEnds() {
    pumpEnds.clear();
    for (const [pumpKey] of pumps) {
        const b = getBlockByKey(pumpKey);
        if (!b) continue;
        // v2：泵顶面=输出口、底面=输入口
        const inNb = getAdjacent(b, "down");
        const outNb = getAdjacent(b, "up");
        pumpEnds.set(pumpKey, {
            in: inNb && inNb.typeId === PIPE_TYPE ? { segId: pipeSeg.get(blockKey(inNb))!, end: null } : null,
            out: outNb && outNb.typeId === PIPE_TYPE ? { segId: pipeSeg.get(blockKey(outNb))!, end: null } : null,
        });
    }
}

// 加载后渐进重建：每 tick 处理一批 pending 管道（64 个），区块加载后洪水入段；
// 已不存在/类型不符的键丢弃；已入段的从 pending 移除。区块边界洪水停在边界，对侧区块加载后由其 pending 重建并合并。
export function rebuildPending() {
    if (!pendingPipes.size) return;
    let n = 0;
    for (const k of [...pendingPipes]) {
        if (n >= PENDING_BATCH) break;
        n++;
        const b = getBlockByKey(k);
        if (!b || (b as any).isLoaded === false) continue; // 区块未加载，稍后重试
        const t = b.typeId;
        if (t !== PIPE_TYPE) {
            pendingPipes.delete(k); // 方块已不存在
            continue;
        }
        restoreFrontMode = true;
        rebuildAround(k);
        restoreFrontMode = false;
    }
    for (const k of [...pendingPipes]) {
        if (pipeSeg.has(k)) pendingPipes.delete(k);
    }
}

// 失效方块 → 重建所在段（重建会重新 flood，移除失效键并纠正端点）
export function rebuildStale() {
    if (!staleKeys.size) return;
    const keys = [...staleKeys];
    staleKeys.clear();
    for (const k of keys) rebuildAround(k);
}