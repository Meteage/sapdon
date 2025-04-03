import { Serializer } from "../../../utils/index.js"

export class RandomStrollBehavior {
    /**
     * 随机漫步行为
     * @param {number} priority 优先级
     * @param {number} interval 间隔
     * @param {number} speed_multiplier 速度倍数
     */
    constructor(priority, interval, speed_multiplier) {
      // 参数验证
      if (typeof priority !== "number" || priority < 0) {
        throw new Error("priority 必须是一个非负数");
      }
      if (typeof interval !== "number" || interval <= 0) {
        throw new Error("interval 必须是一个正数");
      }
      if (typeof speed_multiplier !== "number" || speed_multiplier <= 0) {
        throw new Error("speed_multiplier 必须是一个正数");
      }
  
      // 初始化属性
      this.priority = priority;
      this.interval = interval;
      this.speed_multiplier = speed_multiplier;
      this.xz_dist = 10; // 默认水平距离
      this.y_dist = 7; // 默认垂直距离
    }
  
    /**
     * 设置水平距离
     * @param {number} xz_dist 水平距离
     * @returns {EntityBehaviorRandomStroll} 返回当前实例以支持链式调用
     */
    setXZDist(xz_dist) {
      if (typeof xz_dist !== "number" || xz_dist < 1) {
        throw new Error("xz_dist 必须是一个至少为 1 的整数");
      }
      this.xz_dist = xz_dist;
      return this;
    }
  
    /**
     * 设置垂直距离
     * @param {number} y_dist 垂直距离
     * @returns {EntityBehaviorRandomStroll} 返回当前实例以支持链式调用
     */
    setYDist(y_dist) {
      if (typeof y_dist !== "number" || y_dist < 1) {
        throw new Error("y_dist 必须是一个至少为 1 的整数");
      }
      this.y_dist = y_dist;
      return this;
    }
  
    /**
     * 将组件转换为 JSON 对象
     * @returns {Object} minecraft:behavior.random_stroll 组件的 JSON 对象
     */
    @Serializer
    toObject() {
      return new Map().set("minecraft:behavior.random_stroll",
        {
          priority: this.priority,
          interval: this.interval,
          speed_multiplier: this.speed_multiplier,
          xz_dist: this.xz_dist,
          y_dist: this.y_dist,
        },
      );
    }
  }