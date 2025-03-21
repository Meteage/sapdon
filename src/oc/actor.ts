import type { Entity } from '@minecraft/server'
import { Component, ComponentCtor, ComponentManager, oc } from './core.js'

export type ComponentDescriptor = string | ComponentCtor

export class Actor {

    readonly manager: ComponentManager

    constructor(
        readonly target: Entity,
    ) {
        this.manager = oc.getManager(target.id)
    }

    static from(target: Entity) {
        return new Actor(target)
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

    getComponent<T extends readonly ComponentDescriptor[] | []>(...descs: T): { -readonly [K in keyof T]: Component } {
        return descs.map(desc => {
            if (typeof desc === 'string') {
                return this.target.getComponent(desc)
            }

            return this.manager.getComponentUnsafe(desc)
        }) as { -readonly [K in keyof T]: Component }
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