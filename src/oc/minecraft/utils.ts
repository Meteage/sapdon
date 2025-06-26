import { Entity, Player, world, system } from "@minecraft/server"
import { getGameInstanceClass, initialize, getGameInstance, finalize } from "../arch.js"
import { Optional } from "../optional.js"
import { assertInMinecraft } from "./decorator.js"

export function MinecraftMethod(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const fn = descriptor.value
    descriptor.value = (...args: any[]) => {
        assertInMinecraft()
        return fn.apply(target, args)
    }

    return descriptor
}

class Utils {

    @MinecraftMethod
    toPlayer(entity: Entity): Optional<Player> {
        return Optional.some(world.getAllPlayers().find(p => p.id === entity.id) as Player)
    }

    @MinecraftMethod
    start() {
        // @minecraft/server 2.0.0 and higher
        if (system?.beforeEvents?.startup) {
            system.beforeEvents.startup.subscribe(ev => {
                const gameInstanceCls = getGameInstanceClass()
                if (!gameInstanceCls) {
                    throw new Error("No game instance class found")
                }
    
                initialize(gameInstanceCls, ev)
            })
    
            system.beforeEvents.shutdown.subscribe(ev => {
                const gameInstance = getGameInstance()
                if (gameInstance) {
                    finalize(gameInstance)
                }  
            })
        }

        // @minecraft/server 1.18.0 and lower
        //@ts-ignore
        if (world?.beforeEvents?.worldInitialize) {
            //@ts-ignore
            world.beforeEvents.worldInitialize.subscribe(ev => {
                const gameInstanceCls = getGameInstanceClass()
                if (!gameInstanceCls) {
                    throw new Error("No game instance class found")
                }

                initialize(gameInstanceCls, ev)
            })
        }

    }

}

export const utils = new Utils()