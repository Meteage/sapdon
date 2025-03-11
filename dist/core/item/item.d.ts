export class Item {
    /**
     * 物品类
     * @param {string} identifier 物品唯一标识符
     * @param {string} category 菜单栏分类 可选："construction", "nature", "equipment", "items", and "none"
     * @param {string} texture 物品纹理
     * @param {Object} options 可选参数
     * @param {string} options.group 分组
     * @param {boolean} options.hide_in_command 是否在命令中隐藏，默认为 false
     */
    constructor(identifier: string, category: string, texture: string, options?: {
        group: string;
        hide_in_command: boolean;
    });
    identifier: string;
    category: string;
    texture: string;
    group: string;
    hide_in_command: boolean;
    components: Map<any, any>;
    /**
     * 添加组件
     * @param {Map} componentMap 组件 Map
     */
    addComponent(componentMap: Map<any, any>): this;
    /**
     * 移除组件
     * @param {string} key 组件名称
     */
    removeComponent(key: string): this;
    /**
     * 将物品转换为 JSON 格式
     * @returns {Object} JSON 格式的物品对象
     */
    toJson(): any;
}
