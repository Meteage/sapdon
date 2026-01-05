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
     * @param {object} data 数据操作类实例 通过toObject方法转成正确格式json文本 
     */
    static register(name: string, root: string, path: string, data: object) {
        //此处是登记注册数据到客户端注册表
        //此时不能调用toObject 因为此时只是在客户端生成注册数据，并没有定义好数据
        
        console.log("Registering:", { name, root, path, data });
        //输出类名
        /*
        const className = data.constructor.name;
        console.log(`Data is instance of: ${className}`);
        */
        clientRegistryData.push({ name, root, path, data })
    }

    static submit() {
        //此时用户端已经完成所有注册与更改，提交数据到服务器端
        cliRequest('submitGregistry', clientRegistryData.map(item => {
            //运行 toObject 方法，获取最终数据

            //如果data有toObject方法则调用它
            console.log("Preparing to submit registry item:", item.data);
            if (typeof (item.data as any).toObject === 'function') {
                item.data = (item.data as any).toObject()
            }
            console.log("Submitting registry item:", JSON.stringify(item.data));
            
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