import { generateAddon } from "../load.js"
import { ServerHandles } from "./handles.js"
import { server } from "./server.js"
import { syncDevFilesServer } from "./syncFiles.js"

function startup(GRegistry: any, UIRegistry: any) {
    server.bootstrap()
    server.handle(ServerHandles.WRITE_ADDON, generateAddon(GRegistry, UIRegistry))
    server.handle(ServerHandles.WRITE_GAME_DEV, syncDevFilesServer)
}

export function startDevServer(GRegistry: any, UIRegistry: any) {
    if (server.isListening()) {
        return
    }

    startup(GRegistry, UIRegistry)
    process.send!('initialized')
}

export {
    server, ServerHandles,
}