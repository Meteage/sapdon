import http from 'http';

type ServerHandler = (...args: (Uint8Array & string)[]) => void | Promise<void>;
type HandlerInterceptor = (handler: ServerHandler) => ServerHandler;
declare class DevelopmentServer {
    readonly cliServerHandlers: Map<string, ServerHandler>;
    listening: boolean;
    isListening(): boolean;
    bootstrap(): http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
    handle(url: string, handler: ServerHandler): void;
    getHandler(url: string): ServerHandler | undefined;
    interceptHandler(url: string, interceptor: HandlerInterceptor): ServerHandler;
}
declare const server: DevelopmentServer;

declare namespace client {
    function call(name: any, ...args: any[]): Promise<void>;
}

export { client, server as devServer };
