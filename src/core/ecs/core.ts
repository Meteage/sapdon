import { Entity, Player } from '@minecraft/server'
import { Optional } from './optional.js'
import { Actor } from './actor.js'

export interface Component {
    onTick(manager: ComponentManager, en: Optional<Player|Entity>): void
    detach(manager: ComponentManager): void
    getManager(): ComponentManager
    getEntity(): Optional<Player|Entity>
}

export interface BasicComponent extends Component {
    onAttach(manager: ComponentManager): boolean | void | Promise<boolean|void>
    onDetach(manager: ComponentManager): void | Promise<void>
}

const REFLECT_MANAGER = Symbol('reflect-manager')
const REFLECT_ENTITY = Symbol('reflect-entity')

export class CustomComponent implements Component {
    [REFLECT_MANAGER]?: ComponentManager
    [REFLECT_ENTITY]: Optional<Player|Entity> = Optional.none()

    onTick(manager: ComponentManager, en: Optional<Player|Entity>): void {}

    detach(manager: ComponentManager) {
        const ctor = Object.getPrototypeOf(this).constructor
        return manager.detachComponent(ctor)
    }

    getManager(): ComponentManager {
        return this[REFLECT_MANAGER] as ComponentManager
    }

    getEntity(): Optional<Player|Entity> {
        return this[REFLECT_ENTITY]
    }
}

export class BaseComponent extends CustomComponent implements BasicComponent {
    onAttach(manager: ComponentManager): boolean | void | Promise<boolean|void> {}
    onDetach(manager: ComponentManager): void | Promise<void> {}
}

export interface ComponentCtor<T extends Component | BasicComponent = Component> {
    new(...args: any[]): T
}

export class ComponentManager {
    static profilerEnable = false
    static readonly global = new ComponentManager()

    #components = new Map<ComponentCtor, Component>()
    #prependTicks: Function[] = []
    #nextTicks: Function[] = []

    getComponentUnsafe(ctor: ComponentCtor) {
        return this.#components.get(ctor)
    }

    getComponent<T extends Component>(ctor: ComponentCtor<T>): Optional<T> {
        return Optional.some(this.#components.get(ctor)) as Optional<T>
    }

    getComponents(...ctor: ComponentCtor[]): (Component|undefined)[] {
        return ctor.map(c => this.#components.get(c))
    }

    async #attachComponent<T>(ctor: ComponentCtor, component: Component | BasicComponent, shouldRebuild=true): Promise<Optional<T>> {
        let init = !this.#components.get(ctor)

        if (!init && shouldRebuild) {
            await this.detachComponent(ctor) 
            init = true
        }

        if (REQUIRED_COMPONENTS in component) {
            //@ts-ignore
            for (const [ ctor, comp ] of component[REQUIRED_COMPONENTS]) {
                this.#attachComponent(ctor, comp, false)
            }
        }

        if (init && 'onAttach' in component) {
            await component.onAttach(this)   
        }

        this.#components.set(ctor, component)
        return Optional.some(component) as Optional<T>
    }

    async attachComponent(...component: Component[]) {
        const components: Optional<Component>[] = []
        for (const obj of component) {
            components.push(await this.#attachComponent(
                Object.getPrototypeOf(obj).constructor,
                obj
            ))
        }

        return components
    }

    async getOrCreate<T extends Component>(ctor: ComponentCtor<T>, ...args: any[]): Promise<Optional<T>> {
        let component = this.#components.get(ctor) as T

        if (component) {
            return Optional.some(component)
        }

        return this.#attachComponent(ctor, new ctor(...args))
    }

    async detachComponent(ctor: ComponentCtor) {
        const component = this.#components.get(ctor) as BasicComponent
        if (component && 'onDetach' in component) {
            await component.onDetach(this)
        }

        return this.#components.delete(ctor)
    }

    clear() {
        this.#components.clear()
    }

    getComponentKeys() {
        return this.#components.keys()
    }

    has(ctor: ComponentCtor) {
        return this.#components.has(ctor)
    }

    afterTick(fn: (en: Optional<Player|Entity>) => void) {
        this.#nextTicks.push(fn)
    }

    beforeTick(fn: (en: Optional<Player|Entity>) => void) {
        this.#prependTicks.unshift(fn)
    }

    handleTicks(en: Player|Entity) {
        for (const prependTick of this.#prependTicks) {
            this.profiler(() => prependTick.call(null, Optional.some(en)))
            // prependTick.call(null, Optional.some(en))
        }
        this.#prependTicks.length = 0

        for (const component of this.#components.values()) {

            //@ts-ignore
            if (!component[REFLECT_ENTITY]) {
                //@ts-ignore
                component[REFLECT_ENTITY] = Optional.some(en)
            }

            //@ts-ignore
            if (!component[REFLECT_MANAGER]) {
                //@ts-ignore
                component[REFLECT_MANAGER] = this
            }

            const { onTick } = component

            if (onTick) {
                this.profiler(
                    () => onTick.call(component, this, Optional.some(en)),
                    component
                )
                // onTick.call(component, this, Optional.some(en))
            }
        }

        for (const afterTick of this.#nextTicks) {
            this.profiler(() => afterTick.call(null, Optional.some(en)))
            // afterTick.call(null, Optional.some(en))
        }
        this.#nextTicks.length = 0
    }

    update<T extends Component>(ctor: ComponentCtor<T>, fn: (component: T) => void) {
        const component = this.#components.get(ctor)

        if (component) {
            fn(component as T)
            return true
        }

        return false
    }

    profiler(fn: Function, component?: Component, name?: string) {
        if (!ComponentManager.profilerEnable) {
            return fn()
        }

        const conponentName = component ? Object.getPrototypeOf(component).constructor.name : ''
        const profileName = name ? name 
            : conponentName ? (`${conponentName}.${fn.name}`)
                : fn.name

        const now = performance.now()
        const val = fn()
        console.log(`[Profiler] ${profileName} took ${performance.now() - now}ms`)
        return val
    }
}

type RequireComponentsParam = ComponentCtor | [ComponentCtor, ...any[]]
const REQUIRED_COMPONENTS = Symbol('REQUIRED_COMPONENTS')

export interface RequiredComponent extends BasicComponent {
    getComponent<T extends Component>(ctor: ComponentCtor): T
}

export function RequireComponents(...params: RequireComponentsParam[]) {
    return class CRequiredComponent extends BaseComponent implements RequiredComponent {
        [REQUIRED_COMPONENTS] = new Map<ComponentCtor, Component>()
        
        constructor() {
            super()
            for (const param of params) {
                if (Array.isArray(param)) {
                    const [ Ctor, ...args ] = param
                    this[REQUIRED_COMPONENTS].set(Ctor, Reflect.construct(Ctor, args))
                    continue
                }

                this[REQUIRED_COMPONENTS].set(param, Reflect.construct(param, []))
            }
        }
    
        getComponent<T extends Component>(ctor: ComponentCtor): T {
            return this[REQUIRED_COMPONENTS].get(ctor) as T
        }
    }
    
}

export namespace ecs {
    const table = new Map<string, ComponentManager>()

    export async function addEntity(entity: Player | Entity) {
        const manager = new ComponentManager()
        table.set(entity.id, manager)
        return manager
    }

    export function removeEntity(entity: Player | Entity) {
        const uid = entity.id
        const manager = table.get(uid)
        manager?.clear()
        table.delete(uid)
    }

    export function getManager(entity: Player | Entity) {
        return table.get(entity.id) ?? addEntity(entity)
    }


}