export function bootstrap(): http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
export function startDevServer(): void;
export const port: 49037;
export namespace server {
    export { startDevServer };
    export function handle(url: any, handler: any): void;
}
import http from 'http';
