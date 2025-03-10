export function isListening(): boolean;
export function bootstrap(): http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
export namespace server {
    function handle(url: any, handler: any): void;
}
import http from 'http';
