import { Serializer } from "../../../utils/index.js"

export class MoveTowardsHomeRestrictionBehavior {
    /**
     * 创建 minecraft:behavior.move_towards_home_restriction 组件。
     * @param {number} priority 行为的优先级
     */
    constructor(priority) {
      if (typeof priority !== "number" || priority < 0) {
        throw new Error("priority 必须是一个非负数");
      }
      this.priority = priority;
      this.speed_multiplier = 1.0;
    }

    /**
     * 设置移动速度倍数。
     * @param {number} speedMultiplier 移动速度倍数
     * @returns {MoveTowardsHomeRestrictionBehavior} 返回当前实例以支持链式调用
     */
    setSpeedMultiplier(speedMultiplier) {
      if (typeof speedMultiplier !== "number" || speedMultiplier <= 0) {
        throw new Error("speedMultiplier 必须是一个正数");
      }
      this.speed_multiplier = speedMultiplier;
      return this;
    }

    /**
     * 将组件转换为 JSON 对象。
     * @returns {Object} minecraft:behavior.move_towards_home_restriction 组件的 JSON 对象
     */
    @Serializer
    toObject() {
      return new Map().set(
        "minecraft:behavior.move_towards_home_restriction", {
          priority: this.priority,
          speed_multiplier: this.speed_multiplier,
        },
      );
    }
  }
