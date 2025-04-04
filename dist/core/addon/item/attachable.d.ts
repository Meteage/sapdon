export class AddonAttachable {
    /**
   * 可附着物类 继承客户端实体
   * @param {string} format_version 格式版本
   * @param {AddonAttachableDefinition} definitions 实体定义
   */
    constructor(format_version: string, definitions: AddonAttachableDefinition);
    format_version: string;
    definitions: AddonAttachableDefinition;
    /**
     * 将对象转换为 JSON 格式
     * @returns {Object} JSON 对象
     */
    toJson(): Object;
}
export class AddonAttachableDefinition {
    /**
     * 客户端实体定义类
     * @param {Description} description 实体描述
     */
    constructor(description: Description);
    description: Description;
}
export class AddonAttachableDescription {
    /**
     * 可附着物描述类
     * @param {string} identifier 标识符
     */
    constructor(identifier: string);
    identifier: string;
    /**
     * 添加材质
     * @param {string} name 材质名称
     * @param {string} material 材质路径
     * @returns {AddonAttachableDescription} 返回当前实例以支持链式调用
     */
    addMaterial(name: string, material: string): AddonAttachableDescription;
    materials: {} | undefined;
    /**
     * 添加纹理
     * @param {string} name 纹理名称
     * @param {string} texture 纹理路径
     * @returns {AddonAttachableDescription} 返回当前实例以支持链式调用
     */
    addTexture(name: string, texture: string): AddonAttachableDescription;
    textures: {} | undefined;
    /**
     * 添加几何体
     * @param {string} name 几何体名称
     * @param {string} geometry 几何体路径
     * @returns {AddonAttachableDescription} 返回当前实例以支持链式调用
     */
    addGeometry(name: string, geometry: string): AddonAttachableDescription;
    geometry: {} | undefined;
    /**
     * 添加动画
     * @param {string} name 动画名称
     * @param {string} animation 动画路径
     * @returns {AddonAttachableDescription} 返回当前实例以支持链式调用
     */
    addAnimation(name: string, animation: string): AddonAttachableDescription;
    animations: {} | undefined;
    /**
     * 添加动画控制器
     * @param {string} name 控制器名称
     * @param {string} controller 控制器路径
     * @returns {AddonAttachableDescription} 返回当前实例以支持链式调用
     */
    addAnimationController(name: string, controller: string): AddonAttachableDescription;
    animation_controllers: any[] | undefined;
    /**
     * 添加渲染控制器
     * @param {string} controller 渲染控制器路径
     * @returns {AddonAttachableDescription} 返回当前实例以支持链式调用
     */
    addRenderController(controller: string): AddonAttachableDescription;
    render_controllers: any[] | undefined;
    /**
     * 添加定位器
     * @param {string} name 定位器名称
     * @param {Object} locator 定位器数据
     * @returns {AddonAttachableDescription} 返回当前实例以支持链式调用
     */
    addLocator(name: string, locator: Object): AddonAttachableDescription;
    locators: {} | undefined;
    /**
     * 设置脚本
     * @param {string} key 脚本键
     * @param {string} value 脚本值
     * @returns {AddonAttachableDescription} 返回当前实例以支持链式调用
     */
    setScript(key: string, value: string): AddonAttachableDescription;
    scripts: {} | undefined;
}
