import { Player, Entity } from '@minecraft/server'
import { Component, ComponentCtor, ComponentManager } from './core.js'
import { Optional } from './optional.js'

export type ComponentDescriptor = string | ComponentCtor

export class Actor {

    readonly isPlayer: boolean = false

    constructor(
        readonly target: Player | Entity,
        readonly manager: ComponentManager,
    ) {
        this.isPlayer = target.isValid()
            ? target.typeId === 'minecraft:player'
            : false
    }

    static from(target: Player | Entity, manager: ComponentManager) {
        return new Actor(target, manager)
    }

    /**
     * 优先使用 `Actor.getComponent`
     * @param ctors 
     * @returns 
     */
    getMinecraftComponent(...ids: string[]) {
        return ids.map(id => this.target.getComponent(id))
    }

    /**
     * 优先使用 `Actor.getComponent`
     * @param ctors 
     * @returns 
     */
    getCustomComponent(...ctors: ComponentCtor[]) {
        return this.manager.getComponents(...ctors)
    }

    getComponent(...descs: ComponentDescriptor[]) {
        return descs.map(desc => {
            if (typeof desc === 'string') {
                return this.target.getComponent(desc)
            }

            return this.manager.getComponentUnsafe(desc)
        })
    }

    addComponent(...components: Component[]) {
        return this.manager.attachComponent(...components)
    }

    removeComponent(ctor: ComponentCtor) {
        return this.manager.detachComponent(ctor)
    }

    updateComponent<T extends Component>(ctor: ComponentCtor<T>, fn: (component: T) => void) {
        return this.manager.update(ctor, fn)
    }
}