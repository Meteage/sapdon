import { Serializer } from "../../../utils/index.js"

export class AddonAttachable {
    format_version: string
    definitions: AddonAttachableDefinition

    constructor(format_version: string, definitions: AddonAttachableDefinition) {
        this.format_version = format_version;
        this.definitions = definitions;
    }

    @Serializer
    toObject(): Record<string, any> {
        return {
            format_version: this.format_version,
            ["minecraft:attachable"]: this.definitions
        };
    }
}

export class AddonAttachableDefinition {
    description: AddonAttachableDescription

    constructor(description: AddonAttachableDescription) {
        this.description = description;
    }
}

export class AddonAttachableDescription {
    identifier: string
    materials?: Record<string, string>
    textures?: Record<string, string>
    geometry?: Record<string, string>
    animations?: Record<string, string>
    animation_controllers?: Record<string, string>[]
    render_controllers?: string[]
    locators?: Record<string, any>
    scripts?: Record<string, any>

    constructor(identifier: string) {
        this.identifier = identifier;
    }

    addMaterial(name: string, material: string): this {
        if (this.materials == undefined) this.materials = {};
        this.materials[name] = material;
        return this;
    }

    addTexture(name: string, texture: string): this {
        if (this.textures == undefined) this.textures = {};
        this.textures[name] = texture;
        return this;
    }

    addGeometry(name: string, geometry: string): this {
        if (this.geometry == undefined) this.geometry = {};
        this.geometry[name] = geometry;
        return this;
    }

    addAnimation(name: string, animation: string): this {
        if (this.animations == undefined) this.animations = {};
        this.animations[name] = animation;
        return this;
    }

    addAnimationController(name: string, controller: string): this {
        if (this.animation_controllers == undefined) this.animation_controllers = [];
        this.animation_controllers.push({ [name]: controller });
        return this;
    }

    addRenderController(controller: string): this {
        if (this.render_controllers == undefined) this.render_controllers = [];
        this.render_controllers.push(controller);
        return this;
    }

    addLocator(name: string, locator: any): this {
        if (this.locators == undefined) this.locators = {};
        this.locators[name] = locator;
        return this;
    }

    setScript(key: string, value: string): this {
        if (this.scripts == undefined) this.scripts = {};
        this.scripts[key] = value;
        return this;
    }
}
