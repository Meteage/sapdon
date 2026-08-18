import { Dimension, Vector3 } from "@minecraft/server";
import {
    Color, lerpColor, parseColor, cycleColor,
    ColorParticleManager, COLORS,
} from "./particles.js";
import { Transformation, Calculator } from "./lib/core.js";
import {
    fibonacciSphere, torus, torusKnot, roseCurve, lissajous3D,
    mobius, hypotrochoid, superformulaSphere, sierpinski,
    getPath, PATH_IDS,
} from "./mathfx.js";

// ============================================================
// 运动函数库
// 签名：(center, basePoint, index, elapsedTick, totalTicks) -> Vector3
// index = 该基点在点集中的序号，用于 flow/phase 等按位置演化的运动
// ============================================================
type MotionFn = (center: Vector3, basePoint: number[], index: number, elapsedTick: number, totalTicks: number) => Vector3;

const PI = Math.PI;

function still(c: Vector3, b: number[]): Vector3 {
    return { x: c.x + b[0], y: c.y + b[1], z: c.z + b[2] };
}

function spin(c: Vector3, b: number[], _i: number, t: number, total: number): Vector3 {
    const r = Transformation.rotationTransformation([b], "y", (2 * PI * t) / total)[0];
    return { x: c.x + r[0], y: c.y + r[1], z: c.z + r[2] };
}

function spinRev(c: Vector3, b: number[], _i: number, t: number, total: number): Vector3 {
    const r = Transformation.rotationTransformation([b], "y", (-2 * PI * t) / total)[0];
    return { x: c.x + r[0], y: c.y + r[1], z: c.z + r[2] };
}

function spinTurns(c: Vector3, b: number[], _i: number, t: number, total: number, turns: number): Vector3 {
    const r = Transformation.rotationTransformation([b], "y", (2 * PI * turns * t) / total)[0];
    return { x: c.x + r[0], y: c.y + r[1], z: c.z + r[2] };
}

function pulse(c: Vector3, b: number[], _i: number, t: number, _total: number, cycleTicks: number): Vector3 {
    const s = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin((2 * PI * t) / cycleTicks));
    return { x: c.x + b[0] * s, y: c.y + b[1] * s, z: c.z + b[2] * s };
}

function heartbeat(c: Vector3, b: number[], _i: number, t: number): Vector3 {
    const beat = Math.pow(Math.abs(Math.sin((2 * PI * t) / 60)), 3);
    const s = 0.85 + 0.15 * beat;
    return { x: c.x + b[0] * s, y: c.y + b[1] * s, z: c.z + b[2] * s };
}

function spinBreathe(c: Vector3, b: number[], _i: number, t: number, total: number): Vector3 {
    const s = 0.85 + 0.15 * Math.sin((2 * PI * t) / 60);
    const r = Transformation.rotationTransformation([[b[0] * s, b[1] * s, b[2] * s]], "y", (2 * PI * 2 * t) / total)[0];
    return { x: c.x + r[0], y: c.y + r[1], z: c.z + r[2] };
}

function rise(c: Vector3, b: number[], _i: number, t: number, total: number): Vector3 {
    const r = Transformation.rotationTransformation([b], "y", (2 * PI * 2 * t) / total)[0];
    const yOff = (t / total) * 6 - 3;
    return { x: c.x + r[0], y: c.y + r[1] + yOff, z: c.z + r[2] };
}

// ---- 高级数学运动 ----

// 沿路径流动：粒子 i 在第 t 帧位于路径的第 (i+t) 个点
function flowPath(path: number[][], c: Vector3, _b: number[], i: number, t: number): Vector3 {
    const p = path[(i + t) % path.length];
    return { x: c.x + p[0], y: c.y + p[1], z: c.z + p[2] };
}

// 驻波：基点在 Y 方向做行进波位移
function wave(c: Vector3, b: number[], _i: number, t: number, total: number): Vector3 {
    const phase = ((2 * PI) / total) * 3 * t;
    const w = Math.sin(b[0] * 1.3 + b[2] * 1.3 + phase) * 0.6;
    return { x: c.x + b[0], y: c.y + b[1] + w, z: c.z + b[2] };
}

// 相位呼吸：按序号做行波缩放（形状表面如波纹涌动）
function phase(c: Vector3, b: number[], i: number, t: number, total: number): Vector3 {
    const f = i * 0.1 + ((2 * PI * t) / total);
    const s = 1 + 0.15 * Math.sin(f * 2);
    return { x: c.x + b[0] * s, y: c.y + b[1] * s, z: c.z + b[2] * s };
}

// 混沌抖动：确定性伪随机（同 i,t 稳定），如分子热运动
function fract(x: number): number { return x - Math.floor(x); }

function jitter(c: Vector3, b: number[], i: number, t: number): Vector3 {
    const a = 0.12;
    const r1 = fract(Math.sin(i * 12.9898 + t * 78.233) * 43758.5453);
    const r2 = fract(Math.sin(i * 39.346 + t * 13.771) * 87654.21);
    const r3 = fract(Math.sin(i * 7.771 + t * 91.333) * 23543.897);
    return { x: c.x + b[0] + (r1 - 0.5) * a, y: c.y + b[1] + (r2 - 0.5) * a, z: c.z + b[2] + (r3 - 0.5) * a };
}

// points 仅 flow 需要（沿路径流动）；其余忽略
const MOTION_FACTORIES: Record<string, (points?: number[][]) => MotionFn> = {
    still:        () => (c, b) => still(c, b),
    spin:         () => (c, b, i, t, total) => spin(c, b, i, t, total),
    spin_rev:     () => (c, b, i, t, total) => spinRev(c, b, i, t, total),
    spin_turns:   () => (c, b, i, t, total) => spinTurns(c, b, i, t, total, 2),
    pulse:        () => (c, b, i, t, total) => pulse(c, b, i, t, total, 60),
    heartbeat:    () => (c, b, i, t) => heartbeat(c, b, i, t),
    spin_breathe: () => (c, b, i, t, total) => spinBreathe(c, b, i, t, total),
    rise:         () => (c, b, i, t, total) => rise(c, b, i, t, total),
    // ---- 高级 ----
    flow:         (points) => (c, b, i, t) => flowPath(points ?? [], c, b, i, t),
    wave:         () => (c, b, i, t, total) => wave(c, b, i, t, total),
    phase:        () => (c, b, i, t, total) => phase(c, b, i, t, total),
    jitter:       () => (c, b, i, t) => jitter(c, b, i, t),
};

export const MOTION_IDS = Object.keys(MOTION_FACTORIES);

export function getMotionFn(motionId: string, points?: number[][]): ((points?: number[][]) => MotionFn) | undefined {
    if (motionId === "flow" && !points) return undefined;
    return MOTION_FACTORIES[motionId];
}

// ============================================================
// 形状点集库（含数学形状）
// ============================================================
export interface ShapeParams {
    p1?: number;
    p2?: number;
}

export type ShapeGenerator = (radius: number, params: ShapeParams) => number[][];

const SHAPE_GENS: Record<string, ShapeGenerator> = {
    sphere:     (r) => Calculator.calculateSpherePoints([0, 0, 0], r, PI / 10, PI / 10),
    cube:       (r) => Calculator.calculateCubePoints([0, 0, 0], r * 2, 0.5),
    ring:       (r) => Calculator.calculateCirclePoints([0, 0, 0], r, PI / 24),
    ring_tilt:  (r) => Calculator.calculateCirclePoints([0, 0, 0], r, PI / 24).map((p) => Transformation.rotationTransformation([p], "x", PI / 6)[0]),
    ring_tilt2: (r) => Calculator.calculateCirclePoints([0, 0, 0], r, PI / 24).map((p) => Transformation.rotationTransformation([p], "x", -PI / 6)[0]),
    helix:      (r) => Calculator.calculatePoints(
        (t: number) => [Math.cos(2 * PI * 3 * t) * r, t * 3 - 1.5, Math.sin(2 * PI * 3 * t) * r],
        { start: 0, end: 1, dt: 0.02 },
    ),
    heart:      (r) => {
        const s = r / 1.2;
        const pts: number[][] = [];
        for (let t = 0; t < 2 * PI; t += PI / 40) {
            pts.push([
                (16 * Math.pow(Math.sin(t), 3)) / 16 * s,
                (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16 * s,
                0,
            ]);
        }
        return pts;
    },
    star:       (r) => Calculator.calculateSpherePoints([0, 0, 0], r * 0.25, PI / 4, PI / 4),
    // ---- 数学形状 ----
    fib_sphere:  (r, p) => fibonacciSphere(r, p.p1 ?? 240),
    torus:       (r) => torus(r * 0.7, r * 0.3, 36, 16),
    knot:        (r, p) => torusKnot(r * 0.75, r * 0.2, p.p1 ?? 2, p.p2 ?? 3, 320),
    rose:        (r, p) => roseCurve(r, p.p1 ?? 5, 360),
    lissajous:   (r, p) => lissajous3D(r, p.p1 ?? 3, p.p2 ?? 2, 5, 420),
    mobius:      (r) => mobius(r, 0.6, 36, 8),
    spirograph:  (r) => hypotrochoid(r * 0.75, r * 0.25, r * 0.5, 480),
    superflower: (r, p) => superformulaSphere(r, p.p1 ?? 4, p.p2 ?? 0.3, 1, 1, 28, 28),
    sierpinski:  (r, p) => sierpinski(r, p.p1 ?? 700),
};

export const SHAPE_IDS = Object.keys(SHAPE_GENS);
export const ALL_SHAPE_IDS = [...SHAPE_IDS, ...PATH_IDS.map((id) => `path:${id}`)];

export function getShapePoints(shapeId: string, radius: number, params: ShapeParams = {}): number[][] | undefined {
    if (shapeId.startsWith("path:")) {
        return getPath(shapeId.slice(5), radius);
    }
    const gen = SHAPE_GENS[shapeId];
    return gen ? gen(radius, params) : undefined;
}

// ============================================================
// 颜色解析
// ============================================================
function resolveColorOrGradient(c1: string | undefined, c2: string | undefined, f1: Color, f2: Color): Color | ((t: number) => Color) {
    const color1 = parseColor(c1 ?? "") ?? f1;
    if (c2 === "cycle") return cycleColor;
    if (c2) {
        const color2 = parseColor(c2);
        if (color2) return (t: number) => lerpColor(color1, color2, t);
    }
    if (c1 === "cycle") return cycleColor;
    return color1;
}

// ============================================================
// 预设效果
// ============================================================
export interface EffectLayer {
    shape: string;
    motion: string;
    color1: string;
    color2?: string;
    radius?: number;
    duration?: number;
    trail?: number;
    spin?: number;
    tick?: number;
    turns?: number;
    p1?: number;
    p2?: number;
}

export interface EffectPreset {
    id: string;
    label: string;
    layers: EffectLayer[];
}

export const PRESETS: Record<string, EffectPreset> = {
    scale_sp: {
        id: "scale_sp",
        label: "缩放正方体",
        layers: [{ shape: "cube", motion: "pulse", color1: "blue", spin: 0.8, trail: 2 }],
    },
    spin_sp: {
        id: "spin_sp",
        label: "旋转正方体",
        layers: [{ shape: "cube", motion: "spin", color1: "orange", trail: 2 }],
    },
    ring: {
        id: "ring",
        label: "旋转光环",
        layers: [
            { shape: "ring_tilt",  motion: "spin_turns", color1: "blue",  color2: "purple", trail: 3 },
            { shape: "ring_tilt2", motion: "spin_rev",   color1: "purple", color2: "blue",  trail: 3 },
        ],
    },
    helix: {
        id: "helix",
        label: "螺旋上升",
        layers: [{ shape: "helix", motion: "spin", color1: "cycle", trail: 3 }],
    },
    sphere: {
        id: "sphere",
        label: "呼吸球体",
        layers: [{ shape: "sphere", motion: "pulse", color1: "green", color2: "cyan", trail: 2 }],
    },
    heart: {
        id: "heart",
        label: "心动爱心",
        layers: [{ shape: "heart", motion: "heartbeat", color1: "red", color2: "pink", trail: 2 }],
    },
    galaxy: {
        id: "galaxy",
        label: "旋转渐变球+星环",
        layers: [
            { shape: "sphere",   motion: "spin_breathe", color1: "cyan",  color2: "purple", trail: 2, spin: 0 },
            { shape: "ring_tilt", motion: "spin_turns",  color1: "blue",  color2: "purple", trail: 3, spin: 0, radius: 3.0 },
            { shape: "star",     motion: "spin_turns",   color1: "yellow", spin: 1, trail: 4, radius: 3.0, turns: 2 },
            { shape: "star",     motion: "spin_turns",   color1: "red",   spin: 1, trail: 4, radius: 3.0, turns: 2 },
            { shape: "star",     motion: "spin_turns",   color1: "pink",  spin: 1, trail: 4, radius: 3.0, turns: 2 },
        ],
    },
    // ---- 数学效果 ----
    torus: {
        id: "torus",
        label: "参数环面",
        layers: [{ shape: "torus", motion: "spin", color1: "cyan", color2: "blue", trail: 3 }],
    },
    knot: {
        id: "knot",
        label: "三叶纽结",
        layers: [{ shape: "knot", motion: "spin_turns", color1: "gold", color2: "purple", trail: 3 }],
    },
    attractor: {
        id: "attractor",
        label: "洛伦兹吸引子",
        layers: [{ shape: "path:lorenz", motion: "flow", color1: "cycle", trail: 3, radius: 3 }],
    },
    superflower: {
        id: "superflower",
        label: "超公式花",
        layers: [{ shape: "superflower", motion: "spin_breathe", color1: "pink", color2: "purple", trail: 2 }],
    },
    lissajous: {
        id: "lissajous",
        label: "3D 利萨如",
        layers: [{ shape: "lissajous", motion: "spin", color1: "green", color2: "cyan", trail: 3 }],
    },
    mobius: {
        id: "mobius",
        label: "莫比乌斯带",
        layers: [{ shape: "mobius", motion: "spin_rev", color1: "blue", color2: "green", trail: 2 }],
    },
    spirograph: {
        id: "spirograph",
        label: "旋轮线",
        layers: [{ shape: "spirograph", motion: "spin", color1: "orange", color2: "yellow", trail: 4 }],
    },
    sierpinski: {
        id: "sierpinski",
        label: "谢尔宾斯基分形",
        layers: [{ shape: "sierpinski", motion: "jitter", color1: "red", color2: "orange", trail: 2 }],
    },
    wave_sphere: {
        id: "wave_sphere",
        label: "波动球面",
        layers: [{ shape: "fib_sphere", motion: "wave", color1: "cyan", color2: "purple", trail: 2 }],
    },
};

export const PRESET_IDS = Object.keys(PRESETS);

// ============================================================
// 构建参数（从 EffectParams 到 EffectLayer[]）
// ============================================================
export interface EffectParams extends ShapeParams {
    radius?: number;
    duration?: number;
    trail?: number;
    spin?: number;
    tick?: number;
    turns?: number;
    color1?: string;
    color2?: string;
}

function layerDefaults(layer: EffectLayer, params: EffectParams): EffectLayer {
    return {
        shape: layer.shape,
        motion: layer.motion,
        color1: params.color1 ?? layer.color1,
        color2: params.color2 ?? layer.color2,
        radius: params.radius ?? layer.radius ?? 1.5,
        duration: params.duration ?? layer.duration ?? 60,
        trail: params.trail ?? layer.trail ?? 1,
        spin: params.spin ?? layer.spin ?? 0,
        tick: params.tick ?? layer.tick ?? 1,
        turns: params.turns ?? layer.turns ?? 1,
        p1: params.p1 ?? layer.p1,
        p2: params.p2 ?? layer.p2,
    };
}

// ============================================================
// spawnEffect / spawnShape 入口
// ============================================================
export interface SpawnResult {
    ok: boolean;
    message: string;
}

function spawnLayer(dimension: Dimension, center: Vector3, L: EffectLayer): void {
    const points = getShapePoints(L.shape, L.radius ?? 1.5, L) ?? [];
    const motionFactory = getMotionFn(L.motion, points);
    if (!motionFactory) return;
    const color = resolveColorOrGradient(L.color1, L.color2, COLORS.blue, COLORS.purple);
    ColorParticleManager.spawn(dimension, center, points, color, {
        durationTicks: L.duration,
        trail: L.trail,
        spin: L.spin,
        tick: L.tick,
        movementFn: motionFactory(points),
    });
}

export function spawnEffect(
    dimension: Dimension,
    center: Vector3,
    presetId: string,
    params: EffectParams = {},
): SpawnResult {
    const preset = PRESETS[presetId];
    if (!preset) {
        return { ok: false, message: `未知效果 "${presetId}"，可用：${PRESET_IDS.join(", ")}` };
    }
    for (const raw of preset.layers) {
        const L = layerDefaults(raw, params);
        const points = getShapePoints(L.shape, L.radius ?? 1.5, L);
        if (!points) {
            return { ok: false, message: `未知形状 "${L.shape}"` };
        }
        const motionFactory = getMotionFn(L.motion, points);
        if (!motionFactory) {
            return { ok: false, message: `未知运动 "${L.motion}"` };
        }
        const color = resolveColorOrGradient(L.color1, L.color2, COLORS.blue, COLORS.purple);
        ColorParticleManager.spawn(dimension, center, points, color, {
            durationTicks: L.duration,
            trail: L.trail,
            spin: L.spin,
            tick: L.tick,
            movementFn: motionFactory(points),
        });
    }
    return { ok: true, message: `[粒子] ${preset.label}（${preset.layers.length} 层）` };
}

export function spawnShape(
    dimension: Dimension,
    center: Vector3,
    shapeId: string,
    motionId: string,
    params: EffectParams = {},
): SpawnResult {
    const points = getShapePoints(shapeId, params.radius ?? 1.5, params);
    if (!points) {
        return { ok: false, message: `未知形状 "${shapeId}"，可用：${ALL_SHAPE_IDS.join(", ")}` };
    }
    const motionFactory = getMotionFn(motionId, points);
    if (!motionFactory) {
        return { ok: false, message: `未知运动 "${motionId}"，可用：${MOTION_IDS.join(", ")}` };
    }
    const color = resolveColorOrGradient(params.color1, params.color2, COLORS.blue, COLORS.purple);
    ColorParticleManager.spawn(dimension, center, points, color, {
        durationTicks: params.duration ?? 60,
        trail: params.trail ?? 1,
        spin: params.spin ?? 0,
        tick: params.tick ?? 1,
        movementFn: motionFactory(points),
    });
    return { ok: true, message: `[粒子] ${shapeId} × ${motionId}` };
}