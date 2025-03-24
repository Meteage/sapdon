import { Serializer } from "@utils"
export class AddonClientEntity {
    /**
     * 客户端实体类
     * @param {string} format_version 格式版本
     * @param {AddonClientEntityDefinition} definitions 实体定义
     */
    constructor(format_version, definitions) {
        this.format_version = format_version;
        this.definitions = definitions;
    }

    /**
     * 将对象转换为 JSON 格式
     * @returns {Object} JSON 对象
     */
    @Serializer
    toObject() {
        return {
            format_version: this.format_version,
            ["minecraft:client_entity"]: this.definitions
        };
    }
}

export class AddonClientEntityDefinition {
    /**
     * 客户端实体定义类
     * @param {Description} description 实体描述
     */
    constructor(description) {
        this.description = description;
    }
}

export class AddonClientEntityDescription {
    /**
     * 实体描述类
     * @param {string} identifier 实体标识符
     * @param {string} min_engine_version 最低引擎版本
     */
    constructor(identifier, min_engine_version) {
        this.identifier = identifier;
        this.min_engine_version = min_engine_version;
    }

    /**
     * 注册粒子效果
     * @param {string} name 组件名称
     * @param {Object} component 组件数据
     * @returns {AddonClientEntityDescription} 返回当前实例以支持链式调用
    */
    addParticleEffect(name, particle) {
        if (this.particle_effects == undefined) this.particle_effects = {};
        this.particle_effects[name] = particle;
        return this;
    }

    /**
     * 添加材质
     * @param {string} name 材质名称
     * @param {string} material 材质路径
     * @returns {AddonClientEntityDescription} 返回当前实例以支持链式调用
     */
    addMaterial(name, material) {
        if (this.materials == undefined) this.materials = {};
        this.materials[name] = material;
        return this;
    }

    /**
     * 添加纹理
     * @param {string} name 纹理名称
     * @param {string} texture 纹理路径
     * @returns {AddonClientEntityDescription} 返回当前实例以支持链式调用
     */
    addTexture(name, texture) {
        if (this.textures == undefined) this.textures = {};
        this.textures[name] = texture;
        return this;
    }

    /**
     * 添加几何体
     * @param {string} name 几何体名称
     * @param {string} geometry 几何体路径
     * @returns {AddonClientEntityDescription} 返回当前实例以支持链式调用
     */
    addGeometry(name, geometry) {
        if (this.geometry == undefined) this.geometry = {};
        this.geometry[name] = geometry;
        return this;
    }

    /**
     * 添加动画
     * @param {string} name 动画名称
     * @param {string} animation 动画路径
     * @returns {AddonClientEntityDescription} 返回当前实例以支持链式调用
     */
    addAnimation(name, animation) {
        if (this.animations == undefined) this.animations = {};
        this.animations[name] = animation;
        return this;
    }

    /**
     * 添加动画控制器
     * @param {string} name 控制器名称
     * @param {string} controller 控制器路径
     * @returns {AddonClientEntityDescription} 返回当前实例以支持链式调用
     */
    addAnimationController(name, controller) {
        if (this.animation_controllers == undefined) this.animation_controllers = [];
        this.animation_controllers.push({ [name]: controller });
        return this;
    }

    /**
     * 添加渲染控制器
     * @param {string} controller 渲染控制器路径
     * @returns {AddonClientEntityDescription} 返回当前实例以支持链式调用
     */
    addRenderController(controller) {
        if (this.render_controllers == undefined) this.render_controllers = [];
        this.render_controllers.push(controller);
        return this;
    }

    /**
     * 添加定位器
     * @param {string} name 定位器名称
     * @param {Object} locator 定位器数据
     * @returns {AddonClientEntityDescription} 返回当前实例以支持链式调用
     */
    addLocator(name, locator) {
        if (this.locators == undefined) this.locators = {};
        this.locators[name] = locator;
        return this;
    }

    /**
     * 设置生成蛋
     * @param {string} texture 生成蛋纹理
     * @param {number} texture_index 生成蛋纹理索引
     * @returns {AddonClientEntityDescription} 返回当前实例以支持链式调用
     */
    setSpawnEgg(texture, texture_index) {
        this.spawn_egg = {
            texture: texture,
            texture_index: texture_index
        };
        return this;
    }

    /**
     * 设置脚本
     * @param {string} key 脚本键
     * @param {string} value 脚本值
     * @returns {AddonClientEntityDescription} 返回当前实例以支持链式调用
     */
    setScript(key, value) {
        if (this.scripts == undefined) this.scripts = {};
        this.scripts[key] = value;
        return this;
    }
}