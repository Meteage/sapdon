/**
 * 多方块结构 —— 纯逻辑层（零引擎依赖，可在 Node 里单测）。
 *
 * ## 图案坐标
 *
 * - `aisles`：**从下往上**的各层；每层是**从北往南**的各行（z 递增）；每行字符**从西往东**（x 递增）。
 * - 字符经 `where` 映射到方块判断；**空格 = 不检查**（任意方块）。要求空气请显式写 `Is.air()`。
 * - `anchor`：锚点字符，图案里必须**恰好出现一次**。世界坐标都相对锚点计算。
 * - 朝向 `facing`：0 = 按图案原样（行朝南）；每 +1 绕 Y 轴顺时针转 90°（俯视）。`mirrored` = 先沿 x 镜像再旋转。
 */

export interface BlockPos {
    x: number
    y: number
    z: number
}

/** 方块的最小描述。`states` / `tags` 是函数：只有判断用到时才去读（读方块状态有开销） */
export interface BlockProbe {
    typeId: string
    states(): Record<string, string | number | boolean>
    tags(): readonly string[]
}

/** 方块示例：`Multiblocks.build` 摆放、预览说明时使用 */
export interface BlockExample {
    id: string
    states?: Record<string, string | number | boolean>
}

/** 方块判断。`probe` 为 `undefined` 表示那一格没加载 / 在世界外 */
export interface BlockPredicate {
    test(probe: BlockProbe | undefined): boolean
    /** 说明文字（describe / 预览提示） */
    label: string
    /** 摆放示例；没有时 build 跳过这一格 */
    example?: BlockExample
}

const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'])

/** 方块判断的构造器 */
export const Is = {
    /** 方块 id 是其中之一。第一个 id 作为摆放示例 */
    block(...ids: string[]): BlockPredicate {
        if (ids.length === 0) throw new Error('Is.block() 至少要一个方块 id')
        const set = new Set(ids)
        return { test: (p) => !!p && set.has(p.typeId), label: ids.join(' / '), example: { id: ids[0] } }
    },
    /** 方块 id 匹配且这些状态都相等（未列出的状态不管） */
    states(id: string, states: Record<string, string | number | boolean>): BlockPredicate {
        const entries = Object.entries(states)
        return {
            test: (p) => {
                if (!p || p.typeId !== id) return false
                const actual = p.states()
                return entries.every(([k, v]) => actual[k] === v)
            },
            label: `${id}[${entries.map(([k, v]) => `${k}=${v}`).join(',')}]`,
            example: { id, states },
        }
    },
    /** 带某个方块标签（`block.getTags()`）。`example` 给出摆放用的方块 */
    tag(tag: string, example?: string): BlockPredicate {
        return { test: (p) => !!p && p.tags().includes(tag), label: `#${tag}`, example: example ? { id: example } : undefined }
    },
    /** 空气 */
    air(): BlockPredicate {
        return { test: (p) => !!p && AIR.has(p.typeId), label: '空气', example: { id: 'minecraft:air' } }
    },
    /** 任意已加载的方块（包括空气） */
    any(): BlockPredicate {
        return { test: (p) => !!p, label: '任意' }
    },
    /** 满足其一。摆放示例取第一个有示例的分支 */
    or(...preds: BlockPredicate[]): BlockPredicate {
        return { test: (p) => preds.some((q) => q.test(p)), label: preds.map((q) => q.label).join(' 或 '), example: preds.find((q) => q.example)?.example }
    },
    /** 同时满足 */
    and(...preds: BlockPredicate[]): BlockPredicate {
        return { test: (p) => preds.every((q) => q.test(p)), label: preds.map((q) => q.label).join(' 且 '), example: preds.find((q) => q.example)?.example }
    },
    /** 不满足 */
    not(pred: BlockPredicate): BlockPredicate {
        return { test: (p) => !!p && !pred.test(p), label: `非 ${pred.label}` }
    },
    /** 自定义判断 */
    custom(test: (probe: BlockProbe) => boolean, label = '自定义', example?: BlockExample): BlockPredicate {
        return { test: (p) => !!p && test(p), label, example }
    },
}

export interface Orientation {
    facing: 0 | 1 | 2 | 3
    mirrored: boolean
}

export interface PatternSpec {
    aisles: string[][]
    where: Record<string, BlockPredicate>
    anchor: string
    /** 允许旋转（默认 true：4 个水平朝向） */
    rotate?: boolean
    /** 允许镜像（默认 false） */
    mirror?: boolean
}

export interface MatchResult extends Orientation {
    /** 锚点的世界坐标 */
    anchor: BlockPos
    /** 字符 → 该字符所有格子的世界坐标（不含空格） */
    cells: Record<string, BlockPos[]>
}

export interface PartialMatch extends Orientation {
    anchor: BlockPos
    /** 符合的格子数 / 需要检查的格子总数 */
    matched: number
    total: number
    /** 不符合的格子 */
    missing: { pos: BlockPos, char: string, label: string }[]
}

/** 一个格子：字符 + 相对锚点的局部偏移 */
interface Cell {
    char: string
    local: BlockPos
}

export type BlockReader = (pos: BlockPos) => BlockProbe | undefined

const add = (a: BlockPos, b: BlockPos): BlockPos => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z })
const sub = (a: BlockPos, b: BlockPos): BlockPos => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })

/** 局部偏移 → 世界偏移：先镜像（x 取反），再绕 Y 顺时针转 facing×90° */
export function orient(local: BlockPos, o: Orientation): BlockPos {
    let x = o.mirrored ? -local.x : local.x
    let z = local.z
    for (let i = 0; i < o.facing; i++) [x, z] = [-z, x]
    return { x: x + 0, y: local.y, z: z + 0 }
}

export class MultiblockPattern {
    readonly anchorChar: string
    readonly where: Readonly<Record<string, BlockPredicate>>
    readonly size: BlockPos
    readonly aisles: readonly (readonly string[])[]
    /** 锚点在图案网格里的位置（x = 列，y = 层，z = 行） */
    readonly anchorCell: BlockPos
    private readonly cells: Cell[]
    private readonly byChar = new Map<string, Cell[]>()
    private readonly orientationList: Orientation[]

    constructor(spec: PatternSpec) {
        const { aisles, where, anchor } = spec
        if (!Array.isArray(aisles) || aisles.length === 0) throw new Error('多方块图案：aisles 不能为空')
        if (typeof anchor !== 'string' || anchor.length !== 1 || anchor === ' ') throw new Error('多方块图案：anchor 必须是一个非空格字符')
        const rows = aisles[0].length
        const width = aisles[0][0]?.length ?? 0
        if (rows === 0 || width === 0) throw new Error('多方块图案：每层至少一行一列')
        aisles.forEach((layer, y) => {
            if (layer.length !== rows) throw new Error(`多方块图案：第 ${y} 层有 ${layer.length} 行，应为 ${rows}（各层必须同样大小）`)
            layer.forEach((row, z) => {
                if (row.length !== width) throw new Error(`多方块图案：第 ${y} 层第 ${z} 行长度 ${row.length}，应为 ${width}`)
            })
        })

        const raw: Cell[] = []
        let anchorAt: BlockPos | undefined
        aisles.forEach((layer, y) => layer.forEach((row, z) => [...row].forEach((char, x) => {
            if (char === ' ') return
            if (!where[char]) throw new Error(`多方块图案：字符 "${char}" 没有在 where 里定义`)
            if (char === anchor) {
                if (anchorAt) throw new Error(`多方块图案：锚点 "${anchor}" 出现了不止一次`)
                anchorAt = { x, y, z }
            }
            raw.push({ char, local: { x, y, z } })
        })))
        if (!anchorAt) throw new Error(`多方块图案：锚点 "${anchor}" 没有出现在图案里`)

        this.anchorChar = anchor
        this.where = where
        this.aisles = aisles
        this.size = { x: width, y: aisles.length, z: rows }
        this.anchorCell = anchorAt!
        this.cells = raw.map((c) => ({ char: c.char, local: sub(c.local, anchorAt!) }))
        for (const c of this.cells) {
            if (!this.byChar.has(c.char)) this.byChar.set(c.char, [])
            this.byChar.get(c.char)!.push(c)
        }
        const facings: (0 | 1 | 2 | 3)[] = spec.rotate === false ? [0] : [0, 1, 2, 3]
        const mirrors = spec.mirror ? [false, true] : [false]
        this.orientationList = mirrors.flatMap((mirrored) => facings.map((facing) => ({ facing, mirrored })))
    }

    /** 允许的朝向 */
    orientations(): readonly Orientation[] {
        return this.orientationList
    }

    /** 用到的字符（不含空格） */
    chars(): string[] {
        return [...this.byChar.keys()]
    }

    /** 某个朝向下，所有格子的世界坐标 */
    layout(anchor: BlockPos, o: Orientation): { pos: BlockPos, char: string }[] {
        return this.cells.map((c) => ({ pos: add(anchor, orient(c.local, o)), char: c.char }))
    }

    /** 在给定锚点、按允许的朝向逐一匹配；`only` 限定只试一个朝向 */
    matchAt(anchor: BlockPos, read: BlockReader, only?: Orientation): MatchResult | undefined {
        const list = only ? [only] : this.orientationList
        const cache = new Map<string, BlockProbe | undefined>()
        const get = (pos: BlockPos) => {
            const key = `${pos.x},${pos.y},${pos.z}`
            if (!cache.has(key)) cache.set(key, read(pos))
            return cache.get(key)
        }
        // 锚点先查：它通常最有区分度，失败就不用试任何朝向
        if (!this.where[this.anchorChar].test(get(anchor))) return undefined
        for (const o of list) {
            let ok = true
            const cells: Record<string, BlockPos[]> = {}
            for (const c of this.cells) {
                const pos = add(anchor, orient(c.local, o))
                if (!this.where[c.char].test(get(pos))) {
                    ok = false
                    break
                }
                ;(cells[c.char] ??= []).push(pos)
            }
            if (ok) return { anchor, facing: o.facing, mirrored: o.mirrored, cells }
        }
        return undefined
    }

    /**
     * 已知某个位置上的方块属于结构，但不知道它是哪一格：
     * 对每个「判断接受这个方块」的字符的每一格、每个朝向，反推锚点再完整匹配。
     * @param chars 只考虑这些字符（缺省 = 所有接受该方块的字符）
     */
    matchContaining(pos: BlockPos, read: BlockReader, chars?: readonly string[]): MatchResult | undefined {
        const probe = read(pos)
        if (!probe) return undefined
        const candidates = (chars ?? this.chars()).filter((ch) => this.where[ch]?.test(probe))
        const tried = new Set<string>()
        for (const ch of candidates) {
            for (const cell of this.byChar.get(ch) ?? []) {
                for (const o of this.orientationList) {
                    const anchor = sub(pos, orient(cell.local, o))
                    const key = `${anchor.x},${anchor.y},${anchor.z},${o.facing},${o.mirrored}`
                    if (tried.has(key)) continue
                    tried.add(key)
                    const m = this.matchAt(anchor, read, o)
                    if (m) return m
                }
            }
        }
        return undefined
    }

    /** 给定锚点，找符合格子最多的朝向（预览「还差哪些方块」用）；并列时取 `orientations()` 里靠前的 */
    bestPartial(anchor: BlockPos, read: BlockReader): PartialMatch {
        let best: PartialMatch | undefined
        for (const o of this.orientationList) {
            const missing: PartialMatch['missing'] = []
            for (const c of this.cells) {
                const pos = add(anchor, orient(c.local, o))
                const pred = this.where[c.char]
                if (!pred.test(read(pos))) missing.push({ pos, char: c.char, label: pred.label })
            }
            const result: PartialMatch = { anchor, ...o, matched: this.cells.length - missing.length, total: this.cells.length, missing }
            if (!best || result.matched > best.matched) best = result
        }
        return best!
    }

    /** 各字符的数量与说明（材料清单） */
    bill(): { char: string, count: number, label: string }[] {
        return this.chars().map((char) => ({ char, count: this.byChar.get(char)!.length, label: this.where[char].label }))
    }

    /** 人看的说明：逐层图案 + 图例 */
    describe(): string[] {
        const lines: string[] = [`尺寸 ${this.size.x}×${this.size.y}×${this.size.z}（宽×高×深），锚点 "${this.anchorChar}"`]
        this.aisles.forEach((layer, y) => {
            lines.push(`第 ${y + 1} 层（从下往上）：`)
            for (const row of layer) lines.push(`  ${row.replace(/ /g, '·')}`)
        })
        lines.push('图例：' + this.bill().map((b) => `${b.char}=${b.label}×${b.count}`).join('，') + '；·=不检查')
        return lines
    }
}
