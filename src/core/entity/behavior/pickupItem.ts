import { Serializer } from "../../../utils/index.js";

/**
 * 控制生物拾取物品的 AI 行为配置
 * @example
 * // 创建类似 Allay 的拾取行为
 * const allayPickup = new PickupItemsBehavior(2)
 *   .setMaxDist(32)
 *   .setSearchHeight(32)
 *   .setSpeedMultiplier(6)
 *   .setPickupSameItemsAsInHand(true);
 * 
 * // 创建类似 Drowned 的配置
 * const drownedPickup = new PickupItemsBehavior(6)
 *   .setExcludedItems(["minecraft:glow_ink_sac"])
 *   .setSpeedMultiplier(1.2);
 */
export class PickupItemsBehavior {
  private priority: number;
  private can_pickup_any_item: boolean = false;
  private can_pickup_to_hand_or_equipment: boolean = true;
  private cooldown_after_being_attacked?: number;
  private excluded_items?: string[];
  private goal_radius: number = 0.5;
  private max_dist: number = 0;
  private pickup_based_on_chance: boolean = false;
  private pickup_same_items_as_in_hand?: boolean | string;
  private search_height?: number;
  private speed_multiplier: number = 1;
  private track_target: boolean = false;

  /**
   * @param priority - 行为优先级（数值越小优先级越高）
   */
  constructor(priority: number) {
    this.priority = priority;
  }

  /**
   * 设置是否可以拾取任意物品
   * @param value - 默认 false
   * @returns 当前实例（支持链式调用）
   */
  setCanPickupAnyItem(value: boolean): this {
    this.can_pickup_any_item = value;
    return this;
  }

  /**
   * 设置是否允许拾取到手上或装备栏
   * @param value - 默认 true
   */
  setCanPickupToHandOrEquipment(value: boolean): this {
    this.can_pickup_to_hand_or_equipment = value;
    return this;
  }

  /**
   * 设置被攻击后的拾取冷却时间
   * @param ticks - 冷却时间（游戏刻）
   */
  setCooldownAfterBeingAttacked(ticks: number): this {
    this.cooldown_after_being_attacked = ticks;
    return this;
  }

  /**
   * 设置禁止拾取的物品列表
   * @param items - 物品ID数组，如 ["minecraft:glow_ink_sac"]
   */
  setExcludedItems(items: string[]): this {
    this.excluded_items = items;
    return this;
  }

  /**
   * 设置拾取目标的判定半径
   * @param radius - 默认 0.5 格
   */
  setGoalRadius(radius: number): this {
    this.goal_radius = radius;
    return this;
  }

  /**
   * 设置最大搜索距离
   * @param distance - 单位：格（0 表示无限制）
   */
  setMaxDist(distance: number): this {
    this.max_dist = distance;
    return this;
  }

  /**
   * 设置是否基于难度随机决定能否拾取
   * @param enabled - 默认 false
   */
  setPickupBasedOnChance(enabled: boolean): this {
    this.pickup_based_on_chance = enabled;
    return this;
  }

  /**
   * 设置是否仅拾取与手中相同的物品
   * @param condition - 可设为布尔值或特定物品ID
   */
  setPickupSameItemsAsInHand(condition: boolean | string): this {
    this.pickup_same_items_as_in_hand = condition;
    return this;
  }

  /**
   * 设置垂直搜索范围
   * @param height - 单位：格
   */
  setSearchHeight(height: number): this {
    this.search_height = height;
    return this;
  }

  /**
   * 设置移动速度倍率
   * @param multiplier - 默认 1.0
   */
  setSpeedMultiplier(multiplier: number): this {
    this.speed_multiplier = multiplier;
    return this;
  }

  /**
   * 设置是否持续追踪目标
   * @param enabled - 默认 false
   */
  setTrackTarget(enabled: boolean): this {
    this.track_target = enabled;
    return this;
  }

  /**
   * 序列化为 Minecraft 行为包格式
   */
  @Serializer
  toObject(): Map<string, object> {
    const behaviorObj: Record<string, any> = {
      priority: this.priority,
      can_pickup_any_item: this.can_pickup_any_item,
      can_pickup_to_hand_or_equipment: this.can_pickup_to_hand_or_equipment,
      goal_radius: this.goal_radius,
      max_dist: this.max_dist,
      pickup_based_on_chance: this.pickup_based_on_chance,
      speed_multiplier: this.speed_multiplier,
      track_target: this.track_target,
    };

    // 可选属性处理
    if (this.cooldown_after_being_attacked !== undefined) {
      behaviorObj.cooldown_after_being_attacked = this.cooldown_after_being_attacked;
    }
    if (this.excluded_items !== undefined) {
      behaviorObj.excluded_items = this.excluded_items;
    }
    if (this.pickup_same_items_as_in_hand !== undefined) {
      behaviorObj.pickup_same_items_as_in_hand = this.pickup_same_items_as_in_hand;
    }
    if (this.search_height !== undefined) {
      behaviorObj.search_height = this.search_height;
    }

    return new Map().set("minecraft:behavior.pickup_items", behaviorObj);
  }
}