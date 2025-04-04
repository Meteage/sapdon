import { StartupEvent, system } from '@minecraft/server'
import { oc } from './core.js'
import { ConstructorOf } from '@sapdon/utils/index.js'

export interface GameInstance {
    onStart(ev: StartupEvent): void
    shutdown(): void
}

/**
 * 2.0.0
 * @param gameInstance 
 */
export function initialize(gameInstance: GameInstance) {
    // @ts-ignore
    system.beforeEvents.startup.subscribe(ev => {
        gameInstance.onStart(ev)
        oc.start()
    })

    system.beforeEvents.shutdown.subscribe(() => {
        gameInstance.shutdown()
    })
}

let gameInstance: GameInstance | undefined = undefined

export const GameInstance: ClassDecorator = (target: Function) => {
    if (!gameInstance) {
        gameInstance = new (target as ConstructorOf<GameInstance>)()
        initialize(gameInstance)
    }
}