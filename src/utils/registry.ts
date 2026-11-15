import { transportPost } from "./transport/client.js"
import {
    BUILD_PROTOCOL,
    readBuildContext,
    type BuildContext,
    type BuildEntry,
    type BuildIndexBlock,
    type BuildPacket,
    type BuildPacketFile,
    type BuildSourceFile,
    type PacketResolver,
} from "./protocol.js"

/** 一条注册项：落到 `dev/<proj>_BP|_RP/<path>/<name>.json` 的一个文件 */
export interface RegistryEntry {
    /** 文件名（已做文件名安全化） */
    name: string
    /** `"behavior"` | `"resource"` */
    root: string
    /** 包内子路径，如 `"items/"` */
    path: string
    /** 数据：提交前多为框架实例（如 `Item`），提交时经 `toObject()` 序列化 */
    data: any
}

/**
 * 提交前钩子。在 `registry.submit()` / `GRegistry.submit()` 序列化之前按登记顺序调用；
 * `entries` 是当时全部注册项的快照（项本身是活对象，可直接修改 `data`），
 * 钩子里也可以调用 `GRegistry.register()` 追加文件。钩子抛错 = 构建失败。
 */
export type BeforeSubmitHook = (entries: readonly RegistryEntry[]) => void

const clientRegistryData: RegistryEntry[] = []
const beforeSubmitHooks: BeforeSubmitHook[] = []
let runningHooks = false

/**
 * 「注册项 → 最终文件包」的解析器。
 * 兼容旧 API：设置唯一解析器（会清空之前登记的链）。
 */
export type PacketBuilder = (entries: RegistryEntry[], ctx: BuildContext) => BuildPacket

interface RegisteredResolver {
    priority: number
    fn: PacketResolver
}

const packetResolvers: RegisteredResolver[] = []

/**
 * 登记一个解析器。按 `priority` 从高到低执行；`@sapdon/core` 用 -100 兜底。
 *
 * 解析器返回增量：
 * - `files` / `sources` / `indexBlocks` 会按顺序拼接；
 * - `consumed` 里的注册项不会再交给后面的解析器，也不会被默认映射成 `<name>.json`；
 * - 返回的文件与注册项 `root|path|name` 相同时，会自动视为认领该项（少写 `consumed` 的常见场景）。
 *
 * @throws resolver 不是函数
 */
export function addPacketResolver(resolver: PacketResolver, options: { priority?: number } = {}) {
    if (typeof resolver !== 'function') {
        throw new Error('addPacketResolver: resolver 必须是函数')
    }
    packetResolvers.push({ fn: resolver, priority: options.priority ?? 0 })
    packetResolvers.sort((a, b) => b.priority - a.priority)
}

/**
 * 兼容入口：替换成**唯一**解析器（等价于清空链 + `addPacketResolver`）。
 * 新代码请用 {@link addPacketResolver} 组合，而不是覆盖别人的解析器。
 * @throws builder 不是函数
 */
export function setBuildPacketBuilder(builder: PacketBuilder) {
    if (typeof builder !== 'function') {
        throw new Error('setBuildPacketBuilder: builder 必须是函数')
    }
    packetResolvers.length = 0
    addPacketResolver(({ entries, ctx }) => {
        const packet = builder(entries as RegistryEntry[], ctx)
        return {
            files: packet.files,
            sources: packet.sources,
            indexBlocks: packet.indexBlocks ?? (packet.indexBlock ? [packet.indexBlock] : []),
        }
    }, { priority: -1000 })
}

const entryKey = (entry: BuildEntry) => `${entry.root}|${entry.path}|${entry.name}`

/** 执行解析器链；没有任何解析器认领的注册项按默认规则落成 `<name>.json` */
function buildBuildPacket(entries: RegistryEntry[], ctx: BuildContext): BuildPacket {
    const files: BuildPacketFile[] = []
    const sources: BuildSourceFile[] = []
    const indexBlocks: BuildIndexBlock[] = []
    const consumed = new Set<RegistryEntry>()

    for (const { fn } of packetResolvers) {
        const active = entries.filter((entry) => !consumed.has(entry))
        const result = fn({ entries: active, ctx }) ?? {}

        files.push(...(result.files ?? []))
        sources.push(...(result.sources ?? []))
        indexBlocks.push(...(result.indexBlocks ?? []))

        for (const entry of result.consumed ?? []) consumed.add(entry as RegistryEntry)
        for (const file of result.files ?? []) {
            const key = `${file.root}|${file.path}|${file.name}`
            for (const entry of active) {
                if (!consumed.has(entry) && entryKey(entry) === key) consumed.add(entry)
            }
        }
    }

    for (const entry of entries) {
        if (consumed.has(entry)) continue
        files.push({
            root: entry.root,
            path: entry.path,
            name: entry.name,
            data: entry.data,
        })
    }

    return {
        protocol: BUILD_PROTOCOL,
        files,
        ...(sources.length > 0 ? { sources } : {}),
        ...(indexBlocks.length > 0 ? { indexBlocks } : {}),
    }
}

/**
 * 按 root + path + name 去重，保留最后一次注册的数据
 */
const dedupe = (data: any[]) => {
    const seen = new Map<string, any>()
    for (const item of data) {
        seen.set(`${item.root}|${item.path}|${item.name}`, item)
    }
    return [...seen.values()]
}

/**
 * 提交前自检：注册项若有 `validate()` 就调用一次。
 * 时机很关键 —— 这是用户**配置完**（`addComponent` 等都跑完）之后的唯一统一出口，
 * 而 `registerBlock` 那一刻组件还没挂上（见 BasicBlock.validate 的注释）。
 */
const runValidators = (items: any[]) => {
    for (const item of items) {
        const data = item?.data
        if (data && typeof data.validate === 'function') data.validate()
    }
}

/** 登记提交前钩子（两个 submit 入口共用同一张表） */
const addBeforeSubmitHook = (hook: BeforeSubmitHook) => {
    if (typeof hook !== 'function') {
        throw new Error('beforeSubmit: hook 必须是函数')
    }
    if (runningHooks) {
        throw new Error('beforeSubmit: 不能在提交前钩子执行期间登记新的钩子')
    }
    beforeSubmitHooks.push(hook)
}

/**
 * 依次执行提交前钩子。每个钩子拿到**当时**的注册项快照，
 * 因此后面的钩子能看到前面的钩子追加的文件。
 */
const runBeforeSubmitHooks = () => {
    runningHooks = true
    try {
        for (const hook of beforeSubmitHooks) {
            hook(clientRegistryData.slice())
        }
    } finally {
        runningHooks = false
    }
}

/** 两个 submit 入口共用的一条管线：钩子 → 去重 → 校验 → 序列化 → 解析成文件包 → POST */
function submitBuild() {
    runBeforeSubmitHooks()
    const items = dedupe(clientRegistryData)
    runValidators(items)
    const serialized = items.map((item) => {
        if (typeof (item.data as any).toObject === 'function') {
            item.data = (item.data as any).toObject()
        }
        return item
    })
    const packet: BuildPacket = buildBuildPacket(serialized, readBuildContext())
    transportPost('submit', packet)
}

/**
 * Client
 */
export class GRegistry {
    static debug = false

    /**
     * 生成注册器
     * @param {string} name 文件名字
     * @param {string} root 根目录，如 "behavior"、"resource" 等
     * @param {string} path 数据的路径，如 "blocks/"、"items/"、"recipes/" 等
     * @param {object} data 数据操作类实例 通过toObject方法转成正确格式json文本
     */
    static register(name: string, root: string, path: string, data: object) {
        const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_')
        if (GRegistry.debug) console.log("Registering:", { name: safeName, root, path, data })
        clientRegistryData.push({ name: safeName, root, path, data })
    }

    /**
     * 登记提交前钩子（见 {@link BeforeSubmitHook}）。与 `registry.beforeSubmit` 是同一张表。
     * @param hook 提交前调用的函数
     * @throws hook 不是函数，或在钩子执行期间登记时
     */
    static beforeSubmit(hook: BeforeSubmitHook) {
        addBeforeSubmitHook(hook)
    }

    /** 提交注册表（与 `registry.submit()` 等价） */
    static submit() {
        submitBuild()
    }
}

export namespace registry {
    /**
     * 登记提交前钩子（见 {@link BeforeSubmitHook}）。与 `GRegistry.beforeSubmit` 是同一张表。
     * @param hook 提交前调用的函数
     * @throws hook 不是函数，或在钩子执行期间登记时
     */
    export function beforeSubmit(hook: BeforeSubmitHook) {
        addBeforeSubmitHook(hook)
    }

    /** 提交注册表（与 `GRegistry.submit()` 等价） */
    export function submit() {
        submitBuild()
    }
}
