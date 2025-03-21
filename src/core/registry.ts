import { cliRequest } from "../cli/dev-server/client.js"
import { server } from "../cli/dev-server/server.js"

/**
 * Client
 */
export class GRegistry {
    /**
     * 生成注册器
     * @param {string} name 文件名字
     * @param {string} root 根目录，如 "behavior"、"resource" 等
     * @param {string} path 数据的路径，如 "blocks/"、"items/"、"recipes/" 等
     * @param {string} data 实例 必须包含 toJson 方法
     */
    static register(name: string, root: string, path: string, data: string) {
        data = data === 'string' ? data = JSON.parse(data)
            : ((data as any)?.toJson?.() ?? data)
        cliRequest('register', { name, root, path, data })
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

    static start() {
        server.handle('register', (data: any) => {
            GRegistryServer.dataList.push(data)
        })
    }
}

export namespace registry {
    export function sumbit() {
        cliRequest('sumbit', {})
    }
}