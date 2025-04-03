import { post } from "../dev-server/client.js"
import { createMessage, LogLevel } from "./message.js"
import util from 'util'

export function sendMessage(level: LogLevel, ...args: any[]) {
    const timeStamp = performance.now()
    const message = util.format(...args)
    post('remote-logger', createMessage(level, message, timeStamp))
}

export function sendMessageWithStack(level: LogLevel, ...args: any[]) {
    const timeStamp = performance.now()
    const message = util.format(...args)
    const stack = new Error().stack
    post('remote-logger', createMessage(level, message, timeStamp, stack))
}

export namespace remoteLogger {
    export function info(...args: any[]) {
        sendMessage(LogLevel.Info, ...args)
    }

    export function log(...args: any[]) {
        sendMessage(LogLevel.Info, ...args)
    }

    export function warning(...args: any[]) {
        sendMessage(LogLevel.Warning, ...args)
    }

    export function error(...args: any[]) {
        sendMessageWithStack(LogLevel.Error, ...args)
    }
}