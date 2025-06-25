import { Entity, world, system, StartupEvent, Player } from "@minecraft/server"
import { Minecraft, MinecraftMethod } from "./decorator.js"
import { Level, Scheduler } from "../level.js"
import { ComponentManager } from "../core.js"
import { finalize, GameInstance, getGameInstance, getGameInstanceClass, initialize } from "../arch.js"
import { Optional } from "../optional.js"

export class MinecraftTickingScheduler implements Scheduler<string> {

    private _run: number = 0
    private _currentTick = 0
    private _timeStamp = 0

    get currentTick(): number {
        return this._currentTick
    }

    _handleTick(table: Map<string, ComponentManager<any>>, dt: number) {
        for (const [ id, manager ] of table.entries()) {
            const entity = world.getEntity(id)
            if (entity) {
                manager.handleTicks(entity, dt)
            }
        }
    }

    executeTick(table: Map<string, ComponentManager<any>>): void {
        if (!this.timeDilation) {
            return
        }

        const prev = this._currentTick
        const cur = this._currentTick += this.timeDilation

        if (cur - prev < 1) {
            return
        }

        const lastTickTime = this._timeStamp
        const currentTime = (this._timeStamp = Date.now())
        const dt = (currentTime - lastTickTime) * this.timeDilation

        this._handleTick(table, dt)
    }

    start(table: Map<string, ComponentManager<any>>): void {
        this._timeStamp = Date.now()
        this._run = system.runInterval(this.executeTick.bind(this, table))
    }

    stop(): void {
        system.clearRun(this._run)
    }

    timeDilation: number = 1

}

export class MinecraftLevel extends Level<Entity> {
    readonly scheduler = new MinecraftTickingScheduler()

    getScheduler(): Scheduler<Entity> {
        return this.scheduler
    }
}

@Minecraft
export class MinecraftGameInstance implements GameInstance {
    level?: Level<Entity>

    setLevel(lvl: Level<Entity>): Level<Entity> {
        this.level?.stop?.()
        lvl.start()
        return this.level = lvl as Level<Entity>
    }

    getLevel(): Level<Entity> {
        return this.level as Level<Entity>
    }

    onStart(ev: StartupEvent): void {
        this.setLevel(new MinecraftLevel())
    }

    shutdown(): void {
        this.level?.stop?.()
    }
}

export class oc {

    @MinecraftMethod
    static toPlayer(entity: Entity): Optional<Player> {
        return Optional.some(world.getAllPlayers().find(p => p.id === entity.id) as Player)
    }

    @MinecraftMethod
    static start() {
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
        if (world?.beforeEvents?.worldInitialize) {
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