import { Dimension, Vector3, MolangVariableMap, system } from "@minecraft/server";

export const PARTICLE_ID = "sapdon:color_particle";

export interface Color {
    r: number;
    g: number;
    b: number;
}

export function lerpColor(a: Color, b: Color, t: number): Color {
    const k = Math.max(0, Math.min(1, t));
    return { r: a.r + (b.r - a.r) * k, g: a.g + (b.g - a.g) * k, b: a.b + (b.b - a.b) * k };
}

// ============================================================
// 命名颜色
// ============================================================
export const COLORS: Record<string, Color> = {
    blue:   { r: 0.3,  g: 0.7, b: 0.999 },
    orange: { r: 0.999, g: 0.7, b: 0.1 },
    green:  { r: 0.3,  g: 0.999, b: 0.4 },
    yellow: { r: 0.999, g: 0.999, b: 0.3 },
    purple: { r: 0.75, g: 0.35, b: 0.999 },
    red:    { r: 0.999, g: 0.25, b: 0.25 },
    cyan:   { r: 0.25, g: 0.85, b: 0.999 },
    pink:   { r: 0.999, g: 0.45, b: 0.75 },
    white:  { r: 0.999, g: 0.999, b: 0.999 },
    black:  { r: 0.05, g: 0.05, b: 0.05 },
    gold:   { r: 0.999, g: 0.85, b: 0.1 },
    silver: { r: 0.7,  g: 0.7, b: 0.7 },
};

export function parseColor(name: string): Color | undefined {
    if (!name) return undefined;
    const lower = name.toLowerCase();
    const c = COLORS[lower];
    if (c) return c;
    // 尝试 "r,g,b" 格式
    const parts = lower.split(",");
    if (parts.length === 3) {
        const [r, g, b] = parts.map(Number);
        if ([r, g, b].every((v) => !isNaN(v))) {
            return {
                r: Math.max(0, Math.min(1, r / 255)),
                g: Math.max(0, Math.min(1, g / 255)),
                b: Math.max(0, Math.min(1, b / 255)),
            };
        }
    }
    return undefined;
}

// RGB 循环渐变：红→绿→蓝→红（按进度）
export function cycleColor(t: number): Color {
    const phase = (t * 3) % 1;
    const RED = COLORS.red, GREEN = COLORS.green, BLUE = COLORS.blue;
    return phase < 1 / 3 ? lerpColor(RED, GREEN, phase * 3)
        : phase < 2 / 3 ? lerpColor(GREEN, BLUE, (phase - 1 / 3) * 3)
        : lerpColor(BLUE, RED, (phase - 2 / 3) * 3);
}

// ============================================================
// 粒子调度器（每粒子组独立调度器）
// ============================================================
export interface ParticleGroup {
    dimension: Dimension;
    center: Vector3;
    basePoints: number[][];
    color: Color | ((t: number) => Color);
    spin: number;
    trail: number;
    totalTicks: number;
    elapsed: number;
    movementFn: (center: Vector3, basePoint: number[], index: number, elapsedTick: number, totalTicks: number) => Vector3;
    handle: number | null;
}

export class ColorParticleManager {
    private static groups: ParticleGroup[] = [];

    static spawn(
        dimension: Dimension,
        center: Vector3,
        basePoints: number[][],
        color: Color | ((t: number) => Color),
        opts: {
            durationTicks?: number;
            trail?: number;
            spin?: number;
            tick?: number;
            // 逐点颜色：存在时按序号返回对应点颜色，优先于 color
            perPointColor?: (index: number) => Color | undefined;
            movementFn: (center: Vector3, basePoint: number[], index: number, elapsedTick: number, totalTicks: number) => Vector3;
        },
    ) {
        const group: ParticleGroup = {
            dimension,
            center,
            basePoints,
            color,
            spin: opts.spin ?? 0,
            trail: opts.trail ?? 1,
            totalTicks: opts.durationTicks ?? 60,
            elapsed: 0,
            movementFn: opts.movementFn,
            handle: null,
        };
        ColorParticleManager.groups.push(group);
        group.handle = system.runInterval(() => {
            group.elapsed++;
            if (group.elapsed > group.totalTicks) {
                if (group.handle !== null) system.clearRun(group.handle);
                group.handle = null;
                const i = ColorParticleManager.groups.indexOf(group);
                if (i >= 0) ColorParticleManager.groups.splice(i, 1);
                return;
            }
            const vars = new MolangVariableMap();
            vars.setFloat("variable.lifetime", group.trail / 20);
            vars.setFloat("variable.spin", group.spin);
            for (let i = 0; i < group.basePoints.length; i++) {
                let c: Color;
                if (opts.perPointColor) {
                    const pc = opts.perPointColor(i);
                    c = pc ?? (typeof group.color === "function" ? group.color(0) : group.color);
                } else {
                    c = typeof group.color === "function" ? group.color(group.elapsed / group.totalTicks) : group.color;
                }
                vars.setFloat("variable.color_r", c.r);
                vars.setFloat("variable.color_g", c.g);
                vars.setFloat("variable.color_b", c.b);
                const pos = group.movementFn(group.center, group.basePoints[i], i, group.elapsed, group.totalTicks);
                try {
                    group.dimension.spawnParticle(PARTICLE_ID, pos, vars);
                } catch { }
            }
        }, opts.tick ?? 1);
    }

    static clearAll() {
        for (const g of ColorParticleManager.groups) {
            if (g.handle !== null) {
                system.clearRun(g.handle);
                g.handle = null;
            }
        }
        ColorParticleManager.groups = [];
    }

    static get activeCount(): number {
        return ColorParticleManager.groups.length;
    }
}
