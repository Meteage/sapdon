// ============================================================
// 形状点集库：脚本只用它生成“初始形状点”，运动交给粒子 Molang/发射器。
// 纯计算，无 @minecraft 依赖。
// ============================================================
import { Transformation, Calculator } from "./lib/core.js";
import {
    fibonacciSphere, torus, torusKnot, roseCurve, lissajous3D,
    mobius, hypotrochoid, superformulaSphere, sierpinski,
    getPath, PATH_IDS,
} from "./mathfx.js";

export interface ShapeParams {
    p1?: number;
    p2?: number;
}

export type ShapeGenerator = (radius: number, params: ShapeParams) => number[][];

const PI = Math.PI;

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
    // ---- 数学形状（见 mathfx.ts）----
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