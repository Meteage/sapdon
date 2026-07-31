import type {
  BlockDescriptor,
  BlockPlacerOptions,
  CooldownOptions,
  DiggerOptions,
  DurabilitySensorOptions,
  EntityPlacerOptions,
  FoodComponentOptions,
  IconTextures,
  ItemComponentMap,
  ItemRarity,
  KineticWeaponOptions,
  PiercingWeaponOptions,
  RecordOptions,
  RepairItem,
  ShooterOptions,
  StorageItemOptions,
  SwingSoundsOptions,
  UseModifiersOptions,
} from "./types.js";

export class ItemComponent {
  /**
   * 设置交互按钮
   * @param interact_text 交互文本；传 true 使用通用 "Use Item" 文案，传 false 不显示
   * @returns 交互按钮组件
   */
  static setInteractButton(interact_text: string | boolean): ItemComponentMap {
    if (typeof interact_text !== "string" && typeof interact_text !== "boolean") {
      throw new Error('interact_text 必须是字符串或布尔类型');
    }
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
  /**
   * 设置放置方块组件
   * @param block 被放置的方块标识符
   * @param options 放置配置
   * @param options.replaceBlockItem 是否替换原方块物品
   * @param options.alignedPlacement 是否启用对齐放置
   * @param options.useOn 允许放置的目标方块描述符列表；省略则可放置于任何方块
   * @returns 组件 Map
   */
  static setBlockPlacer(block: string, options: BlockPlacerOptions = {}): ItemComponentMap {
    if (typeof block !== "string" || block.length === 0) {
      throw new Error('block 必须是非空字符串');
    }
    const { replaceBlockItem, alignedPlacement, useOn } = options;
    const component: Record<string, unknown> = { block };
    if (replaceBlockItem !== undefined) component.replace_block_item = replaceBlockItem;
    if (alignedPlacement !== undefined) component.aligned_placement = alignedPlacement;
    if (useOn !== undefined) component.use_on = useOn;
    return new Map<string, unknown>().set("minecraft:block_placer", component);
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
   * 支持字符串（default 纹理）或对象（多纹理）两种格式。
   * @param texture 图标纹理名称，或包含 default/dyed/iconTrim 等纹理的对象。
   * @returns 新的组件集合。
   */
  static setIcon(texture: string | IconTextures): ItemComponentMap {
    if (typeof texture === "string") {
      if (texture.length === 0) {
        throw new Error('图标纹理必须是字符串类型');
      }
      return new Map<string, unknown>().set("minecraft:icon", texture);
    }
    if (typeof texture !== "object" || typeof texture.default !== "string") {
      throw new Error('图标纹理对象必须包含 default 字符串');
    }
    const { default: def, dyed, iconTrim, bundleOpenBack, bundleOpenFront } = texture;
    const textures: Record<string, unknown> = { default: def };
    if (dyed !== undefined) textures.dyed = dyed;
    if (iconTrim !== undefined) textures.icon_trim = iconTrim;
    if (bundleOpenBack !== undefined) textures.bundle_open_back = bundleOpenBack;
    if (bundleOpenFront !== undefined) textures.bundle_open_front = bundleOpenFront;
    return new Map<string, unknown>().set("minecraft:icon", { textures });
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
   * @param options 使用修饰配置。
   * @param options.movementModifier 使用物品时玩家移动速度的缩放值（0.0-1.0）。
   * @param options.useDuration 物品使用所需的时间（秒）。
   * @param options.emitVibrations 是否在开始/停止使用时发出振动。
   * @param options.startSound 开始使用时触发的音效。
   * @param options.startUsing 使用修饰生效的时机（"always" 或 "if_first"）。
   * @returns 新的组件集合。
   */
  static setUseModifiers(options: UseModifiersOptions = {}): ItemComponentMap {
    const {
      movementModifier,
      useDuration,
      emitVibrations,
      startSound,
      startUsing,
    } = options;

    const component: Record<string, unknown> = {};

    if (movementModifier !== undefined) {
      if (typeof movementModifier !== "number") {
        throw new Error('movementModifier 必须是数字类型');
      }
      component.movement_modifier = movementModifier;
    }

    if (useDuration !== undefined) {
      if (typeof useDuration !== "number" || useDuration < 0) {
        throw new Error('useDuration 必须是非负数');
      }
      component.use_duration = useDuration;
    }

    if (emitVibrations !== undefined) component.emit_vibrations = emitVibrations;
    if (startSound !== undefined) component.start_sound = startSound;
    if (startUsing !== undefined) {
      if (startUsing !== 'always' && startUsing !== 'if_first') {
        throw new Error("startUsing 必须是 'always' 或 'if_first'");
      }
      component.start_using = startUsing;
    }

    return new Map<string, unknown>().set("minecraft:use_modifiers", component);
  }

  /**
   * 设置物品的可穿戴组件。
   * @param protection 物品提供的保护值。
   * @param slot 物品可以穿戴的槽位（如 "slot.armor.head"、"slot.weapon.offhand" 等）。
   * @param hidesPlayerLocation 穿戴时是否从定位栏与定位地图中隐藏。
   * @returns 新的组件集合。
   */
  static setWearable(protection = 0, slot?: string, hidesPlayerLocation?: boolean): ItemComponentMap {
    const wearableComponent: Record<string, unknown> = { protection };

    if (slot !== undefined) {
      if (typeof slot !== "string") {
        throw new Error('slot 必须是字符串类型');
      }
      wearableComponent.slot = slot;
    }

    if (hidesPlayerLocation !== undefined) {
      wearableComponent.hides_player_location = hidesPlayerLocation;
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
   * 设置物品是否可装备至副手。
   * @param allowed 是否允许装备至副手。
   * @returns 新的组件集合。
   */
  static setAllowOffHand(allowed: boolean): ItemComponentMap {
    if (typeof allowed !== "boolean") {
      throw new Error('allowed 必须是布尔类型');
    }
    return new Map<string, unknown>().set("minecraft:allow_off_hand", allowed);
  }

  /**
   * 设置 Bundle 交互组件（需要同时具备 storage_item 组件）。
   * @param numViewableSlots 可查看的槽位数量（1-64）。
   * @returns 新的组件集合。
   */
  static setBundleInteraction(numViewableSlots: number): ItemComponentMap {
    if (typeof numViewableSlots !== "number" || !Number.isInteger(numViewableSlots) || numViewableSlots < 1 || numViewableSlots > 64) {
      throw new Error('numViewableSlots 必须是 1-64 之间的整数');
    }
    return new Map<string, unknown>().set("minecraft:bundle_interaction", { num_viewable_slots: numViewableSlots });
  }

  /**
   * 设置创造模式下能否破坏方块。
   * @param canDestroy 是否可破坏。
   * @returns 新的组件集合。
   */
  static setCanDestroyInCreative(canDestroy: boolean): ItemComponentMap {
    if (typeof canDestroy !== "boolean") {
      throw new Error('canDestroy 必须是布尔类型');
    }
    return new Map<string, unknown>().set("minecraft:can_destroy_in_creative", canDestroy);
  }

  /**
   * 设置堆肥组件。
   * @param compostingChance 堆肥等级增加的概率（0-100）。
   * @returns 新的组件集合。
   */
  static setCompostable(compostingChance: number): ItemComponentMap {
    if (typeof compostingChance !== "number" || compostingChance < 0 || compostingChance > 100) {
      throw new Error('compostingChance 必须是 0-100 之间的数字');
    }
    return new Map<string, unknown>().set("minecraft:compostable", { composting_chance: compostingChance });
  }

  /**
   * 设置物品的冷却组件。
   * @param options 冷却配置。
   * @param options.category 冷却分类，相同分类的物品共享冷却。
   * @param options.duration 冷却时长（秒），负数会使物品无法使用。
   * @param options.type 冷却影响的输入类型（"use" 或 "attack"）。
   * @returns 新的组件集合。
   */
  static setCooldown(options: CooldownOptions): ItemComponentMap {
    const { category, duration, type } = options;
    if (typeof category !== "string" || category.length === 0) {
      throw new Error('category 必须是非空字符串');
    }
    if (typeof duration !== "number") {
      throw new Error('duration 必须是数字类型');
    }
    const component: Record<string, unknown> = { category, duration };
    if (type !== undefined) {
      if (type !== 'use' && type !== 'attack') {
        throw new Error("type 必须是 'use' 或 'attack'");
      }
      component.type = type;
    }
    return new Map<string, unknown>().set("minecraft:cooldown", component);
  }

  /**
   * 设置物品的伤害组件。
   * @param damage 额外伤害值（0-32767）。
   * @returns 新的组件集合。
   */
  static setDamage(damage: number): ItemComponentMap {
    if (typeof damage !== "number" || !Number.isInteger(damage) || damage < 0 || damage > 32767) {
      throw new Error('damage 必须是 0-32767 之间的整数');
    }
    return new Map<string, unknown>().set("minecraft:damage", damage);
  }

  /**
   * 设置伤害吸收组件（需要同时具备 durability 组件并装备于盔甲槽位）。
   * @param absorbableCauses 可被吸收的伤害原因列表，如 ["all"]。
   * @returns 新的组件集合。
   */
  static setDamageAbsorption(absorbableCauses: string[]): ItemComponentMap {
    if (!Array.isArray(absorbableCauses) || absorbableCauses.length === 0) {
      throw new Error('absorbableCauses 必须是非空数组');
    }
    return new Map<string, unknown>().set("minecraft:damage_absorption", { absorbable_causes: absorbableCauses });
  }

  /**
   * 设置挖掘组件。
   * @param options 挖掘配置。
   * @param options.destroySpeeds 破坏速度列表，speed 为 0 表示无法破坏该方块。
   * @param options.useEfficiency 效率附魔是否能影响破坏速度。
   * @returns 新的组件集合。
   */
  static setDigger(options: DiggerOptions): ItemComponentMap {
    const { destroySpeeds, useEfficiency } = options;
    if (!Array.isArray(destroySpeeds) || destroySpeeds.length === 0) {
      throw new Error('destroySpeeds 必须是非空数组');
    }
    const component: Record<string, unknown> = {
      destroy_speeds: destroySpeeds.map(({ block, speed }) => ({ block, speed })),
    };
    if (useEfficiency !== undefined) component.use_efficiency = useEfficiency;
    return new Map<string, unknown>().set("minecraft:digger", component);
  }

  /**
   * 设置耐久传感器组件。
   * @param options 耐久传感器配置。
   * @param options.durabilityThresholds 耐久阈值列表，达到阈值时触发粒子或音效。
   * @returns 新的组件集合。
   */
  static setDurabilitySensor(options: DurabilitySensorOptions): ItemComponentMap {
    const { durabilityThresholds } = options;
    if (!Array.isArray(durabilityThresholds) || durabilityThresholds.length === 0) {
      throw new Error('durabilityThresholds 必须是非空数组');
    }
    const thresholds = durabilityThresholds.map(({ durability, particleType, soundEvent }) => {
      const entry: Record<string, unknown> = { durability };
      if (particleType !== undefined) entry.particle_type = particleType;
      if (soundEvent !== undefined) entry.sound_event = soundEvent;
      return entry;
    });
    return new Map<string, unknown>().set("minecraft:durability_sensor", { durability_thresholds: thresholds });
  }

  /**
   * 设置可染色组件。
   * @param defaultColor 默认颜色，如 "#ffffff"。
   * @returns 新的组件集合。
   */
  static setDyeable(defaultColor: string): ItemComponentMap {
    if (typeof defaultColor !== "string" || defaultColor.length === 0) {
      throw new Error('defaultColor 必须是非空字符串');
    }
    return new Map<string, unknown>().set("minecraft:dyeable", { default_color: defaultColor });
  }

  /**
   * 设置可附魔组件。
   * @param slot 可应用的附魔槽位，如 "sword"、"bow"。
   * @param value 附魔质量与数量（0-255）。
   * @returns 新的组件集合。
   */
  static setEnchantable(slot: string, value: number): ItemComponentMap {
    if (typeof slot !== "string" || slot.length === 0) {
      throw new Error('slot 必须是非空字符串');
    }
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 255) {
      throw new Error('value 必须是 0-255 之间的整数');
    }
    return new Map<string, unknown>().set("minecraft:enchantable", { slot, value });
  }

  /**
   * 设置放置实体组件。
   * @param entity 被放置的实体标识符，可带出生事件如 "wiki:entity<wiki:event>"。
   * @param options 放置配置。
   * @param options.dispenseOn 允许发射器放置的目标方块列表。
   * @param options.useOn 允许放置的目标方块列表。
   * @returns 新的组件集合。
   */
  static setEntityPlacer(entity: string, options: EntityPlacerOptions = {}): ItemComponentMap {
    if (typeof entity !== "string" || entity.length === 0) {
      throw new Error('entity 必须是非空字符串');
    }
    const { dispenseOn, useOn } = options;
    const component: Record<string, unknown> = { entity };
    if (dispenseOn !== undefined) component.dispense_on = dispenseOn;
    if (useOn !== undefined) component.use_on = useOn;
    return new Map<string, unknown>().set("minecraft:entity_placer", component);
  }

  /**
   * 设置防火组件。
   * @param value 是否防火。
   * @returns 新的组件集合。
   */
  static setFireResistant(value: boolean): ItemComponentMap {
    if (typeof value !== "boolean") {
      throw new Error('value 必须是布尔类型');
    }
    return new Map<string, unknown>().set("minecraft:fire_resistant", { value });
  }

  /**
   * 设置物品名颜色组件。
   * @param color 颜色名称，如 "minecoin_gold"。
   * @returns 新的组件集合。
   */
  static setHoverTextColor(color: string): ItemComponentMap {
    if (typeof color !== "string" || color.length === 0) {
      throw new Error('color 必须是非空字符串');
    }
    return new Map<string, unknown>().set("minecraft:hover_text_color", color);
  }

  /**
   * 设置动能武器组件。
   * @param options 动能武器配置。
   * @param options.delay 动能伤害开始生效前的延迟（tick）。
   * @param options.hitboxMargin 命中箱额外边距（格）。
   * @param options.reach 生效距离范围（格）。
   * @param options.creativeReach 创造模式下生效距离范围（格）。
   * @param options.damageMultiplier 基础伤害倍率。
   * @param options.damageModifier 附加伤害。
   * @param options.damageConditions 造成伤害的条件。
   * @param options.dismountConditions 解除骑乘的条件。
   * @param options.knockbackConditions 造成击退的条件。
   * @returns 新的组件集合。
   */
  static setKineticWeapon(options: KineticWeaponOptions): ItemComponentMap {
    const {
      delay, hitboxMargin, reach, creativeReach,
      damageMultiplier, damageModifier,
      damageConditions, dismountConditions, knockbackConditions,
    } = options;
    if (typeof delay !== "number" || delay < 0) {
      throw new Error('delay 必须是非负数');
    }
    const component: Record<string, unknown> = { delay };
    if (hitboxMargin !== undefined) component.hitbox_margin = hitboxMargin;
    if (reach !== undefined) component.reach = reach;
    if (creativeReach !== undefined) component.creative_reach = creativeReach;
    if (damageMultiplier !== undefined) component.damage_multiplier = damageMultiplier;
    if (damageModifier !== undefined) component.damage_modifier = damageModifier;
    if (damageConditions !== undefined) component.damage_conditions = damageConditions;
    if (dismountConditions !== undefined) component.dismount_conditions = dismountConditions;
    if (knockbackConditions !== undefined) component.knockback_conditions = knockbackConditions;
    return new Map<string, unknown>().set("minecraft:kinetic_weapon", component);
  }

  /**
   * 设置物品是否与液体方块交互。
   * @param clipped 是否在液体内部交互。
   * @returns 新的组件集合。
   */
  static setLiquidClipped(clipped: boolean): ItemComponentMap {
    if (typeof clipped !== "boolean") {
      throw new Error('clipped 必须是布尔类型');
    }
    return new Map<string, unknown>().set("minecraft:liquid_clipped", clipped);
  }

  /**
   * 设置穿刺武器组件。
   * @param options 穿刺武器配置。
   * @param options.hitboxMargin 命中箱额外边距（格）。
   * @param options.reach 生效距离范围（格）。
   * @param options.creativeReach 创造模式下生效距离范围（格）。
   * @returns 新的组件集合。
   */
  static setPiercingWeapon(options: PiercingWeaponOptions = {}): ItemComponentMap {
    const { hitboxMargin, reach, creativeReach } = options;
    const component: Record<string, unknown> = {};
    if (hitboxMargin !== undefined) component.hitbox_margin = hitboxMargin;
    if (reach !== undefined) component.reach = reach;
    if (creativeReach !== undefined) component.creative_reach = creativeReach;
    return new Map<string, unknown>().set("minecraft:piercing_weapon", component);
  }

  /**
   * 设置物品稀有度组件（会被 hover_text_color 覆盖）。
   * @param rarity 稀有度："common"、"uncommon"、"rare"、"epic"。
   * @returns 新的组件集合。
   */
  static setRarity(rarity: ItemRarity): ItemComponentMap {
    const allowed = ['common', 'uncommon', 'rare', 'epic'];
    if (typeof rarity !== "string" || !allowed.includes(rarity)) {
      throw new Error("rarity 必须是 'common'、'uncommon'、'rare' 或 'epic'");
    }
    return new Map<string, unknown>().set("minecraft:rarity", rarity);
  }

  /**
   * 设置唱片组件。
   * @param options 唱片配置。
   * @param options.comparatorSignal 比较器信号强度（0-15）。
   * @param options.duration 播放时长（秒）。
   * @param options.soundEvent 播放的原版音效事件。
   * @returns 新的组件集合。
   */
  static setRecord(options: RecordOptions): ItemComponentMap {
    const { comparatorSignal, duration, soundEvent } = options;
    if (typeof comparatorSignal !== "number" || !Number.isInteger(comparatorSignal) || comparatorSignal < 0 || comparatorSignal > 15) {
      throw new Error('comparatorSignal 必须是 0-15 之间的整数');
    }
    if (typeof duration !== "number" || duration < 0) {
      throw new Error('duration 必须是非负数');
    }
    if (typeof soundEvent !== "string" || soundEvent.length === 0) {
      throw new Error('soundEvent 必须是非空字符串');
    }
    return new Map<string, unknown>().set("minecraft:record", {
      comparator_signal: comparatorSignal,
      duration,
      sound_event: soundEvent,
    });
  }

  /**
   * 设置可修复组件。
   * @param repairItems 修复条目列表；repair_amount 可为数字或 Molang 表达式字符串。
   * @returns 新的组件集合。
   */
  static setRepairable(repairItems: RepairItem[]): ItemComponentMap {
    if (!Array.isArray(repairItems) || repairItems.length === 0) {
      throw new Error('repairItems 必须是非空数组');
    }
    const items = repairItems.map(({ items, repairAmount }) => {
      const entry: Record<string, unknown> = { items };
      if (repairAmount !== undefined) entry.repair_amount = repairAmount;
      return entry;
    });
    return new Map<string, unknown>().set("minecraft:repairable", { repair_items: items });
  }

  /**
   * 设置射击组件（需要同时具备 use_modifiers 组件）。
   * @param options 射击配置。
   * @param options.ammunition 弹药列表，item 必须具有 projectile 组件。
   * @param options.chargeOnDraw 是否在拉弓时上弹（如弩）。
   * @param options.maxDrawDuration 自动发射前的最大拉弓时长（秒）。
   * @param options.scalePowerByDrawDuration 发射威力是否随拉弓时长增加。
   * @returns 新的组件集合。
   */
  static setShooter(options: ShooterOptions): ItemComponentMap {
    const { ammunition, chargeOnDraw, maxDrawDuration, scalePowerByDrawDuration } = options;
    if (!Array.isArray(ammunition) || ammunition.length === 0) {
      throw new Error('ammunition 必须是非空数组');
    }
    const component: Record<string, unknown> = {
      ammunition: ammunition.map(({ item, searchInventory, useInCreative, useOffhand }) => {
        const entry: Record<string, unknown> = { item };
        if (searchInventory !== undefined) entry.search_inventory = searchInventory;
        if (useInCreative !== undefined) entry.use_in_creative = useInCreative;
        if (useOffhand !== undefined) entry.use_offhand = useOffhand;
        return entry;
      }),
    };
    if (chargeOnDraw !== undefined) component.charge_on_draw = chargeOnDraw;
    if (maxDrawDuration !== undefined) component.max_draw_duration = maxDrawDuration;
    if (scalePowerByDrawDuration !== undefined) component.scale_power_by_draw_duration = scalePowerByDrawDuration;
    return new Map<string, unknown>().set("minecraft:shooter", component);
  }

  /**
   * 设置是否应该消失组件。
   * @param shouldDespawn 掉落物是否最终消失。
   * @returns 新的组件集合。
   */
  static setShouldDespawn(shouldDespawn: boolean): ItemComponentMap {
    if (typeof shouldDespawn !== "boolean") {
      throw new Error('shouldDespawn 必须是布尔类型');
    }
    return new Map<string, unknown>().set("minecraft:should_despawn", shouldDespawn);
  }

  /**
   * 设置按数据堆叠组件。
   * @param stackedByData 不同数据值的同种物品是否分开堆叠。
   * @returns 新的组件集合。
   */
  static setStackedByData(stackedByData: boolean): ItemComponentMap {
    if (typeof stackedByData !== "boolean") {
      throw new Error('stackedByData 必须是布尔类型');
    }
    return new Map<string, unknown>().set("minecraft:stacked_by_data", stackedByData);
  }

  /**
   * 设置容器物品组件（需要 max_stack_size 为 1）。
   * @param options 容器配置。
   * @param options.maxSlots 容器槽位数量（1-64）。
   * @param options.allowNestedStorageItems 是否允许嵌套其他容器物品。
   * @param options.allowedItems 仅允许存入的物品列表。
   * @param options.bannedItems 禁止存入的物品列表。
   * @returns 新的组件集合。
   */
  static setStorageItem(options: StorageItemOptions): ItemComponentMap {
    const { maxSlots, allowNestedStorageItems, allowedItems, bannedItems } = options;
    if (typeof maxSlots !== "number" || !Number.isInteger(maxSlots) || maxSlots < 1 || maxSlots > 64) {
      throw new Error('maxSlots 必须是 1-64 之间的整数');
    }
    if (typeof allowNestedStorageItems !== "boolean") {
      throw new Error('allowNestedStorageItems 必须是布尔类型');
    }
    const component: Record<string, unknown> = {
      max_slots: maxSlots,
      allow_nested_storage_items: allowNestedStorageItems,
    };
    if (allowedItems !== undefined) component.allowed_items = allowedItems;
    if (bannedItems !== undefined) component.banned_items = bannedItems;
    return new Map<string, unknown>().set("minecraft:storage_item", component);
  }

  /**
   * 设置容器重量上限组件（需要同时具备 storage_item 组件）。
   * @param maxWeightLimit 容器内物品总重量上限。
   * @returns 新的组件集合。
   */
  static setStorageWeightLimit(maxWeightLimit: number): ItemComponentMap {
    if (typeof maxWeightLimit !== "number" || !Number.isInteger(maxWeightLimit) || maxWeightLimit < 0) {
      throw new Error('maxWeightLimit 必须是非负整数');
    }
    return new Map<string, unknown>().set("minecraft:storage_weight_limit", { max_weight_limit: maxWeightLimit });
  }

  /**
   * 设置容器重量修正组件（0 表示不允许放入其他容器）。
   * @param weightInStorageItem 该物品放入容器时占用的重量（0-64）。
   * @returns 新的组件集合。
   */
  static setStorageWeightModifier(weightInStorageItem: number): ItemComponentMap {
    if (typeof weightInStorageItem !== "number" || !Number.isInteger(weightInStorageItem) || weightInStorageItem < 0 || weightInStorageItem > 64) {
      throw new Error('weightInStorageItem 必须是 0-64 之间的整数');
    }
    return new Map<string, unknown>().set("minecraft:storage_weight_modifier", { weight_in_storage_item: weightInStorageItem });
  }

  /**
   * 设置挥动时长组件。
   * @param value 基础挥动时长（秒）。
   * @returns 新的组件集合。
   */
  static setSwingDuration(value: number): ItemComponentMap {
    if (typeof value !== "number" || value < 0) {
      throw new Error('value 必须是非负数');
    }
    return new Map<string, unknown>().set("minecraft:swing_duration", { value });
  }

  /**
   * 设置挥砍音效组件。
   * @param options 音效配置。
   * @param options.attackMiss 未命中时播放的原版音效。
   * @param options.attackHit 普通命中时播放的原版音效。
   * @param options.attackCriticalHit 暴击命中时播放的原版音效。
   * @returns 新的组件集合。
   */
  static setSwingSounds(options: SwingSoundsOptions = {}): ItemComponentMap {
    const { attackMiss, attackHit, attackCriticalHit } = options;
    const component: Record<string, unknown> = {};
    if (attackMiss !== undefined) component.attack_miss = attackMiss;
    if (attackHit !== undefined) component.attack_hit = attackHit;
    if (attackCriticalHit !== undefined) component.attack_critical_hit = attackCriticalHit;
    return new Map<string, unknown>().set("minecraft:swing_sounds", component);
  }

  /**
   * 设置物品标签组件。
   * @param tags 标签列表。
   * @returns 新的组件集合。
   */
  static setTags(tags: string[]): ItemComponentMap {
    if (!Array.isArray(tags) || tags.some(tag => typeof tag !== "string")) {
      throw new Error('tags 必须是字符串数组');
    }
    return new Map<string, unknown>().set("minecraft:tags", { tags });
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
