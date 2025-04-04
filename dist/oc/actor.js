export class Actor {
    target;
    manager;
    constructor(target, manager) {
        this.target = target;
        this.manager = manager;
    }
    static from(target, manager) {
        return new Actor(target, manager);
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
