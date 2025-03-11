export class ItemComponent {
    /**
     * 物品的耐久度组件
     * @param {number} max_durability 最大耐久
     * @param {number} damage_chance_min 损坏最小几率
     * @param {number} damage_chance_max 损坏最大几率
     * @returns {ItemComponent}
     */
    static setDurability(max_durability: number, damage_chance_min?: number, damage_chance_max?: number): ItemComponent;
    static setBlockPlacer(block: any, replace_block_item: any, use_on: any): Map<any, any>;
    /**
  *
  * @param {Array} custom_components
  * @returns
  */
    static setCustomComponents(custom_components: any[]): Map<any, any>;
    /**
     * 设置物品的可投掷组件。
     * @param {Boolean} doSwingAnimation - 是否使用挥动动画。
     * @param {Number} launchPowerScale - 投掷力量的缩放比例。
     * @param {Number} maxDrawDuration - 最大蓄力时间。
     * @param {Number} maxLaunchPower - 最大投掷力量。
     * @param {Number} minDrawDuration - 最小蓄力时间。
     * @param {Boolean} scalePowerByDrawDuration - 投掷力量是否随蓄力时间增加。
     * @returns {Map} - 新的组件集合。
     */
    static setThrowable(doSwingAnimation?: boolean, launchPowerScale?: number, maxDrawDuration?: number, maxLaunchPower?: number, minDrawDuration?: number, scalePowerByDrawDuration?: boolean): Map<any, any>;
    /**
     * 设置物品的显示名称。
     * @param {String} displayName - 显示名称或本地化键。
     * @returns {Map} - 新的组件集合。
     */
    static setDisplayName(displayName: string): Map<any, any>;
    /**
     * 设置物品的食物组件。
     * @param {Boolean} canAlwaysEat - 是否随时可以食用。
     * @param {Number} nutrition - 营养值。
     * @param {Number} saturationModifier - 饱和度修正值。
     * @param {String} [usingConvertsTo] - 食用后转换的目标物品。
     * @returns {Map} - 新的组件集合。
     */
    static setFoodComponent(canAlwaysEat: boolean, nutrition: number, saturationModifier: number, usingConvertsTo?: string): Map<any, any>;
    /**
     * 设置物品的燃料组件。
     * @param {Number} duration - 燃料燃烧的持续时间（秒），最小值为 0.05。
     * @returns {Map} - 新的组件集合。
     */
    static setFuel(duration: number): Map<any, any>;
    /**
     * 设置物品的附魔光效组件。
     * @param {Boolean} hasGlint - 是否显示附魔光效。
     * @returns {Map} - 新的组件集合。
     */
    static setGlint(hasGlint: boolean): Map<any, any>;
    /**
     * 设置物品的手持渲染方式组件。
     * @param {Boolean} isHandEquipped - 是否像工具一样渲染。
     * @returns {Map} - 新的组件集合。
     */
    static setHandEquipped(isHandEquipped: boolean): Map<any, any>;
    /**
     * 设置物品的图标组件。
     * @param {String} texture - 图标纹理名称。
     * @returns {Map} - 新的组件集合。
     */
    static setIcon(texture: string): Map<any, any>;
    /**
     * 设置物品的最大堆叠数量组件。
     * @param {Number} maxStackSize - 最大堆叠数量，默认值为 64。
     * @returns {Map} - 新的组件集合。
     */
    static setMaxStackSize(maxStackSize?: number): Map<any, any>;
    /**
     * 设置物品的投射物组件。
     * @param {Number} [minimumCriticalPower] - 投射物需要蓄力多久才能造成暴击。
     * @param {String} [projectileEntity] - 作为投射物发射的实体名称。
     * @returns {Map} - 新的组件集合。
     */
    static setProjectile(minimumCriticalPower?: number, projectileEntity?: string): Map<any, any>;
    /**
     * 设置物品的使用修饰组件。
     * @param {Number} [movementModifier] - 使用物品时玩家移动速度的缩放值。
     * @param {Number} [useDuration] - 物品使用所需的时间（秒）。
     * @returns {Map} - 新的组件集合。
     */
    static setUseModifiers(movementModifier?: number, useDuration?: number): Map<any, any>;
    /**
     * 设置物品的可穿戴组件。
     * @param {Number} [protection=0] - 物品提供的保护值。
     * @param {String} [slot] - 物品可以穿戴的槽位（如 "head"、"chest" 等）。
     * @returns {Map} - 新的组件集合。
     */
    static setWearable(protection?: number, slot?: string): Map<any, any>;
    /**
    * 设置物品的使用动画组件。
    * @param {String} animation - 物品使用时的动画类型（如 "eat"、"drink" 等）。
    * @returns {Map} - 新的组件集合。
    * @throws {Error} - 如果 animation 不是字符串类型。
    */
    static setUseAnimation(animation: string): Map<any, any>;
    /**
     * 将多个组件集合合并为一个。
     * @param {...Map} componentMaps - 多个组件集合。
     * @returns {Map} - 合并后的组件集合。
     */
    static combineComponents(...componentMaps: Map<any, any>[]): Map<any, any>;
    /**
     * 获取当前组件的 JSON 表示。
     * @param {Map} components - 组件集合。
     * @returns {Object} - 组件的 JSON 对象。
     */
    static toJSON(components: Map<any, any>): any;
}
