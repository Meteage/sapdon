import http from 'http';
export const port = 49037;
const cliServerHandlers = new Map();
// server
export function startDevServer() {
    return http.createServer(async (req, res) => {
        const handler = cliServerHandlers.get(req.url.slice(1));
        if (handler) {
            try {
                const { promise, resolve } = Promise.withResolvers();
                let buf = Buffer.alloc(0);
                req.on('data', chunk => buf = Buffer.concat([buf, chunk]));
                req.on('end', () => resolve(JSON.parse(buf)));
                await handler(...promise);
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
}
export const server = {
    startDevServer,
    handle(url, handler) {
        cliServerHandlers.set(url, handler);
    }
};
