export class ItemComponent {
  /**
   * 设置交互按钮
   * @param {string} interact_text 交互文本
   * @returns 交互按钮组件
   */
  static setInteractButton(interact_text){
    return new Map([[
      "minecraft:interact_button",
      interact_text
    ]])
  }

  /**
   * 自定义物品组件 
   * [warning] 需要物品格式版本 format_version >1.21.90 and Scripting V2.0.0
   * @param {string} component_id 组件标识符
   * @param {object} params 自定义参数接口对象
   * @returns {Map} 物品组件Map
   */
  static setCustomComponentV2(component_id,params){
    return new Map([[
      component_id,
      params
    ]]);
  }
  /**
   * 物品的耐久度组件
   * @param {number} max_durability 最大耐久
   * @param {number} damage_chance_min 损坏最小几率
   * @param {number} damage_chance_max 损坏最大几率
   * @returns {ItemComponent}
   */
  static setDurability(max_durability,damage_chance_min = 0, damage_chance_max = 100){
    return new Map().set("minecraft:durability", {
      "damage_chance": {
          "min": damage_chance_min,
          "max": damage_chance_max
      },
      "max_durability": max_durability
    })
  }
  static setBlockPlacer(block,replace_block_item, use_on){
    return new Map().set("minecraft:block_placer",{
      block:block,
      replace_block_item: replace_block_item,
      use_on:use_on
    })
  }
    /**
  * 
  * @param {Array} custom_components 
  * @returns 
  */
  static setCustomComponents(custom_components){
    return new Map().set("minecraft:custom_components",[...custom_components])
  }
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
  static setThrowable(
    doSwingAnimation = false,
    launchPowerScale = 1.0,
    maxDrawDuration = 0.0,
    maxLaunchPower = 1.0,
    minDrawDuration = 0.0,
    scalePowerByDrawDuration = false
  ) {
    return new Map().set("minecraft:throwable", {
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
   * @param {String} displayName - 显示名称或本地化键。
   * @returns {Map} - 新的组件集合。
   */
  static setDisplayName(displayName) {
    if (typeof displayName !== "string") {
      throw new Error('显示名称必须是字符串类型');
    }
    return new Map().set("minecraft:display_name", { value: displayName });
  }

  /**
   * 设置物品的食物组件。
   * @param {Boolean} canAlwaysEat - 是否随时可以食用。
   * @param {Number} nutrition - 营养值。
   * @param {Number} saturationModifier - 饱和度修正值。
   * @param {String} [usingConvertsTo] - 食用后转换的目标物品。
   * @returns {Map} - 新的组件集合。
   */
  static setFoodComponent(canAlwaysEat, nutrition, saturationModifier, usingConvertsTo) {
    return new Map().set("minecraft:food", {
      can_always_eat: canAlwaysEat,
      nutrition: nutrition || 0,
      saturation_modifier: saturationModifier || 0.6,
      using_converts_to: usingConvertsTo || undefined,
    });
  }

  /**
   * 设置物品的燃料组件。
   * @param {Number} duration - 燃料燃烧的持续时间（秒），最小值为 0.05。
   * @returns {Map} - 新的组件集合。
   */
  static setFuel(duration) {
    if (typeof duration !== "number" || duration < 0.05) {
      throw new Error('燃料持续时间必须是一个大于或等于 0.05 的数字');
    }
    return new Map().set("minecraft:fuel", { duration });
  }

  /**
   * 设置物品的附魔光效组件。
   * @param {Boolean} hasGlint - 是否显示附魔光效。
   * @returns {Map} - 新的组件集合。
   */
  static setGlint(hasGlint) {
    if (typeof hasGlint !== "boolean") {
      throw new Error('附魔光效值必须是布尔类型');
    }
    return new Map().set("minecraft:glint", hasGlint);
  }

  /**
   * 设置物品的手持渲染方式组件。
   * @param {Boolean} isHandEquipped - 是否像工具一样渲染。
   * @returns {Map} - 新的组件集合。
   */
  static setHandEquipped(isHandEquipped) {
    if (typeof isHandEquipped !== "boolean") {
      throw new Error('手持渲染方式值必须是布尔类型');
    }
    return new Map().set("minecraft:hand_equipped", isHandEquipped);
  }

  /**
   * 设置物品的图标组件。
   * @param {String} texture - 图标纹理名称。
   * @returns {Map} - 新的组件集合。
   */
  static setIcon(texture) {
    if (typeof texture !== "string") {
      throw new Error('图标纹理必须是字符串类型');
    }
    return new Map().set("minecraft:icon", texture);
  }

  /**
   * 设置物品的最大堆叠数量组件。
   * @param {Number} maxStackSize - 最大堆叠数量，默认值为 64。
   * @returns {Map} - 新的组件集合。
   */
  static setMaxStackSize(maxStackSize = 64) {
    if (typeof maxStackSize !== "number" || maxStackSize <= 0 || !Number.isInteger(maxStackSize)) {
      throw new Error('最大堆叠数量必须是正整数');
    }
    return new Map().set("minecraft:max_stack_size", maxStackSize);
  }

  /**
   * 设置物品的投射物组件。
   * @param {Number} [minimumCriticalPower] - 投射物需要蓄力多久才能造成暴击。
   * @param {String} [projectileEntity] - 作为投射物发射的实体名称。
   * @returns {Map} - 新的组件集合。
   */
  static setProjectile(minimumCriticalPower, projectileEntity) {
    const projectileComponent = {};

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

    return new Map().set("minecraft:projectile", projectileComponent);
  }

  /**
   * 设置物品的使用修饰组件。
   * @param {Number} [movementModifier] - 使用物品时玩家移动速度的缩放值。
   * @param {Number} [useDuration] - 物品使用所需的时间（秒）。
   * @returns {Map} - 新的组件集合。
   */
  static setUseModifiers(movementModifier, useDuration) {
    const useModifiersComponent = {};

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

    return new Map().set("minecraft:use_modifiers", useModifiersComponent);
  }

  /**
   * 设置物品的可穿戴组件。
   * @param {Number} [protection=0] - 物品提供的保护值。
   * @param {String} [slot] - 物品可以穿戴的槽位（如 "head"、"chest" 等）。
   * @returns {Map} - 新的组件集合。
   */
  static setWearable(protection = 0, slot) {
    const wearableComponent = { protection };

    if (slot !== undefined) {
      if (typeof slot !== "string") {
        throw new Error('slot 必须是字符串类型');
      }
      wearableComponent.slot = slot;
    }

    return new Map().set("minecraft:wearable", wearableComponent);
  }
  /**
  * 设置物品的使用动画组件。
  * @param {String} animation - 物品使用时的动画类型（如 "eat"、"drink" 等）。
  * @returns {Map} - 新的组件集合。
  * @throws {Error} - 如果 animation 不是字符串类型。
  */
  static setUseAnimation(animation) {
    // 检查 animation 是否为字符串
    if (typeof animation !== "string") {
      throw new Error('animation 必须是字符串类型');
    }

    // 返回包含动画设置的 Map 对象
    return new Map().set("minecraft:use_animation", animation);
  }

  /**
   * 将多个组件集合合并为一个。
   * @param {...Map} componentMaps - 多个组件集合。
   * @returns {Map} - 合并后的组件集合。
   */
  static combineComponents(...componentMaps) {
    return new Map(componentMaps.flatMap(map => [...map]));
  }

  /**
   * 获取当前组件的 JSON 表示。
   * @param {Map} components - 组件集合。
   * @returns {Object} - 组件的 JSON 对象。
   */
  static toJSON(components) {
    return Object.fromEntries(components);
  }
}