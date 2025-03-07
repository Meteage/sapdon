import http from 'http';
import { devServerConfig } from './config.js';
const { port } = devServerConfig;
const cliServerHandlers = new Map();
let listening = false;
export function isListening() {
    return listening;
}
// server
export function bootstrap() {
    listening = true;
    const svr = http.createServer(async (req, res) => {
        const handler = cliServerHandlers.get(req.url.slice(1));
        if (handler) {
            try {
                const { promise, resolve } = Promise.withResolvers();
                let buf = Buffer.alloc(0);
                req.on('data', chunk => buf = Buffer.concat([buf, chunk]));
                req.on('end', () => resolve(JSON.parse(buf)));
                await handler(...await promise);
            }
            catch (error) {
                console.error(error);
                res.writeHead(500);
                res.end();
                return;
            }
            res.writeHead(200);
            res.end();
        }
        else {
            res.writeHead(404);
            res.end();
        }
    }).listen(port);
    svr.on('error', () => listening = false);
    return svr;
}
export const server = {
    handle(url, handler) {
        cliServerHandlers.set(url, handler);
    }
};
