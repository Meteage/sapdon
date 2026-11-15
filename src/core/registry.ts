import { serialize } from "@sapdon/utils/index.js"
import { transportPost } from "./transport/client.js"
import { BlockCustomComponentBuilder } from "./block/blockCustomComponent.js"

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

    static submit() {
        runBeforeSubmitHooks()
        const items = dedupe(clientRegistryData)
        runValidators(items)
        transportPost('submitGregistry', items.map(item => {
            if (GRegistry.debug) console.log("Preparing to submit registry item:", item.data)
            if (typeof (item.data as any).toObject === 'function') {
                item.data = (item.data as any).toObject()
            }
            if (GRegistry.debug) console.log("Submitting registry item:", JSON.stringify(item.data))
            
            return item
        }))
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

    export function submit() {
        runBeforeSubmitHooks()
        const items = dedupe(clientRegistryData)
        runValidators(items)
        const buildData = items.map(item => {
            if (typeof (item.data as any).toObject === 'function') {
                item.data = (item.data as any).toObject()
            }
            return item
        })

        // 自动收集 BlockCustomComponentBuilder 实例，生成 runtime 脚本数据
        for (const builder of BlockCustomComponentBuilder.getAllInstances()) {
            const safeName = builder.id().replace(/[^a-zA-Z0-9_]/g, '_')
            const source = builder.generateRuntimeCode()
            buildData.push({
                name: safeName,
                root: 'behavior',
                path: 'scripts/custom_components/',
                data: { _scriptSource: safeName, source, componentId: builder.id() }
            })
        }

        transportPost('submit', buildData)
    }
}