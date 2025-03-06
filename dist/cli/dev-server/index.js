import { generateAddon } from "../load.js";
import { client } from "./client.js";
import { bootstrap, isListening, server } from "./server.js";
import { syncDevFilesServer } from "./sync-files.js";
export function startDevServer(GRegistry, UIRegistry) {
    if (!isListening()) {
        bootstrap();
        server.handle('write-addon', generateAddon(GRegistry, UIRegistry));
        server.handle('sync-files', syncDevFilesServer);
    }
}
export { server, client };
