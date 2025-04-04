import http from 'http';
type ServerHandler = (...args: Transferable[]) => void;
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
export declare const server: DevelopmentServer;
export {};
