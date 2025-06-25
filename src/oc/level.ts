import { ComponentManager } from "./core.js"

export interface Scheduler<Actor> {
    get currentTick(): number
    start(table: Map<string, ComponentManager<Actor>>): void
    stop(): void
    timeDilation: number
}

export abstract class Level<T> {
    readonly table = new Map<string, ComponentManager<any>>()
    
    addEntity(entityId: string) {
        const manager = new ComponentManager()
        this.table.set(entityId, manager)
        return manager
    }
    
    removeEntity(entityId: string) {
        const uid = entityId
        const manager = this.table.get(uid)
        manager?.clear()
        this.table.delete(uid)
    }
    
    getManager(entityId: string) {
        return this.table.get(entityId) ?? this.addEntity(entityId)
    }

    abstract getScheduler(): Scheduler<T>

    start() {
        this.getScheduler().start(this.table)
    }

    stop() {
        this.getScheduler().stop()
    }
}