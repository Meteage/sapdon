/**
 * 构建协议（CLI ↔ 构建脚本子进程）。
 *
 * 职责边界：`@sapdon/core` / `@sapdon/ui` 在子进程里把注册项解析成**最终文件**，
 * 通过 HTTP 交给 CLI；CLI 只负责落盘、清单、同步与打包，不认识 addon 语义。
 *
 * 协议带版本号：CLI 与项目里的 core 版本不一致时**报错退出**，不猜测兼容。
 * 新增字段属于兼容扩展，不需要升级版本；破坏性改动才升级。
 */

/** 协议版本；不兼容改动必须升级它 */
export const BUILD_PROTOCOL = 'sapdon-build/1'

/** CLI → 子进程（`SAPDON_BUILD_CONTEXT` 环境变量，JSON） */
export interface BuildContext {
    protocol: string
    /** 项目名（`dev/<name>_BP|_RP` 的前缀） */
    projectName: string
    /** 项目根目录 */
    projectPath: string
    /** 构建目录（相对项目根） */
    buildDir: string
    /** `dev` | `prod` | `debug` */
    buildMode: string
    /**
     * 资源包里 `textures/**` 的文件清单（相对 `_RP` 根，正斜杠）。
     * core 用它生成 `item_texture.json` / `terrain_texture.json` 的自动条目。
     */
    resourceFiles: string[]
}

/** 一条注册项（与 `RegistryEntry` 结构一致，放在 protocol 里避免循环依赖） */
export interface BuildEntry {
    name: string
    root: string
    path: string
    data: any
}

/** 文件输出格式；缺省 `json` */
export type BuildFileFormat = 'json' | 'text' | 'base64'

/** 一个待落盘的文件 */
export interface BuildPacketFile {
    /** `"behavior"` | `"resource"` */
    root: string
    /** 包内子路径，如 `"items/"` */
    path: string
    /** 文件名（不含扩展名） */
    name: string
    /** 已序列化的内容：json 为对象；text/base64 为字符串 */
    data: unknown
    /** 输出格式，缺省 `json` */
    format?: BuildFileFormat
    /** 扩展名（不带点），缺省 `json`；text 常用 `txt`、base64 常用 `png` */
    ext?: string
}

/** 需要写入项目源码目录的文件 */
export interface BuildSourceFile {
    /** 相对项目根的路径，正斜杠 */
    path: string
    content: string
    /** 已存在时是否覆盖；缺省 `false`（保留用户改动） */
    overwrite?: boolean
}

/** 需要按标记块合并进已有文件的文本 */
export interface BuildIndexBlock {
    /** 相对项目根的路径 */
    path: string
    /** 标记块内容（含起止注释行） */
    content: string
}

/** 一个解析器返回的增量 */
export interface ResolverResult {
    files?: BuildPacketFile[]
    sources?: BuildSourceFile[]
    indexBlocks?: BuildIndexBlock[]
    /**
     * 本解析器「认领」掉的注册项。被认领的项不会再交给后面的解析器，
     * 也不会被默认映射成 `<name>.json`。
     */
    consumed?: BuildEntry[]
}

/** 解析器：按优先级从高到低执行，返回增量；`@sapdon/core` 最后兜底 */
export type PacketResolver = (state: {
    entries: readonly BuildEntry[]
    ctx: BuildContext
}) => ResolverResult | void

/** 子进程 → CLI（POST /submit） */
export interface BuildPacket {
    protocol: string
    files: BuildPacketFile[]
    sources?: BuildSourceFile[]
    /** 兼容旧字段（单个标记块）；新代码用 `indexBlocks` */
    indexBlock?: BuildIndexBlock
    /** 需要按标记合并的文本块（可多个） */
    indexBlocks?: BuildIndexBlock[]
}

/** 一条校验问题 */
export interface BuildPacketIssue {
    level: 'error' | 'warning'
    message: string
    /** 关联的文件/源码路径（便于定位），可选 */
    target?: string
}

const FILE_FORMATS = new Set(['json', 'text', 'base64'])

/** 相对路径必须是正斜杠、非绝对、不能含 `..` / NUL；允许空串（如 blocks.json） */
function isSafeRelativePath(value: unknown, allowEmpty = true): boolean {
    if (typeof value !== 'string') return false
    if (value === '') return allowEmpty
    if (value.includes('\0') || value.includes('\\')) return false
    if (value.startsWith('/') || /^[a-zA-Z]:/.test(value)) return false
    return !value.split('/').some((segment) => segment === '..')
}

function isSafeFileName(value: unknown): boolean {
    if (typeof value !== 'string' || value.length === 0) return false
    if (value === '.' || value === '..') return false
    return !/[/\\\0]/.test(value)
}

/**
 * 结构校验（纯函数）。**不检查** `protocol`（由调用方决定兼容策略）。
 *
 * CLI 在落盘前跑一次；子进程在提交前也会跑一次并有插件校验器。
 * 错误 = 拒绝落盘；警告 = 仍然落盘，但打日志。
 */
export function validateBuildPacket(packet: BuildPacket): BuildPacketIssue[] {
    const issues: BuildPacketIssue[] = []
    const error = (message: string, target?: string) => issues.push({ level: 'error', message, target })
    const warning = (message: string, target?: string) => issues.push({ level: 'warning', message, target })

    if (!packet || typeof packet !== 'object') {
        error('BuildPacket 必须是一个对象')
        return issues
    }
    if (!Array.isArray(packet.files)) {
        error('BuildPacket.files 必须是数组')
        return issues
    }

    const seenFiles = new Map<string, string>()

    for (const [index, file] of packet.files.entries()) {
        const label = `files[${index}]`
        if (!file || typeof file !== 'object') {
            error(`${label} 必须是对象`)
            continue
        }
        if (file.root !== 'behavior' && file.root !== 'resource') {
            error(`${label} 的 root 必须是 "behavior" 或 "resource"（收到 ${JSON.stringify(file.root)}）`, label)
        }
        if (!isSafeRelativePath(file.path)) {
            error(`${label} 的 path 必须是安全的相对路径（不能绝对、不能含 ".."、反斜杠或 NUL）`, label)
        }
        if (!isSafeFileName(file.name)) {
            error(`${label} 的 name 必须是非空文件名（不能含路径分隔符）`, label)
        }
        if (file.format !== undefined && !FILE_FORMATS.has(file.format)) {
            error(`${label} 的 format 必须是 json / text / base64（收到 ${JSON.stringify(file.format)}）`, label)
        }
        if (file.ext !== undefined && !/^[A-Za-z0-9]+$/.test(file.ext)) {
            warning(`${label} 的 ext 建议只使用字母/数字（收到 ${JSON.stringify(file.ext)}）`, label)
        }
        if (file.format === 'json' || file.format === undefined) {
            if (file.data === undefined) error(`${label} 是 json 但 data 为 undefined`, label)
        } else if (typeof file.data !== 'string') {
            warning(`${label} 是 ${file.format}，data 不是字符串，落盘时会强制转成字符串`, label)
        }

        const key = `${file.root}|${file.path}|${file.name}.${file.ext ?? 'json'}`
        if (seenFiles.has(key)) {
            warning(`重复的文件 ${key}，后写入的会覆盖前一个（来自 ${seenFiles.get(key)}）`, label)
        } else {
            seenFiles.set(key, label)
        }
    }

    const seenSources = new Map<string, string>()
    for (const [index, source] of (packet.sources ?? []).entries()) {
        const label = `sources[${index}]`
        if (!source || typeof source !== 'object') {
            error(`${label} 必须是对象`)
            continue
        }
        if (!isSafeRelativePath(source.path, false)) {
            error(`${label} 的 path 必须是安全的相对路径`, label)
        }
        if (typeof source.content !== 'string') {
            error(`${label} 的 content 必须是字符串`, label)
        }
        if (typeof source.path === 'string') {
            if (seenSources.has(source.path)) {
                warning(`重复的源码文件 ${source.path}，后写入的会覆盖前一个`, label)
            } else {
                seenSources.set(source.path, label)
            }
        }
    }

    const blocks = packet.indexBlocks ?? (packet.indexBlock ? [packet.indexBlock] : [])
    for (const [index, block] of blocks.entries()) {
        const label = `indexBlocks[${index}]`
        if (!block || typeof block !== 'object') {
            error(`${label} 必须是对象`)
            continue
        }
        if (!isSafeRelativePath(block.path, false)) {
            error(`${label} 的 path 必须是安全的相对路径`, label)
        }
        if (typeof block.content !== 'string') {
            error(`${label} 的 content 必须是字符串`, label)
        }
    }

    return issues
}

/** 把问题列表格式化成多行文本（CLI / 子进程报错用） */
export function formatPacketIssues(issues: BuildPacketIssue[]): string {
    return issues
        .map((issue) => `[${issue.level}]${issue.target ? ` ${issue.target}:` : ''} ${issue.message}`)
        .join('\n')
}

/** 没有 CLI 上下文时（例如直接 `node main.mjs`）使用的默认值 */
export function defaultBuildContext(): BuildContext {
    return {
        protocol: BUILD_PROTOCOL,
        projectName: '',
        projectPath: typeof process !== 'undefined' ? process.cwd() : '',
        buildDir: 'dev',
        buildMode: 'dev',
        resourceFiles: [],
    }
}

/**
 * 读取 CLI 注入的构建上下文。
 * 没注入（或版本不符）时返回默认上下文 —— 提交仍可发出，只是没有图集自动条目。
 */
export function readBuildContext(): BuildContext {
    const raw = typeof process !== 'undefined' ? process.env?.SAPDON_BUILD_CONTEXT : undefined
    if (!raw) return defaultBuildContext()

    try {
        const parsed = JSON.parse(raw) as Partial<BuildContext>
        if (parsed?.protocol !== BUILD_PROTOCOL) return defaultBuildContext()
        return { ...defaultBuildContext(), ...parsed }
    } catch {
        return defaultBuildContext()
    }
}
