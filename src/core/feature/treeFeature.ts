import { AddonTreeFeature, AddonTreeFeatureDefinition, AddonTreeFeatureDescription } from "../addon/feature/treeFeature.js"
import { Serializer, serialize } from "../../utils/index.js"

/**
 * 方块引用（引擎 `trunk_block` / `leaf_block` 的形状）。
 *
 * `states` 是原版方块状态的键值对（如 `{ "old_log_type": "oak" }`）；
 * 自定义方块一般不需要它。
 */
export interface TreeBlockRef {
    name: string
    states?: Record<string, string | number | boolean>
}

/** 可以被树写掉的方块：可以是 identifier，也可以是标签查询（`{ tags: "query.any_tag('dirt')" }`） */
export type TreeFilter = string | { tags: string }

/** `trunk_height`（`trunk` / `fancy_trunk` / `acacia_trunk` 等共用） */
export interface TreeTrunkHeight {
    /** 最小高度（与 `range_max` 配对使用） */
    range_min?: number
    /** 最大高度（与 `range_min` 配对使用） */
    range_max?: number
    /** 最小高度（`acacia_trunk` 风格写法，与 `intervals` 配对） */
    base?: number
    /** 相对 `base` 的可用增量（`acacia_trunk` 风格写法） */
    intervals?: readonly number[]
    /** 树冠最低可以挂到的高度 */
    min_height_for_canopy?: number
}

/** `trunk` 组件：一根直立的单宽树干 */
export interface TreeTrunkSpec {
    trunk_block: TreeBlockRef
    trunk_height?: TreeTrunkHeight
    /** 能否被水淹没；`true` = 不限制深度 */
    can_be_submerged?: boolean | { max_depth: number }
    trunk_decoration?: Record<string, unknown>
    [field: string]: unknown
}

/** `fancy_trunk` / `mega_trunk` / `acacia_trunk` 等：字段与 `trunk` 不同，原样透传 */
export type TreeOtherTrunkSpec = Record<string, unknown>

/** `canopy` 组件：原版橡树那种「按层 + 按几率去角」的树冠 */
export interface TreeCanopySpec {
    leaf_block: TreeBlockRef
    /** 树冠相对「树干上方那一格」的偏移范围 */
    canopy_offset?: { min: number; max: number }
    /** 每一层生成树叶的几率（决定各层缺角） */
    variation_chance?: readonly (number | { numerator: number; denominator: number })[]
    min_width?: number
    canopy_slope?: { rise: number; run: number }
    canopy_decoration?: Record<string, unknown>
    [field: string]: unknown
}

/** `fancy_canopy` 组件：直接给「层数 + 半径」的圆整树冠 */
export interface TreeFancyCanopySpec {
    /** 树冠层数 */
    height: number
    /** 树冠半径（格） */
    radius: number
    leaf_block?: TreeBlockRef
    [field: string]: unknown
}

/** `random_spread_canopy` 组件：在「高度 × 半径」的柱体内随机撒叶 */
export interface TreeRandomSpreadCanopySpec {
    leaf_blocks: readonly (string | readonly [string, number])[]
    leaf_placement_attempts?: number
    canopy_height?: number
    canopy_radius?: number
    [field: string]: unknown
}

/** 其它树冠组件（`mega_canopy` / `roofed_canopy` / `pine_canopy` / …）原样透传 */
export type TreeOtherCanopySpec = Record<string, unknown>

/**
 * `minecraft:tree_feature` 的**组件表**（键名与引擎逐字相同）。
 *
 * 也可以直接写引擎支持、这里没列出的组件（见索引签名）——`_trunk` / `_canopy` / `_roots`
 * 结尾的键一律放行；写错的键名（如顶层写 `trunk_height`）会被 `createTreeFeature` 拒绝。
 */
export interface TreeFeatureSpec {
    /** 直立单宽树干：**恰好一个** `*_trunk` 组件必须出现 */
    trunk?: TreeTrunkSpec
    fancy_trunk?: TreeOtherTrunkSpec
    acacia_trunk?: TreeOtherTrunkSpec
    cherry_trunk?: TreeOtherTrunkSpec
    fallen_trunk?: TreeOtherTrunkSpec
    mangrove_trunk?: TreeOtherTrunkSpec
    mega_trunk?: TreeOtherTrunkSpec
    poplar_trunk?: TreeOtherTrunkSpec
    /** 每个地物**最多一个** `*_canopy` 组件 */
    canopy?: TreeCanopySpec
    fancy_canopy?: TreeFancyCanopySpec
    random_spread_canopy?: TreeRandomSpreadCanopySpec
    acacia_canopy?: TreeOtherCanopySpec
    cherry_canopy?: TreeOtherCanopySpec
    mangrove_canopy?: TreeOtherCanopySpec
    mega_canopy?: TreeOtherCanopySpec
    mega_pine_canopy?: TreeOtherCanopySpec
    pine_canopy?: TreeOtherCanopySpec
    poplar_canopy?: TreeOtherCanopySpec
    roofed_canopy?: TreeOtherCanopySpec
    spruce_canopy?: TreeOtherCanopySpec
    /** 树可以长在什么方块上（`dirt` 标签可一次覆盖草/泥土/灰化土…） */
    may_grow_on?: readonly TreeFilter[]
    /** 树可以穿过什么方块长出来 */
    may_grow_through?: readonly TreeFilter[]
    /** 树叶可以替换掉什么方块 */
    may_replace?: readonly string[]
    /** 树根下方强制替换成的方块 */
    base_block?: readonly string[]
    base_cluster?: Record<string, unknown>
    mangrove_roots?: Record<string, unknown>
    [component: string]: unknown
}

/** 已知组件名（引擎的组件表 + 官方 feature schema；`*_trunk` / `*_canopy` / `*_roots` 之外的键会被拒） */
const KNOWN_COMPONENTS = new Set([
    "trunk", "fancy_trunk", "acacia_trunk", "cherry_trunk", "fallen_trunk", "mangrove_trunk", "mega_trunk", "poplar_trunk",
    "canopy", "acacia_canopy", "cherry_canopy", "fancy_canopy", "mangrove_canopy", "mega_canopy", "mega_pine_canopy",
    "pine_canopy", "poplar_canopy", "random_spread_canopy", "roofed_canopy", "spruce_canopy",
    "may_grow_on", "may_grow_through", "may_replace", "base_block", "base_cluster", "mangrove_roots",
])

/** 抛错并终止（函数声明，`never` 返回值让调用点之后的代码被 TS 收窄） */
function fail(identifier: string, message: string): never {
    throw new Error(`[sapdon] tree_feature ${identifier}：${message}`)
}

const isPositiveInt = (v: unknown): boolean => typeof v === "number" && Number.isInteger(v) && v > 0

/** 方块引用必须是 `{ name: "ns:block" }`（引擎只认这个形状；元组/裸字符串都不行） */
function assertBlockRef(identifier: string, where: string, value: unknown): void {
    const ref = value as TreeBlockRef | undefined
    if (!ref || typeof ref !== "object" || typeof ref.name !== "string" || ref.name.length === 0) {
        fail(identifier, `${where} 必须是 { name: "namespace:block" } 形状，实测 ${JSON.stringify(value)}`)
    }
    if (!ref.name.includes(":")) {
        fail(identifier, `${where}.name 必须是 "namespace:block"（缺命名空间 ${JSON.stringify(ref.name)}）`)
    }
}

function assertFilterList(identifier: string, where: string, value: unknown): void {
    if (!Array.isArray(value) || value.length === 0) {
        fail(identifier, `${where} 必须是非空数组，实测 ${JSON.stringify(value)}`)
    }
    for (const entry of value) {
        const ok = typeof entry === "string" || (entry as { tags?: unknown })?.tags !== undefined
        if (!ok) fail(identifier, `${where} 的元素只能是方块 id 或 { tags: "query.any_tag(...)" }，实测 ${JSON.stringify(entry)}`)
    }
}

/** 校验 `createTreeFeature` 的入参；不合法**直接抛**（不静默产出会被引擎丢掉的地物） */
function assertTreeFeatureSpec(identifier: string, spec: TreeFeatureSpec): void {
    if (!/^[a-zA-Z0-9_]+:[a-zA-Z0-9_]+$/.test(identifier)) {
        fail(identifier, `identifier 必须是 "namespace:name"（只允许字母/数字/下划线，name 会当成产物文件名）`)
    }
    if (!spec || typeof spec !== "object") {
        fail(identifier, `spec 必须是对象，实测 ${JSON.stringify(spec)}`)
    }

    const keys = Object.keys(spec)
    for (const key of keys) {
        if (KNOWN_COMPONENTS.has(key) || /(^|_)(trunk|canopy|roots)$/.test(key)) continue
        fail(
            identifier,
            `不认识的组件 ${JSON.stringify(key)} —— 引擎只认树干/树冠/根与 may_grow_on / may_grow_through / ` +
            `may_replace / base_block / base_cluster（写错层级的典型：把 trunk_height 写在顶层）`
        )
    }

    const trunks = keys.filter((k) => /(^|_)trunk$/.test(k))
    if (trunks.length !== 1) {
        fail(identifier, `必须**恰好一个**树干组件（*_trunk），实测 [${trunks.join(", ")}]`)
    }
    const canopies = keys.filter((k) => /(^|_)canopy$/.test(k))
    if (canopies.length > 1) {
        fail(identifier, `最多**一个**树冠组件（*_canopy），实测 [${canopies.join(", ")}]`)
    }

    // ── trunk ──
    const trunk = spec.trunk
    if (trunk !== undefined) {
        assertBlockRef(identifier, "trunk.trunk_block", trunk.trunk_block)
        const h = trunk.trunk_height
        if (h !== undefined) {
            const ranged = h.range_min !== undefined || h.range_max !== undefined
            const based = h.base !== undefined
            if (!ranged && !based) {
                fail(identifier, `trunk.trunk_height 必须给 range_min/range_max 或 base/intervals，实测 ${JSON.stringify(h)}`)
            }
            if (ranged) {
                if (!isPositiveInt(h.range_min) || !isPositiveInt(h.range_max) || (h.range_min as number) > (h.range_max as number)) {
                    fail(identifier, `trunk.trunk_height 的 range_min/range_max 必须是正整数且 min ≤ max，实测 ${JSON.stringify(h)}`)
                }
            }
        }
    }

    // ── canopy ──
    const canopy = spec.canopy
    if (canopy !== undefined) {
        assertBlockRef(identifier, "canopy.leaf_block", canopy.leaf_block)
        const off = canopy.canopy_offset
        if (off !== undefined && (!Number.isInteger(off.min) || !Number.isInteger(off.max) || off.min > off.max)) {
            fail(identifier, `canopy.canopy_offset 的 min/max 必须是整数且 min ≤ max，实测 ${JSON.stringify(off)}`)
        }
        for (const [i, chance] of (canopy.variation_chance ?? []).entries()) {
            const den = typeof chance === "number" ? 1 : chance?.denominator
            if (typeof den !== "number" || den === 0) {
                fail(identifier, `canopy.variation_chance[${i}] 的分母不能是 0，实测 ${JSON.stringify(chance)}`)
            }
        }
    }

    // ── fancy_canopy ──
    const fancy = spec.fancy_canopy
    if (fancy !== undefined) {
        if (!isPositiveInt(fancy.height)) fail(identifier, `fancy_canopy.height 必须是正整数（层数），实测 ${JSON.stringify(fancy.height)}`)
        if (!isPositiveInt(fancy.radius)) fail(identifier, `fancy_canopy.radius 必须是正整数（半径），实测 ${JSON.stringify(fancy.radius)}`)
        if (fancy.leaf_block !== undefined) assertBlockRef(identifier, "fancy_canopy.leaf_block", fancy.leaf_block)
    }

    // ── random_spread_canopy ──
    const spread = spec.random_spread_canopy
    if (spread !== undefined) {
        if (!Array.isArray(spread.leaf_blocks) || spread.leaf_blocks.length === 0) {
            fail(identifier, `random_spread_canopy.leaf_blocks 必须是非空数组，实测 ${JSON.stringify(spread.leaf_blocks)}`)
        }
    }

    // ── 公共列表 ──
    if (spec.may_grow_on !== undefined) assertFilterList(identifier, "may_grow_on", spec.may_grow_on)
    if (spec.may_grow_through !== undefined) assertFilterList(identifier, "may_grow_through", spec.may_grow_through)
    if (spec.may_replace !== undefined) assertFilterList(identifier, "may_replace", spec.may_replace)
}

/**
 * 树地物（`minecraft:tree_feature`）。
 *
 * 由 `FeatureAPI.createTreeFeature()` 创建并注册；也可以直接 `new TreeFeature(identifier, spec)`
 * 只做题与序列化（不注册）——单测走这条路，不需要 dev server。
 */
export class TreeFeature {
    identifier: string
    spec: TreeFeatureSpec

    constructor(identifier: string, spec: TreeFeatureSpec) {
        assertTreeFeatureSpec(identifier, spec)
        this.identifier = identifier
        this.spec = spec
    }

    /** 序列化成 `features/<name>.json` 的内容 */
    @Serializer
    toObject(): Record<string, any> {
        return serialize(new AddonTreeFeature(
            "1.13.0",
            new AddonTreeFeatureDefinition(
                new AddonTreeFeatureDescription(this.identifier),
                this.spec
            )
        ))
    }
}
