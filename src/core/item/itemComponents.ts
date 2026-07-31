import type { ItemComponentMap, FoodComponentOptions } from "./types.js";

export class ItemComponent {
  /**
   * 设置交互按钮
   * @param interact_text 交互文本
   * @returns 交互按钮组件
   */
  static setInteractButton(interact_text: string): ItemComponentMap {
    return new Map<string, unknown>([[
      "minecraft:interact_button",
      interact_text
    ]])
  }

  /**
   * 自定义物品组件 
   * [warning] 需要物品格式版本 format_version >1.21.90 and Scripting V2.0.0
   * @param component_id 组件标识符
   * @param params 自定义参数接口对象
   * @returns 物品组件 Map
   */
  static setCustomComponentV2(component_id: string, params: object): ItemComponentMap {
    return new Map<string, unknown>([[
      component_id,
      params
    ]]);
  }
  /**
   * 物品的耐久度组件
   * @param max_durability 最大耐久
   * @param damage_chance_min 损坏最小几率
   * @param damage_chance_max 损坏最大几率
   * @returns 耐久度组件 Map
   */
  static setDurability(max_durability: number, damage_chance_min = 0, damage_chance_max = 100): ItemComponentMap {
    return new Map<string, unknown>().set("minecraft:durability", {
      "damage_chance": {
          "min": damage_chance_min,
          "max": damage_chance_max
      },
      "max_durability": max_durability
    })
  }
  static setBlockPlacer(block: string, replace_block_item: boolean, use_on: string[]): ItemComponentMap {
    return new Map<string, unknown>().set("minecraft:block_placer",{
      block: block,
      replace_block_item: replace_block_item,
      use_on: use_on
    })
  }
    /**
   * 设置自定义组件列表
   * @param custom_components 自定义组件 ID 数组
   * @returns 组件 Map
   */
  static setCustomComponents(custom_components: string[]): ItemComponentMap {
    const map = new Map<string, unknown>();
    for (const id of custom_components) {
      map.set(id, {});
    }
    return map;
  }
  /**
   * 设置物品的可投掷组件。
   * @param doSwingAnimation 是否使用挥动动画。
   * @param launchPowerScale 投掷力量的缩放比例。
   * @param maxDrawDuration 最大蓄力时间。
   * @param maxLaunchPower 最大投掷力量。
   * @param minDrawDuration 最小蓄力时间。
   * @param scalePowerByDrawDuration 投掷力量是否随蓄力时间增加。
   * @returns 新的组件集合。
   */
  static setThrowable(
    doSwingAnimation = false,
    launchPowerScale = 1.0,
    maxDrawDuration = 0.0,
    maxLaunchPower = 1.0,
    minDrawDuration = 0.0,
    scalePowerByDrawDuration = false
  ): ItemComponentMap {
    return new Map<string, unknown>().set("minecraft:throwable", {
      do_swing_animation: doSwingAnimation,
      launch_power_scale: launchPowerScale,
      max_draw_duration: maxDrawDuration,
      max_launch_power: maxLaunchPower,
      min_draw_duration: minDrawDuration,
      scale_power_by_draw_duration: scalePowerByDrawDuration,
    });
  }
  /**
   * 设置物品的显示名称。
   * @param displayName 显示名称或本地化键。
   * @returns 新的组件集合。
   */
  static setDisplayName(displayName: string): ItemComponentMap {
    if (typeof displayName !== "string") {
      throw new Error('显示名称必须是字符串类型');
    }
    return new Map<string, unknown>().set("minecraft:display_name", { value: displayName });
  }

  /**
   * 设置物品的食物组件。
   * @param options 食物组件配置。
   * @param options.canAlwaysEat 是否随时可以食用。
   * @param options.nutrition 营养值。
   * @param options.saturationModifier 饱和度修正值。
   * @param options.usingConvertsTo 食用后转换的目标物品。
   * @returns 新的组件集合。
   */
  static setFoodComponent(options: FoodComponentOptions = {}): ItemComponentMap {
    const {
      canAlwaysEat = false,
      nutrition = 0,
      saturationModifier = 0.6,
      usingConvertsTo,
    } = options;

    const foodComponent: Record<string, unknown> = {
      can_always_eat: canAlwaysEat,
      nutrition,
      saturation_modifier: saturationModifier,
    };

    if (usingConvertsTo !== undefined) {
      foodComponent.using_converts_to = usingConvertsTo;
    }

    return new Map<string, unknown>().set("minecraft:food", foodComponent);
  }

  /**
   * 设置物品的燃料组件。
   * @param duration 燃料燃烧的持续时间（秒），最小值为 0.05。
   * @returns 新的组件集合。
   */
  static setFuel(duration: number): ItemComponentMap {
    if (typeof duration !== "number" || duration < 0.05) {
      throw new Error('燃料持续时间必须是一个大于或等于 0.05 的数字');
    }
    return new Map<string, unknown>().set("minecraft:fuel", { duration });
  }

  /**
   * 设置物品的附魔光效组件。
   * @param hasGlint 是否显示附魔光效。
   * @returns 新的组件集合。
   */
  static setGlint(hasGlint: boolean): ItemComponentMap {
    if (typeof hasGlint !== "boolean") {
      throw new Error('附魔光效值必须是布尔类型');
    }
    return new Map<string, unknown>().set("minecraft:glint", hasGlint);
  }

  /**
   * 设置物品的手持渲染方式组件。
   * @param isHandEquipped 是否像工具一样渲染。
   * @returns 新的组件集合。
   */
  static setHandEquipped(isHandEquipped: boolean): ItemComponentMap {
    if (typeof isHandEquipped !== "boolean") {
      throw new Error('手持渲染方式值必须是布尔类型');
    }
    return new Map<string, unknown>().set("minecraft:hand_equipped", isHandEquipped);
  }

  /**
   * 设置物品的图标组件。
   * @param texture 图标纹理名称。
   * @returns 新的组件集合。
   */
  static setIcon(texture: string): ItemComponentMap {
    if (typeof texture !== "string") {
      throw new Error('图标纹理必须是字符串类型');
    }
    return new Map<string, unknown>().set("minecraft:icon", texture);
  }

  /**
   * 设置物品的最大堆叠数量组件。
   * @param maxStackSize 最大堆叠数量，默认值为 64。
   * @returns 新的组件集合。
   */
  static setMaxStackSize(maxStackSize = 64): ItemComponentMap {
    if (typeof maxStackSize !== "number" || maxStackSize <= 0 || !Number.isInteger(maxStackSize)) {
      throw new Error('最大堆叠数量必须是正整数');
    }
    return new Map<string, unknown>().set("minecraft:max_stack_size", maxStackSize);
  }

  /**
   * 设置物品的投射物组件。
   * @param minimumCriticalPower 投射物需要蓄力多久才能造成暴击。
   * @param projectileEntity 作为投射物发射的实体名称。
   * @returns 新的组件集合。
   */
  static setProjectile(minimumCriticalPower?: number, projectileEntity?: string): ItemComponentMap {
    const projectileComponent: Record<string, unknown> = {};

    if (minimumCriticalPower !== undefined) {
      if (typeof minimumCriticalPower !== "number" || minimumCriticalPower < 0) {
        throw new Error('minimumCriticalPower 必须是非负数');
      }
      projectileComponent.minimum_critical_power = minimumCriticalPower;
    }

    if (projectileEntity !== undefined) {
      if (typeof projectileEntity !== "string") {
        throw new Error('projectileEntity 必须是字符串类型');
      }
      projectileComponent.projectile_entity = projectileEntity;
    }

    return new Map<string, unknown>().set("minecraft:projectile", projectileComponent);
  }

  /**
   * 设置物品的使用修饰组件。
   * @param movementModifier 使用物品时玩家移动速度的缩放值。
   * @param useDuration 物品使用所需的时间（秒）。
   * @returns 新的组件集合。
   */
  static setUseModifiers(movementModifier?: number, useDuration?: number): ItemComponentMap {
    const useModifiersComponent: Record<string, unknown> = {};

    if (movementModifier !== undefined) {
      if (typeof movementModifier !== "number") {
        throw new Error('movementModifier 必须是数字类型');
      }
      useModifiersComponent.movement_modifier = movementModifier;
    }

    if (useDuration !== undefined) {
      if (typeof useDuration !== "number" || useDuration < 0) {
        throw new Error('useDuration 必须是非负数');
      }
      useModifiersComponent.use_duration = useDuration;
    }

    return new Map<string, unknown>().set("minecraft:use_modifiers", useModifiersComponent);
  }

  /**
   * 设置物品的可穿戴组件。
   * @param protection 物品提供的保护值。
   * @param slot 物品可以穿戴的槽位（如 "head"、"chest" 等）。
   * @returns 新的组件集合。
   */
  static setWearable(protection = 0, slot?: string): ItemComponentMap {
    const wearableComponent: Record<string, unknown> = { protection };

    if (slot !== undefined) {
      if (typeof slot !== "string") {
        throw new Error('slot 必须是字符串类型');
      }
      wearableComponent.slot = slot;
    }

    return new Map<string, unknown>().set("minecraft:wearable", wearableComponent);
  }
  /**
   * 设置物品的使用动画组件。
   * @param animation 物品使用时的动画类型（如 "eat"、"drink" 等）。
   * @returns 新的组件集合。
   */
  static setUseAnimation(animation: string): ItemComponentMap {
    // 检查 animation 是否为字符串
    if (typeof animation !== "string") {
      throw new Error('animation 必须是字符串类型');
    }

    // 返回包含动画设置的 Map 对象
    return new Map<string, unknown>().set("minecraft:use_animation", animation);
  }

  /**
   * 将多个组件集合合并为一个。
   * @param componentMaps 多个组件集合。
   * @returns 合并后的组件集合。
   */
  static combineComponents(...componentMaps: ItemComponentMap[]): ItemComponentMap {
    return new Map(componentMaps.flatMap(map => [...map]));
  }

  /**
   * 获取当前组件的 JSON 表示。
   * @param components 组件集合。
   * @returns 组件的 JSON 对象。
   */
  static toJSON(components: ItemComponentMap): Record<string, unknown> {
    return Object.fromEntries(components);
  }
}
