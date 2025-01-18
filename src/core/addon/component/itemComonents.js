/**
 * ItemCompoment 工具类，用于创建和管理 Minecraft 物品组件。
 */

export const ItemCompoment = {
    /**
     * 创建 allow_off_hand 组件。
     * @param {Boolean} value - 是否允许副手装备
     * @returns {Map} - 包含 allow_off_hand 组件的 Map。
     */
    allowOffHand: (value) => {
      return new Map().set("minecraft:allow_off_hand", value);
    },
  
    /**
   * 创建 block_placer 组件。
   * @param {string} block - 要放置的方块 ID。
   * @param {Array} useOn - 允许使用的方块描述符列表（可选）。
   * @param {boolean} replaceBlockItem - 是否将此物品注册为方块的默认物品（实验性功能）。
   * @returns {Map} - 包含 block_placer 组件的 Map。
   */
  blockPlacer: (block, useOn = [], replaceBlockItem = false) => {
    const blockPlacerData = {
      block: block,
    };

    // 如果指定了 use_on 参数
    if (useOn.length > 0) {
      blockPlacerData.use_on = useOn;
    }

    // 如果启用了实验性功能
    if (replaceBlockItem) {
      blockPlacerData.replace_block_item = replaceBlockItem;
    }

    return new Map().set("minecraft:block_placer", blockPlacerData);
  },
  
    /**
     * 创建 bundle_interaction 组件。
     * @param {number} numViewableSlots - 工具提示中可见的物品槽位数量（1 到 64）。
     * @returns {Map} - 包含 bundle_interaction 组件的 Map。
    */
    bundleInteraction: (numViewableSlots) => {
        if (numViewableSlots < 1 || numViewableSlots > 64) {
        throw new Error("num_viewable_slots must be between 1 and 64");
        }

        return new Map().set("minecraft:bundle_interaction", {
        num_viewable_slots: numViewableSlots,
        });
    },
  
    /**
     * 创建 can_destroy_in_creative 组件。
     * @param {boolean} canDestroy - 是否可以在创造模式下破坏方块。
     * @returns {Map} - 包含 can_destroy_in_creative 组件的 Map。
     */
    canDestroyInCreative: (canDestroy) => {
      return new Map().set("minecraft:can_destroy_in_creative", canDestroy);
    },
  
   /**
   * 创建 compostable 组件。
   * @param {number} compostingChance - 生成堆肥的概率（1 到 100）。
   * @returns {Map} - 包含 compostable 组件的 Map。
   */
  compostable: (compostingChance) => {
    if (compostingChance < 1 || compostingChance > 100) {
      throw new Error("composting_chance must be between 1 and 100");
    }

    return new Map().set("minecraft:compostable", {
      composting_chance: compostingChance,
    });
  },
  
    /**
   * 创建 cooldown 组件。
   * @param {string} category - 冷却类别的名称。
   * @param {number} duration - 冷却时间（秒）。
   * @returns {Map} - 包含 cooldown 组件的 Map。
   */
  cooldown: (category, duration) => {
    if (typeof category !== "string" || !category.trim()) {
      throw new Error("category must be a non-empty string");
    }
    if (typeof duration !== "number" || duration <= 0) {
      throw new Error("duration must be a positive number");
    }

    return new Map().set("minecraft:cooldown", {
      category: category,
      duration: duration,
    });
  },
  
    /**
   * 创建 damage 组件。
   * @param {number} value - 物品的额外伤害值（必须为正整数）。
   * @returns {Map} - 包含 damage 组件的 Map。
   */
  damage: (value) => {
    if (typeof value !== "number" || value <= 0 || !Number.isInteger(value)) {
      throw new Error("value must be a positive integer");
    }

    return new Map().set("minecraft:damage", value);
  },

  /////////////////////////////////////////////////////////////////////
  
    /**
   * 创建 display_name 组件。
   * @param {string} value - 物品的显示名称或本地化键。
   * @returns {Map} - 包含 display_name 组件的 Map。
   */
  displayName: (value) => {
    if (typeof value !== "string" || !value.trim()) {
      throw new Error("value must be a non-empty string");
    }

    return new Map().set("minecraft:display_name", {
        value:value
    });
  },


  
    /**
     * 创建 durability 组件。
     * @param {Object} options - 配置选项。
     * @param {number} options.max_durability - 物品的最大耐久度（必须大于等于 0）。
     * @param {Object} [options.damage_chance] - 物品失去耐久的概率范围。
     * @param {number} [options.damage_chance.min] - 最小失去耐久的概率（0-100）。
     * @param {number} [options.damage_chance.max] - 最大失去耐久的概率（0-100）。
     * @returns {Map} - 包含 durability 组件的 Map。
     * @throws {Error} - 如果 max_durability 小于 0，或 damage_chance 范围无效，则抛出错误。
     */
    durability: ({ max_durability, damage_chance }) => {
        // 检查 max_durability 是否有效
        if (max_durability === undefined || max_durability < 0) {
            throw new Error("max_durability is required and must be greater than or equal to 0");
        }

        // 检查 damage_chance 是否有效
        if (damage_chance) {
            if (
                damage_chance.min === undefined ||
                damage_chance.max === undefined ||
                damage_chance.min < 0 ||
                damage_chance.max > 100 ||
                damage_chance.min > damage_chance.max
            ) {
                throw new Error("damage_chance must be an object with min and max values between 0 and 100, and min must be less than or equal to max");
            }
        }

        // 构建 durability 组件
        const durabilityComponent = {
            max_durability: max_durability
        };

        // 如果提供了 damage_chance，则添加到组件中
        if (damage_chance) {
            durabilityComponent.damage_chance = {
                min: damage_chance.min,
                max: damage_chance.max
            };
        }

        return new Map().set("minecraft:durability", durabilityComponent);
    },
  
    /**
     * 创建 enchantable 组件。
     * @param {string[]} slots - 可附魔的插槽类型（如 "armor"、"weapon"）。
     * @returns {Map} - 包含 enchantable 组件的 Map。
     */
    enchantable: (slots) => {
      return new Map().set("minecraft:enchantable", {
        slots: slots,
      });
    },
  
    /**
     * 创建 entity_placer 组件。
     * @param {string} entity - 要放置的实体 ID。
     * @returns {Map} - 包含 entity_placer 组件的 Map。
     */
    entityPlacer: (entity) => {
      return new Map().set("minecraft:entity_placer", {
        entity: entity,
      });
    },
  
    /**
     * 创建 food 组件。
     * @param {Object} options - 配置选项。
     * @param {number} options.nutrition - 物品的营养值（必须大于等于 0）。
     * @param {number} [options.saturation_modifier=0.6] - 饱和度修饰符（必须大于等于 0）。
     * @param {boolean} [options.can_always_eat=false] - 是否可以在任何时候食用（即使不饿）。
     * @param {string} [options.using_converts_to] - 使用后转换的物品标识符（例如 "minecraft:stick"）。
     * @returns {Map} - 包含 food 组件的 Map。
     * @throws {Error} - 如果 nutrition 或 saturation_modifier 无效，则抛出错误。
     */
    food: ({ nutrition, saturation_modifier = 0.6, can_always_eat = false, using_converts_to }) => {
        // 检查 nutrition 是否有效
        if (nutrition === undefined || nutrition < 0) {
            throw new Error("nutrition is required and must be greater than or equal to 0");
        }

        // 检查 saturation_modifier 是否有效
        if (saturation_modifier < 0) {
            throw new Error("saturation_modifier must be greater than or equal to 0");
        }

        // 构建 food 组件
        const foodComponent = {
            nutrition: nutrition,
            saturation_modifier: saturation_modifier,
            can_always_eat:can_always_eat
        };

        // 如果提供了 using_converts_to，则添加到组件中
        if (using_converts_to) {
            foodComponent.using_converts_to = using_converts_to;
        }

        return new Map().set("minecraft:food", foodComponent);
    },
  
    /**
     * 创建 fuel 组件。
     * @param {number} duration - 燃烧时间（秒）。
     * @returns {Map} - 包含 fuel 组件的 Map。
     */
    fuel: (duration) => {
      return new Map().set("minecraft:fuel", {
        duration: duration,
      });
    },
  
    /**
     * 创建 glint 组件。
     * @param {boolean} enabled - 是否启用附魔光效。
     * @returns {Map} - 包含 glint 组件的 Map。
     */
    glint: (enabled) => {
      return new Map().set("minecraft:glint", {
        enabled: enabled,
      });
    },
  
    /**
     * 创建 hand_equipped 组件。
     * @param {boolean} equipped - 是否渲染为工具。
     * @returns {Map} - 包含 hand_equipped 组件的 Map。
     */
    handEquipped: (equipped) => {
      return new Map().set("minecraft:hand_equipped", {
        value: equipped,
      });
    },
  
    /**
     * 创建 hover_text_color 组件。
     * @param {string} color - 悬停文本颜色（如 "#FF0000"）。
     * @returns {Map} - 包含 hover_text_color 组件的 Map。
     */
    hoverTextColor: (color) => {
      return new Map().set("minecraft:hover_text_color", {
        value: color,
      });
    },
  
    /**
     * 创建 icon 组件。
     * @param {string} texture - 图标纹理路径。
     * @returns {Map} - 包含 icon 组件的 Map。
     */
    icon: (texture) => {
      return new Map().set("minecraft:icon", {
        texture: texture,
      });
    },
  
    /**
     * 创建 interact_button 组件。
     * @param {string|boolean} text - 交互按钮文本（或 true 使用默认文本）。
     * @returns {Map} - 包含 interact_button 组件的 Map。
     */
    interactButton: (text) => {
      return new Map().set("minecraft:interact_button", {
        value: text,
      });
    },
  
    /**
     * 创建 liquid_clipped 组件。
     * @param {boolean} clipped - 是否与液体方块交互。
     * @returns {Map} - 包含 liquid_clipped 组件的 Map。
     */
    liquidClipped: (clipped) => {
      return new Map().set("minecraft:liquid_clipped", {
        value: clipped,
      });
    },
  
    /**
     * 创建 max_stack_size 组件。
     * @param {number} size - 最大堆叠数量。
     * @returns {Map} - 包含 max_stack_size 组件的 Map。
     */
    maxStackSize: (size) => {
      return new Map().set("minecraft:max_stack_size", {
        value: size,
      });
    },
  
    /**
     * 创建 projectile 组件。
     * @param {string} projectileEntity - 投射物实体 ID。
     * @returns {Map} - 包含 projectile 组件的 Map。
     */
    projectile: (projectileEntity) => {
      return new Map().set("minecraft:projectile", {
        projectile_entity: projectileEntity,
      });
    },
  
    /**
     * 创建 rarity 组件。
     * @param {string} rarity - 稀有度（如 "common"、"rare"）。
     * @returns {Map} - 包含 rarity 组件的 Map。
     */
    rarity: (rarity) => {
      return new Map().set("minecraft:rarity", {
        value: rarity,
      });
    },
  
    /**
     * 创建 record 组件。
     * @param {string} soundEvent - 播放的音效事件 ID。
     * @returns {Map} - 包含 record 组件的 Map。
     */
    record: (soundEvent) => {
      return new Map().set("minecraft:record", {
        sound_event: soundEvent,
      });
    },
  
    /**
     * 创建 repairable 组件。
     * @param {string[]} repairItems - 可修复物品的 ID 列表。
     * @param {number} repairAmount - 每次修复的耐久度。
     * @returns {Map} - 包含 repairable 组件的 Map。
     */
    repairable: (repairItems, repairAmount) => {
      return new Map().set("minecraft:repairable", {
        repair_items: repairItems,
        repair_amount: repairAmount,
      });
    },
  
    /**
     * 创建 shooter 组件。
     * @param {string} projectile - 投射物实体 ID。
     * @param {number} chargeOnDraw - 拉弓时的充能时间。
     * @returns {Map} - 包含 shooter 组件的 Map。
     */
    shooter: (projectile, chargeOnDraw) => {
      return new Map().set("minecraft:shooter", {
        projectile: projectile,
        charge_on_draw: chargeOnDraw,
      });
    },
  
    /**
     * 创建 should_despawn 组件。
     * @param {boolean} despawn - 是否自然消失。
     * @returns {Map} - 包含 should_despawn 组件的 Map。
     */
    shouldDespawn: (despawn) => {
      return new Map().set("minecraft:should_despawn", {
        value: despawn,
      });
    },
  
    /**
     * 创建 stacked_by_data 组件。
     * @param {boolean} stacked - 是否根据附加值堆叠。
     * @returns {Map} - 包含 stacked_by_data 组件的 Map。
     */
    stackedByData: (stacked) => {
      return new Map().set("minecraft:stacked_by_data", {
        value: stacked,
      });
    },
  
    /**
     * 创建 storage_item 组件。
     * @param {number} capacity - 存储容量。
     * @returns {Map} - 包含 storage_item 组件的 Map。
     */
    storageItem: (capacity) => {
      return new Map().set("minecraft:storage_item", {
        capacity: capacity,
      });
    },
  
    /**
     * 创建 tags 组件。
     * @param {string[]} tags - 标签列表。
     * @returns {Map} - 包含 tags 组件的 Map。
     */
    tags: (tags) => {
      return new Map().set("minecraft:tags", {
        value: tags,
      });
    },
  
    /**
     * 创建 throwable 组件。
     * @param {boolean} throwable - 是否可投掷。
     * @returns {Map} - 包含 throwable 组件的 Map。
     */
    throwable: (throwable) => {
      return new Map().set("minecraft:throwable", {
        value: throwable,
      });
    },
  
    /**
     * 创建 use_animation 组件。
     * @param {string} animation - 使用动画（如 "eat"、"drink"）。
     * @returns {Map} - 包含 use_animation 组件的 Map。
     */
    useAnimation: (animation) => {
      return new Map().set("minecraft:use_animation", {
        value: animation,
      });
    },
  
    /**
     * 创建 use_modifiers 组件。
     * @param {number} useDuration - 使用时间（秒）。
     * @param {number} movementModifier - 移动速度修正。
     * @returns {Map} - 包含 use_modifiers 组件的 Map。
     */
    useModifiers: (useDuration, movementModifier) => {
      return new Map().set("minecraft:use_modifiers", {
        use_duration: useDuration,
        movement_modifier: movementModifier,
      });
    },
  
    /**
     * 创建 wearable 组件。
     * @param {string} slot - 可穿戴的插槽（如 "head"、"chest"）。
     * @returns {Map} - 包含 wearable 组件的 Map。
     */
    wearable: (slot) => {
      return new Map().set("minecraft:wearable", {
        slot: slot,
      });
    },
    /**
     * 创建自定义组件。
     * @param {string} componentName - 组件名称（如 "minecraft:display_name"）。
     * @param {object} data - 组件的数据。
     * @returns {Map} - 包含自定义组件的 Map。
     */
    custom: (componentName, data) => {
        return new Map().set(componentName, data);
    },

    /**
     * 合并多个组件 Map。
     * @param {...Map} componentMaps - 多个组件 Map。
     * @returns {Map} - 合并后的组件 Map。
     */
    merge: (...componentMaps) => {
        const mergedMap = new Map();
        for (const map of componentMaps) {
            for (const [key, value] of map.entries()) {
                mergedMap.set(key, value);
            }
        }
        return mergedMap;
    },
  };

/**
 * 使用示例
1. 创建单个组件

const iconComponent = ItemCompoment.icon("textures/items/masterball");
const fuelComponent = ItemCompoment.fuel(60);
const durabilityComponent = ItemCompoment.durability(100);

console.log(iconComponent);
console.log(fuelComponent);
console.log(durabilityComponent);
2. 合并多个组件

const combinedComponents = ItemCompoment.merge(
    ItemCompoment.icon("textures/items/masterball"),
    ItemCompoment.fuel(60),
    ItemCompoment.durability(100)
);

console.log(combinedComponents);
3. 转换为 JSON

const componentsObject = Object.fromEntries(combinedComponents);
console.log(JSON.stringify(componentsObject, null, 2));
 */