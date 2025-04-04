import { system, world } from '@minecraft/server';
import { Optional } from './optional.js';
const REFLECT_MANAGER = Symbol('reflect-manager');
const REFLECT_ENTITY = Symbol('reflect-entity');
export class CustomComponent {
    [REFLECT_MANAGER];
    [REFLECT_ENTITY] = Optional.none();
    onTick(manager, en) { }
    detach(manager) {
        const ctor = Object.getPrototypeOf(this).constructor;
        return manager.detachComponent(ctor);
    }
    getManager() {
        return this[REFLECT_MANAGER];
    }
    getEntity() {
        return this[REFLECT_ENTITY];
    }
}
export class BaseComponent extends CustomComponent {
    onAttach(manager) { }
    onDetach(manager) { }
}
export class ComponentManager {
    static profilerEnable = false;
    static global = new ComponentManager();
    #components = new Map();
    #prependTicks = [];
    #nextTicks = [];
    getComponentUnsafe(ctor) {
        return this.#components.get(ctor);
    }
    getComponent(ctor) {
        return Optional.some(this.#components.get(ctor));
    }
    getComponents(...ctor) {
        return ctor.map(c => this.#components.get(c));
    }
    async #attachComponent(ctor, component, shouldRebuild = true) {
        let init = !this.#components.get(ctor);
        if (!init && shouldRebuild) {
            await this.detachComponent(ctor);
            init = true;
        }
        if (REQUIRED_COMPONENTS in component) {
            //@ts-ignore
            for (const [ctor, comp] of component[REQUIRED_COMPONENTS]) {
                this.#attachComponent(ctor, comp, false);
            }
        }
        if (init && 'onAttach' in component) {
            await component.onAttach(this);
        }
        this.#components.set(ctor, component);
        return Optional.some(component);
    }
    async attachComponent(...component) {
        const components = [];
        for (const obj of component) {
            components.push(await this.#attachComponent(Object.getPrototypeOf(obj).constructor, obj));
        }
        return components;
    }
    async getOrCreate(ctor, ...args) {
        let component = this.#components.get(ctor);
        if (component) {
            return Optional.some(component);
        }
        return this.#attachComponent(ctor, new ctor(...args));
    }
    async detachComponent(ctor) {
        const component = this.#components.get(ctor);
        if (component && 'onDetach' in component) {
            await component.onDetach(this);
        }
        return this.#components.delete(ctor);
    }
    clear() {
        this.#components.clear();
    }
    getComponentKeys() {
        return this.#components.keys();
    }
    has(ctor) {
        return this.#components.has(ctor);
    }
    afterTick(fn) {
        this.#nextTicks.push(fn);
    }
    beforeTick(fn) {
        this.#prependTicks.unshift(fn);
    }
    handleTicks(en) {
        for (const prependTick of this.#prependTicks) {
            this.profiler(() => prependTick.call(null, Optional.some(en)));
            // prependTick.call(null, Optional.some(en))
        }
        this.#prependTicks.length = 0;
        for (const component of this.#components.values()) {
            //@ts-ignore
            if (!component[REFLECT_ENTITY]) {
                //@ts-ignore
                component[REFLECT_ENTITY] = Optional.some(en);
            }
            //@ts-ignore
            if (!component[REFLECT_MANAGER]) {
                //@ts-ignore
                component[REFLECT_MANAGER] = this;
            }
            const { onTick } = component;
            if (onTick) {
                this.profiler(() => onTick.call(component, this, Optional.some(en)), component);
                // onTick.call(component, this, Optional.some(en))
            }
        }
        for (const afterTick of this.#nextTicks) {
            this.profiler(() => afterTick.call(null, Optional.some(en)));
            // afterTick.call(null, Optional.some(en))
        }
        this.#nextTicks.length = 0;
    }
    update(ctor, fn) {
        const component = this.#components.get(ctor);
        if (component) {
            fn(component);
            return true;
        }
        return false;
    }
    profiler(fn, component, name) {
        if (!ComponentManager.profilerEnable) {
            return fn();
        }
        const conponentName = component ? Object.getPrototypeOf(component).constructor.name : '';
        const profileName = name ? name
            : conponentName ? (`${conponentName}.${fn.name}`)
                : fn.name;
        const now = performance.now();
        const val = fn();
        console.log(`[Profiler] ${profileName} took ${performance.now() - now}ms`);
        return val;
    }
}
const REQUIRED_COMPONENTS = Symbol('REQUIRED_COMPONENTS');
export function RequireComponents(...params) {
    return class CRequiredComponent extends BaseComponent {
        [REQUIRED_COMPONENTS] = new Map();
        constructor() {
            super();
            for (const param of params) {
                if (Array.isArray(param)) {
                    const [Ctor, ...args] = param;
                    this[REQUIRED_COMPONENTS].set(Ctor, Reflect.construct(Ctor, args));
                    continue;
                }
                this[REQUIRED_COMPONENTS].set(param, Reflect.construct(param, []));
            }
        }
        getComponent(ctor) {
            return this[REQUIRED_COMPONENTS].get(ctor);
        }
    };
}
export var oc;
(function (oc) {
    const table = new Map();
    function addEntity(entityId) {
        const manager = new ComponentManager();
        table.set(entityId, manager);
        return manager;
    }
    oc.addEntity = addEntity;
    function removeEntity(entityId) {
        const uid = entityId;
        const manager = table.get(uid);
        manager?.clear();
        table.delete(uid);
    }
    oc.removeEntity = removeEntity;
    function getManager(entityId) {
        return table.get(entityId) ?? addEntity(entityId);
    }
    oc.getManager = getManager;
    function tick() {
        for (const [id, manager] of table.entries()) {
            const entity = world.getEntity(id);
            if (entity) {
                manager.handleTicks(entity);
            }
        }
    }
    oc.tick = tick;
    function start() {
        system.runInterval(tick);
    }
    oc.start = start;
    function toPlayer(entity) {
        return Optional.some(world.getAllPlayers().find(p => p.id === entity.id));
    }
    oc.toPlayer = toPlayer;
})(oc || (oc = {}));
