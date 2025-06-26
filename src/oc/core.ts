import { Optional } from './optional.js'

export interface Component<Actor> {
    onTick(dt: number): void
    detach(): void
    getManager(): ComponentManager<Actor>
    getEntity(): Optional<Actor>
}

export interface BasicComponent<Actor> extends Component<Actor> {
    onAttach(manager: ComponentManager<Actor>): boolean | void | Promise<boolean|void>
    onDetach(manager: ComponentManager<Actor>): void | Promise<void>
}

const REFLECT_MANAGER = Symbol('reflect-manager')
const REFLECT_ENTITY = Symbol('reflect-entity')

export class CustomComponent<Actor> implements Component<Actor> {
    [REFLECT_MANAGER]?: ComponentManager<Actor>
    [REFLECT_ENTITY]: Optional<Actor> = Optional.none()

    onTick(dt: number): void {}

    detach() {
        const ctor = Object.getPrototypeOf(this).constructor
        return this.getManager().detachComponent(ctor)
    }

    getManager(): ComponentManager<Actor> {
        return this[REFLECT_MANAGER] as ComponentManager<Actor>
    }

    getEntity(): Optional<Actor> {
        return this[REFLECT_ENTITY] as Optional<Actor>
    }

    lazyGet<T extends ComponentCtor<unknown>>(ctor: T) {
        return lazyGet(this, ctor)
    }
}

export class BaseComponent<Actor> extends CustomComponent<Actor> implements BasicComponent<Actor> {
    onAttach(manager: ComponentManager<Actor>): boolean | void | Promise<boolean|void> {}
    onDetach(manager: ComponentManager<Actor>): void | Promise<void> {}
}

export interface ComponentCtor<Actor, T extends Component<Actor> | BasicComponent<Actor> = Component<Actor>> {
    new(...args: any[]): T
}

export class ComponentManager<Actor> {
    static profilerEnable = false
    static readonly global = new ComponentManager()

    #components = new Map<ComponentCtor<Actor>, Component<Actor>>()
    #prependTicks: Function[] = []
    #nextTicks: Function[] = []

    getComponentUnsafe(ctor: ComponentCtor<Actor>) {
        return this.#components.get(ctor)
    }

    getComponent<T extends Component<Actor>>(ctor: ComponentCtor<Actor, T>): Optional<T> {
        return Optional.some(this.#components.get(ctor)) as Optional<T>
    }

    getComponents(...ctor: ComponentCtor<Actor>[]): (Component<Actor>|undefined)[] {
        return ctor.map(c => this.#components.get(c))
    }

    #attachComponent<T>(ctor: ComponentCtor<Actor>, component: Component<Actor> | BasicComponent<Actor>, shouldRebuild=true): Optional<T> {
        //@ts-ignore
        if (!component[REFLECT_MANAGER]) {
            //@ts-ignore
            component[REFLECT_MANAGER] = this
        }

        let init = !this.#components.get(ctor)

        if (!init && shouldRebuild) {
            this.detachComponent(ctor) 
            init = true
        }

        if (REQUIRED_COMPONENTS in component) {
            //@ts-ignore
            for (const [ ctor, comp ] of component[REQUIRED_COMPONENTS]) {
                this.#attachComponent(ctor, comp, false)
            }
        }

        if (init && 'onAttach' in component) {
            component.onAttach(this)   
        }

        this.#components.set(ctor, component)
        return Optional.some(component) as Optional<T>
    }

    attachComponent(...component: Component<Actor>[]) {
        const components: Optional<Component<Actor>>[] = []
        for (const obj of component) {
            components.push(this.#attachComponent(
                Object.getPrototypeOf(obj).constructor,
                obj
            ))
        }

        return components
    }

    async getOrCreate<T extends Component<Actor>>(ctor: ComponentCtor<Actor, T>, ...args: any[]): Promise<Optional<T>> {
        let component = this.#components.get(ctor) as T

        if (component) {
            return Optional.some(component)
        }

        return this.#attachComponent(ctor, new ctor(...args))
    }

    detachComponent(ctor: ComponentCtor<Actor>) {
        const component = this.#components.get(ctor) as BasicComponent<Actor>
        if (component && 'onDetach' in component) {
            component.onDetach(this)
        }

        return this.#components.delete(ctor)
    }

    clear() {
        this.#components.clear()
    }

    getComponentKeys() {
        return this.#components.keys()
    }

    has(ctor: ComponentCtor<Actor>) {
        return this.#components.has(ctor)
    }

    afterTick(fn: (en: Optional<Actor>) => void) {
        this.#nextTicks.push(fn)
    }

    beforeTick(fn: (en: Optional<Actor>) => void) {
        this.#prependTicks.unshift(fn)
    }

    handleTicks(en: Actor, dt: number) {
        for (const prependTick of this.#prependTicks) {
            this.profiler(() => prependTick.call(null, Optional.some(en)))
            // prependTick.call(null, Optional.some(en))
        }
        this.#prependTicks.length = 0

        for (const component of this.#components.values()) {

            //@ts-ignore
            if (component[REFLECT_ENTITY].isEmpty()) {
                //@ts-ignore
                component[REFLECT_ENTITY] = Optional.some(en)
            }

            const { onTick } = component

            if (onTick) {
                this.profiler(
                    () => onTick.call(component, dt),
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

    update<T extends Component<Actor>>(ctor: ComponentCtor<Actor, T>, fn: (component: T) => void) {
        const component = this.#components.get(ctor)

        if (component) {
            fn(component as T)
            return true
        }

        return false
    }

    profiler(fn: Function, component?: Component<Actor>, name?: string) {
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

type RequireComponentsParam<Actor> = ComponentCtor<Actor> | [ComponentCtor<Actor>, ...any[]]
const REQUIRED_COMPONENTS = Symbol('REQUIRED_COMPONENTS')

export interface RequiredComponent<Actor> extends BasicComponent<Actor> {
    getComponent<T extends Component<Actor>>(ctor: ComponentCtor<Actor>): T
}

export function RequireComponents<Actor>(...params: RequireComponentsParam<Actor>[]) {
    return class CRequiredComponent extends BaseComponent<Actor> implements RequiredComponent<Actor> {
        [REQUIRED_COMPONENTS] = new Map<ComponentCtor<Actor>, Component<Actor>>()
        
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
    
        getComponent<T extends Component<Actor>>(ctor: ComponentCtor<Actor>): T {
            return this[REQUIRED_COMPONENTS].get(ctor) as T
        }
    }
    
}

/**
 * 使用前请保证组件已存在
 * @param manager 
 * @param ctor 
 * @returns 
 */
export function lazyGet<T extends ComponentCtor<unknown>>(component: Component<unknown>, ctor: T): InstanceType<T> {
    let inst: any = null
    return new Proxy(Object.prototype, {
        get(_, p) {
            if (inst) {
                return inst[p]
            }

            inst = component.getManager().getComponentUnsafe(ctor as any)
            return inst[p]
        },
        set(_, p, v) {
            if (inst) {
                inst[p] = v
                return true
            }

            inst = component.getManager().getComponentUnsafe(ctor as any)
            inst[p] = v
            return true
        }
    }) as InstanceType<T>
}