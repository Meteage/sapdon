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
