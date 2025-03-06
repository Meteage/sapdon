export function startDevServer(): http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
export const port: 49037;
export namespace server {
    export { startDevServer };
    export function handle(url: any, handler: any): void;
}
import http from 'http';
