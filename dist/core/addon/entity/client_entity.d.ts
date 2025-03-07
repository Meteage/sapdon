export class AddonClientEntity {
    /**
     * 客户端实体类
     * @param {string} format_version 格式版本
     * @param {AddonClientEntityDefinition} definitions 实体定义
     */
    constructor(format_version: string, definitions: AddonClientEntityDefinition);
    format_version: string;
    definitions: AddonClientEntityDefinition;
    /**
     * 将对象转换为 JSON 格式
     * @returns {Object} JSON 对象
     */
    toJson(): any;
}
export class AddonClientEntityDefinition {
    /**
     * 客户端实体定义类
     * @param {Description} description 实体描述
     */
    constructor(description: Description);
    description: Description;
}
export class AddonClientEntityDescription {
    /**
     * 实体描述类
     * @param {string} identifier 实体标识符
     * @param {string} min_engine_version 最低引擎版本
     */
    constructor(identifier: string, min_engine_version: string);
    identifier: string;
    min_engine_version: string;
    /**
     * 添加材质
     * @param {string} name 材质名称
     * @param {string} material 材质路径
     * @returns {AddonClientEntityDescription} 返回当前实例以支持链式调用
     */
    addMaterial(name: string, material: string): AddonClientEntityDescription;
    materials: {};
    /**
     * 添加纹理
     * @param {string} name 纹理名称
     * @param {string} texture 纹理路径
     * @returns {AddonClientEntityDescription} 返回当前实例以支持链式调用
     */
    addTexture(name: string, texture: string): AddonClientEntityDescription;
    textures: {};
    /**
     * 添加几何体
     * @param {string} name 几何体名称
     * @param {string} geometry 几何体路径
     * @returns {AddonClientEntityDescription} 返回当前实例以支持链式调用
     */
    addGeometry(name: string, geometry: string): AddonClientEntityDescription;
    geometry: {};
    /**
     * 添加动画
     * @param {string} name 动画名称
     * @param {string} animation 动画路径
     * @returns {AddonClientEntityDescription} 返回当前实例以支持链式调用
     */
    addAnimation(name: string, animation: string): AddonClientEntityDescription;
    animations: {};
    /**
     * 添加动画控制器
     * @param {string} name 控制器名称
     * @param {string} controller 控制器路径
     * @returns {AddonClientEntityDescription} 返回当前实例以支持链式调用
     */
    addAnimationController(name: string, controller: string): AddonClientEntityDescription;
    animation_controllers: any[];
    /**
     * 添加渲染控制器
     * @param {string} controller 渲染控制器路径
     * @returns {AddonClientEntityDescription} 返回当前实例以支持链式调用
     */
    addRenderController(controller: string): AddonClientEntityDescription;
    render_controllers: any[];
    /**
     * 添加定位器
     * @param {string} name 定位器名称
     * @param {Object} locator 定位器数据
     * @returns {AddonClientEntityDescription} 返回当前实例以支持链式调用
     */
    addLocator(name: string, locator: any): AddonClientEntityDescription;
    locators: {};
    /**
     * 设置生成蛋
     * @param {string} texture 生成蛋纹理
     * @param {number} texture_index 生成蛋纹理索引
     * @returns {AddonClientEntityDescription} 返回当前实例以支持链式调用
     */
    setSpawnEgg(texture: string, texture_index: number): AddonClientEntityDescription;
    spawn_egg: {
        texture: string;
        texture_index: number;
    };
    /**
     * 设置脚本
     * @param {string} key 脚本键
     * @param {string} value 脚本值
     * @returns {AddonClientEntityDescription} 返回当前实例以支持链式调用
     */
    setScript(key: string, value: string): AddonClientEntityDescription;
    scripts: {};
}
