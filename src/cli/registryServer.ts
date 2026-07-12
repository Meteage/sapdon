import { server } from './dev-server/server.js'
import { handleRemoteLogger } from './remoteLogger/server.js'

export class GRegistryServer {
    static dataList: any[] = []

    static getDataList() {
        return [...this.dataList]
    }

    static startServer() {
        server.handle('submitGregistry', (data: any) => {
            this.dataList = data
        })

        server.handle('remote-logger', handleRemoteLogger)
    }
}
