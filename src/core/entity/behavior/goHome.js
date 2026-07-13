import { Serializer } from "../../../utils/index.js"

export class GoHomeBehavior {
    /**
     * 创建 minecraft:behavior.go_home 组件。
     * @param {number} priority 行为的优先级
     */
    constructor(priority) {
      if (typeof priority !== "number" || priority < 0) {
        throw new Error("priority 必须是一个非负数");
      }
      this.priority = priority;
      this.speed_multiplier = 1.0;
      this.goal_radius = 1.0;
      this.interval = 120;
    }

    /**
     * 设置移动速度倍数。
     * @param {number} speedMultiplier 移动速度倍数
     * @returns {GoHomeBehavior} 返回当前实例以支持链式调用
     */
    setSpeedMultiplier(speedMultiplier) {
      if (typeof speedMultiplier !== "number" || speedMultiplier <= 0) {
        throw new Error("speedMultiplier 必须是一个正数");
      }
      this.speed_multiplier = speedMultiplier;
      return this;
    }

    /**
     * 设置回家目标判定半径。
     * @param {number} goalRadius 判定半径（方块格）
     * @returns {GoHomeBehavior} 返回当前实例以支持链式调用
     */
    setGoalRadius(goalRadius) {
      if (typeof goalRadius !== "number" || goalRadius < 0) {
        throw new Error("goalRadius 必须是一个非负数");
      }
      this.goal_radius = goalRadius;
      return this;
    }

    /**
     * 设置回家行为执行的间隔时间（游戏刻）。
     * @param {number} interval 间隔时间（游戏刻）
     * @returns {GoHomeBehavior} 返回当前实例以支持链式调用
     */
    setInterval(interval) {
      if (typeof interval !== "number" || interval <= 0) {
        throw new Error("interval 必须是一个正数");
      }
      this.interval = interval;
      return this;
    }

    /**
     * 将组件转换为 JSON 对象。
     * @returns {Object} minecraft:behavior.go_home 组件的 JSON 对象
     */
    @Serializer
    toObject() {
      return new Map().set(
        "minecraft:behavior.go_home", {
          priority: this.priority,
          speed_multiplier: this.speed_multiplier,
          goal_radius: this.goal_radius,
          interval: this.interval,
        },
      );
    }
  }
