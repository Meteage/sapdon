// ============================================================
// 数学表达式粒子装配层：把 /particle_math 的接收参数
// 解析为现有 ColorParticleManager.spawn 可用的"铺点 + 逐点着色"。
// 纯计算，无 @minecraft 依赖。
// ============================================================
import { Color } from "./particles.js";
import { ProgramExpr, ExprError, MathContext, EvalResult } from "./expr.js";

export type MathMode = "param" | "surface";

export interface MathParticleOptions {
    mode?: MathMode;
    count?: number;
    duration?: number;
    trail?: number;
    dt?: number;
    radius?: number;
    color?: string; // 缺省固态色；expr 输出 red/green/blue 时优先生成逐点渐变色
}

export interface MathSpawnResult {
    ok: boolean;
    message: string;
    prog: ProgramExpr | null;
    // 逐点数据：pos 为相对中心偏移；expr 带 red/green/blue 时 color 为逐点色
    points: { pos: [number, number, number]; color?: Color }[];
    // 整组缺省色（expr 未输出颜色时使用）
    groupColor: Color;
}

export const MATH_MODE_IDS: MathMode[] = ["param", "surface"];

function clampNorm(v: number): number {
    return Math.max(0, Math.min(1, v));
}

// 命名色 / r,g,b（0-255）/ 缺省蓝
export function resolveSolidColor(name: string | undefined): Color {
    if (name) {
        const parts = name.split(",");
        if (parts.length === 3) {
            const [r, g, b] = parts.map(Number);
            if (![r, g, b].some((v) => isNaN(v))) {
                return {
                    r: clampNorm(r / 255),
                    g: clampNorm(g / 255),
                    b: clampNorm(b / 255),
                };
            }
        }
        const named = NAMED_COLORS[name.toLowerCase()];
        if (named) return named;
    }
    return NAMED_COLORS.blue;
}

const NAMED_COLORS: Record<string, Color> = {
    blue: { r: 0.3, g: 0.7, b: 0.999 },
    orange: { r: 0.999, g: 0.7, b: 0.1 },
    green: { r: 0.3, g: 0.999, b: 0.4 },
    yellow: { r: 0.999, g: 0.999, b: 0.3 },
    purple: { r: 0.75, g: 0.35, b: 0.999 },
    red: { r: 0.999, g: 0.25, b: 0.25 },
    cyan: { r: 0.25, g: 0.85, b: 0.999 },
    pink: { r: 0.999, g: 0.45, b: 0.75 },
    white: { r: 0.999, g: 0.999, b: 0.999 },
    black: { r: 0.05, g: 0.05, b: 0.05 },
    gold: { r: 0.999, g: 0.85, b: 0.1 },
    silver: { r: 0.7, g: 0.7, b: 0.7 },
};

// 组装铺点点集：
//  - param  ：沿 t:0→1 以 dt 递增，得到曲线上的点
//  - surface：外层用 i/n 做第二维、内层用 t 铺满曲面
export function buildMathSpawn(
    program: string,
    opts: MathParticleOptions = {},
): MathSpawnResult {
    let prog: ProgramExpr;
    try {
        prog = new ProgramExpr(program);
    } catch (e) {
        const msg = e instanceof ExprError ? e.message : String(e);
        return { ok: false, message: `表达式语法错误：${msg}`, prog: null, points: [], groupColor: NAMED_COLORS.blue };
    }

    const mode: MathMode = opts.mode ?? "param";
    const count = Math.max(1, Math.floor(opts.count ?? 120));
    const radius = opts.radius ?? 1.5;
    const dt = Math.max(0.0001, opts.dt ?? 0.01);

    const points: { pos: [number, number, number]; color?: Color }[] = [];
    const hasOwnColor = prog.hasColor();
    const groupColor = resolveSolidColor(opts.color);

    const push = (pos: [number, number, number], res: EvalResult) => {
        if (hasOwnColor) {
            points.push({
                pos,
                color: {
                    r: clampNorm(res.red ?? 0.5),
                    g: clampNorm(res.green ?? 0.5),
                    b: clampNorm(res.blue ?? 0.5),
                },
            });
        } else {
            points.push({ pos });
        }
    };

    try {
        if (mode === "param") {
            let steps = 0;
            for (let t = 0; t <= 1.0001; t += dt) {
                if (steps >= count) break;
                const res = prog.eval({ t: clampNorm(t), i: steps, n: count, r: radius });
                push([res.x, res.y, res.z], res);
                steps++;
            }
        } else {
            let steps = 0;
            for (let outer = 0; outer < count; outer++) {
                const inner = Math.max(2, Math.round(count / 6));
                for (let k = 0; k < inner; k++) {
                    const t = k / (inner - 1);
                    const res = prog.eval({ t: clampNorm(t), i: outer, n: count, r: radius });
                    push([res.x, res.y, res.z], res);
                    steps++;
                    if (steps > 8000) break;
                }
                if (steps > 8000) break;
            }
        }
    } catch (e) {
        const msg = e instanceof ExprError ? e.message : String(e);
        return { ok: false, message: `表达式求值错误：${msg}`, prog: null, points: [], groupColor: NAMED_COLORS.blue };
    }

    return {
        ok: true,
        message: `[粒子] ${program}（${points.length} 点, mode=${mode}）`,
        prog,
        points,
        groupColor,
    };
}

export type { Color, MathContext, EvalResult };