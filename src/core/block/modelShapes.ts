import type { ModelCubeSpec, UvRect } from './blockModel.js'

/**
 * 常用方块形状的 cube 声明。坐标一律用**像素**：`x/z ∈ 0..16`（0 = 方块西/北边）、`y ∈ 0..16`（0 = 底面），
 * 与 Blockbench 的方块画布一致；转换到 Bedrock 的 `origin` 时 `x/z` 减 8、`y` 不变。
 */

const HALF = 8

/** 把一对像素坐标转成 Bedrock 的 `origin` / `size`（`x1<x2`、`y1<y2`、`z1<z2`）。 */
export function boxFromPixels(
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number,
): ModelCubeSpec {
    for (const v of [x1, y1, z1, x2, y2, z2]) {
        if (!Number.isFinite(v)) throw new Error(`[sapdon:model] boxFromPixels 收到非有限数：${JSON.stringify([x1, y1, z1, x2, y2, z2])}`)
    }
    if (x2 <= x1 || y2 <= y1 || z2 <= z1) {
        throw new Error(`[sapdon:model] boxFromPixels 要求 x1<x2、y1<y2、z1<z2：${JSON.stringify([x1, y1, z1, x2, y2, z2])}`)
    }
    return { origin: [x1 - HALF, y1, z1 - HALF], size: [x2 - x1, y2 - y1, z2 - z1] }
}

/** 竖直柱体（缺省 2×10×2，居中立在底面上）：`post()` = 标记柱那类形状。 */
export function post(options: { readonly width?: number; readonly height?: number; readonly depth?: number; readonly y?: number } = {}): ModelCubeSpec {
    const width = options.width ?? 2
    const height = options.height ?? 10
    const depth = options.depth ?? width
    const y = options.y ?? 0
    return {
        origin: [-width / 2, y, -depth / 2],
        size: [width, height, depth],
    }
}

/** 半砖：`half: 'bottom'`（缺省）占下半、`'top'` 占上半；`thickness` 可调（像素）。 */
export function slab(options: { readonly half?: 'bottom' | 'top'; readonly thickness?: number } = {}): ModelCubeSpec {
    const thickness = options.thickness ?? 8
    if (thickness <= 0 || thickness > 16) throw new Error(`[sapdon:model] slab 的 thickness 必须在 (0,16]：${thickness}`)
    const y = options.half === 'top' ? 16 - thickness : 0
    return { origin: [-HALF, y, -HALF], size: [16, thickness, 16] }
}

/** 薄板：`axis: 'x'`（缺省）= 板面法线朝 x（薄在 x 方向），`'z'` 则薄在 z 方向。 */
export function pane(options: { readonly axis?: 'x' | 'z'; readonly thickness?: number; readonly height?: number; readonly y?: number; readonly length?: number } = {}): ModelCubeSpec {
    const thickness = options.thickness ?? 2
    const height = options.height ?? 16
    const y = options.y ?? 0
    const length = options.length ?? 16
    if (thickness <= 0 || height <= 0 || length <= 0) {
        throw new Error(`[sapdon:model] pane 的 thickness/height/length 必须为正：${JSON.stringify([thickness, height, length])}`)
    }
    const off = length / 2
    return options.axis === 'z'
        ? { origin: [-off, y, -thickness / 2], size: [length, height, thickness] }
        : { origin: [-thickness / 2, y, -off], size: [thickness, height, length] }
}

/**
 * 交叉平面（作物/花草那类 X 形）：两根绕 y 各转 45° 的**零厚度**平板。
 *
 * 平板自带 `uv`（缺省 `[0,0,16,16]`，贴的都是朝向玩家的那两面）—— 零厚度面在盒式展开里
 * 两面各要一整张贴图，别指望 {@link BlockModel.autoUv} 给它铺。
 *
 * @returns 两个 cube（`model.cube(cross())` 直接加进去）。
 */
export function cross(options: { readonly size?: number; readonly height?: number; readonly thickness?: number; readonly rotation?: number; readonly uv?: UvRect } = {}): ModelCubeSpec[] {
    const size = options.size ?? 16
    const height = options.height ?? 16
    const thickness = options.thickness ?? 0
    const rotation = options.rotation ?? 45
    const uv = options.uv ?? [0, 0, 16, 16]
    const half = size / 2
    const faces = { west: uv, east: uv }
    return [
        { origin: [-half, 0, -thickness / 2], size: [size, height, thickness], rotation: [0, rotation, 0], pivot: [0, 0, 0], uv: faces },
        { origin: [-half, 0, -thickness / 2], size: [size, height, thickness], rotation: [0, -rotation, 0], pivot: [0, 0, 0], uv: faces },
    ]
}
