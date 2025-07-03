import { GRegistry } from "@sapdon/core/registry.js";
import { serialize, Serializer } from "../../../utils/index.js"

/**
 * 表示 Minecraft 插件中的渲染控制器组。
 * 该类用于管理一组渲染控制器，并提供添加、设置和转换为 JSON 的方法。
 */
export class AddonRenderControllerGroup {
    static id = 0
    /**
     * 创建一个新的 AddonRenderControllerGroup 实例。
     * @param {string} format_version - 渲染控制器的格式版本。
     * @param {Map} [render_controllers] - 渲染控制器的 Map（可选）。默认为空 Map。
     */
    constructor(format_version, render_controllers) {
        /**
         * 渲染控制器的格式版本。
         * @type {string}
         */
        this.format_version = format_version;

        /**
         * 渲染控制器的 Map，键为标识符，值为渲染控制器。
         * @type {Map<string, AddonRenderController>}
         */
        this.render_controllers = render_controllers || new Map();

        GRegistry.register('render' + AddonRenderControllerGroup.id++, 'resource', 'render_controllers/', this)
    }

    /**
     * 设置或更新组中的渲染控制器。
     * @param {string} identifier - 渲染控制器的唯一标识符。
     * @param {AddonRenderController} render_controller - 要添加或更新的渲染控制器。
     */
    setRenderController(identifier, render_controller) {
        this.render_controllers.set(identifier, render_controller);
        return this; // 支持链式调用
    }

    /**
     * 使用渲染控制器的标识符将其添加到组中。
     * @param {AddonRenderController} render_controller - 要添加的渲染控制器。
     */
    addRenderController(render_controller) {
        this.render_controllers.set(render_controller.name, serialize(render_controller));
        return this; // 支持链式调用
    }

    /**
     * 将渲染控制器组转换为 JSON 对象。
     * @returns {Object} - 渲染控制器组的 JSON 表示。
     */
    @Serializer
    toObject() {
        return {
            format_version: this.format_version,
            render_controllers: Object.fromEntries(this.render_controllers)
        };
    }
}

/**
 * 表示 Minecraft 插件中的渲染控制器。
 * 该类定义了用于渲染实体的几何体、材质、纹理和数组。
 */
export class AddonRenderController {
    /**
     * 创建一个新的 AddonRenderController 实例。
     * @param {string} name - 渲染控制器的名称。
     */
    constructor(name) {
        /**
         * 渲染控制器的名称。
         * @type {string}
         */
        this.name = `controller.render.${name}`;

        /**
         * 数组集合（例如纹理、几何体）。
         * @type {Object}
         */
        this.arrays = {};

        /**
         * 用于渲染的默认几何体。
         * @type {string}
         */
        this.geometry = "Geometry.default";

        /**
         * 用于渲染的材质列表。
         * @type {Array<string>}
         */
        this.materials = [];

        /**
         * 用于渲染的纹理列表。
         * @type {Array<string>}
         */
        this.textures = [];
    }

    /**
     * 设置渲染控制器的默认几何体。
     * @param {`geometry.${string}`} geometry - 要设置的几何体。
     */
    setGeometry(geometry) {
        this.geometry = geometry;
        return this; // 支持链式调用
    }

    /**
     * 向材质列表中添加一个材质。
     * @template T
     * @param {import("../../type.js").MaterialDesc<T>} material - 要添加的材质。
     */
    addMaterial(material) {
        this.materials.push(material);
        return this; // 支持链式调用
    }

    /**
     * 向纹理列表中添加一个纹理。
     * @param {`texture.${string}`} texture - 要添加的纹理。
     */
    addTexture(texture) {
        this.textures.push(texture);
        return this; // 支持链式调用
    }

    /**
     * 注册一个数组。
     * @param {string} name - 数组的名称。
     * @param {Array} array - 要注册的数组。
     */
    registerArray(name, array) {
        this.arrays[`Array.${name}`] = { [name]: array };
        return this; // 支持链式调用
    }

    /**
     * 注册几何体数组。
     * @param {Array} array - 要注册的几何体数组。
     */
    registerGeometriesArray(array) {
        this.registerArray("geometries", array);
        return this; // 支持链式调用
    }

    /**
     * 注册纹理数组。
     * @param {Array} array - 要注册的纹理数组。
     */
    registerTexturesArray(array) {
        this.registerArray("textures", array);
        return this; // 支持链式调用
    }

    /**
     * 将渲染控制器转换为 JSON 对象。
     * @returns {Object} - 渲染控制器的 JSON 表示。
     */
    @Serializer
    toObject() {
        return {
                arrays: this.arrays,
                geometry: this.geometry,
                materials: this.materials,
                textures: this.textures
        };
    }
}

/*
// 示例用法
const renderControllerGroup = new AddonRenderControllerGroup("1.10.0");

const renderController = new AddonRenderController("custom_entity");
renderController.setGeometry("Geometry.custom");
renderController.addMaterial("Material.default");
renderController.addTexture("Texture.default");
renderController.registerTexturesArray(["Texture.variant_1", "Texture.variant_2"]);

renderControllerGroup.addRenderController(renderController);

console.log(JSON.stringify(renderControllerGroup.@Serializer
    toObject(), null, 4));
*/