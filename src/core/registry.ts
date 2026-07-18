import { serialize } from "@sapdon/utils/index.js"
import { transportPost } from "./transport/client.js"

const clientRegistryData: any[] = []

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
        if (GRegistry.debug) console.log("Registering:", { name, root, path, data })
        clientRegistryData.push({ name, root, path, data })
    }

    static submit() {
        transportPost('submitGregistry', clientRegistryData.map(item => {
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
    export function submit() {
        const data = clientRegistryData.map(item => {
            if (typeof (item.data as any).toObject === 'function') {
                item.data = (item.data as any).toObject()
            }
            return item
        })
        transportPost('submit', data)
    }
}