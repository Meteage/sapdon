import { cliRequest } from './dev-server/client.js'

export {
    server as devServer,
} from './dev-server/index.js'

// 编程式入口（VS Code 插件 / CI / 其他构建器复用）
export { writeBuildPacket } from './load.js'
export { writeLib } from './dev-server/syncFiles.js'
export { planLibCopies, LIB_PACKAGES } from './dev-server/libPlan.js'
export { packProject } from './pack.js'

export const client = {
    call: async (name, ...args) => {
        return await cliRequest(name, ...args)
    }
}