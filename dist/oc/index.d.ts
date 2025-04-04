import * as _minecraft_server from '@minecraft/server';
import { Entity, Player, InputButton } from '@minecraft/server';

declare class Optional<T = any> {
    private value;
    static none<T>(): Optional<T>;
    static some<T>(value?: T): Optional<T>;
    constructor(value: T);
    unwrap(): T;
    isEmpty(): boolean;
    orElse(other: T): T;
    use(fn: (v: T) => void, self?: any): boolean;
}

interface Component {
    onTick(manager: ComponentManager, en: Optional<Entity>): void;
    detach(manager: ComponentManager): void;
    getManager(): ComponentManager;
    getEntity(): Optional<Entity>;
}
interface BasicComponent extends Component {
    onAttach(manager: ComponentManager): boolean | void | Promise<boolean | void>;
    onDetach(manager: ComponentManager): void | Promise<void>;
}
declare const REFLECT_MANAGER: unique symbol;
declare const REFLECT_ENTITY: unique symbol;
declare class CustomComponent implements Component {
    [REFLECT_MANAGER]?: ComponentManager;
    [REFLECT_ENTITY]: Optional<Entity>;
    onTick(manager: ComponentManager, en: Optional<Entity>): void;
    detach(manager: ComponentManager): Promise<boolean>;
    getManager(): ComponentManager;
    getEntity(): Optional<Entity>;
}
declare class BaseComponent extends CustomComponent implements BasicComponent {
    onAttach(manager: ComponentManager): boolean | void | Promise<boolean | void>;
    onDetach(manager: ComponentManager): void | Promise<void>;
}
interface ComponentCtor<T extends Component | BasicComponent = Component> {
    new (...args: any[]): T;
}
declare class ComponentManager {
    #private;
    static profilerEnable: boolean;
    static readonly global: ComponentManager;
    getComponentUnsafe(ctor: ComponentCtor): Component | undefined;
    getComponent<T extends Component>(ctor: ComponentCtor<T>): Optional<T>;
    getComponents(...ctor: ComponentCtor[]): (Component | undefined)[];
    attachComponent(...component: Component[]): Promise<Optional<Component>[]>;
    getOrCreate<T extends Component>(ctor: ComponentCtor<T>, ...args: any[]): Promise<Optional<T>>;
    detachComponent(ctor: ComponentCtor): Promise<boolean>;
    clear(): void;
    getComponentKeys(): MapIterator<ComponentCtor<Component>>;
    has(ctor: ComponentCtor): boolean;
    afterTick(fn: (en: Optional<Entity>) => void): void;
    beforeTick(fn: (en: Optional<Entity>) => void): void;
    handleTicks(en: Entity): void;
    update<T extends Component>(ctor: ComponentCtor<T>, fn: (component: T) => void): boolean;
    profiler(fn: Function, component?: Component, name?: string): any;
}
type RequireComponentsParam = ComponentCtor | [ComponentCtor, ...any[]];
declare const REQUIRED_COMPONENTS: unique symbol;
interface RequiredComponent extends BasicComponent {
    getComponent<T extends Component>(ctor: ComponentCtor): T;
}
declare function RequireComponents(...params: RequireComponentsParam[]): {
    new (): {
        getComponent<T extends Component>(ctor: ComponentCtor): T;
        [REQUIRED_COMPONENTS]: Map<ComponentCtor<Component>, Component>;
        onAttach(manager: ComponentManager): boolean | void | Promise<boolean | void>;
        onDetach(manager: ComponentManager): void | Promise<void>;
        onTick(manager: ComponentManager, en: Optional<Entity>): void;
        detach(manager: ComponentManager): Promise<boolean>;
        getManager(): ComponentManager;
        getEntity(): Optional<Entity>;
        [REFLECT_MANAGER]?: ComponentManager;
        [REFLECT_ENTITY]: Optional<Entity>;
    };
};
declare namespace oc {
    function addEntity(entityId: string): ComponentManager;
    function removeEntity(entityId: string): void;
    function getManager(entityId: string): ComponentManager;
    function tick(): void;
    function start(): void;
    function toPlayer(entity: Entity): Optional<Player>;
}

type ComponentDescriptor = string | ComponentCtor;
declare class Actor {
    readonly target: Entity;
    readonly manager: ComponentManager;
    constructor(target: Entity);
    static from(target: Entity): Actor;
    /**
     * 优先使用 `Actor.getComponent`
     * @param ctors
     * @returns
     */
    getMinecraftComponent(...ids: string[]): (_minecraft_server.EntityComponent | undefined)[];
    /**
     * 优先使用 `Actor.getComponent`
     * @param ctors
     * @returns
     */
    getCustomComponent(...ctors: ComponentCtor[]): (Component | undefined)[];
    getComponent<T extends readonly ComponentDescriptor[] | []>(...descs: T): {
        -readonly [K in keyof T]: Component;
    };
    addComponent(...components: Component[]): Promise<Optional<Component>[]>;
    removeComponent(ctor: ComponentCtor): Promise<boolean>;
    updateComponent<T extends Component>(ctor: ComponentCtor<T>, fn: (component: T) => void): boolean;
}

declare enum InputChangeState {
    Press = 0,
    Release = 1,
    None = 2
}
/**
 * `@minecraft/server` version 2.0.0-beta
 * 低于此版本请不要使用此组件
 */
declare class PlayerInputComponent extends BaseComponent {
    [InputButton.Jump]: InputChangeState;
    [InputButton.Sneak]: InputChangeState;
    static setup(): void;
}
/**
 * `@minecraft/server` version 1.17.0-beta
 * 有 1tick 延迟
 * 条件允许请使用 `PlayerInputComponent`
 */
declare class PlayerInputCompatibilityComponent extends BaseComponent {
    [InputButton.Jump]: InputChangeState;
    [InputButton.Sneak]: InputChangeState;
    private _lastJump;
    private _lastSneak;
    onTick(manager: ComponentManager, en: Optional<Entity>): void;
}

export { Actor, BaseComponent, type BasicComponent, type Component, type ComponentCtor, type ComponentDescriptor, ComponentManager, CustomComponent, InputChangeState, Optional, PlayerInputCompatibilityComponent, PlayerInputComponent, RequireComponents, type RequiredComponent, oc };
