import { generateAddon } from "../load.js";
import { bootstrap, isListening, server } from "./server.js";
import { syncDevFilesServer } from "./syncFiles.js";
export function startDevServer(GRegistry, UIRegistry) {
    if (!isListening()) {
        bootstrap();
        server.handle('write-addon', generateAddon(GRegistry, UIRegistry));
        server.handle('sync-files', syncDevFilesServer);
    }
}
export { server, };
