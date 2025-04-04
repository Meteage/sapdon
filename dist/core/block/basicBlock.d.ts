export class BasicBlock {
    /**
     * 基础方块类
     * @param {string} identifier 方块唯一标识符
     * @param {string} category 菜单栏分类 可选："construction", "nature", "equipment", "items", and "none"
     * @param {Array} textures_arr 纹理数组 [上,下,东,西,南,北]
     * @param {Object} options 可选参数
     * @param {string} options.group 分组，默认为 "construction"
     * @param {boolean} options.hide_in_command 是否在命令中隐藏，默认为 false
     */
    constructor(identifier: string, category: string, textures_arr: any[], options?: {
        group: string;
        hide_in_command: boolean;
    });
    identifier: string;
    category: string;
    textures: any[];
    group: string;
    hide_in_command: boolean;
    traits: Map<any, any>;
    states: Map<any, any>;
    components: Map<any, any>;
    permutations: any[];
    getId(): string;
    registerTrait(key: any, value: any): this;
    registerState(key: any, value: any): this;
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
     * 添加方块变体
     * @param {string} condition 变体条件
     * @param {Map} componentMap 组件 Map
     */
    addPermutation(condition: string, componentMap: Map<any, any>): this;
    /**
     * 将方块对象转换为 JSON 格式
     * @returns {Object} JSON 格式的方块对象
     */
    toJson(): Object;
}
