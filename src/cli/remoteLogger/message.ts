export enum LogLevel {
    Info = "info",
    Warning = "warn",
    Error = "error",
}

export interface Message {
    level: LogLevel
    message: string
    timeStamp: number
    stack?: string
}

export function createMessage(level: LogLevel, message: string, timeStamp: number, stack?: string): string {
    return JSON.stringify({
        level,
        message,
        timeStamp,
        stack,
    })
}