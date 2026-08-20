// ============================================================
// Molang 粒子家族：脚本只算初始位置并传参，数学由粒子 Molang 演化。
// 统一色彩/大小/寿命契约；按 recipe.kind 分派到不同运动/发射模型：
//   universal  → mfx_universal（parametric：脚本铺点 + Molang 轨迹）
//   dynamic    → mfx_dynamic（初速度 + 重力/拖曳/碰撞）
//   stream     → mfx_stream（持续/循环发射）
//   shape_disc/sphere/box → mfx_shape_*（原生随机分布，一次爆发）
// 运动全部由粒子/发射器自驱动；脚本只生成初始形状并传参。
// ============================================================
import { Dimension, Vector3, MolangVariableMap } from "@minecraft/server";
import { getShapePoints } from "./effects.js";
import { resolveSolidColor } from "./colors.js";

export type MfxKind =
  | "universal" | "dynamic" | "stream"
  | "shape_disc" | "shape_sphere" | "shape_box"
  | "cubebreath" | "sine" | "uni";

const KIND_PARTICLE: Record<MfxKind, string> = {
    universal: "colorparticle:mfx_universal",
    dynamic: "colorparticle:mfx_dynamic",
    stream: "colorparticle:mfx_stream",
    shape_disc: "colorparticle:mfx_shape_disc",
    shape_sphere: "colorparticle:mfx_shape_sphere",
    shape_box: "colorparticle:mfx_shape_box",
    cubebreath: "colorparticle:mfx_edgebreathe",
    sine: "colorparticle:mfx_sine",
    uni: "colorparticle:mfx_uni",
};

export const MFX_COLORMODES = ["solid", "gradient", "cycle", "rainbow", "heat"];
export const MFX_SIZEMODES = ["const", "bloom", "fade"];
export const MFX_FADEMODES = ["out", "inout", "none"];

export interface MfxRecipe {
    id: string;
    label: string;
    kind?: MfxKind;          // 默认 universal
    // 通用
    shape?: string;          // universal：脚本铺点的形状
    color: string;
    color2?: string;
    colorMode?: number;      // 0 solid 1 gradient 2 cycle 3 rainbow 4 heat
    sizeMode?: number;       // 0 const 1 bloom 2 fade
    size?: number;
    fade?: number;           // 0 out 1 inout 2 none
    turns?: number;
    rise?: number;
    spin?: number;
    motion?: number;         // universal：0..9
    maxframe?: number;
    uv?: [number, number];
    count?: number;          // dynamic / universal 采样数
    lifeTicks?: number;      // 本配方默认寿命（游戏刻），否则 120
    // uni：全能表达式系数（每项 {A,B,C,type} ×3 + D），type: 0..7
    curve?: CurveSpec;                              // X 轴（兼容单轴）
    curve3d?: { x?: CurveSpec; y?: CurveSpec; z?: CurveSpec }; // 三轴独立
    // dynamic / stream 物理
    speed?: number;
    gravity?: number;
    drag?: number;
    collide?: number;
    // stream 流量
    flow?: number;
    flowmax?: number;
    flowtime?: number;
};

interface CurveSpec {
    A: number[];
    B: number[];
    C: number[];
    type: number[];
    D?: number;
}

// 「全能表」配方：给配方名 + 可选参数覆盖 = 完全定义一次效果
export const MFX_PRESETS: Record<string, MfxRecipe> = {
    // ---- universal（parametric：脚本铺点 + Molang 轨迹）----
    ring:     { id: "ring", label: "旋转光环",   kind: "universal", shape: "ring",   motion: 1, colorMode: 1, color: "blue",   color2: "purple", sizeMode: 0, size: 0.14, turns: 1, rise: 0, spin: 0 },
    sphere:   { id: "sphere", label: "呼吸球体", kind: "universal", shape: "sphere", motion: 4, colorMode: 1, color: "green",  color2: "cyan",    sizeMode: 0, size: 0.12, turns: 0, rise: 0, spin: 0.5 },
    spiral:   { id: "spiral", label: "上升螺旋", kind: "universal", shape: "helix",  motion: 3, colorMode: 2, color: "blue",   color2: "purple", sizeMode: 0, size: 0.12, turns: 2, rise: 1.5, spin: 0 },
    heart:    { id: "heart", label: "心动爱心",  kind: "universal", shape: "heart",  motion: 4, colorMode: 1, color: "red",    color2: "pink",    sizeMode: 1, size: 0.14, turns: 0, rise: 0, spin: 0 },
    lissajous:{ id: "lissajous", label: "3D 利萨如", kind: "universal", shape: "lissajous", motion: 1, colorMode: 3, color: "green", color2: "cyan", sizeMode: 0, size: 0.12, turns: 1, rise: 0, spin: 0.5 },
    rose:     { id: "rose", label: "玫瑰线",     kind: "universal", shape: "rose",   motion: 1, colorMode: 2, color: "pink",   color2: "purple", sizeMode: 0, size: 0.12, turns: 1, rise: 0, spin: 0.5 },
    torus:    { id: "torus", label: "参数环面", kind: "universal", shape: "torus",  motion: 1, colorMode: 1, color: "cyan",   color2: "blue",    sizeMode: 0, size: 0.1, turns: 1, rise: 0, spin: 0 },
    cone:     { id: "cone", label: "喷锥",       kind: "universal", shape: "sphere", motion: 6, colorMode: 2, color: "orange", color2: "yellow", sizeMode: 1, size: 0.1, turns: 0, rise: 2.5, spin: 0.4, fade: 2, maxframe: 1 },
    bounce:   { id: "bounce", label: "弹跳盘",   kind: "universal", shape: "ring", motion: 8, colorMode: 0, color: "gold",    sizeMode: 0, size: 0.14, turns: 0, rise: 0, spin: 0, fade: 0, maxframe: 1 },
    orbit:    { id: "orbit", label: "流转轨道", kind: "universal", shape: "ring",   motion: 9, colorMode: 3, color: "cyan",   color2: "purple", sizeMode: 0, size: 0.12, turns: 2, rise: 0, spin: 0, fade: 0, maxframe: 1 },
    heat:     { id: "heat", label: "余烬",       kind: "universal", shape: "sphere", motion: 2, colorMode: 4, color: "red",    sizeMode: 1, size: 0.16, turns: 0, rise: 1.2, spin: 0.6, fade: 1, maxframe: 1 },
    sprite:   { id: "sprite", label: "序列帧火苗", kind: "universal", shape: "sphere", motion: 0, colorMode: 0, color: "white", sizeMode: 0, size: 0.22, turns: 0, rise: 0, spin: 0, fade: 0, maxframe: 8, uv: [0, 0] },
    cubebreathe:{ id: "cubebreathe", label: "呼吸立方", kind: "cubebreath", colorMode: 1, color: "blue", color2: "purple", sizeMode: 1, size: 0.13, turns: 0, rise: 0, spin: 0, fade: 1, lifeTicks: 400 },
    // ---- A-2：互斥模型伴生粒子 ----
    gust:     { id: "gust", label: "喷发气流",   kind: "dynamic", colorMode: 2, color: "white", sizeMode: 1, size: 0.15, fade: 1, count: 60, speed: 2.5, gravity: -20, drag: 0.5, collide: 1 },
    spring:   { id: "spring", label: "喷泉",    kind: "stream", colorMode: 2, color: "cyan", color2: "blue", sizeMode: 1, size: 0.14, fade: 1, speed: 3.0, gravity: -25, drag: 0.2, flow: 40, flowmax: 120, flowtime: 20 },
    halo:     { id: "halo", label: "光环爆发",   kind: "shape_disc", colorMode: 3, color: "cyan", sizeMode: 0, size: 0.12, fade: 0 },
    snowstorm:{ id: "snowstorm", label: "雪片风暴", kind: "shape_box", colorMode: 0, color: "white", sizeMode: 0, size: 0.1, fade: 0 },
    starfield:{ id: "starfield", label: "星空爆发", kind: "shape_sphere", colorMode: 3, color: "white", sizeMode: 1, size: 0.1, fade: 1 },
    // ---- 验证用：单粒子线性 sin ——
    sine:     { id: "sine", label: "单个 sin 粒子", kind: "sine", colorMode: 0, color: "orange", sizeMode: 0, size: 0.25, fade: 0, lifeTicks: 120 },
    // ---- uni：全能表达式（x=ΣA_i·f_i(B_i·t+C_i)+D, t=emitter_age, sin/cos 角度制）----
    uni_linear:   { id: "uni_linear", label: "uni 线性",    kind: "uni", color: "orange", lifeTicks: 120, curve: { A: [1, 0, 0], B: [1, 0, 0], C: [0, 0, 0], type: [0, 0, 0], D: 0 } },
    uni_sine:     { id: "uni_sine",   label: "uni 正弦",    kind: "uni", color: "cyan",   lifeTicks: 120, curve: { A: [5, 0, 0], B: [1, 0, 0], C: [0, 0, 0], type: [2, 0, 0], D: 0 } },
    uni_cos:      { id: "uni_cos",    label: "uni 余弦",    kind: "uni", color: "green",  lifeTicks: 120, curve: { A: [5, 0, 0], B: [1, 0, 0], C: [0, 0, 0], type: [3, 0, 0], D: 0 } },
    uni_parabolic:{ id: "uni_parabolic", label: "uni 抛物线", kind: "uni", color: "purple", lifeTicks: 120, curve: { A: [0.5, 0, 0], B: [1, 0, 0], C: [0, 0, 0], type: [1, 0, 0], D: 0 } },
    uni_mix:      { id: "uni_mix",    label: "uni 组合",    kind: "uni", color: "pink",   lifeTicks: 120, curve: { A: [2, 3, 0], B: [1, 2, 0], C: [0, 0, 0], type: [0, 2, 0], D: 0 } },
    uni_sinpar:   { id: "uni_sinpar", label: "uni 正弦二次", kind: "uni", color: "gold",   lifeTicks: 120, curve: { A: [3, 0.5, 0], B: [1, 1, 0], C: [0, 0, 0], type: [2, 1, 0], D: 0 } },
    // ---- uni 3D：螺旋 / 利萨如（角度制，B 控制每秒弧度点数）----
    uni_spiral:   { id: "uni_spiral", label: "uni 螺旋上升", kind: "uni", color: "cyan", lifeTicks: 200, curve3d: {
        x: { A: [1, 0, 0], B: [18, 0, 0], C: [0, 0, 0], type: [2, 0, 0], D: 0 },
        y: { A: [1, 0, 0], B: [1, 0, 0], C: [0, 0, 0], type: [0, 0, 0], D: 0 },
        z: { A: [1, 0, 0], B: [18, 0, 0], C: [0, 0, 0], type: [3, 0, 0], D: 0 },
    } },
    uni_lissajous:{ id: "uni_lissajous", label: "uni 利萨如", kind: "uni", color: "pink", lifeTicks: 200, curve3d: {
        x: { A: [1, 0, 0], B: [3, 0, 0], C: [0, 0, 0], type: [2, 0, 0], D: 0 },
        y: { A: [1, 0, 0], B: [2, 0, 0], C: [0, 0, 0], type: [2, 0, 0], D: 0 },
        z: { A: [1, 0, 0], B: [5, 0, 0], C: [0, 0, 0], type: [2, 0, 0], D: 0 },
    } },
};

export const MFX_PRESET_IDS = Object.keys(MFX_PRESETS);

// ============================================================
// 单 uni 粒子的 DSL（两种形式并存）：
//   在命令行里【必须用双引号"..."整体包裹】，
//   否则裸 token 里的 = , ; ( ) : $ 会被指令 tokenizer 当作保留符报错。
//   ① 词条式：<轴>:<函数>(<A=,B=,C=>) 函数 lin/sqr/sin/cos/exp/expd/abs/ln
//   ② 数字式：<轴>:<type>(<A,B,C>)    type 0..7（0线性1平方2sin3cos4exp5exp⁻6abs7ln）
//   系数均可部分缺省补 0；同轴用 + 叠加（最多 3 项）；; 分轴。
//   D 全局偏移两种写法：;D=0.5 / ;D0.5 / 尾部 $0.5
// ============================================================
const UNI_DRE = /^D(?:\s*=\s*)?(-?[0-9.]+)$/i;
const UNI_DLR = /\$(-?[0-9.]+)\s*$/;

export const UNI_FUNCS: Record<string, number> = {
    lin: 0, sqr: 1, sin: 2, cos: 3,
    exp: 4, expd: 5, abs: 6, ln: 7,
};

export function uniHelpText(): string {
    return "用双引号包裹 DSL: /colorparticle:uni \"x:sin(A=3,B=4);z:cos(A=3,B=4)\" | 函数 lin/sqr/sin/cos/exp/expd/abs/ln | 系数 A=/B=/C=，整体偏移 D=";
}

interface NamedCurveOut { x?: CurveSpec; y?: CurveSpec; z?: CurveSpec }

// 解析一个 term：词条式 → type via UNI_FUNCS；数字式 → type = 首数字。
function parseUniTerm(part: string): number[] | string {
    const tm = /^([a-zA-Z][a-zA-Z0-9]*)\s*\(\s*(.*?)\s*\)$/.exec(part);
    if (tm) {
        const fname = tm[1].toLowerCase();
        const type = UNI_FUNCS[fname];
        if (type === undefined) return `未知函数 "${fname}"，可用 ${Object.keys(UNI_FUNCS).join("/")}`;
        const coeff = [0, 0, 0]; // A B C
        const inner = tm[2].trim();
        if (inner) {
            for (const kv of inner.split(",")) {
                const kvm = /^([ABC])\s*=\s*(-?[0-9.]+)$/i.exec(kv.trim()) || /^([ABC])(-?[0-9.]+)$/i.exec(kv.trim());
                if (!kvm) return `系数 "${kv}" 不合法，应为 A=<数值>/B=<数值>/C=<数值>`;
                coeff["ABC".indexOf(kvm[1].toUpperCase())] = Number(kvm[2]);
            }
        }
        return [type, coeff[0], coeff[1], coeff[2]];
    }

    const nm = /^(\d+)\s*\(\s*(.*?)\s*\)$/.exec(part);
    if (nm) {
        const type = Number(nm[1]);
        if (!Number.isInteger(type) || type < 0 || type > 7) return `数字式 type=${nm[1]} 越界，应为 0..7`;
        const coeff = [0, 0, 0]; // A B C，部分缺省补 0
        const inner = nm[2].trim();
        if (inner) {
            const items = inner.split(",");
            if (items.length > 3) return `数字式括号内最多 3 个系数，当前 ${items.length} 个`;
            items.forEach((v, i) => {
                const num = Number(v.trim());
                if (!isNaN(num)) coeff[i] = num;
            });
        }
        return [type, coeff[0], coeff[1], coeff[2]];
    }

    return `无法解析函数项 "${part}"，应为 函数(A=,B=,C=) 或 type(A,B,C)`;
}

export function parseCurve(dsl: string): { ok: true; curve: NamedCurveOut } | { ok: false; message: string } {
    const clean = dsl.trim();
    if (!clean) return { ok: false, message: "DSL 为空" };
    const out: NamedCurveOut = {};

    // 先剥离尾部 $<偏移>（D 的第二种写法）
    let globalD: number | undefined;
    let unlimited = clean;
    const dlm = UNI_DLR.exec(clean);
    if (dlm) {
        globalD = Number(dlm[1]);
        unlimited = clean.slice(0, dlm.index).trim();
    }

    const AXIS = /^([xyz]):(.*)$/i;
    const DRE = UNI_DRE;
    const tokens = unlimited.split(";");

    // 预排：D= 全局偏移，写入三轴 D
    for (const raw of tokens) {
        const t = raw.trim();
        const dm = DRE.exec(t);
        if (dm) globalD = Number(dm[1]);
    }

    let matchedAxis = false;
    for (const raw of tokens) {
        const t = raw.trim();
        if (!t) continue;
        if (DRE.test(t)) continue;
        const axm = AXIS.exec(t);
        if (!axm) return { ok: false, message: `无法解析片段 "${t}"，应为 <轴>:<函数>(...) 或 D<偏移>` };
        matchedAxis = true;
        const axis = axm[1].toLowerCase() as "x" | "y" | "z";
        const body = axm[2].trim();

        const terms: number[][] = []; // 每项 [type,A,B,C]
        for (const part of body.split("+")) {
            const p = part.trim();
            if (!p) continue;
            const parsed = parseUniTerm(p);
            if (typeof parsed === "string") return { ok: false, message: parsed };
            terms.push(parsed);
        }
        if (terms.length === 0) return { ok: false, message: `${axis} 轴未定义任何函数项` };
        if (terms.length > 3) return { ok: false, message: `${axis} 轴最多 3 项，当前 ${terms.length} 项` };

        const spec: CurveSpec = { A: [0, 0, 0], B: [0, 0, 0], C: [0, 0, 0], type: [0, 0, 0], D: globalD ?? 0 };
        terms.forEach((tt, i) => {
            spec.type[i] = tt[0];
            spec.A[i] = tt[1];
            spec.B[i] = tt[2];
            spec.C[i] = tt[3];
        });
        out[axis] = spec;
    }
    if (!matchedAxis) return { ok: false, message: "没有解析到任何轴（x/y/z）定义" };
    return { ok: true, curve: out };
}

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

const BASE_UV_DEFAULT: [number, number] = [49, 88];

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
    const c1 = resolveSolidColor(opts.color ?? recipe.color);
    const c2 = resolveSolidColor(opts.color2 ?? recipe.color2 ?? recipe.color);

    // 呼吸立方：脚本在立方体棱线每个点上放一个独立发射器（mfx_edgebreathe），
    // 每个发射器用 emitter_age 驱动它那颗粒子沿「棱点↔中心」径向往返 → 整体缩放。
    if (recipe.id === "cubebreathe") {
        const pts = getShapePoints("cube", radius);
        if (!pts || pts.length === 0) {
            return { ok: false, message: "[mfx] 立方形状生成失败" };
        }
        const lifeTicks = opts.lifeTicks ?? recipe.lifeTicks ?? 400;
        const cf = c1; // tint 用 cr/cg/cb
        let spawned = 0;
        let firstErr = "";
        for (const p of pts) {
            const ox = Math.hypot(p[0], p[1], p[2]) || 1;
            const m = new MolangVariableMap();
            m.setFloat("variable.dirx", p[0] / ox);
            m.setFloat("variable.diry", p[1] / ox);
            m.setFloat("variable.dirz", p[2] / ox);
            m.setFloat("variable.ox", ox);
            m.setFloat("variable.life", lifeTicks / 20);
            m.setFloat("variable.colormode", recipe.colorMode ?? 1);
            m.setFloat("variable.cr", cf.r);
            m.setFloat("variable.cg", cf.g);
            m.setFloat("variable.cb", cf.b);
            m.setFloat("variable.c2r", c2.r);
            m.setFloat("variable.c2g", c2.g);
            m.setFloat("variable.c2b", c2.b);
            try {
                dimension.spawnParticle("colorparticle:mfx_edgebreathe", { x: center.x + p[0], y: center.y + p[1], z: center.z + p[2] }, m);
                spawned++;
            } catch (e) {
                if (!firstErr) firstErr = String(e);
            }
        }
        return firstErr
            ? { ok: false, message: `[mfx] 发射失败：${firstErr}` }
            : { ok: true, message: `[mfx] 呼吸立方边框（${spawned} 棱点发射器，${lifeTicks} 刻）` };
    }

    const kind: MfxKind = recipe.kind ?? "universal";
    const particleId = KIND_PARTICLE[kind];

    const life = (opts.lifeTicks ?? recipe.lifeTicks ?? 120) / 20; // tick → 秒
    const size0 = recipe.size ?? 0.12;
    const turns = opts.turns ?? recipe.turns ?? 1;
    const rise = opts.rise ?? recipe.rise ?? 0;

    const map = new MolangVariableMap();
    // 通用契约：色彩 / 大小 / 淡出 / 寿命 / 相位
    map.setFloat("variable.colormode", recipe.colorMode ?? 0);
    map.setFloat("variable.cr", c1.r);
    map.setFloat("variable.cg", c1.g);
    map.setFloat("variable.cb", c1.b);
    map.setFloat("variable.c2r", c2.r);
    map.setFloat("variable.c2g", c2.g);
    map.setFloat("variable.c2b", c2.b);
    map.setFloat("variable.sizemode", recipe.sizeMode ?? 0);
    map.setFloat("variable.size0", size0);
    map.setFloat("variable.fademode", recipe.fade ?? 0);
    map.setFloat("variable.life", life);
    map.setFloat("variable.phase", 0);

    // universal / dynamic / stream 物理与运动参数
    map.setFloat("variable.motion", recipe.motion ?? 0);
    map.setFloat("variable.turns", turns);
    map.setFloat("variable.rise", rise);
    map.setFloat("variable.spin", recipe.spin ?? 0);
    map.setFloat("variable.radius", radius);
    map.setFloat("variable.speed", recipe.speed ?? 1);
    map.setFloat("variable.gravity", recipe.gravity ?? -9.8);
    map.setFloat("variable.drag", recipe.drag ?? 0);
    map.setFloat("variable.collide", recipe.collide ?? 0);
    map.setFloat("variable.flow", recipe.flow ?? 30);
    map.setFloat("variable.flowmax", recipe.flowmax ?? 80);
    map.setFloat("variable.flowtime", recipe.flowtime ?? 20);
    map.setFloat("variable.hx", radius);
    map.setFloat("variable.hy", radius);
    map.setFloat("variable.hz", radius);
    map.setFloat("variable.maxframe", recipe.maxframe ?? 1);
    const uv = recipe.uv ?? BASE_UV_DEFAULT;
    map.setFloat("variable.uvx", uv[0]);
    map.setFloat("variable.uvy", uv[1]);

    let spawned = 0;
    let firstErr = "";

    const spawnParticle = (loc: Vector3) => {
        try {
            dimension.spawnParticle(particleId, loc, map);
            spawned++;
        } catch (e) {
            if (!firstErr) firstErr = String(e);
        }
    };

    if (kind === "universal") {
        const points = getShapePoints(recipe.shape ?? "sphere", radius);
        if (!points || points.length === 0) {
            return { ok: false, message: `配方 "${recipeId}" 形状生成失败` };
        }
        let pts = points;
        if (opts.count && opts.count < pts.length) {
            const step = pts.length / Math.max(1, Math.floor(opts.count));
            const sampled: number[][] = [];
            for (let k = 0; k < pts.length; k += step) sampled.push(pts[Math.min(pts.length - 1, Math.round(k))]);
            pts = sampled;
        }
        const n = pts.length;
        for (let i = 0; i < n; i++) {
            map.setFloat("variable.phase", i / Math.max(1, n - 1));
            map.setFloat("variable.px", pts[i][0]);
            map.setFloat("variable.py", pts[i][1]);
            map.setFloat("variable.pz", pts[i][2]);
            spawnParticle(center);
        }
    } else if (kind === "dynamic") {
        const n = Math.max(1, Math.floor(opts.count ?? recipe.count ?? 60));
        for (let i = 0; i < n; i++) {
            map.setFloat("variable.phase", i / Math.max(1, n - 1));
            spawnParticle(center);
        }
    } else {
        // stream / shape_* / cubebreath / sine / uni：一次 spawn，由发射器自行驱动
        if (kind === "uni") {
            const setAxis = (pre: string, spec?: CurveSpec) => {
                for (let i = 0; i < 3; i++) {
                    map.setFloat(`variable.${pre}a${i}`, spec?.A[i] ?? 0);
                    map.setFloat(`variable.${pre}b${i}`, spec?.B[i] ?? 0);
                    map.setFloat(`variable.${pre}c${i}`, spec?.C[i] ?? 0);
                    map.setFloat(`variable.${pre}t${i}`, spec?.type[i] ?? 0);
                }
                map.setFloat(`variable.${pre}d`, spec?.D ?? 0);
            };
            if (recipe.curve3d) {
                setAxis("x", recipe.curve3d.x);
                setAxis("y", recipe.curve3d.y);
                setAxis("z", recipe.curve3d.z);
            } else {
                setAxis("x", recipe.curve);
                setAxis("y", undefined);
                setAxis("z", undefined);
            }
        }
        spawnParticle(center);
    }

    if (firstErr) return { ok: false, message: `[mfx] spawn 失败：${firstErr}` };
    return { ok: true, message: `[mfx] ${recipe.label}（kind=${kind}，${spawned} 粒子）` };
}

// ============================================================
// 自定义单 uni 粒子：完全由 DSL 驱动三轴运动 + 视觉/发射/淡出参数。
// ============================================================

function applyCurveAxis(map: MolangVariableMap, pre: string, spec?: CurveSpec) {
    for (let i = 0; i < 3; i++) {
        map.setFloat(`variable.${pre}a${i}`, spec?.A[i] ?? 0);
        map.setFloat(`variable.${pre}b${i}`, spec?.B[i] ?? 0);
        map.setFloat(`variable.${pre}c${i}`, spec?.C[i] ?? 0);
        map.setFloat(`variable.${pre}t${i}`, spec?.type[i] ?? 0);
    }
    map.setFloat(`variable.${pre}d`, spec?.D ?? 0);
}

export interface UniCustomOptions {
    lifeTicks?: number;   // 默认 120
    color?: string;       // 命名色 / R,G,B
    color2?: string;      // 渐变尾色（仅 colormode=1 用）
    colormode?: number;   // 0 solid 1 gradient 2 cycle 3 rainbow 4 heat
    size?: number;        // 默认 0.16
    sizemode?: number;    // 0 const 1 bloom 2 fade（默认 2，保留经典缩小）
    fademode?: number;    // 0 out 1 inout 2 none（默认 2，不透明）
}

export function spawnUniCustom(
    dimension: Dimension,
    center: Vector3,
    dsl: string,
    opts: UniCustomOptions = {},
): MfxResult {
    const parsed = parseCurve(dsl);
    if (!parsed.ok) return parsed;

    const c1 = resolveSolidColor(opts.color ?? "blue");
    const c2 = resolveSolidColor(opts.color2 ?? opts.color ?? "blue");
    const size0 = opts.size ?? 0.16;
    const sizemode = opts.sizemode ?? 2;
    const fademode = opts.fademode ?? 2;
    // 显式给了 color2 → 渐变(1)；否则保持纯色(0)，color 即生效
    const colormode = opts.color2 ? (opts.colormode ?? 1) : (opts.colormode ?? 0);
    const life = (opts.lifeTicks ?? 120) / 20;

    const map = new MolangVariableMap();
    applyCurveAxis(map, "x", parsed.curve.x);
    applyCurveAxis(map, "y", parsed.curve.y);
    applyCurveAxis(map, "z", parsed.curve.z);
    map.setFloat("variable.colormode", colormode);
    map.setFloat("variable.cr", c1.r);
    map.setFloat("variable.cg", c1.g);
    map.setFloat("variable.cb", c1.b);
    map.setFloat("variable.c2r", c2.r);
    map.setFloat("variable.c2g", c2.g);
    map.setFloat("variable.c2b", c2.b);
    map.setFloat("variable.sizemode", sizemode);
    map.setFloat("variable.size0", size0);
    map.setFloat("variable.fademode", fademode);
    map.setFloat("variable.life", life);
    map.setFloat("variable.phase", 0);

    try {
        dimension.spawnParticle("colorparticle:mfx_uni", center, map);
        return { ok: true, message: `[uni] 出生单粒子（life=${life}s size=${size0} sm=${sizemode} fm=${fademode} cm=${colormode}）` };
    } catch (e) {
        return { ok: false, message: `[uni] spawn 失败：${e}` };
    }
}

// ============================================================
// /colorparticle:sculpt：形状枚举铺锚点 + uni 粒子运动 DSL。
//   脚本用 getShapePoints(shape, radius) 算形状点，在每个锚点 spawn
//   一个 mfx_uni（粒子默认出生即固定在该锚点），并传同一 animDsl →
//   每颗粒子相对自己锚点按同一条动画曲线位移 → 整形状整体动、不散架。
// ============================================================

export interface ShapeSculptOptions {
    radius?: number;     // 默认 1.5
    count?: number;      // 降采样点数，默认取形状全部点
    color?: string;
    color2?: string;
    colormode?: number;  // 默认 3 彩虹
    size?: number;       // 默认 0.08
    sizemode?: number;   // 默认 2 fade
    fademode?: number;   // 默认 1 inout
    lifeTicks?: number;  // 默认 120
    mode?: "move" | "scale"; // move=平移/旋转叠加; scale=径向整体缩放
}

export function spawnShapeSculpt(
    dimension: Dimension,
    center: Vector3,
    shape: string,
    animDsl: string,
    opts: ShapeSculptOptions = {},
): MfxResult {
    const anim = parseCurve(animDsl);
    if (!anim.ok) return anim;

    const radius = opts.radius ?? 1.5;
    const points = getShapePoints(shape, radius);
    if (!points || points.length === 0) {
        return { ok: false, message: `形状 "${shape}" 生成失败：无点集` };
    }

    let pts = points;
    const cnt = opts.count;
    if (cnt && cnt < pts.length) {
        const step = pts.length / Math.max(1, Math.floor(cnt));
        const sampled: number[][] = [];
        for (let k = 0; k < pts.length; k += step) sampled.push(pts[Math.min(pts.length - 1, Math.round(k))]);
        pts = sampled;
    }

    const n = pts.length;
    const c1 = resolveSolidColor(opts.color ?? "cyan");
    const c2 = resolveSolidColor(opts.color2 ?? opts.color ?? "purple");
    // 显式给了 color2 → 渐变(1)；只给 color → 纯色(0)；都不给 → 彩虹(3)
    const colormode = opts.color2 ? (opts.colormode ?? 1) : opts.color ? (opts.colormode ?? 0) : (opts.colormode ?? 3);
    const sizemode = opts.sizemode ?? 2;
    const fademode = opts.fademode ?? 1;
    const size0 = opts.size ?? 0.08;
    const life = (opts.lifeTicks ?? 120) / 20;
    const scaleMode = opts.mode === "scale" ? 1 : 0;
    const spawnAtCenter = scaleMode === 1; // scale 在形状中心出生，sx/sy/sz=锚点向量

    let spawned = 0;
    let firstErr = "";
    for (let k = 0; k < n; k++) {
        const map = new MolangVariableMap();
        applyCurveAxis(map, "x", anim.curve.x);
        applyCurveAxis(map, "y", anim.curve.y);
        applyCurveAxis(map, "z", anim.curve.z);
        map.setFloat("variable.colormode", colormode);
        map.setFloat("variable.cr", c1.r);
        map.setFloat("variable.cg", c1.g);
        map.setFloat("variable.cb", c1.b);
        map.setFloat("variable.c2r", c2.r);
        map.setFloat("variable.c2g", c2.g);
        map.setFloat("variable.c2b", c2.b);
        map.setFloat("variable.sizemode", sizemode);
        map.setFloat("variable.size0", size0);
        map.setFloat("variable.fademode", fademode);
        map.setFloat("variable.life", life);
        map.setFloat("variable.phase", n > 1 ? k / (n - 1) : 0);
        map.setFloat("variable.sms", scaleMode);
        if (spawnAtCenter) {
            map.setFloat("variable.sx", pts[k][0]);
            map.setFloat("variable.sy", pts[k][1]);
            map.setFloat("variable.sz", pts[k][2]);
        }
        const loc = spawnAtCenter
            ? { x: center.x, y: center.y, z: center.z }
            : { x: center.x + pts[k][0], y: center.y + pts[k][1], z: center.z + pts[k][2] };
        try {
            dimension.spawnParticle("colorparticle:mfx_uni", loc, map);
            spawned++;
        } catch (e) {
            if (!firstErr) firstErr = String(e);
        }
    }
    if (firstErr) return { ok: false, message: `[sculpt] 部分失败：${firstErr}` };
    return { ok: true, message: `[sculpt] ${shape}×${n}锚点[${scaleMode ? "scale" : "move"}] + anim(${animDsl})` };
}

export function sculptHelpText(): string {
    return "sculpt: /colorparticle:sculpt <shape> \"<动画DSL>\" [mode move|scale] [radius] [count] [color] [size] [life] | shape=形状枚举(sphere/cube/ring/helix/heart/torus/rose/...) | mode move=叠加平移/旋转, scale=整体径向缩放(px/py/pz=锚点向量) | 动画DSL用双引号包裹复用uni曲线";
}