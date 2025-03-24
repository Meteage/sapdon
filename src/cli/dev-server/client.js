import { encode } from '@utils'
import { devServerConfig } from './config.js'

const {
    port
} = devServerConfig

export async function cliRequest(path, ...params) {
    try {
        await fetch(`http://localhost:${port}/${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: encode(params)
        })
    } catch (error) {
        console.error(error)
        console.error('尝试在构建脚本中使用 server.startDevServer() 启动开发服务器')
    }
}