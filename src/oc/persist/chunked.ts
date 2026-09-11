import type { Vector3 } from '@minecraft/server'

/**
 * 分块动态属性读写（`world` / `Entity` / `ItemStack` 通用）。
 *
 * ## 为什么框架要内建
 * Bedrock 单个动态属性值长度有上限（约 **32KB** 量级），超限时 `setDynamicProperty` **抛错**。
 * 项目侧手写时一旦把这段包进 `try-catch`，就会变成**静默丢存档**（症状：重进世界后数据回到早期快照）。
 * AGENTS.md 记的 `digitCircuit` 事故与 `lr-framework` 的 `BaseEngine.save` 都是这个坑。
 * 所以这里把「分块 + 清理残留 + 不吞异常」固化成框架接口。
 *
 * ## 存储格式（与既有实现互通）
 * - 小数据（≤ {@link CHUNK_SIZE}）：主 key 直接存**原字符串**。
 * - 大数据：数据块 `"<key>#0" … "<key>#N-1"`，主 key 存 `{"_chunks":N}`。
 *   与 `examples/lr-framework/.../BaseEngine.ts` 的 `save/load`、
 *   `digitCircuit` 的 `CIRCUIT_CHUNK=24000` 方案**完全一致**，可互相读取。
 * - **提交点**：数据块先写、主 key 后写。中途失败时主 key 仍指向上一份完整数据，
 *   不会留下「半新半旧」的可读结果。
 *
 * ## 空值语义（★ 与 `BaseEngine` 的坑不同）
 * `loadChunked` 返回 `undefined` = **从没存过**；返回 `''` = **存过空串**。
 * ⚠️ 判断时请用 `=== undefined`，**不要**用真值判断（`if (!v)` 会把空串当没存过）。
 *
 * ## 异常约定
 * **本模块不吞任何异常**：写入失败、分块缺失、类型不符一律抛出。
 * 调用方若确实要容错，请自行 catch 并**至少打印日志**，不要静默忽略。
 */

/** 单个数据块的字符数上限（与 BaseEngine / digitCircuit 一致，安全低于约 32KB 的引擎上限） */
export const CHUNK_SIZE = 24000

/** 分块键后缀：`<key>#<index>` */
export const CHUNK_SUFFIX = '#'

/**
 * 无 `getDynamicPropertyIds()` 时的兜底扫描上界。
 * 有该 API 时按实际存在的键精确清理，不受此值限制。
 */
export const MAX_CHUNK_SCAN = 256

/** `setDynamicProperty` 允许的取值 */
export type DynamicPropertyValue = boolean | number | string | Vector3

/**
 * 分块读写所需的最小目标接口。
 * `world`（World）/ `Entity` / `ItemStack` / 容器槽位均满足；单测里可用内存对象顶替。
 */
export interface DynamicPropertyTarget {
    getDynamicProperty(identifier: string): DynamicPropertyValue | undefined
    setDynamicProperty(identifier: string, value?: DynamicPropertyValue): void
    /** 可选：@minecraft/server 的 World/Entity/ItemStack 均提供，用于精确清理残留分块 */
    getDynamicPropertyIds?(): string[]
}

/** 第 index 个数据块的键名 */
export function chunkKey(key: string, index: number): string {
    return `${key}${CHUNK_SUFFIX}${index}`
}

/** 主 key 里表示「已分块」的元数据 JSON，如 `{"_chunks":3}` */
export function chunkMetaJson(count: number): string {
    return JSON.stringify({ _chunks: count })
}

/**
 * 解析主 key 的分块元数据。
 * 只有「恰好是一个仅含整型 `_chunks` 的对象」才算分块，其余一律返回 undefined。
 */
export function parseChunkCount(raw: unknown): number | undefined {
    if (typeof raw !== 'string' || raw.length < 2 || raw[0] !== '{') return undefined
    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch {
        return undefined
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return undefined
    const keys = Object.keys(parsed as object)
    if (keys.length !== 1 || keys[0] !== '_chunks') return undefined
    const count = (parsed as { _chunks: unknown })._chunks
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) return undefined
    return count
}

/**
 * 该字符串是否**长得像**分块元数据。
 * 这类值必须强制分块，否则 `{"_chunks":2}` 这样的原文会被 `loadChunked` 误判成元数据。
 */
export function looksLikeChunkMeta(value: string): boolean {
    return parseChunkCount(value) !== undefined
}

/** 按 size 切分字符串（纯函数，可单测） */
export function splitValue(value: string, size: number = CHUNK_SIZE): string[] {
    if (!Number.isInteger(size) || size < 1) throw new Error(`splitValue: size 必须是正整数，收到 ${size}`)
    if (value.length === 0) return ['']
    const parts: string[] = []
    for (let i = 0; i < value.length; i += size) parts.push(value.slice(i, i + size))
    return parts
}

// ─────────────────────────── 内部：残留分块清理 ───────────────────────────

/** 目标是否支持精确枚举动态属性键 */
function canEnumerate(target: DynamicPropertyTarget): boolean {
    return typeof target.getDynamicPropertyIds === 'function'
}

function isChunkIdOf(key: string, id: string): boolean {
    if (!id.startsWith(key + CHUNK_SUFFIX)) return false
    const suffix = id.slice(key.length + CHUNK_SUFFIX.length)
    return suffix.length > 0 && /^\d+$/.test(suffix)
}

/**
 * 删除 `key` 的 `index >= from` 的所有数据块（防旧存档残留脏块）。
 * 支持枚举时精确删除；否则从 `from` 扫描到 {@link MAX_CHUNK_SCAN}。
 */
function purgeChunksFrom(target: DynamicPropertyTarget, key: string, from: number): void {
    if (canEnumerate(target)) {
        for (const id of target.getDynamicPropertyIds!()) {
            if (!isChunkIdOf(key, id)) continue
            if (Number(id.slice(key.length + CHUNK_SUFFIX.length)) < from) continue
            target.setDynamicProperty(id, undefined)
        }
        return
    }
    for (let i = from; i < MAX_CHUNK_SCAN; i++) {
        const id = chunkKey(key, i)
        if (target.getDynamicProperty(id) !== undefined) target.setDynamicProperty(id, undefined)
    }
}

// ─────────────────────────────── 公开 API ───────────────────────────────

/**
 * 分块写入字符串（幂等：同一份数据连存两次结果一致）。
 *
 * @throws 值不是字符串、或底层 `setDynamicProperty` 抛错（如超限）时**原样抛出**
 */
export function saveChunked(target: DynamicPropertyTarget, key: string, value: string): void {
    if (!key) throw new Error('saveChunked: key 不能为空')
    if (typeof value !== 'string') {
        throw new Error(`saveChunked: value 必须是字符串（收到 ${typeof value}），请自行序列化后再存`)
    }

    // 数据块先写、主 key 后写（提交点）；元数据形态的原文强制分块，避免读回时歧义
    if (value.length > CHUNK_SIZE || looksLikeChunkMeta(value)) {
        const parts = splitValue(value, CHUNK_SIZE)
        for (let i = 0; i < parts.length; i++) target.setDynamicProperty(chunkKey(key, i), parts[i])
        target.setDynamicProperty(key, chunkMetaJson(parts.length))
        purgeChunksFrom(target, key, parts.length)
        return
    }

    target.setDynamicProperty(key, value)
    purgeChunksFrom(target, key, 0)
}

/**
 * 读取字符串。
 * @returns `undefined` = 从没存过；`''` = 存过空串
 * @throws 分块数据缺失/损坏，或主 key 被非字符串占用时
 */
export function loadChunked(target: DynamicPropertyTarget, key: string): string | undefined {
    if (!key) throw new Error('loadChunked: key 不能为空')
    const raw = target.getDynamicProperty(key)
    if (raw === undefined) return undefined
    if (typeof raw !== 'string') {
        throw new Error(`loadChunked: 主 key "${key}" 存的是 ${typeof raw}，本接口只读写字符串`)
    }

    const count = parseChunkCount(raw)
    if (count === undefined) return raw
    if (count === 0) return ''

    let out = ''
    for (let i = 0; i < count; i++) {
        const part = target.getDynamicProperty(chunkKey(key, i))
        if (typeof part !== 'string') {
            // 不静默返回半截数据：宁可抛，也不要让调用方以为存档是完整的
            throw new Error(
                `loadChunked: 分块存档损坏 —— 主 key "${key}" 声明 ${count} 块，` +
                `但 "${chunkKey(key, i)}" 是 ${part === undefined ? '缺失' : typeof part}`
            )
        }
        out += part
    }
    return out
}

/**
 * 彻底清除：主 key + **所有**数据块（含旧存档残留的更高序号块）。
 * 清完 `loadChunked` 返回 `undefined`（回到「从没存过」）。
 */
export function clearChunked(target: DynamicPropertyTarget, key: string): void {
    if (!key) throw new Error('clearChunked: key 不能为空')
    purgeChunksFrom(target, key, 0)
    target.setDynamicProperty(key, undefined)
}
