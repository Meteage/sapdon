import { Serializer } from "../../../utils/index.js"

export class AddonClientEntity {
    format_version: string
    definitions: AddonClientEntityDefinition

    constructor(format_version: string, definitions: AddonClientEntityDefinition) {
        this.format_version = format_version;
        this.definitions = definitions;
    }

    @Serializer
    toObject(): Record<string, any> {
        return {
            format_version: this.format_version,
            ["minecraft:client_entity"]: this.definitions
        };
    }
}

export class AddonClientEntityDefinition {
    description: AddonClientEntityDescription

    constructor(description: AddonClientEntityDescription) {
        this.description = description;
    }
}

export class AddonClientEntityDescription {
    identifier: string
    min_engine_version?: string
    particle_effects?: Record<string, any>
    materials?: Record<string, string>
    textures?: Record<string, string>
    geometry?: Record<string, string>
    animations?: Record<string, string>
    animation_controllers?: Record<string, string>[]
    render_controllers?: string[]
    locators?: Record<string, any>
    spawn_egg?: { texture: string; texture_index: number }
    scripts?: Record<string, any>

    constructor(identifier: string, min_engine_version?: string) {
        this.identifier = identifier;
        this.min_engine_version = min_engine_version;
    }

    addParticleEffect(name: string, particle: any): this {
        if (this.particle_effects == undefined) this.particle_effects = {};
        this.particle_effects[name] = particle;
        return this;
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

    setSpawnEgg(texture: string, texture_index: number): this {
        this.spawn_egg = {
            texture: texture,
            texture_index: texture_index
        };
        return this;
    }

    setScript(key: string, value: any): this {
        if (this.scripts == undefined) this.scripts = {};
        this.scripts[key] = value;
        return this;
    }
}
