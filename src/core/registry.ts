import { serialize } from "@sapdon/utils/index.js"
import { cliRequest } from "../cli/dev-server/client.js"
import { server } from "../cli/dev-server/server.js"
import { handleRemoteLogger } from "@sapdon/cli/remoteLogger/server.js"

const clientRegistryData: any[] = []

/**
 * Client
 */
export class GRegistry {
    /**
     * 生成注册器
     * @param {string} name 文件名字
     * @param {string} root 根目录，如 "behavior"、"resource" 等
     * @param {string} path 数据的路径，如 "blocks/"、"items/"、"recipes/" 等
     * @param {string | object} data 实例 必须包含 toJson 方法
     */
    static register(name: string, root: string, path: string, data: string) {
        clientRegistryData.push({ name, root, path, data })
    }

    static submit() {
        cliRequest('submitGregistry', clientRegistryData.map(item => {
            //console.log("Data is:",item.data,"type:",typeof(item.data))
            const data = typeof item.data === 'string'
                ? JSON.parse(item.data)
                : serialize<object, object>(item.data as any)

            item.data = data
            return item
        }))
    }
}

/**
 * Server
 */
export class GRegistryServer {
    static dataList: any[] = []
    static getDataList() {
        return [...GRegistryServer.dataList]
    }

    static startServer() {
        server.handle('submitGregistry', (data: any) => {
            //@ts-ignore
            // console.log(data.map(item => item.data.description))
            this.dataList = data
        })

        server.handle('remote-logger', handleRemoteLogger)
    }
}

export namespace registry {
    export function submit() {
        GRegistry.submit()
        cliRequest('submit', {})
    }
}