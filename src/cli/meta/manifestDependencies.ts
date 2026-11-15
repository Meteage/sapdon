/**
 * `build.config` → `buildOptions.dependencies` 的校验与规范化（纯函数，零 fs）。
 *
 * 两种依赖写进**行为包** manifest 的 `dependencies`：
 * - 脚本模块：`{ "module_name": "@minecraft/server", "version": "2.0.0" }` —— 原样透传（产物逐字节不变）；
 * - 另一个包：`{ "uuid": "<该包 header uuid>", "version": "1.2.0" | [1, 2, 0] }` ——
 *   `version` 统一写成三段数字数组，与本框架生成的 `header.version` 同形（manifest format_version 2）。
 */

/** 脚本模块依赖（`@minecraft/*`） */
export interface ModuleDependency {
    module_name: string
    version: string
}

/** 对另一个包（按 header uuid）的依赖 */
export interface PackDependency {
    uuid: string
    version: string | number[]
}

/** `build.config` 里 `dependencies` 的一项 */
export type BuildDependency = ModuleDependency | PackDependency

/** 写进 manifest 的包依赖（`version` 已规范化为数组） */
export interface ManifestPackDependency {
    uuid: string
    version: [number, number, number]
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function fail(index: number, message: string): never {
    throw new Error(`build.config 的 buildOptions.dependencies[${index}] ${message}`)
}

function toVersionArray(index: number, version: unknown): [number, number, number] {
    const parts = typeof version === 'string'
        ? version.trim().split('.').map((part) => (/^\d+$/.test(part) ? Number(part) : NaN))
        : Array.isArray(version) ? version : null
    if (!parts || parts.length !== 3 || !parts.every((n) => Number.isSafeInteger(n) && (n as number) >= 0)) {
        fail(index, `的 version 必须是 "主.次.修" 三段非负整数（字符串或数组），实际为 ${JSON.stringify(version)}`)
    }
    return parts as [number, number, number]
}

/**
 * 校验并规范化依赖列表。
 *
 * @param dependencies `build.config` 里的原始值（缺省 / `null` 视为空列表）
 * @param ownUuids 本项目自己的 BP/RP header uuid（用于拒绝依赖自身；可省略）
 * @returns 写进行为包 manifest 的依赖（模块依赖为原对象，包依赖为新对象）
 * @throws 格式不合法、uuid 非法、依赖自身、同一 uuid 重复时
 */
export function normalizeManifestDependencies(
    dependencies: unknown,
    ownUuids: readonly string[] = [],
): (ModuleDependency | ManifestPackDependency)[] {
    if (dependencies === undefined || dependencies === null) return []
    if (!Array.isArray(dependencies)) {
        throw new Error(`build.config 的 buildOptions.dependencies 必须是数组，实际为 ${typeof dependencies}`)
    }

    const own = new Set(ownUuids.map((uuid) => uuid.toLowerCase()))
    const seenPacks = new Set<string>()

    return dependencies.map((dependency, index) => {
        if (typeof dependency !== 'object' || dependency === null || Array.isArray(dependency)) {
            fail(index, '必须是对象')
        }
        const hasModule = 'module_name' in dependency
        const hasUuid = 'uuid' in dependency
        if (hasModule === hasUuid) {
            fail(index, '必须且只能写 module_name（脚本模块）或 uuid（另一个包）之一')
        }

        if (hasModule) {
            const { module_name, version } = dependency as Record<string, unknown>
            if (typeof module_name !== 'string' || module_name.length === 0) fail(index, '的 module_name 必须是非空字符串')
            if (typeof version !== 'string' || version.length === 0) fail(index, '的 version 必须是非空字符串')
            return dependency as ModuleDependency
        }

        const { uuid, version } = dependency as Record<string, unknown>
        if (typeof uuid !== 'string' || !UUID_PATTERN.test(uuid)) {
            fail(index, `的 uuid 不是合法的 UUID：${JSON.stringify(uuid)}`)
        }
        const key = uuid.toLowerCase()
        if (own.has(key)) fail(index, `依赖的是本项目自己（${uuid}）`)
        if (seenPacks.has(key)) fail(index, `与前面的依赖重复（uuid ${uuid}）`)
        seenPacks.add(key)
        return { uuid, version: toVersionArray(index, version) }
    })
}

/**
 * 找出「配置里有、但现有 manifest 里没有」的依赖。
 *
 * manifest 只在首次构建时生成，之后改 `dependencies` 不会自动写入；构建时用本函数提示。
 * 只比对**缺失**（manifest 里多出来的手写依赖不算差异）。
 *
 * @param expected `normalizeManifestDependencies` 的结果
 * @param manifestDependencies 现有 manifest 的 `dependencies`（非数组按空列表处理）
 */
export function missingManifestDependencies(
    expected: readonly (ModuleDependency | ManifestPackDependency)[],
    manifestDependencies: unknown,
): (ModuleDependency | ManifestPackDependency)[] {
    const actual = Array.isArray(manifestDependencies) ? manifestDependencies : []
    const keyOf = (dependency: Record<string, unknown>): string | undefined => {
        if (typeof dependency?.module_name === 'string') {
            return `module|${dependency.module_name}|${String(dependency.version)}`
        }
        if (typeof dependency?.uuid === 'string') {
            const version = Array.isArray(dependency.version) ? dependency.version.join('.') : String(dependency.version)
            return `pack|${dependency.uuid.toLowerCase()}|${version}`
        }
        return undefined
    }
    const present = new Set(actual.map((dependency) => keyOf(dependency)).filter(Boolean))
    return expected.filter((dependency) => !present.has(keyOf(dependency as unknown as Record<string, unknown>)))
}
