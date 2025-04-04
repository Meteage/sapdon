import http from 'http';
import { devServerConfig } from './config.js';
const { port } = devServerConfig;
class DevelopmentServer {
    cliServerHandlers = new Map();
    listening = false;
    isListening() {
        return this.listening;
    }
    bootstrap() {
        this.listening = true;
        const svr = http.createServer(async (req, res) => {
            const handler = this.cliServerHandlers.get((req.url ?? '/').slice(1));
            if (handler) {
                try {
                    const { promise, resolve, reject } = Promise.withResolvers();
                    let buf = Buffer.alloc(0);
                    req.on('data', chunk => buf = Buffer.concat([buf, chunk]));
                    req.on('end', () => {
                        try {
                            resolve(JSON.parse(buf));
                        }
                        catch (error) {
                            reject(error);
                        }
                    });
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
        }).listen(port, () => console.log(`Dev Server listening on port ${port}`));
        svr.on('error', () => this.listening = false);
        return svr;
    }
    handle(url, handler) {
        this.cliServerHandlers.set(url, handler);
    }
    getHandler(url) {
        return this.cliServerHandlers.get(url);
    }
    interceptHandler(url, interceptor) {
        const currentHandler = this.getHandler(url) ?? Function.prototype;
        const newHandler = interceptor(currentHandler);
        this.cliServerHandlers.set(url, newHandler);
        return newHandler;
    }
}
export const server = new DevelopmentServer();
