import { cliRequest } from './dev-server/client.js'

export {
    server as devServer,
} from './dev-server/index.js'

export const client = {
    call: async (name, ...args) => {
        return await cliRequest(name, ...args)
    }
}