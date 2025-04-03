import http from 'http'
import { devServerConfig } from './config.js'
import { decode } from '../../utils/index.js'

const {
    port
} = devServerConfig

type ServerHandler = (...args: any[]) => void | Promise<void>
type HandlerInterceptor = (handler: ServerHandler) => ServerHandler

class DevelopmentServer {

    readonly cliServerHandlers = new Map<string, ServerHandler>()
    listening = false

    isListening() {
        return this.listening
    }

    bootstrap() {
        this.listening = true
        const svr = http.createServer(async (req, res) => {
            const handler = this.cliServerHandlers.get((req.url ?? '/').slice(1))
            if (handler) {
                try {
                    const { promise, resolve, reject } = Promise.withResolvers()
                    let buf = Buffer.alloc(0)
                    req.on('data', chunk => buf = Buffer.concat([buf, chunk]))
                    req.on('end', () => {
                        try {
                            resolve(decode<Buffer, any>(buf as any))
                        } catch (error) {
                            reject(error)
                        }
                    })
                    await handler(...(await promise as any[]))
                } catch (error) {
                    console.error(error)
                    res.writeHead(500)
                    res.end()
                    return
                }
                res.writeHead(200)
                res.end()
            } else {
                res.writeHead(404)
                res.end()
            }
        }).listen(port, () => console.log(`Dev Server listening on port ${port}`))
    
        svr.on('error', () => this.listening = false)
    
        return svr
    }

    handle(url: string, handler: ServerHandler) {
        this.cliServerHandlers.set(url, handler)
    }

    getHandler(url: string) {
        return this.cliServerHandlers.get(url)
    }

    interceptHandler(url: string, interceptor: HandlerInterceptor): ServerHandler {
        const currentHandler = this.getHandler(url) ?? (Function.prototype as ServerHandler)
        const newHandler = interceptor(currentHandler)

        this.cliServerHandlers.set(url, newHandler)
        return newHandler
    }
}

export const server = new DevelopmentServer()