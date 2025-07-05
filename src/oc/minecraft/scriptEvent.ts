import { ScriptEventCommandMessageAfterEvent, system } from "@minecraft/server"
import EventEmitter from "../events/index.js"

const scriptEvents = new EventEmitter()

system.afterEvents.scriptEventReceive.subscribe(ev => {
    scriptEvents.emitNone(ev.id, ev)
})

export const ScriptEvent: {
    on: (evType: string, handler: (ev: ScriptEventCommandMessageAfterEvent) => void) => void
    off: (evType: string, handler: (ev: ScriptEventCommandMessageAfterEvent) => void) => void
    (evType: string): MethodDecorator
} = evType => (t, p) => {
    scriptEvents.on(evType, (t as any)[p])
}

ScriptEvent.on = (ev, handler) => {
    scriptEvents.on(ev, handler)
}

ScriptEvent.off = (ev, handler) => {
    scriptEvents.off(ev, handler)
}