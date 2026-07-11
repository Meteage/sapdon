import { GRegistry } from "@sapdon/core/registry.js";
import { serialize, Serializer } from "../../../utils/index.js"

export class AddonRenderControllerGroup {
    static id = 0
    format_version: string
    render_controllers: Map<string, AddonRenderController>

    constructor(format_version: string, render_controllers?: Map<string, AddonRenderController>) {
        this.format_version = format_version;
        this.render_controllers = render_controllers || new Map();
        GRegistry.register('render' + AddonRenderControllerGroup.id++, 'resource', 'render_controllers/', this)
    }

    setRenderController(identifier: string, render_controller: AddonRenderController): this {
        this.render_controllers.set(identifier, render_controller);
        return this;
    }

    addRenderController(render_controller: AddonRenderController): this {
        this.render_controllers.set(render_controller.name, serialize(render_controller));
        return this;
    }

    @Serializer
    toObject(): Record<string, any> {
        return {
            format_version: this.format_version,
            render_controllers: Object.fromEntries(this.render_controllers)
        };
    }
}

export class AddonRenderController {
    name: string
    arrays: Record<string, any>
    geometry: string
    materials: string[]
    textures: string[]

    constructor(name: string) {
        this.name = `controller.render.${name}`;
        this.arrays = {};
        this.geometry = "Geometry.default";
        this.materials = [];
        this.textures = [];
    }

    setGeometry(geometry: string): this {
        this.geometry = geometry;
        return this;
    }

    addMaterial(material: string): this {
        this.materials.push(material);
        return this;
    }

    addTexture(texture: string): this {
        this.textures.push(texture);
        return this;
    }

    registerArray(name: string, array: any[]): this {
        this.arrays[`Array.${name}`] = { [name]: array };
        return this;
    }

    registerGeometriesArray(array: any[]): this {
        this.registerArray("geometries", array);
        return this;
    }

    registerTexturesArray(array: any[]): this {
        this.registerArray("textures", array);
        return this;
    }

    @Serializer
    toObject(): Record<string, any> {
        return {
            arrays: this.arrays,
            geometry: this.geometry,
            materials: this.materials,
            textures: this.textures
        };
    }
}
