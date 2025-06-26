import { Entity, world, system, StartupEvent } from "@minecraft/server"
import { Minecraft } from "./decorator.js"
import { Level, Scheduler } from "../level.js"
import { ComponentManager } from "../core.js"
import { GameInstance } from "../arch.js"

@Minecraft
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

@Minecraft
export class MinecraftLevel extends Level<Entity> {
    readonly scheduler = new MinecraftTickingScheduler()

    getScheduler(): Scheduler<Entity> {
        return this.scheduler
    }
}

export abstract class MinecraftGameInstance implements GameInstance {
    level?: Level<Entity>

    setLevel(lvl: Level<Entity>): Level<Entity> {
        this.level?.stop?.()
        lvl.start()
        return this.level = lvl as Level<Entity>
    }

    getLevel(): Level<Entity> {
        return this.level as Level<Entity>
    }

    /**
     * 在 Startup 阶段完成时运行
     * @param ev 
     */
    onStart(ev: StartupEvent): void {
        this.setLevel(new MinecraftLevel())
        system.runTimeout(() => this.afterStart(), 1)
    }

    /**
     * 在 shutdown 阶段运行
     */
    shutdown(): void {
        this.level?.stop?.()
    }

    /**
     * 在 onStart 之后运行，用于绑定监听器等 (onStart时没有权限进行绑定)
     */
    afterStart(): void {}
}