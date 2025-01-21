
export class AddonAttachable {
      /**
     * 可附着物类 继承客户端实体
     * @param {string} format_version 格式版本
     * @param {AddonAttachableDefinition} definitions 实体定义
     */
      constructor(format_version, definitions) {
        this.format_version = format_version;
        this.definitions = definitions;
    }

    /**
     * 将对象转换为 JSON 格式
     * @returns {Object} JSON 对象
     */
    toJson() {
        return {
            format_version: this.format_version,
            ["minecraft:attachable"]: this.definitions
        };
    }
}

export class AddonAttachableDefinition {
    /**
     * 客户端实体定义类
     * @param {Description} description 实体描述
     */
    constructor(description) {
        this.description = description;
    }
}

export class AddonAttachableDescription {
    /**
     * 可附着物描述类
     * @param {string} identifier 标识符
     */
    constructor(identifier) {
        this.identifier = identifier;
    }

    /**
     * 添加材质
     * @param {string} name 材质名称
     * @param {string} material 材质路径
     * @returns {AddonAttachableDescription} 返回当前实例以支持链式调用
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
     * @returns {AddonAttachableDescription} 返回当前实例以支持链式调用
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
     * @returns {AddonAttachableDescription} 返回当前实例以支持链式调用
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
     * @returns {AddonAttachableDescription} 返回当前实例以支持链式调用
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
     * @returns {AddonAttachableDescription} 返回当前实例以支持链式调用
     */
    addAnimationController(name, controller) {
        if (this.animation_controllers == undefined) this.animation_controllers = [];
        this.animation_controllers.push({ [name]: controller });
        return this;
    }

    /**
     * 添加渲染控制器
     * @param {string} controller 渲染控制器路径
     * @returns {AddonAttachableDescription} 返回当前实例以支持链式调用
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
     * @returns {AddonAttachableDescription} 返回当前实例以支持链式调用
     */
    addLocator(name, locator) {
        if (this.locators == undefined) this.locators = {};
        this.locators[name] = locator;
        return this;
    }

    /**
     * 设置脚本
     * @param {string} key 脚本键
     * @param {string} value 脚本值
     * @returns {AddonAttachableDescription} 返回当前实例以支持链式调用
     */
    setScript(key, value) {
        if (this.scripts == undefined) this.scripts = {};
        this.scripts[key] = value;
        return this;
    }
}