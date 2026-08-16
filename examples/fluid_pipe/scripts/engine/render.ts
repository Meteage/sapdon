// 引擎层 R — 渲染：管道水态（fluid_pipe:core）+ 罐液位（fluid_pipe:level）写方块状态
// 水覆盖集合由逻辑层（tickFlow → seg.covered）每 20 tick 计算，此处只读并同步到方块；
// 发现失效方块（外力移除/类型变化，未经 playerBreakBlock）→ 记入 staleKeys，tick 末尾重建对应段。
import { PIPE_TYPE, TANK_TYPE, FLUID_STATE, TANK_LEVEL_STATE, TANK_LEVEL_MAX } from "./const.js";
import { getBlockByKey } from "./world.js";
import { segments, tanks, pipeCache, tankCache, staleKeys } from "./state.js";
import { logErr } from "./log.js";
import { TANK_MAX } from "../core/potential.js";

export function renderAll() {
    for (const seg of segments.values()) {
        const covered = seg.covered ?? new Set<string>();
        for (const key of seg.pipes) {
            const want = covered.has(key) ? 1 : 0;
            if (pipeCache.get(key) === want) continue;
            pipeCache.set(key, want);
            const b = getBlockByKey(key);
            if (!b || b.typeId !== PIPE_TYPE) {
                staleKeys.add(key);
                pipeCache.delete(key);
                continue;
            }
            try { b.setPermutation(b.permutation.withState(FLUID_STATE as any, want)); } catch (e) { staleKeys.add(key); pipeCache.delete(key); logErr("render pipe", e); }
        }
    }
    for (const [key, t] of tanks) {
        // 液位 0..32 → 水块级数 0..15（满 32 → 15 = 16 块全显）
        const want = Math.max(0, Math.min(TANK_LEVEL_MAX, Math.round(t.level * TANK_LEVEL_MAX / TANK_MAX)));
        if (tankCache.get(key) === want) continue;
        tankCache.set(key, want);
        const b = getBlockByKey(key);
        if (!b || b.typeId !== TANK_TYPE) {
            staleKeys.add(key);
            tankCache.delete(key);
            continue;
        }
        try { b.setPermutation(b.permutation.withState(TANK_LEVEL_STATE as any, want)); } catch (e) { staleKeys.add(key); tankCache.delete(key); logErr("render tank", e); }
    }
}