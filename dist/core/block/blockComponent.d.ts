export class BlockComponent {
    static setTick(interval_range: any, looping: any): Map<any, any>;
    /**
     *
     * @param {Array} custom_components
     * @returns
     */
    static setCustomComponents(custom_components: any[]): Map<any, any>;
    /**
   * 创建一个用于 Minecraft 方块的变换对象，并返回一个 Map。
   * @param {number[]} [translation=[0, 0, 0]] - 平移向量 [x, y, z]。
   * @param {number[]} [scale=[1, 1, 1]] - 缩放向量 [x, y, z]。
   * @param {number[]} [scale_pivot=[0, 0, 0]] - 缩放的枢轴点 [x, y, z]。
   * @param {number[]} [rotation=[0, 0, 0]] - 旋转向量（角度）[x, y, z]。
   * @param {number[]} [rotation_pivot=[0, 0, 0]] - 旋转的枢轴点 [x, y, z]。
   * @returns {Map} - 一个包含变换数据的 Map 对象。
   * @throws {Error} - 如果任何参数无效，则抛出错误。
   */
    static setTransformation(translation?: number[], scale?: number[], scale_pivot?: number[], rotation?: number[], rotation_pivot?: number[]): Map<any, any>;
    /**
     * 设置方块的呼吸行为。
     * @param {String} value - 呼吸行为，可选值为 "solid" 或 "air"。
     * @returns {Map} - 新的组件集合。
     */
    static setBreathability(value: string): Map<any, any>;
    /**
     * 启用或禁用方块的碰撞箱。
     * @param {Boolean} enabled - 是否启用碰撞箱。
     * @returns {Map} - 新的组件集合。
     */
    static setCollisionBoxEnabled(enabled: boolean): Map<any, any>;
    /**
     * 设置自定义的碰撞箱。
     * @param {Array} origin - 碰撞箱的起点坐标 [x, y, z]。
     * @param {Array} size - 碰撞箱的大小 [width, height, depth]。
     * @returns {Map} - 新的组件集合。
     */
    static setCollisionBoxCustom(origin: any[], size: any[]): Map<any, any>;
    /**
     * 设置方块的合成台属性。
     * @param {Array} craftingTags - 合成标签。
     * @param {String} tableName - 合成台名称。
     * @returns {Map} - 新的组件集合。
     */
    static setCraftingTable(craftingTags: any[], tableName: string): Map<any, any>;
    /**
     * 启用或禁用方块的爆炸抗性。
     * @param {Boolean} enabled - 是否启用爆炸抗性。
     * @returns {Map} - 新的组件集合。
     */
    static setDestructibleByExplosionEnabled(enabled: boolean): Map<any, any>;
    /**
     * 设置自定义的爆炸抗性。
     * @param {Number} explosionResistance - 爆炸抗性值。
     * @returns {Map} - 新的组件集合。
     */
    static setDestructibleByExplosionCustom(explosionResistance: number): Map<any, any>;
    /**
     * 启用或禁用方块的挖掘抗性。
     * @param {Boolean} enabled - 是否启用挖掘抗性。
     * @returns {Map} - 新的组件集合。
     */
    static setDestructibleByMiningEnabled(enabled: boolean): Map<any, any>;
    /**
     * 设置自定义的挖掘抗性。
     * @param {Number} secondsToDestroy - 破坏所需时间（秒）。
     * @param {Array} itemSpecificSpeeds - 特定工具的挖掘速度。
     * @returns {Map} - 新的组件集合。
     */
    static setDestructibleByMiningCustom(secondsToDestroy: number, itemSpecificSpeeds: any[]): Map<any, any>;
    /**
     * 设置方块的显示名称。
     * @param {String} displayName - 显示名称。
     * @returns {Map} - 新的组件集合。
     */
    static setDisplayName(displayName: string): Map<any, any>;
    /**
     * 启用或禁用方块的易燃性。
     * @param {Boolean} enabled - 是否启用易燃性。
     * @returns {Map} - 新的组件集合。
     */
    static setFlammableEnabled(enabled: boolean): Map<any, any>;
    /**
     * 设置自定义的易燃性。
     * @param {Number} catchChanceModifier - 着火概率。
     * @param {Number} destroyChanceModifier - 被火焰摧毁的概率。
     * @returns {Map} - 新的组件集合。
     */
    static setFlammableCustom(catchChanceModifier: number, destroyChanceModifier: number): Map<any, any>;
    /**
     * 设置方块的摩擦力。
     * @param {Number} value - 摩擦力值，范围为 0.0 到 0.9。
     * @returns {Map} - 新的组件集合。
     */
    static setFriction(value: number): Map<any, any>;
    /**
     * 设置方块的几何模型。
     * @param {String} identifier - 几何模型标识符。
     * @param {Object} bone_visibility - 骨骼可见性配置。
     * @returns {Map} - 新的组件集合。
     */
    static setGeometry(identifier: string, bone_visibility: Object): Map<any, any>;
    /**
     * 设置方块的物品视觉属性。
     * @param {String} geometry - 几何模型标识符。
     * @param {Object} materialInstances - 材质实例配置。
     * @returns {Map} - 新的组件集合。
     */
    static setItemVisual(geometry: string, materialInstances: Object): Map<any, any>;
    /**
     * 设置方块的光衰减值。
     * @param {Number} value - 光的衰减值，范围为 0 到 15。
     * @returns {Map} - 新的组件集合。
     */
    static setLightDampening(value: number): Map<any, any>;
    /**
     * 设置方块的光照强度。
     * @param {Number} value - 光照强度，范围为 0 到 15。
     * @returns {Map} - 新的组件集合。
     */
    static setLightEmission(value: number): Map<any, any>;
    /**
     * 设置方块的液体检测属性。
     * @param {Boolean} canContainLiquid - 是否可以包含液体。
     * @param {String} liquidType - 液体类型。
     * @param {String} onLiquidTouches - 对液体的反应方式。
     * @param {Array} stopsLiquidFlowingFromDirection - 阻止液体流动的方向。
     * @returns {Map} - 新的组件集合。
     */
    static setLiquidDetection(canContainLiquid: boolean, liquidType: string, onLiquidTouches: string, stopsLiquidFlowingFromDirection: any[]): Map<any, any>;
    /**
     * 设置方块的战利品表路径。
     * @param {String} path - 战利品表路径。
     * @returns {Map} - 新的组件集合。
     */
    static setLoot(path: string): Map<any, any>;
    /**
     * 设置方块的地图颜色。
     * @param {String|Array} value - 地图颜色，可以是十六进制字符串或 RGB 数组。
     * @returns {Map} - 新的组件集合。
     */
    static setMapColor(value: string | any[]): Map<any, any>;
    /**
     * 设置方块的材质实例。
     * @param {Object} instances - 材质实例配置。
     * @returns {Map} - 新的组件集合。
     */
    static setMaterialInstances(instances: Object): Map<any, any>;
    /**
     * 设置方块的放置过滤条件。
     * @param {Array} conditions - 放置条件列表。
     * @returns {Map} - 新的组件集合。
     */
    static setPlacementFilter(conditions: any[]): Map<any, any>;
    /**
     * 设置方块的红石导电性。
     * @param {Boolean} allowsWireToStepDown - 是否允许红石线向下阶梯连接。
     * @param {Boolean} redstoneConductor - 方块是否可以被红石信号激活。
     * @returns {Map} - 新的组件集合。
     */
    static setRedstoneConductivity(allowsWireToStepDown: boolean, redstoneConductor: boolean): Map<any, any>;
    /**
     * 启用或禁用方块的选择框。
     * @param {Boolean} enabled - 是否启用选择框。
     * @returns {Map} - 新的组件集合。
     */
    static setSelectionBoxEnabled(enabled: boolean): Map<any, any>;
    /**
     * 设置自定义的选择框。
     * @param {Array} origin - 选择框的起点坐标 [x, y, z]。
     * @param {Array} size - 选择框的大小 [width, height, depth]。
     * @returns {Map} - 新的组件集合。
     */
    static setSelectionBoxCustom(origin: any[], size: any[]): Map<any, any>;
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
    static toJSON(components: Map<any, any>): Object;
}
