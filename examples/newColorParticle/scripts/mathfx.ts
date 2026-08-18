// ============================================================
// 数学效果库：参数曲面、奇异吸引子、分形（纯计算，无 mc 依赖）
// ============================================================

export type Point = number[];

// ------------------------------------------------------------
// 均匀分布点集
// ------------------------------------------------------------

// 黄金螺旋球面均匀分布
export function fibonacciSphere(radius: number, count: number): Point[] {
    const ga = Math.PI * (3 - Math.sqrt(5));
    const pts: Point[] = [];
    for (let i = 0; i < count; i++) {
        const y = 1 - (2 * (i + 0.5)) / count;
        const r = Math.sqrt(1 - y * y);
        const th = ga * i;
        pts.push([r * Math.cos(th) * radius, y * radius, r * Math.sin(th) * radius]);
    }
    return pts;
}

// ------------------------------------------------------------
// 参数曲面
// ------------------------------------------------------------

// 环面：R 主半径，r 管半径
export function torus(R: number, r: number, uSteps = 36, vSteps = 16): Point[] {
    const pts: Point[] = [];
    for (let i = 0; i <= uSteps; i++) {
        const u = (i / uSteps) * 2 * Math.PI;
        for (let j = 0; j <= vSteps; j++) {
            const v = (j / vSteps) * 2 * Math.PI;
            const ring = R + r * Math.cos(v);
            pts.push([ring * Math.cos(u), r * Math.sin(v), ring * Math.sin(u)]);
        }
    }
    return pts;
}

// (p,q) 纽结曲线：p/q=2/3 三叶结，5/2 五瓣结
export function torusKnot(R: number, r: number, p = 2, q = 3, steps = 320): Point[] {
    const pts: Point[] = [];
    for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * 2 * Math.PI;
        const ring = R + r * Math.cos(q * t);
        pts.push([ring * Math.cos(p * t), r * Math.sin(q * t), ring * Math.sin(p * t)]);
    }
    return pts;
}

// 玫瑰线：k 奇数→k 瓣，k 偶数→2k 瓣（XZ 平面）
export function roseCurve(radius: number, k = 5, steps = 360): Point[] {
    const pts: Point[] = [];
    for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * 2 * Math.PI;
        const r = Math.abs(Math.cos(k * t)) * radius;
        pts.push([r * Math.cos(t), 0, r * Math.sin(t)]);
    }
    return pts;
}

// 3D 利萨如曲线
export function lissajous3D(radius: number, ax = 3, ay = 2, az = 5, steps = 420): Point[] {
    const pts: Point[] = [];
    for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * 2 * Math.PI;
        pts.push([radius * Math.sin(ax * t), radius * Math.sin(ay * t), radius * Math.sin(az * t)]);
    }
    return pts;
}

// 莫比乌斯带
export function mobius(radius: number, w = 0.6, uSteps = 36, vSteps = 8): Point[] {
    const pts: Point[] = [];
    for (let i = 0; i <= uSteps; i++) {
        const u = (i / uSteps) * 2 * Math.PI;
        for (let j = 0; j <= vSteps; j++) {
            const v = -1 + (2 * j) / vSteps;
            const half = 1 + (v / 2) * Math.cos(u / 2);
            pts.push([
                radius * half * Math.cos(u),
                radius * (w / 2) * v * Math.sin(u / 2),
                radius * half * Math.sin(u),
            ]);
        }
    }
    return pts;
}

// 内旋轮线（spirograph）：R 大圆，r 小圆，d 笔点到小圆中心
export function hypotrochoid(R: number, r: number, d: number, steps = 480): Point[] {
    const pts: Point[] = [];
    const k = 1 - r / R;
    for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * 2 * Math.PI;
        pts.push([
            (R - r) * Math.cos(t) + d * Math.cos(k * t),
            0,
            (R - r) * Math.sin(t) - d * Math.sin(k * t),
        ]);
    }
    return pts;
}

// 超公式（superformula）三维球面：m 对称瓣数，n1/n2/n3 控制形状
function superShape(theta: number, m: number, n1: number, n2: number, n3: number): number {
    const t1 = Math.pow(Math.abs(Math.cos((m * theta) / 4)), n2);
    const t2 = Math.pow(Math.abs(Math.sin((m * theta) / 4)), n3);
    return Math.pow(t1 + t2, -1 / n1);
}

export function superformulaSphere(radius: number, m = 4, n1 = 0.3, n2 = 1, n3 = 1, uSteps = 28, vSteps = 28): Point[] {
    const pts: Point[] = [];
    for (let i = 0; i <= uSteps; i++) {
        const u = (i / uSteps) * 2 * Math.PI;
        const ru = superShape(u, m, n1, n2, n3);
        for (let j = 0; j <= vSteps; j++) {
            const v = (j / vSteps) * Math.PI;
            const rv = superShape(v, m, n1, n2, n3);
            pts.push([
                radius * ru * Math.cos(u) * rv * Math.cos(v),
                radius * rv * Math.sin(v),
                radius * ru * Math.sin(u) * rv * Math.cos(v),
            ]);
        }
    }
    return pts;
}

// ------------------------------------------------------------
// 分形
// ------------------------------------------------------------

// 3D 谢尔宾斯基四面体（随机迭代）
export function sierpinski(radius: number, iterations = 700): Point[] {
    const verts: Point[] = [
        [1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1],
    ].map((v) => [v[0] * radius, v[1] * radius, v[2] * radius]);
    const pts: Point[] = [];
    let p: Point = [0, 0, 0];
    for (let i = 0; i < iterations; i++) {
        const v = verts[Math.floor(Math.random() * 4)];
        p = [(p[0] + v[0]) / 2, (p[1] + v[1]) / 2, (p[2] + v[2]) / 2];
        pts.push([p[0], p[1], p[2]]);
    }
    return pts;
}

// ------------------------------------------------------------
// 奇异吸引子（轨迹生成，随后 normalize 到目标半径）
// ------------------------------------------------------------

export type Attractor = (start: number[], steps: number) => Point[];

function integrate(start: number[], steps: number, dt: number, deriv: (x: number, y: number, z: number) => [number, number, number]): Point[] {
    let [x, y, z] = start;
    const pts: Point[] = [];
    for (let i = 0; i < steps; i++) {
        const [dx, dy, dz] = deriv(x, y, z);
        x += dx * dt;
        y += dy * dt;
        z += dz * dt;
        pts.push([x, y, z]);
    }
    return pts;
}

export const lorenz: Attractor = (start, steps) => integrate(start, steps, 0.006,
    (x, y, z) => [10 * (y - x), x * (28 - z) - y, x * y - (8 / 3) * z]);

export const rossler: Attractor = (start, steps) => integrate(start, steps, 0.03,
    (x, y, z) => [-y - z, x + 0.2 * y, 0.2 + z * (x - 5.7)]);

export const thomas: Attractor = (start, steps) => integrate(start, steps, 0.03,
    (x, y, z) => [Math.sin(y) - 0.208186 * x, Math.sin(z) - 0.208186 * y, Math.sin(x) - 0.208186 * z]);

export const aizawa: Attractor = (start, steps) => {
    let [x, y, z] = start;
    const pts: Point[] = [];
    for (let i = 0; i < steps; i++) {
        const dx = (z - 0.7) * x - 3.5 * y;
        const dy = 3.5 * x + (z - 0.7) * y;
        const dz = 0.6 + 0.95 * z - (z ** 3) / 3 - (x * x + y * y) * (1 + 0.25 * z) + 0.1 * z * (x ** 3);
        x += dx * 0.01;
        y += dy * 0.01;
        z += dz * 0.01;
        pts.push([x, y, z]);
    }
    return pts;
};

// 2D 迭代映射
export const dejong: Attractor = (start, steps) => {
    let [x, y] = start;
    const pts: Point[] = [];
    for (let i = 0; i < steps; i++) {
        const nx = Math.sin(1.4 * y) - Math.cos(-2.3 * x);
        const ny = Math.sin(2.4 * x) - Math.cos(-2.1 * y);
        x = nx; y = ny;
        pts.push([x, y, 0]);
    }
    return pts;
};

export const henon: Attractor = (start, steps) => {
    let [x, y] = start;
    const pts: Point[] = [];
    for (let i = 0; i < steps; i++) {
        const nx = 1 - 1.4 * x * x + y;
        const ny = 0.3 * x;
        x = nx; y = ny;
        pts.push([x, y, 0]);
    }
    return pts;
};

export const PATHS: Record<string, { gen: Attractor; start: number[]; steps: number }> = {
    lorenz:  { gen: lorenz,  start: [0.1, 0, 0],   steps: 600 },
    rossler: { gen: rossler, start: [1, 1, 1],     steps: 500 },
    thomas:  { gen: thomas,  start: [0.1, 0.2, 0.3], steps: 500 },
    aizawa:  { gen: aizawa,  start: [1, 1, 1],     steps: 400 },
    dejong:  { gen: dejong,  start: [0.5, 0.5],    steps: 800 },
    henon:   { gen: henon,   start: [0.1, 0.1],    steps: 500 },
};

export const PATH_IDS = Object.keys(PATHS);

// 归一化轨迹到目标半径并居中
export function normalize(points: Point[], radius: number): Point[] {
    if (points.length === 0) return points;
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const p of points) {
        if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
        if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
        if (p[2] < minZ) minZ = p[2]; if (p[2] > maxZ) maxZ = p[2];
    }
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
    const ex = (maxX - minX) / 2 || 1, ey = (maxY - minY) / 2 || 1, ez = (maxZ - minZ) / 2 || 1;
    const scale = radius / Math.max(ex, ey, ez);
    return points.map((p) => [(p[0] - cx) * scale, (p[1] - cy) * scale, (p[2] - cz) * scale]);
}

export function getPath(id: string, radius: number): Point[] | undefined {
    const def = PATHS[id];
    if (!def) return undefined;
    return normalize(def.gen(def.start, def.steps), radius);
}