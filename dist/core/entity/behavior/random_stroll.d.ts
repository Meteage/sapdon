export class RandomStrollBehavior {
    /**
     * 随机漫步行为
     * @param {number} priority 优先级
     * @param {number} interval 间隔
     * @param {number} speed_multiplier 速度倍数
     */
    constructor(priority: number, interval: number, speed_multiplier: number);
    priority: number;
    interval: number;
    speed_multiplier: number;
    xz_dist: number;
    y_dist: number;
    /**
     * 设置水平距离
     * @param {number} xz_dist 水平距离
     * @returns {EntityBehaviorRandomStroll} 返回当前实例以支持链式调用
     */
    setXZDist(xz_dist: number): EntityBehaviorRandomStroll;
    /**
     * 设置垂直距离
     * @param {number} y_dist 垂直距离
     * @returns {EntityBehaviorRandomStroll} 返回当前实例以支持链式调用
     */
    setYDist(y_dist: number): EntityBehaviorRandomStroll;
    /**
     * 将组件转换为 JSON 对象
     * @returns {Object} minecraft:behavior.random_stroll 组件的 JSON 对象
     */
    toJSON(): any;
}
