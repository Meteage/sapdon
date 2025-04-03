import { Message } from "./message.js"

export async function handleRemoteLogger({ level, message, timeStamp, stack }: Message) {
    console[level](message, stack, `\nat ${new Date(timeStamp).toLocaleString()}`)
}