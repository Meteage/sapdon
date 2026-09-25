import { GRegistry } from '../registry.js'

/** 方块的六个面名（与 `minecraft:geometry` 的 `uv` 键一致）。 */
export type ModelFace = 'north' | 'south' | 'east' | 'west' | 'up' | 'down'

/** 六个面的固定顺序（生成 `uv` 键时按它写 = Blockbench 的导出顺序，便于与手写模型逐字节对比）。 */
export const MODEL_FACES: readonly ModelFace[] = ['north', 'east', 'south', 'west', 'up', 'down']

/** 贴图像素矩形：`[u, v, 宽, 高]`（原点 = 贴图左上角，v 向下为正）。 */
export type UvRect = readonly [number, number, number, number]

/** 一个 cube 的声明参数（单位与 Bedrock 一致：`x/z ∈ -8..8`、`y ∈ 0..16`）。 */
export interface ModelCubeSpec {
    readonly origin: readonly [number, number, number]
    readonly size: readonly [number, number, number]
    /** 逐面 UV；`'auto'`（缺省）= 交给 {@link BlockModel.autoUv} 按盒式展开算。 */
    readonly uv?: Partial<Record<ModelFace, UvRect>> | 'auto'
    /** 膨胀量（像素，可负）：Bedrock 的 `inflate`。 */
    readonly inflate?: number
    /** 绕轴旋转（度）与旋转中心（像素）。 */
    readonly rotation?: readonly [number, number, number]
    readonly pivot?: readonly [number, number, number]
}

/** {@link BlockModel} 的构造参数。 */
export interface BlockModelOptions {
    /** 模型标识符，形如 `geometry.my_post`（与 `BlockComponent.setGeometry()` 收到的字符串一致）。 */
    readonly identifier: string
    /** 贴图尺寸 `[宽, 高]`，默认 `[16, 16]`。 */
    readonly texture?: readonly [number, number]
    /** 可见包围盒（缺省 `width 2 / height 2.5 / offset [0,0.75,0]`，与原版方块模型同值）。 */
    readonly visibleBounds?: {
        readonly width?: number
        readonly height?: number
        readonly offset?: readonly [number, number, number]
    }
}

interface CubeJson {
    origin: [number, number, number]
    size: [number, number, number]
    uv: Record<string, { uv: number[]; uv_size: number[] }>
    inflate?: number
    rotation?: number[]
    pivot?: number[]
}

interface BoneJson {
    name: string
    parent?: string
    pivot: number[]
    cubes: CubeJson[]
}

/**
 * 构建期的方块模型构建器：链式声明骨与 cube，`toJson()` 出 `minecraft:geometry` 对象，
 * `register()` 写进资源包 `models/blocks/`。
 *
 * 常见错误：`identifier` 为空、尺寸非正、`register()` 之前没调 `autoUv()` 而 cube 又没给 UV、
 * 自动 UV 超出贴图范围 —— 都在构建期抛错，不留给游戏内"看不见/贴图糊了"。
 */
export class BlockModel {
    private readonly identifier: string
    private readonly textureSize: readonly [number, number]
    private readonly visibleBounds: { width: number; height: number; offset: number[] }
    private readonly bones: BoneJson[] = []
    private current: BoneJson | undefined

    constructor(options: BlockModelOptions) {
        if (!options.identifier) throw new Error('[sapdon:model] identifier 不能为空')
        this.identifier = options.identifier
        this.textureSize = options.texture ?? [16, 16]
        if (this.textureSize[0] <= 0 || this.textureSize[1] <= 0) {
            throw new Error(`[sapdon:model] texture 尺寸必须为正：[${this.textureSize.join(',')}]`)
        }
        this.visibleBounds = {
            width: options.visibleBounds?.width ?? 2,
            height: options.visibleBounds?.height ?? 2.5,
            offset: [...(options.visibleBounds?.offset ?? [0, 0.75, 0])],
        }
    }

    /** 新开一根骨（后续 `cube()` 都加到它下面）；同名骨重复声明抛错。 */
    bone(name: string, options: { readonly parent?: string; readonly pivot?: readonly [number, number, number] } = {}): this {
        if (!name) throw new Error('[sapdon:model] 骨名不能为空')
        if (this.bones.some((b) => b.name === name)) throw new Error(`[sapdon:model] 骨名重复：${name}`)
        if (options.parent !== undefined && !this.bones.some((b) => b.name === options.parent)) {
            throw new Error(`[sapdon:model] 骨 ${name} 的父骨 ${options.parent} 不存在（父骨要先声明）`)
        }
        const pivot = [...(options.pivot ?? [0, 0, 0])]
        const bone: BoneJson = options.parent === undefined ? { name, pivot, cubes: [] } : { name, parent: options.parent, pivot, cubes: [] }
        this.bones.push(bone)
        this.current = bone
        return this
    }

    /**
     * 加一个 cube（也可一次传一组，例如 `cube(cross())`）；未开骨时自动建一根与模型同名的骨。
     *
     * `size` 允许某一维为 **0**（平板/交叉平面），但不允许为负、也不允许三轴全 0。
     */
    cube(spec: ModelCubeSpec | readonly ModelCubeSpec[]): this {
        if (Array.isArray(spec)) {
            for (const one of spec) this.cube(one)
            return this
        }
        const one = spec as ModelCubeSpec
        const { origin, size } = one
        for (const v of [...origin, ...size]) {
            if (!Number.isFinite(v)) throw new Error(`[sapdon:model] cube 的 origin/size 必须是有限数：${JSON.stringify(one)}`)
        }
        if (size[0] < 0 || size[1] < 0 || size[2] < 0 || (size[0] === 0 && size[1] === 0 && size[2] === 0)) {
            throw new Error(`[sapdon:model] cube 的 size 不能为负、也不能三轴全 0：[${size.join(',')}]`)
        }
        if (this.current === undefined) this.bone(this.defaultBoneName())
        const cube: CubeJson = {
            origin: [origin[0], origin[1], origin[2]],
            size: [size[0], size[1], size[2]],
            uv: one.uv === undefined || one.uv === 'auto' ? {} : this.uvFromRect(one.uv),
        }
        if (one.inflate !== undefined) cube.inflate = one.inflate
        if (one.rotation !== undefined) cube.rotation = [...one.rotation]
        if (one.pivot !== undefined) cube.pivot = [...one.pivot]
        ;(this.current as BoneJson).cubes.push(cube)
        return this
    }

    /**
     * 给**所有还没指定 UV** 的 cube 按**盒式展开**自动铺 UV（Blockbench 的 box UV 规则）。
     *
     * @returns `this`
     * @throws 展开超出一张贴图范围时抛错 —— 方块模型只有一张贴图，装不下就是布局错了
     *   （零厚度平板尤其容易撞上：两面各要一整张 16×16，请给 `cross()` 之类显式 UV）。
     */
    autoUv(): this {
        const [tw, th] = this.textureSize
        let cursor = 0
        for (const bone of this.bones) {
            for (const cube of bone.cubes) {
                if (Object.keys(cube.uv).length > 0) continue
                const boxWidth = 2 * cube.size[2] + 2 * cube.size[0]
                const boxHeight = cube.size[2] + cube.size[1]
                if (boxWidth > tw || boxHeight > th) {
                    throw new Error(
                        `[sapdon:model] ${this.identifier} 的 cube ${JSON.stringify(cube.size)} 盒式展开需要 ` +
                        `${boxWidth}×${boxHeight}，贴图只有 ${tw}×${th} —— 给这个 cube 显式指定 uv，或换更大的贴图`,
                    )
                }
                // 一行内平铺多个 cube（与 Blockbench 相同：按 v 分层、层内从左往右）
                if (cursor + boxWidth > tw) cursor = 0
                cube.uv = this.boxUv(cube.size, [cursor, 0])
                cursor += boxWidth
            }
        }
        return this
    }

    /**
     * 生成 `minecraft:geometry` 的对象（可直接交给 `GRegistry.register`）。
     *
     * @throws 有 cube 既没给 UV 又没调过 {@link BlockModel.autoUv} —— 缺 UV 的面在游戏里是隐形/糊图，
     *   不静默放行。
     */
    toJson(): Record<string, unknown> {
        for (const bone of this.bones) {
            for (const cube of bone.cubes) {
                if (Object.keys(cube.uv).length === 0) {
                    throw new Error(
                        `[sapdon:model] ${this.identifier} 的骨 ${bone.name} 里有 cube 没有 UV：先调 autoUv()，` +
                        '或给这个 cube 显式传 uv',
                    )
                }
            }
        }
        const geometry = {
            description: {
                identifier: this.identifier,
                texture_width: this.textureSize[0],
                texture_height: this.textureSize[1],
                visible_bounds_width: this.visibleBounds.width,
                visible_bounds_height: this.visibleBounds.height,
                visible_bounds_offset: this.visibleBounds.offset,
            },
            bones: this.bones,
        }
        return { format_version: '1.21.20', 'minecraft:geometry': [geometry] }
    }

    /**
     * 写进资源包：`dev/<proj>_RP/models/blocks/<name>.json`。
     *
     * @param name 注册名（同时是文件名，会做文件名安全化）；方块侧的 `minecraft:geometry`
     *   用的是**模型标识符**（`options.identifier`），两者不必相同。
     */
    register(name: string): this {
        if (!name) throw new Error('[sapdon:model] register 的 name 不能为空')
        GRegistry.register(name, 'resource', 'models/blocks', this.toJson())
        return this
    }

    /** 骨名列表（声明顺序）。 */
    boneNames(): string[] {
        return this.bones.map((b) => b.name)
    }

    /** 读某根骨的 cube 副本（不改内部状态，用于核对/派生新模型）；骨名不存在抛错。 */
    cubesOf(bone: string): ModelCubeSpec[] {
        return (this.boneOf(bone).cubes as CubeJson[]).map((c) => ({
            origin: [c.origin[0], c.origin[1], c.origin[2]] as const,
            size: [c.size[0], c.size[1], c.size[2]] as const,
            uv: 'auto',
            ...(c.inflate === undefined ? {} : { inflate: c.inflate }),
            ...(c.rotation === undefined ? {} : { rotation: c.rotation as [number, number, number] }),
            ...(c.pivot === undefined ? {} : { pivot: c.pivot as [number, number, number] }),
        }))
    }

    /**
     * 改某根骨里第 `index` 个 cube 的字段（按传入的键覆盖，其余保持）。
     *
     * @throws 骨名/序号不存在，或改完 `size` 非法 —— 校验与 `cube()` 同一套。
     */
    editCube(bone: string, index: number, patch: Partial<ModelCubeSpec>): this {
        const target = this.cubeOf(bone, index)
        if (patch.origin !== undefined) target.origin = [patch.origin[0], patch.origin[1], patch.origin[2]]
        if (patch.size !== undefined) {
            const [w, h, d] = patch.size
            if (w < 0 || h < 0 || d < 0 || (w === 0 && h === 0 && d === 0)) {
                throw new Error(`[sapdon:model] editCube 的 size 不能为负、也不能三轴全 0：[${patch.size.join(',')}]`)
            }
            target.size = [w, h, d]
        }
        if (patch.uv !== undefined) target.uv = patch.uv === 'auto' ? {} : this.uvFromRect(patch.uv)
        if (patch.inflate !== undefined) target.inflate = patch.inflate
        if (patch.rotation !== undefined) target.rotation = [...patch.rotation]
        if (patch.pivot !== undefined) target.pivot = [...patch.pivot]
        return this
    }

    /** 删某根骨里第 `index` 个 cube；骨名/序号不存在抛错。 */
    removeCube(bone: string, index: number): this {
        this.boneOf(bone).cubes.splice(this.cubeIndexOf(bone, index), 1)
        return this
    }

    /**
     * 改某个 cube 某一面的贴图区域；传 `'auto'` = 清掉该面让 {@link BlockModel.autoUv} 重新铺。
     *
     * 注意：Bedrock 的"换贴图"其实分两处 —— 贴图**区域**在本节（模型里），
     * 贴图**文件**在方块的 `minecraft:material_instances`（`BlockComponent.setMaterial`），别混。
     */
    setUv(bone: string, index: number, face: ModelFace, rect: UvRect | 'auto'): this {
        const target = this.cubeOf(bone, index)
        if (rect === 'auto') {
            delete target.uv[face]
            return this
        }
        const [u, v, w, h] = rect
        target.uv[face] = face === 'up' || face === 'down'
            ? { uv: [u + w, v + h], uv_size: [-w, -h] }
            : { uv: [u, v], uv_size: [w, h] }
        return this
    }

    private boneOf(name: string): BoneJson {
        const bone = this.bones.find((b) => b.name === name)
        if (bone === undefined) throw new Error(`[sapdon:model] 没有名为 ${name} 的骨（现有：${this.bones.map((b) => b.name).join(', ') || '无'}）`)
        return bone
    }

    private cubeIndexOf(bone: string, index: number): number {
        const count = this.boneOf(bone).cubes.length
        if (!Number.isInteger(index) || index < 0 || index >= count) {
            throw new Error(`[sapdon:model] 骨 ${bone} 没有序号 ${index} 的 cube（共 ${count} 个）`)
        }
        return index
    }

    private cubeOf(bone: string, index: number): CubeJson {
        return this.boneOf(bone).cubes[this.cubeIndexOf(bone, index)] as CubeJson
    }

    private defaultBoneName(): string {
        const nm = this.identifier.includes(':') ? this.identifier.split(':')[1] : this.identifier
        return nm || 'model'
    }

    /** 把 `[u,v,w,h]` 展开成六个面的 `uv` / `uv_size`（up/down 用负尺寸，见盒式展开约定）。 */
    private uvFromRect(rect: Partial<Record<ModelFace, UvRect>>): Record<string, { uv: number[]; uv_size: number[] }> {
        const out: Record<string, { uv: number[]; uv_size: number[] }> = {}
        for (const face of MODEL_FACES) {
            const r = rect[face]
            if (r === undefined) continue
            out[face] = face === 'up' || face === 'down'
                ? { uv: [r[0] + r[2], r[1] + r[3]], uv_size: [-r[2], -r[3]] }
                : { uv: [r[0], r[1]], uv_size: [r[2], r[3]] }
        }
        return out
    }

    /**
     * 盒式展开：给定 cube 尺寸与贴图上的起始点，算出六个面的 UV。
     *
     * 版式（与 Blockbench / 原版一致，单位像素）：
     * ```
     *        [d][up][w][dn]          ← 顶面/底面那一行（d = 深度、w = 宽度）
     *        [e][n ][w][s ]          ← 四个侧面那一行（h = 高）
     * ```
     */
    private boxUv(size: readonly [number, number, number], at: readonly [number, number]): Record<string, { uv: number[]; uv_size: number[] }> {
        const [w, h, d] = size
        const [u, v] = at
        const side = (du: number): { uv: number[]; uv_size: number[] } => ({ uv: [u + du, v + d], uv_size: [w, h] })
        const cap = (du: number): { uv: number[]; uv_size: number[] } => ({ uv: [u + du + w, v + d], uv_size: [-w, -d] })
        const boxes: Record<string, { uv: number[]; uv_size: number[] }> = {
            north: side(d),
            east: { uv: [u, v + d], uv_size: [d, h] },
            south: side(2 * d + w),
            west: { uv: [u + d + w, v + d], uv_size: [d, h] },
            up: cap(d),
            down: cap(d + w),
        }
        // 零厚度平板的退化面（面积为 0）没有可见面，写了反而让引擎拿到 0 尺寸 UV
        const degenerate: Record<ModelFace, boolean> = {
            north: w === 0 || h === 0,
            south: w === 0 || h === 0,
            east: d === 0 || h === 0,
            west: d === 0 || h === 0,
            up: w === 0 || d === 0,
            down: w === 0 || d === 0,
        }
        for (const face of MODEL_FACES) if (degenerate[face]) delete boxes[face]
        return boxes
    }
}
