export class EntityBehaviorTempt {
    /**
     * 创建 minecraft:behavior.tempt 组件。
     * @param {number} priority 行为的优先级
     */
    constructor(priority) {
      if (typeof priority !== "number" || priority < 0) {
        throw new Error("priority 必须是一个非负数");
      }
      this.priority = priority;
      this.can_get_scared = false;
      this.can_tempt_vertically = false;
      this.can_tempt_while_ridden = false;
      this.items = [];
      this.sound_interval = { range_min: 0.0, range_max: 0.0 };
      this.speed_multiplier = 1.0;
      this.tempt_sound = null;
      this.within_radius = 0.0;
    }
  
    /**
     * 设置是否会被吓跑。
     * @param {boolean} canGetScared 是否会被吓跑
     * @returns {Tempt} 返回当前实例以支持链式调用
     */
    canGetScared(canGetScared) {
      if (typeof canGetScared !== "boolean") {
        throw new Error("canGetScared 必须是布尔类型");
      }
      this.can_get_scared = canGetScared;
      return this;
    }
  
    /**
     * 设置是否考虑垂直距离。
     * @param {boolean} canTemptVertically 是否考虑垂直距离
     * @returns {Tempt} 返回当前实例以支持链式调用
     */
    canTemptVertically(canTemptVertically) {
      if (typeof canTemptVertically !== "boolean") {
        throw new Error("canTemptVertically 必须是布尔类型");
      }
      this.can_tempt_vertically = canTemptVertically;
      return this;
    }
  
    /**
     * 设置是否在被骑乘时被吸引。
     * @param {boolean} canTemptWhileRidden 是否在被骑乘时被吸引
     * @returns {Tempt} 返回当前实例以支持链式调用
     */
    canTemptWhileRidden(canTemptWhileRidden) {
      if (typeof canTemptWhileRidden !== "boolean") {
        throw new Error("canTemptWhileRidden 必须是布尔类型");
      }
      this.can_tempt_while_ridden = canTemptWhileRidden;
      return this;
    }
  
    /**
     * 设置吸引实体的物品列表。
     * @param {Array} items 吸引实体的物品列表
     * @returns {Tempt} 返回当前实例以支持链式调用
     */
    setItems(items) {
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error("items 必须是一个非空数组");
      }
      this.items = items;
      return this;
    }
  
    /**
     * 设置播放吸引声音的随机间隔时间。
     * @param {number} min 最小间隔时间
     * @param {number} max 最大间隔时间
     * @returns {Tempt} 返回当前实例以支持链式调用
     */
    setSoundInterval(min, max) {
      if (typeof min !== "number" || typeof max !== "number" || min < 0 || max < 0) {
        throw new Error("min 和 max 必须是非负数");
      }
      this.sound_interval = { range_min: min, range_max: max };
      return this;
    }
  
    /**
     * 设置移动速度倍数。
     * @param {number} speedMultiplier 移动速度倍数
     * @returns {Tempt} 返回当前实例以支持链式调用
     */
    setSpeedMultiplier(speedMultiplier) {
      if (typeof speedMultiplier !== "number" || speedMultiplier <= 0) {
        throw new Error("speedMultiplier 必须是一个正数");
      }
      this.speed_multiplier = speedMultiplier;
      return this;
    }
  
    /**
     * 设置吸引时播放的声音。
     * @param {string} temptSound 吸引时播放的声音
     * @returns {Tempt} 返回当前实例以支持链式调用
     */
    setTemptSound(temptSound) {
      if (typeof temptSound !== "string") {
        throw new Error("temptSound 必须是字符串");
      }
      this.tempt_sound = temptSound;
      return this;
    }
  
    /**
     * 设置吸引的最大距离。
     * @param {number} withinRadius 吸引的最大距离
     * @returns {Tempt} 返回当前实例以支持链式调用
     */
    setWithinRadius(withinRadius) {
      if (typeof withinRadius !== "number" || withinRadius < 0) {
        throw new Error("withinRadius 必须是一个非负数");
      }
      this.within_radius = withinRadius;
      return this;
    }
  
    /**
     * 将组件转换为 JSON 对象。
     * @returns {Object} minecraft:behavior.tempt 组件的 JSON 对象
     */
    toJSON() {
      return {
        "minecraft:behavior.tempt": {
          priority: this.priority,
          can_get_scared: this.can_get_scared,
          can_tempt_vertically: this.can_tempt_vertically,
          can_tempt_while_ridden: this.can_tempt_while_ridden,
          items: this.items,
          sound_interval: this.sound_interval,
          speed_multiplier: this.speed_multiplier,
          tempt_sound: this.tempt_sound,
          within_radius: this.within_radius,
        },
      };
    }
  }