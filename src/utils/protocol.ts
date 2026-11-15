/**
 * 构建协议（CLI ↔ 构建脚本子进程）。
 *
 * 职责边界：`@sapdon/core` / `@sapdon/ui` 在子进程里把注册项解析成**最终文件**，
 * 通过 HTTP 交给 CLI；CLI 只负责落盘、清单、同步与打包，不认识 addon 语义。
 *
 * 协议带版本号：CLI 与项目里的 core 版本不一致时**报错退出**，不猜测兼容。
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

/** 一个待落盘的 JSON 文件 */
export interface BuildPacketFile {
    /** `"behavior"` | `"resource"` */
    root: string
    /** 包内子路径，如 `"items/"` */
    path: string
    /** 文件名（不含 `.json`） */
    name: string
    /** 已序列化的内容 */
    data: unknown
}

/** 需要写入项目源码目录的文件（已存在则跳过，保留用户改动） */
export interface BuildSourceFile {
    /** 相对项目根的路径，正斜杠 */
    path: string
    content: string
}

/** 需要按标记块合并进已有文件的文本（自定义组件注册索引） */
export interface BuildIndexBlock {
    /** 相对项目根的路径 */
    path: string
    /** 标记块内容（含起止注释行） */
    content: string
}

/** 子进程 → CLI（POST /submit） */
export interface BuildPacket {
    protocol: string
    files: BuildPacketFile[]
    sources?: BuildSourceFile[]
    indexBlock?: BuildIndexBlock
}

export type PacketBuilder = (entries: any[], ctx: BuildContext) => BuildPacket

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
