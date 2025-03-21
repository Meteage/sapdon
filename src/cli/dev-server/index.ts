import { server } from "./server.js"

export function startDevServer() {
    if (server.isListening()) {
        return
    }

    server.bootstrap()
}

export {
    server,
}