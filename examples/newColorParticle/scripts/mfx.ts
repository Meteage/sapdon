// ============================================================
// Molang 全能粒子：单个粒子 JSON（sapdon:mfx_universal）由 Molang
// 完成轨迹/颜色/大小/旋转；脚本只做"一次算好初始位置 + 逐点传参"。
// 与 expr/particle_math（任意表达式脚本求值）互为双方案：
//   - mfx       ：作者烘焙的高性能参数化粒子（数学在 Molang）
//   - particle_math：运行时任意表达式（数学在脚本）
// ============================================================
import { Dimension, Vector3, MolangVariableMap } from "@minecraft/server";
import { getShapePoints } from "./effects.js";
import { resolveSolidColor } from "./mathexpress.js";

export const MFX_PARTICLE_ID = "sapdon:mfx_universal";

// 运动分支（对应 JSON 里 variable.motion 的 if 链）
export const MFX_MOTIONS = ["still", "spin", "rise", "spiral", "breathe", "wave"];
// 颜色分支（variable.colormode）
export const MFX_COLORMODES = ["solid", "gradient", "cycle", "rainbow", "heat"];
// 大小分支（variable.sizemode）
export const MFX_SIZEMODES = ["const", "bloom", "fade"];
// 淡出分支（variable.fadeMode）
export const MFX_FADEMODES = ["out", "inout", "none"];

export interface MfxRecipe {
    id: string;
    label: string;
    shape: string;
    motion: number;      // 0 still 1 spin 2 rise 3 spiral 4 breathe 5 wave 6 cone 7 wobble 8 bounce 9 orbit
    colorMode: number;   // 0 solid 1 gradient 2 cycle 3 rainbow 4 heat
    color: string;
    color2?: string;
    sizeMode: number;    // 0 const 1 bloom 2 fade
    size: number;
    turns: number;
    rise: number;
    spin: number;
    fade?: number;       // 0 out 1 inout 2 none
    maxframe?: number;   // 序列帧数；1=静态
    uv?: [number, number]; // 序列帧起始 UV
}

// 「全能表」内置配方：给配方名 + 可选参数覆盖 = 完全定义一次效果
export const MFX_PRESETS: Record<string, MfxRecipe> = {
    ring:     { id: "ring", label: "旋转光环",   shape: "ring",   motion: 1, colorMode: 1, color: "blue",   color2: "purple", sizeMode: 0, size: 0.14, turns: 1, rise: 0, spin: 0 },
    sphere:   { id: "sphere", label: "呼吸球体", shape: "sphere", motion: 4, colorMode: 1, color: "green",  color2: "cyan",    sizeMode: 0, size: 0.12, turns: 0, rise: 0, spin: 0.5 },
    spiral:   { id: "spiral", label: "上升螺旋", shape: "helix",  motion: 3, colorMode: 2, color: "blue",   color2: "purple", sizeMode: 0, size: 0.12, turns: 2, rise: 1.5, spin: 0 },
    heart:    { id: "heart", label: "心动爱心",  shape: "heart",  motion: 4, colorMode: 1, color: "red",    color2: "pink",    sizeMode: 1, size: 0.14, turns: 0, rise: 0, spin: 0 },
    lissajous:{ id: "lissajous", label: "3D 利萨如", shape: "lissajous", motion: 1, colorMode: 3, color: "green", color2: "cyan", sizeMode: 0, size: 0.12, turns: 1, rise: 0, spin: 0.5 },
    rose:     { id: "rose", label: "玫瑰线",     shape: "rose",   motion: 1, colorMode: 2, color: "pink",   color2: "purple", sizeMode: 0, size: 0.12, turns: 1, rise: 0, spin: 0.5 },
    torus:    { id: "torus", label: "参数环面",   shape: "torus",  motion: 1, colorMode: 1, color: "cyan",   color2: "blue",    sizeMode: 0, size: 0.1, turns: 1, rise: 0, spin: 0 },
    // ---- A-1 新增：用新轨迹分支 / 热色 / 淡出 / 序列帧 ----
    cone:     { id: "cone", label: "喷锥",       shape: "sphere", motion: 6, colorMode: 2, color: "orange", color2: "yellow", sizeMode: 1, size: 0.1, turns: 0, rise: 2.5, spin: 0.4, fade: 2, maxframe: 1 },
    bounce:   { id: "bounce", label: "弹跳盘",   shape: "ring",   motion: 8, colorMode: 0, color: "gold",   sizeMode: 0, size: 0.14, turns: 0, rise: 0, spin: 0, fade: 0, maxframe: 1 },
    orbit:    { id: "orbit", label: "流转轨道",  shape: "ring",   motion: 9, colorMode: 3, color: "cyan",   color2: "purple", sizeMode: 0, size: 0.12, turns: 2, rise: 0, spin: 0, fade: 0, maxframe: 1 },
    heat:     { id: "heat", label: "余烬",       shape: "sphere", motion: 2, colorMode: 4, color: "red",    sizeMode: 1, size: 0.16, turns: 0, rise: 1.2, spin: 0.6, fade: 1, maxframe: 1 },
    sprite:   { id: "sprite", label: "序列帧火苗", shape: "sphere", motion: 0, colorMode: 0, color: "white", sizeMode: 0, size: 0.22, turns: 0, rise: 0, spin: 0, fade: 0, maxframe: 8, uv: [0, 0] },
};

export const MFX_PRESET_IDS = Object.keys(MFX_PRESETS);

export interface MfxOptions {
    count?: number;
    radius?: number;
    lifeTicks?: number;
    turns?: number;
    rise?: number;
    color?: string;
    color2?: string;
}

export interface MfxResult {
    ok: boolean;
    message: string;
}

// 一次性铺点并逐个 spawnParticle（数学交给 Molang，脚本不再每刻重刷）
export function spawnMfx(
    dimension: Dimension,
    center: Vector3,
    recipeId: string,
    opts: MfxOptions = {},
): MfxResult {
    const recipe = MFX_PRESETS[recipeId];
    if (!recipe) {
        return { ok: false, message: `未知配方 "${recipeId}"，可用：${MFX_PRESET_IDS.join(", ")}` };
    }

    const radius = opts.radius ?? 1.5;
    const points = getShapePoints(recipe.shape, radius);
    if (!points || points.length === 0) {
        return { ok: false, message: `配方 "${recipeId}" 的形状 "${recipe.shape}" 生成失败` };
    }

    // 逐点初始位置（相对中心偏移）+ 相位
    let pts = points;
    if (opts.count && opts.count < pts.length) {
        // 抽稀到指定数量（均匀步长）
        const step = pts.length / Math.max(1, Math.floor(opts.count));
        const sampled: number[][] = [];
        for (let k = 0; k < pts.length; k += step) {
            sampled.push(pts[Math.min(pts.length - 1, Math.round(k))]);
        }
        pts = sampled;
    }

    const c1 = resolveSolidColor(opts.color ?? recipe.color);
    const c2 = resolveSolidColor(opts.color2 ?? recipe.color2 ?? recipe.color);
    const size0 = recipe.size;
    const turns = opts.turns ?? recipe.turns;
    const rise = opts.rise ?? recipe.rise;
    const life = (opts.lifeTicks ?? 120) / 20; // tick → 粒子寿命(秒)，默认 120 刻 = 6 秒

    const map = new MolangVariableMap();
    map.setFloat("variable.motion", recipe.motion);
    map.setFloat("variable.turns", turns);
    map.setFloat("variable.rise", rise);
    map.setFloat("variable.spin", recipe.spin);
    map.setFloat("variable.radius", radius);
    map.setFloat("variable.colormode", recipe.colorMode);
    map.setFloat("variable.cr", c1.r);
    map.setFloat("variable.cg", c1.g);
    map.setFloat("variable.cb", c1.b);
    map.setFloat("variable.c2r", c2.r);
    map.setFloat("variable.c2g", c2.g);
    map.setFloat("variable.c2b", c2.b);
    map.setFloat("variable.sizemode", recipe.sizeMode);
    map.setFloat("variable.size0", size0);
    map.setFloat("variable.life", life);
    // A-1 新增：淡出模式 / 序列帧 / 起始 UV（默认保持现有配方外观）
    map.setFloat("variable.fadeMode", recipe.fade ?? 0);
    map.setFloat("variable.maxframe", recipe.maxframe ?? 1);
    const uv = recipe.uv ?? [49, 88];
    map.setFloat("variable.uvx", uv[0]);
    map.setFloat("variable.uvy", uv[1]);

    const n = pts.length;
    let spawned = 0;
    let firstErr = "";
    for (let i = 0; i < n; i++) {
        map.setFloat("variable.phase", i / Math.max(1, n - 1));
        map.setFloat("variable.px", pts[i][0]);
        map.setFloat("variable.py", pts[i][1]);
        map.setFloat("variable.pz", pts[i][2]);
        try {
            dimension.spawnParticle(MFX_PARTICLE_ID, center, map);
            spawned++;
        } catch (e) {
            if (!firstErr) firstErr = String(e);
        }
    }
    return { ok: true, message: `[mfx] ${recipe.label}（${spawned} 粒子, 寿命${life}s）` };
}