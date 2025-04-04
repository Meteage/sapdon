import { world, system, InputButton, ButtonState } from '@minecraft/server';

class Optional {
    value;
    static none() {
        return new Optional(null);
    }
    static some(value) {
        return new Optional(value);
    }
    constructor(value) {
        this.value = value;
    }
    unwrap() {
        if (!this.isEmpty()) {
            return this.value;
        }
        throw new Error('Optional is empty');
    }
    isEmpty() {
        return this.value === undefined || this.value === null;
    }
    orElse(other) {
        return this.value ?? other;
    }
    use(fn, self) {
        if (!this.isEmpty()) {
            fn.call(self, this.value);
            return true;
        }
        return false;
    }
}

const REFLECT_MANAGER = Symbol('reflect-manager');
const REFLECT_ENTITY = Symbol('reflect-entity');
class CustomComponent {
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
class BaseComponent extends CustomComponent {
    onAttach(manager) { }
    onDetach(manager) { }
}
class ComponentManager {
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
function RequireComponents(...params) {
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
var oc;
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

class Actor {
    target;
    manager;
    constructor(target) {
        this.target = target;
        this.manager = oc.getManager(target.id);
    }
    static from(target) {
        return new Actor(target);
    }
    /**
     * 优先使用 `Actor.getComponent`
     * @param ctors
     * @returns
     */
    getMinecraftComponent(...ids) {
        return ids.map(id => this.target.getComponent(id));
    }
    /**
     * 优先使用 `Actor.getComponent`
     * @param ctors
     * @returns
     */
    getCustomComponent(...ctors) {
        return this.manager.getComponents(...ctors);
    }
    getComponent(...descs) {
        return descs.map(desc => {
            if (typeof desc === 'string') {
                return this.target.getComponent(desc);
            }
            return this.manager.getComponentUnsafe(desc);
        });
    }
    addComponent(...components) {
        return this.manager.attachComponent(...components);
    }
    removeComponent(ctor) {
        return this.manager.detachComponent(ctor);
    }
    updateComponent(ctor, fn) {
        return this.manager.update(ctor, fn);
    }
}

var InputChangeState;
(function (InputChangeState) {
    InputChangeState[InputChangeState["Press"] = 0] = "Press";
    InputChangeState[InputChangeState["Release"] = 1] = "Release";
    InputChangeState[InputChangeState["None"] = 2] = "None";
})(InputChangeState || (InputChangeState = {}));
/**
 * `@minecraft/server` version 2.0.0-beta
 * 低于此版本请不要使用此组件
 */
class PlayerInputComponent extends BaseComponent {
    ;
    [InputButton.Jump] = InputChangeState.None;
    [InputButton.Sneak] = InputChangeState.None;
    static setup() {
        world.afterEvents.playerButtonInput.subscribe(e => {
            const manager = oc.getManager(e.player.id);
            const playerInput = manager.getComponent(PlayerInputComponent);
            playerInput.use(playerInput => {
                playerInput[e.button] = e.newButtonState === ButtonState.Pressed ? InputChangeState.Press : InputChangeState.Release;
                manager.afterTick(() => {
                    playerInput[e.button] = InputChangeState.None;
                });
            });
        });
    }
}
/**
 * `@minecraft/server` version 1.17.0-beta
 * 有 1tick 延迟
 * 条件允许请使用 `PlayerInputComponent`
 */
class PlayerInputCompatibilityComponent extends BaseComponent {
    ;
    [InputButton.Jump] = InputChangeState.None;
    [InputButton.Sneak] = InputChangeState.None;
    _lastJump = ButtonState.Released;
    _lastSneak = ButtonState.Released;
    onTick(manager, en) {
        const player = oc.toPlayer(en.unwrap()).unwrap();
        const jump = player.inputInfo.getButtonState(InputButton.Jump);
        const sneak = player.inputInfo.getButtonState(InputButton.Sneak);
        if (jump === ButtonState.Pressed && this._lastJump === ButtonState.Released) {
            this[InputButton.Jump] = InputChangeState.Press;
        }
        else if (jump === ButtonState.Released && this._lastJump === ButtonState.Pressed) {
            this[InputButton.Jump] = InputChangeState.Release;
        }
        else {
            this[InputButton.Jump] = InputChangeState.None;
        }
        if (sneak === ButtonState.Pressed && this._lastSneak === ButtonState.Released) {
            this[InputButton.Sneak] = InputChangeState.Press;
        }
        else if (sneak === ButtonState.Released && this._lastSneak === ButtonState.Pressed) {
            this[InputButton.Sneak] = InputChangeState.Release;
        }
        else {
            this[InputButton.Sneak] = InputChangeState.None;
        }
        this._lastJump = jump;
        this._lastSneak = sneak;
    }
}

export { Actor, BaseComponent, ComponentManager, CustomComponent, InputChangeState, Optional, PlayerInputCompatibilityComponent, PlayerInputComponent, RequireComponents, oc };
