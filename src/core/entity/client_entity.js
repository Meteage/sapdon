import { AddonClientEntity, AddonClientEntityDefinition, AddonClientEntityDescription } from "../addon/entity/client_entity.js";

export class ClientEntity {
    /**
     * 客服端实体构建器类
     * @param {string} identifier 实体标识符
     * @param {string} min_engine_version 最低引擎版本
     */
    constructor(identifier, min_engine_version = "1.8.0") {
        this.description = new AddonClientEntityDescription(identifier, min_engine_version);
    }

    /**
     * 添加材质
     * @param {string} name 材质名称
     * @param {string} material 材质路径
     * @returns {EntityBuilder} 返回当前实例，支持链式调用
     */
    addMaterial(name, material) {
        this.description.addMaterial(name, material);
        return this;
    }

    /**
     * 添加纹理
     * @param {string} name 纹理名称
     * @param {string} texture 纹理路径
     * @returns {EntityBuilder} 返回当前实例，支持链式调用
     */
    addTexture(name, texture) {
        this.description.addTexture(name, texture);
        return this;
    }

    /**
     * 添加几何体
     * @param {string} name 几何体名称
     * @param {string} geometry 几何体路径
     * @returns {EntityBuilder} 返回当前实例，支持链式调用
     */
    addGeometry(name, geometry) {
        this.description.addGeometry(name, geometry);
        return this;
    }

    /**
     * 添加动画
     * @param {string} name 动画名称
     * @param {string} animation 动画路径
     * @returns {EntityBuilder} 返回当前实例，支持链式调用
     */
    addAnimation(name, animation) {
        this.description.addAnimation(name, animation);
        return this;
    }

    /**
     * 添加动画控制器
     * @param {string} name 控制器名称
     * @param {string} controller 控制器路径
     * @returns {EntityBuilder} 返回当前实例，支持链式调用
     */
    addAnimationController(name, controller) {
        this.description.addAnimationController(name, controller);
        return this;
    }

    /**
     * 添加渲染控制器
     * @param {string} controller 渲染控制器路径
     * @returns {EntityBuilder} 返回当前实例，支持链式调用
     */
    addRenderController(controller) {
        this.description.addRenderController(controller);
        return this;
    }

    /**
     * 添加定位器
     * @param {string} name 定位器名称
     * @param {Object} locator 定位器数据
     * @returns {EntityBuilder} 返回当前实例，支持链式调用
     */
    addLocator(name, locator) {
        this.description.addLocator(name, locator);
        return this;
    }

    /**
     * 设置生成蛋
     * @param {string} texture 生成蛋纹理
     * @param {number} texture_index 生成蛋纹理索引
     * @returns {EntityBuilder} 返回当前实例，支持链式调用
     */
    setSpawnEgg(texture, texture_index) {
        this.description.setSpawnEgg(texture, texture_index);
        return this;
    }

    /**
     * 设置脚本
     * @param {string} key 脚本键
     * @param {string} value 脚本值
     * @returns {EntityBuilder} 返回当前实例，支持链式调用
     */
    setScript(key, value) {
        this.description.setScript(key, value);
        return this;
    }

    /**
     * 构建实体 JSON 数据
     * @returns {Object} JSON 对象
     */
    toJson() {
        const entity = new AddonClientEntity(
            "1.8.0",
            new AddonClientEntityDefinition(this.description)
        );
        return entity.toJson();
    }
}