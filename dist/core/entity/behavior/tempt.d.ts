export class TemptBehavior {
    /**
     * 创建 minecraft:behavior.tempt 组件。
     * @param {number} priority 行为的优先级
     */
    constructor(priority: number);
    priority: number;
    can_get_scared: boolean;
    can_tempt_vertically: boolean;
    can_tempt_while_ridden: boolean;
    items: any[];
    sound_interval: {
        range_min: number;
        range_max: number;
    };
    speed_multiplier: number;
    tempt_sound: string | null;
    within_radius: number;
    /**
     * 设置是否会被吓跑。
     * @param {boolean} canGetScared 是否会被吓跑
     * @returns {Tempt} 返回当前实例以支持链式调用
     */
    canGetScared(canGetScared: boolean): Tempt;
    /**
     * 设置是否考虑垂直距离。
     * @param {boolean} canTemptVertically 是否考虑垂直距离
     * @returns {Tempt} 返回当前实例以支持链式调用
     */
    canTemptVertically(canTemptVertically: boolean): Tempt;
    /**
     * 设置是否在被骑乘时被吸引。
     * @param {boolean} canTemptWhileRidden 是否在被骑乘时被吸引
     * @returns {Tempt} 返回当前实例以支持链式调用
     */
    canTemptWhileRidden(canTemptWhileRidden: boolean): Tempt;
    /**
     * 设置吸引实体的物品列表。
     * @param {Array} items 吸引实体的物品列表
     * @returns {Tempt} 返回当前实例以支持链式调用
     */
    setItems(items: any[]): Tempt;
    /**
     * 设置播放吸引声音的随机间隔时间。
     * @param {number} min 最小间隔时间
     * @param {number} max 最大间隔时间
     * @returns {Tempt} 返回当前实例以支持链式调用
     */
    setSoundInterval(min: number, max: number): Tempt;
    /**
     * 设置移动速度倍数。
     * @param {number} speedMultiplier 移动速度倍数
     * @returns {Tempt} 返回当前实例以支持链式调用
     */
    setSpeedMultiplier(speedMultiplier: number): Tempt;
    /**
     * 设置吸引时播放的声音。
     * @param {string} temptSound 吸引时播放的声音
     * @returns {Tempt} 返回当前实例以支持链式调用
     */
    setTemptSound(temptSound: string): Tempt;
    /**
     * 设置吸引的最大距离。
     * @param {number} withinRadius 吸引的最大距离
     * @returns {Tempt} 返回当前实例以支持链式调用
     */
    setWithinRadius(withinRadius: number): Tempt;
    /**
     * 将组件转换为 JSON 对象。
     * @returns {Object} minecraft:behavior.tempt 组件的 JSON 对象
     */
    toJSON(): Object;
}
