
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
    toJson() {
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
    constructor(identifier, min_engine_version = "1.8.0") {
        this.identifier = identifier;
        this.min_engine_version = min_engine_version;
        this.materials = new Map(); // 使用 Map 管理材质
        this.textures = new Map(); // 使用 Map 管理纹理
        this.geometry = new Map(); // 使用 Map 管理几何体
        this.animations = new Map(); // 使用 Map 管理动画
        this.animation_controllers = []; // 动画控制器（数组）
        this.render_controllers = []; // 渲染控制器（数组）
        this.locators = new Map(); // 使用 Map 管理定位器
        this.spawn_egg = {}; // 生成蛋（对象）
        this.scripts = {}; // 脚本（对象）
    }

    /**
     * 添加材质
     * @param {string} name 材质名称
     * @param {string} material 材质路径
     */
    addMaterial(name, material) {
        this.materials.set(name, material);
    }

    /**
     * 添加纹理
     * @param {string} name 纹理名称
     * @param {string} texture 纹理路径
     */
    addTexture(name, texture) {
        this.textures.set(name, texture);
    }

    /**
     * 添加几何体
     * @param {string} name 几何体名称
     * @param {string} geometry 几何体路径
     */
    addGeometry(name, geometry) {
        this.geometry.set(name, geometry);
    }

    /**
     * 添加动画
     * @param {string} name 动画名称
     * @param {string} animation 动画路径
     */
    addAnimation(name, animation) {
        this.animations.set(name, animation);
    }

    /**
     * 添加动画控制器
     * @param {string} name 控制器名称
     * @param {string} controller 控制器路径
     */
    addAnimationController(name, controller) {
        this.animation_controllers.push({ [name]: controller });
    }

    /**
     * 添加渲染控制器
     * @param {string} controller 渲染控制器路径
     */
    addRenderController(controller) {
        this.render_controllers.push(controller);
    }

    /**
     * 添加定位器
     * @param {string} name 定位器名称
     * @param {Object} locator 定位器数据
     */
    addLocator(name, locator) {
        this.locators.set(name, locator);
    }

    /**
     * 设置生成蛋
     * @param {string} texture 生成蛋纹理
     * @param {number} texture_index 生成蛋纹理索引
     */
    setSpawnEgg(texture, texture_index) {
        this.spawn_egg = {
            texture: texture,
            texture_index: texture_index
        };
    }

    /**
     * 设置脚本
     * @param {string} key 脚本键
     * @param {string} value 脚本值
     */
    setScript(key, value) {
        this.scripts[key] = value;
    }

    /**
     * 将对象转换为 JSON 格式
     * @returns {Object} JSON 对象
     */
    toJson() {
        return {
            identifier: this.identifier,
            min_engine_version: this.min_engine_version,
            materials: Object.fromEntries(this.materials), // 将 Map 转换为对象
            textures: Object.fromEntries(this.textures), // 将 Map 转换为对象
            geometry: Object.fromEntries(this.geometry), // 将 Map 转换为对象
            animations: Object.fromEntries(this.animations), // 将 Map 转换为对象
            animation_controllers: this.animation_controllers,
            render_controllers: this.render_controllers,
            locators: Object.fromEntries(this.locators), // 将 Map 转换为对象
            spawn_egg: this.spawn_egg,
            scripts: this.scripts
        };
    }
}