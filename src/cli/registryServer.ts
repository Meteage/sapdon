import { server } from './dev-server/server.js'
import { handleRemoteLogger } from './remoteLogger/server.js'

/**
 * CLI 侧的服务端 handler 注册。
 *
 * 注册表数据的接收已合并到 `build.js` 的 `submit` 一个入口（载荷是 `BuildPacket`）；
 * 这里只剩远程日志。
 */
export class GRegistryServer {
    static startServer() {
        server.handle('remote-logger', handleRemoteLogger)
    }
}
