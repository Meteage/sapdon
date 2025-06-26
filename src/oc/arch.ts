import { Level } from './level.js'
import { ConstructorOf } from '../utils/type.js'

export interface GameInstance<A=any> {
    onStart(conf: any): void
    shutdown(): void
    setLevel(lvl: Level<A>): Level<A>
    getLevel(): Level<A>
}

let gameInstanceClass: ConstructorOf<GameInstance> | undefined = undefined
let gameInstance: GameInstance | undefined = undefined

export function initialize(gameInstanceCls: ConstructorOf<GameInstance>, conf: any = {}) {
    gameInstance = Reflect.construct(gameInstanceCls, [])
    gameInstance?.onStart?.(conf)
}

export function finalize(gameInstance: GameInstance) {
    gameInstance?.shutdown?.()
}

export const GameInstance = (target: Function) => {
    gameInstanceClass = target as ConstructorOf<GameInstance>
}

export function getGameInstanceClass() {
    return gameInstanceClass
}

export function getGameInstance() {
    return gameInstance
}