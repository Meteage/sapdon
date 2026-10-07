/**
 * `sapdon lib` 的「源 → 目标」规划（纯逻辑，除 `exists` 探测外无副作用）。
 *
 * 为什么要单独成模块：`lib` 把**「CLI 自己所在目录的父目录」**当框架源根
 * （框架 bundle 里 `prod/cli/start.js` 的父目录就是 `prod/`，那里 `core/ cli/ oc/` 齐备）。
 * 但 npm 正常安装布局下 CLI 是从**项目自己的** `node_modules/@sapdon/cli` 解析到的，
 * 那时源根 == 项目的 `node_modules/@sapdon`，于是：
 *   ① `src === dest` → `cpSync` 抛 `ERR_FS_CP_EINVAL: src and dest cannot be the same`；
 *   ② 目标名是 `runtime`（发布名），而框架侧源目录叫 `oc` —— 任何 `node_modules/@sapdon/`
 *      布局下都只有 `runtime`、没有 `oc` → `cpSync` 抛 `ENOENT`。
 * 两者都属于「这个包本来就没得同步」，应当**说明清楚并跳过**，而不是让整条 `sapdon lib` 失败。
 *
 * 详见 `doc/dev/known-pitfalls.md` §8。
 */
import fs from 'fs'
import path from 'path'

/** 一个待同步的包：发布名 + 目标目录名 + 源目录候选（按顺序探测） */
export interface LibPackageSpec {
    /** 发布名（写进目标 `package.json` 的 `name`） */
    name: string
    /** 目标目录名（`node_modules/@sapdon/` 下的目录名） */
    target: string
    /** 框架源根下的源目录候选名，按顺序探测；`oc` 是框架侧历史名，发布名才是 `runtime` */
    sources: string[]
}

/** 待同步清单：顺序即拷贝顺序（与历史行为一致） */
export const LIB_PACKAGES: LibPackageSpec[] = [
    { name: '@sapdon/core', target: 'core', sources: ['core'] },
    { name: '@sapdon/cli', target: 'cli', sources: ['cli'] },
    { name: '@sapdon/runtime', target: 'runtime', sources: ['oc', 'runtime'] },
]

export interface LibPlanItem {
    /** 发布名 */
    name: string
    /** 源目录绝对路径；探测不到为 `null` */
    src: string | null
    /** 目标目录绝对路径 */
    dest: string
    /** 跳过原因（给人看的一行说明）；`null` = 本次应当同步 */
    skip: string | null
}

export interface LibPlanOptions {
    /** 框架源根（`lib` 默认取 CLI 所在目录的父目录；框架 bundle 里 = `prod/`） */
    rootDir: string
    /** 项目的 `node_modules`（目标的 `@sapdon/` 建在它下面） */
    modulesDir: string
    /** 目录存在性判定（默认 `fs.existsSync`；测试可注入） */
    exists?: (dir: string) => boolean
    /** 包清单（默认 `LIB_PACKAGES`；测试可注入） */
    packages?: LibPackageSpec[]
}

/** 路径比较用的归一化：Windows 大小写不敏感，分隔符统一 */
function normalizeForCompare(dir: string): string {
    const resolved = path.resolve(dir)
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved
}

/** 两条路径是否指向同一处 */
export function isSamePath(a: string, b: string): boolean {
    return normalizeForCompare(a) === normalizeForCompare(b)
}

/**
 * `child` 是否就是 `parent`，或落在 `parent` **内部**。
 * 后者同样会让 `fs.cpSync(src, dest)` 抛 `ERR_FS_CP_EINVAL`（把目录拷进自己的子目录）。
 * 注意必须按路径段比较：`/a/bc` 不算落在 `/a/b` 内部。
 */
export function isSameOrInside(parent: string, child: string): boolean {
    const p = normalizeForCompare(parent)
    const c = normalizeForCompare(child)
    if (c === p) return true
    return c.startsWith(p.endsWith(path.sep) ? p : p + path.sep)
}

/**
 * 算出每个包「从哪拷到哪」，以及拷不了的原因。**不做任何拷贝**。
 *
 * 跳过判定（顺序即优先级）：
 *   1. 源目录探测不到（`oc` / `runtime` 都不在框架源根下）→ 跳过 + 说明；
 *   2. 源与目标同一处、或目标落在源内部 → 跳过 + 说明（消灭 `ERR_FS_CP_EINVAL`）。
 */
export function planLibCopies(options: LibPlanOptions): LibPlanItem[] {
    const exists = options.exists ?? ((dir: string) => fs.existsSync(dir))
    const packages = options.packages ?? LIB_PACKAGES

    return packages.map((spec): LibPlanItem => {
        const dest = path.join(options.modulesDir, '@sapdon', spec.target)
        const src = spec.sources
            .map((name) => path.join(options.rootDir, name))
            .find((dir) => exists(dir)) ?? null

        if (src === null) {
            const tried = spec.sources.map((name) => `${name}/`).join(' 或 ')
            return {
                name: spec.name,
                src,
                dest,
                skip: `跳过 ${spec.name}：框架源根下没有 ${tried}（源根：${options.rootDir}）`,
            }
        }

        if (isSameOrInside(src, dest)) {
            return {
                name: spec.name,
                src,
                dest,
                skip: `跳过 ${spec.name}：CLI 就来自项目自己的 node_modules/@sapdon，源与目标同一处（${src}）`,
            }
        }

        return { name: spec.name, src, dest, skip: null }
    })
}
