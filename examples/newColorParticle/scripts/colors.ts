// ============================================================
// 颜色工具：命名色 / r,g,b（0-255）/ 缺省蓝。纯计算，无 @minecraft 依赖。
// ============================================================

export interface Color {
    r: number;
    g: number;
    b: number;
}

export const NAMED_COLORS: Record<string, Color> = {
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