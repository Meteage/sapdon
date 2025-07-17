import { RideableComponentDesc } from '../../type.js'

export class EntityComponent {
    /**
   * 设置实体是否可以堆叠
   * @returns 
   */
 static setIsStackable(){
  return new Map([[
              "minecraft:is_stackable",{}
          ]])
 }
 
  /**
   * 设置实体周围的效果范围
   * @param {Object} options - 效果配置
   * @param {string} options.effect - 效果ID（如"minecraft:poison"）
   * @param {number} [options.range=0.2] - 效果作用范围（单位：格）
   * @param {number|'infinite'} [options.duration=10] - 效果持续时间（秒）
   * @param {number} [options.cooldown=0] - 效果触发冷却时间（秒）
   * @param {Object} [options.filter] - 实体过滤器配置
   * @returns {Map} 返回 Minecraft mob_effect 组件
   * 
   * @example // 河豚毒效果（小范围中毒）
   * const pufferfish = EntityComponent.setMobEffect({
   *   effect: "minecraft:poison",
   *   range: 0.2,
   *   duration: 10
   * });
   * 
   * @example // 监守者黑暗效果（大范围）
   * const warden = EntityComponent.setMobEffect({
   *   effect: "minecraft:darkness",
   *   range: 20,
   *   duration: 13,
   *   cooldown: 6,
   *   filter: {
   *     all_of: [
   *       { test: "is_family", subject: "other", value: "player" },
   *       { operator: "not", test: "has_ability", subject: "other", value: "invulnerable" }
   *     ]
   *   }
   * });
   * 
   * @example // 无限持续时间效果
   * const infiniteEffect = EntityComponent.setMobEffect({
   *   effect: "minecraft:regeneration",
   *   duration: 'infinite'
   * });
   */
  static setMobEffect({ effect, range = 0.2, duration = 10, cooldown = 0, filter }) {
    const data = {
      mob_effect: effect,
      effect_range: range,
      effect_time: duration,
      cooldown_time: cooldown
    };
    if (filter) data.entity_filter = filter;
    return new Map([['minecraft:mob_effect', data]]);
  }
  /**
   * 设置控制实体所需的物品
   * @param {string|string[]} controlItems - 可控制物品ID或数组
   * @returns {Map} 返回 Minecraft item_controllable 组件
   * 
   * @example // 猪控制（胡萝卜钓竿）
   * const pigControl = EntityComponent.setItemControllable("carrotOnAStick");
   * 
   * @example // 炽足兽控制（诡异菌钓竿）
   * const striderControl = EntityComponent.setItemControllable("warped_fungus_on_a_stick");
   * 
   * @example // 多物品控制（同时接受两种控制物品）
   * const multiControl = EntityComponent.setItemControllable([
   *   "carrotOnAStick",
   *   "custom:special_stick"
   * ]);
   */
  static setItemControllable(controlItems) {
    return new Map([[
      'minecraft:item_controllable',
      {
        control_items: Array.isArray(controlItems) ? controlItems : [controlItems]
      }
    ]]);
  }
  /**
   * 设置实体群组大小追踪规则
   * @param {number} [radius=16] - 检测半径范围（单位：方块格，默认16格）
   * @param {Object} [filter] - 实体过滤器配置（可选）
   * @returns {Map} 返回 Minecraft group_size 组件配置
   * 
   * @example // 基础用法 - 只设置检测半径
   * const basic = EntityComponent.setGroupSize(12);
   * 
   * @example // 猪灵配置 - 32格半径，过滤成年猪灵
   * const hoglin = EntityComponent.setGroupSize(32, {
   *   all_of: [
   *     { test: "has_component", operator: "!=", value: "minecraft:is_baby" },
   *     { test: "is_family", value: "hoglin" }
   *   ]
   * });
   * 
   * @example // 村民配置 - 24格半径，过滤成年村民
   * const villager = EntityComponent.setGroupSize(24, {
   *   all_of: [
   *     { test: "is_family", value: "villager" },
   *     { test: "has_component", operator: "!=", value: "minecraft:is_baby" }
   *   ]
   * });
   * 
   * @example // 怪物群体检测 - 16格半径，过滤所有敌对生物
   * const monsters = EntityComponent.setGroupSize(16, {
   *   any_of: [
   *     { test: "is_family", value: "monster" },
   *     { test: "is_family", value: "undead" }
   *   ]
   * });
   */
  static setGroupSize(radius = 16, filter) {
    const data = { radius };
    if (filter) data.filters = filter;
    return new Map([['minecraft:group_size', data]]);
  }
  /**
   * 设置实体的装备配置
   * @param {Object} options - 装备配置选项
   * @param {string} [options.table] - 装备表的文件路径（相对于行为包根目录）
   * @param {Array<Object>} [options.slotDropChance] - 装备槽位的掉落概率配置
   * @param {string} options.slotDropChance[].slot - 装备槽位名称（如："slot.weapon.mainhand"）
   * @param {number} options.slotDropChance[].dropChance - 掉落概率（0-1）
   * @returns {Map} 返回 Minecraft 装备组件
   * 
   * @example
   * // 沼泽僵尸（使用骨骼装备表）
   * const bogged = EntityComponent.setEquipment({
   *   table: "loot_tables/entities/skeleton_gear.json"
   * });
   * 
   * // 溺尸（设置主手武器100%掉落）
   * const drowned = EntityComponent.setEquipment({
   *   slotDropChance: [{
   *     slot: "slot.weapon.mainhand",
   *     dropChance: 1
   *   }]
   * });
   * 
   * // 村民（主手武器不会掉落）
   * const villager = EntityComponent.setEquipment({
   *   slotDropChance: [{
   *     slot: "slot.weapon.mainhand",
   *     dropChance: 0
   *   }]
   * });
   */
  static setEquipment(options = {}) {
    const componentData = {};
    
    if (options.table) {
      componentData.table = options.table;
    }
    
    if (options.slotDropChance) {
      componentData.slot_drop_chance = options.slotDropChance.map(item => ({
        slot: item.slot,
        drop_chance: item.dropChance
      }));
    }
    
    return new Map([[
      'minecraft:equipment',
      componentData
    ]]);
  }
   /**
   * 设置实体装备物品的行为
   * @param {Object} [options={}] - 装备配置选项
   * @param {boolean} [options.canWearArmor] - 是否可以穿戴盔甲
   * @param {Array<Object>} [options.excludedItems] - 禁止装备的物品列表
   * @param {string} options.excludedItems[].item - 禁止装备的物品ID（格式："命名空间:物品名:数据值"）
   * @returns {Map} 返回 Minecraft 装备物品组件
   * 
   * @example
   * // 沼泽僵尸（禁止装备特定旗帜）
   * const bogged = EntityComponent.setEquipItem({
   *   excludedItems: [{ item: "minecraft:banner:15" }]
   * });
   * 
   * // 唤魔者（默认空配置）
   * const evoker = EntityComponent.setEquipItem();
   * 
   * // 狐狸（禁止穿戴盔甲）
   * const fox = EntityComponent.setEquipItem({
   *   canWearArmor: false
   * });
   */
  static setEquipItem(options = {}) {
    const componentData = {};
    
    if (options.canWearArmor !== undefined) {
      componentData.can_wear_armor = options.canWearArmor;
    }
    
    if (options.excludedItems) {
      componentData.excluded_items = options.excludedItems;
    }
    
    return new Map([[
      'minecraft:equip_item',
      componentData
    ]]);
  }
  /**
   * Makes entity immune to fire damage
   * @param {boolean} [value=true] - Whether the entity is fire immune
   * @returns {Map} Minecraft fire_immune component
   */
  static setFireImmune(value = true) {
    return new Map([[
      'minecraft:fire_immune',
      value === false ? {} : true
    ]]);
  }
  /**
   * Sets the crop growth promotion properties when entity walks over crops
   * @param {Object} options - Growth configuration
   * @param {number} [options.chance=0] - Success chance per tick (0-1)
   * @param {number} [options.charges=10] - Number of growth charges
   * @returns {Map} Minecraft grows_crop component
   */
  static setGrowsCrop({ chance = 0, charges = 10 } = {}) {
    return new Map([[
      'minecraft:grows_crop',
      { chance, charges }
    ]]);
  }
   /**
   * 设置实体立即消失
   * @param {Object} [options] - 消失配置选项
   * @param {boolean} [options.removeChildEntities=false] - 是否同时移除子实体（如被拴绳牵引的实体）
   * @returns {Map} 返回Minecraft立即消失组件
   */
  static setInstantDespawn(options = {}) {
    return new Map([[
      'minecraft:instant_despawn',
      { remove_child_entities: !!options.removeChildEntities }
    ]]);
  }
  /**
   * 设置实体在指定方块内的通知器
   * @param {Array} blockList - 要监测的方块列表
   * @param {Object[]} blockList[].block - 方块定义
   * @param {string} blockList[].block.name - 方块ID (如"minecraft:bubble_column")
   * @param {Object} [blockList[].block.states] - 方块状态 (如{"drag_down": true})
   * @param {Object} [blockList[].entered_block_event] - 进入方块时触发的事件
   * @param {string} blockList[].entered_block_event.event - 进入事件名称
   * @param {string} [blockList[].entered_block_event.target="self"] - 事件目标
   * @param {Object} [blockList[].exited_block_event] - 离开方块时触发的事件
   * @param {string} blockList[].exited_block_event.event - 离开事件名称
   * @param {string} [blockList[].exited_block_event.target="self"] - 事件目标
   * @returns {Map} 返回Minecraft方块内部通知器组件
   */
  static setInsideBlockNotifier(blockList) {
    return new Map([[
      'minecraft:inside_block_notifier',
      { block_list: blockList }
    ]]);
  }
   /**
   * 设置实体的库存属性
   * @param {Object} options - 库存配置选项
   * @param {number} [options.additionalSlotsPerStrength] - 每点力量值增加的额外槽位数
   * @param {boolean} [options.canBeSiphonedFrom] - 是否允许漏斗从此库存抽取物品
   * @param {'horse'|'minecart_chest'|'chest_boat'} [options.containerType] - 容器类型
   * @param {number} [options.inventorySize] - 库存槽位数量
   * @param {boolean} [options.isPrivate] - 死亡时是否不掉落库存物品
   * @param {boolean} [options.restrictToOwner] - 是否只有所有者能访问
   * @returns {Map} 返回Minecraft库存组件
   */
  static setInventoryProperties(options) {
    return new Map([[
      'minecraft:inventory', 
      {
        additional_slots_per_strength: options.additionalSlotsPerStrength,
        can_be_siphoned_from: options.canBeSiphonedFrom,
        container_type: options.containerType,
        inventory_size: options.inventorySize,
        private: options.isPrivate,
        restrict_to_owner: options.restrictToOwner
      }
    ]]);
  }

  /**
   * 设置自定义碰撞箱
   * @param {Array} hitboxes - 碰撞箱定义数组
   * @returns {Map} 返回Minecraft自定义碰撞测试组件
   */
  static setCustomHitTest(hitboxes) {
    return new Map([['minecraft:custom_hit_test', { hitboxes }]]);
  }

    /**
     * @param {string[]} family_arr 
     * @returns 
     */
    static setTypeFamily(family_arr) {
        return new Map().set("minecraft:type_family", {
            "family": family_arr
        });
    }

    static setDamageSensor(deals_damage) {
        return new Map().set("minecraft:damage_sensor", {
            "triggers": {
                "deals_damage": deals_damage
            }
        }
        );
    }

    /**
     * @param {RideableComponentDesc} param0 
     * @returns 
     */
    static setRideable({
        controllingSeat = 1,
        crouchingSkipInteract = true,
        familyTypes = ['player'],
        interactText = 'drive',
        onRiderEnterEvent,
        onRiderExitEvent,
        seatCount,
        seats,
        passengerMaxWidth,
        pullInEntities,
    }) {
        return new Map([[
            'minecraft:rideable',
            {
                "controlling_seat": controllingSeat,
                "crouching_skip_interact": crouchingSkipInteract,
                "family_types": familyTypes,
                "interact_text": interactText,
                "on_rider_enter_event": onRiderEnterEvent,
                "on_rider_exit_event": onRiderExitEvent,
                "seat_count": seatCount,
                "seats": seats,
                "passenger_max_width": passengerMaxWidth,
                "pull_in_entities": pullInEntities,
            }
        ]])
    }

    static setInputGroundControlled() {
        return new Map([[
            'minecraft:input_ground_controlled',
            {}
        ]])
    }

    /**
     * @param {number} [base] 
     * @param {number} [controlled] 
     * @param {number} [jumpPrevented] 
     * @returns 
     */
    static setVariableMaxAutoStep(base, controlled, jumpPrevented) {
        return new Map([[
            'minecraft:variable_max_auto_step',
            {
                'base_value': base,
                'controlled_value': controlled,
                'jump_prevented_value': jumpPrevented
            }
        ]])
    }

    static setMovement(speed) {
        return new Map().set("minecraft:movement", {
            "value": speed
        });
    }

    static setCollisionBox(width, height) {
        return new Map().set("minecraft:collision_box", {
            width: width,
            height: height,
        });
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
       * 创建 minecraft:health 组件。
       * @param {Object} options 配置选项
       * @param {number} options.max 实体的最大生命值
       * @param {number|Object} options.value 实体的初始生命值（可以是固定值或范围值）
       * @returns {Map} 包含 minecraft:health 组件的 Map 对象
       * @throws {Error} 如果参数无效。
       */
    static setHealth(options = {}) {
        const { max, value } = options;

        // 参数验证
        this.validateHealthParameters(max, value);

        // 构建组件
        const healthComponent = {
            max: max,
            value: value,
        };

        // 返回 Map 对象
        const healthMap = new Map();
        healthMap.set("minecraft:health", healthComponent);
        return healthMap;
    }

    /**
     * 验证 minecraft:health 组件的参数。
     * @param {number} max 最大生命值
     * @param {number|Object} value 初始生命值
     * @throws {Error} 如果参数无效。
     */
    static validateHealthParameters(max, value) {
        if (typeof max !== "number" || max <= 0) {
            throw new Error("max 必须是一个正数");
        }

        if (
            (typeof value !== "number" && typeof value !== "object") ||
            (typeof value === "number" && value <= 0) ||
            (typeof value === "object" &&
                (typeof value.range_min !== "number" ||
                    typeof value.range_max !== "number" ||
                    value.range_min <= 0 ||
                    value.range_max <= 0))
        ) {
            throw new Error("value 必须是一个正数或包含 range_min 和 range_max 的对象");
        }
    }
    /**
     * 创建 minecraft:physics 组件。
     * @param {boolean} has_collision 是否碰撞（默认：true）
     * @param {boolean} has_gravity 是否受重力影响（默认：true）
     * @param {boolean} push_towards_closest_space 是否在卡住时推向最近空间（默认：false）
     * @returns {Map} 包含 minecraft:physics 组件的 Map 对象
     * @throws {Error} 如果参数不是布尔类型。
     */
    static setPhysics(
        has_collision = true,
        has_gravity = true,
        push_towards_closest_space = false
    ) {
        // 参数验证
        if (
            typeof has_collision !== "boolean" ||
            typeof has_gravity !== "boolean" ||
            typeof push_towards_closest_space !== "boolean"
        ) {
            throw new Error("所有参数必须是布尔类型");
        }

        // 创建 Map 对象
        const physicsMap = new Map();
        physicsMap.set("minecraft:physics", {
            has_collision: has_collision,
            has_gravity: has_gravity,
            push_towards_closest_space: push_towards_closest_space,
        });

        return physicsMap;
    }

    /**
   * 创建 minecraft:scale 组件。
   * @param {number} value 实体的缩放比例（默认：1.0）
   * @returns {Map} 包含 minecraft:scale 组件的 Map 对象
   * @throws {Error} 如果参数无效。
   */
    static setScale(value = 1.0) {
        // 参数验证
        if (typeof value !== "number" || value <= 0) {
            throw new Error("value 必须是一个正数");
        }

        // 返回 Map 对象
        const scaleMap = new Map();
        scaleMap.set("minecraft:scale", {
            value: value,
        });
        return scaleMap;
    }
    /**
   * 创建默认的 minecraft:nameable 组件（不填写参数）。
   * @returns {Map} 包含 minecraft:nameable 组件的 Map 对象
   */
    static setDefaultNameable() {
        const nameableMap = new Map();
        nameableMap.set("minecraft:nameable", {});
        return nameableMap;
    }

    /**
     * 创建自定义的 minecraft:nameable 组件（填写参数）。
     * @param {boolean} allowNameTagRenaming 是否允许使用命名牌重命名（默认：true）
     * @param {boolean} alwaysShow 是否始终显示名称（默认：false）
     * @param {Object} defaultTrigger 默认触发事件（可选）
     * @param {Array} nameActions 特殊名称及其对应的事件（可选）
     * @returns {Map} 包含 minecraft:nameable 组件的 Map 对象
     * @throws {Error} 如果参数无效。
     */
    static setCustomNameable(
        allowNameTagRenaming = true,
        alwaysShow = false,
        defaultTrigger = null,
        nameActions = []
    ) {
        // 参数验证
        if (
            typeof allowNameTagRenaming !== "boolean" ||
            typeof alwaysShow !== "boolean"
        ) {
            throw new Error("allowNameTagRenaming 和 alwaysShow 必须是布尔类型");
        }

        // 构建组件
        const nameableComponent = {
            allow_name_tag_renaming: allowNameTagRenaming,
            always_show: alwaysShow,
        };

        // 添加 default_trigger（如果存在）
        if (defaultTrigger) {
            nameableComponent.default_trigger = defaultTrigger;
        }

        // 添加 name_actions（如果存在）
        if (nameActions.length > 0) {
            nameableComponent.name_actions = nameActions;
        }

        // 返回 Map 对象
        const nameableMap = new Map();
        nameableMap.set("minecraft:nameable", nameableComponent);
        return nameableMap;
    }

    /**
     * 创建 minecraft:pushable 组件。
     * @param {boolean} isPushable 是否可以被其他实体推动（默认：true）
     * @param {boolean} isPushableByPiston 是否可以被活塞推动（默认：true）
     * @returns {Map} 包含 minecraft:pushable 组件的 Map 对象
     * @throws {Error} 如果参数无效。
     */
    static setPushable(isPushable = true, isPushableByPiston = true) {
        // 参数验证
        if (typeof isPushable !== "boolean" || typeof isPushableByPiston !== "boolean") {
            throw new Error("isPushable 和 isPushableByPiston 必须是布尔类型");
        }

        // 返回 Map 对象
        const pushableMap = new Map();
        pushableMap.set("minecraft:pushable", {
            is_pushable: isPushable,
            is_pushable_by_piston: isPushableByPiston,
        });
        return pushableMap;
    }


    /**
       * 创建 minecraft:jump.static 组件。
       * @param {number} jumpPower 跳跃的初始垂直速度（默认：0.42）
       * @returns {Map} 包含 minecraft:jump.static 组件的 Map 对象
       * @throws {Error} 如果参数无效。
       */
    static setJumpStatic(jumpPower = 0.42) {
        // 参数验证
        if (typeof jumpPower !== "number" || jumpPower < 0) {
            throw new Error("jumpPower 必须是一个非负数");
        }

        // 返回 Map 对象
        const jumpStaticMap = new Map();
        jumpStaticMap.set("minecraft:jump.static", {
            jump_power: jumpPower,
        });
        return jumpStaticMap;
    }

    /**
    * 创建 minecraft:navigation.walk 组件。
    * @param {Object} options 配置选项
    * @param {boolean} options.avoidDamageBlocks 是否避免伤害性方块（默认：false）
    * @param {boolean} options.avoidPortals 是否避免传送门（默认：false）
    * @param {boolean} options.avoidSun 是否避免阳光下的方块（默认：false）
    * @param {boolean} options.avoidWater 是否避免水（默认：false）
    * @param {Array} options.blocksToAvoid 需要避免的方块列表（默认：[]）
    * @param {boolean} options.canBreach 是否可以跳出水面（默认：false）
    * @param {boolean} options.canBreakDoors 是否可以破坏门（默认：false）
    * @param {boolean} options.canFloat 是否可以漂浮（默认：false）
    * @param {boolean} options.canJump 是否可以跳跃（默认：true）
    * @param {boolean} options.canOpenDoors 是否可以开门（默认：false）
    * @param {boolean} options.canOpenIronDoors 是否可以开铁门（默认：false）
    * @param {boolean} options.canPassDoors 是否可以穿过门（默认：true）
    * @param {boolean} options.canPathFromAir 是否可以在空中开始路径规划（默认：false）
    * @param {boolean} options.canPathOverLava 是否可以在熔岩表面行走（默认：false）
    * @param {boolean} options.canPathOverWater 是否可以在水面上行走（默认：false）
    * @param {boolean} options.canSink 是否会在水中下沉（默认：true）
    * @param {boolean} options.canSwim 是否可以游泳（默认：false）
    * @param {boolean} options.canWalk 是否可以在地面上行走（默认：true）
    * @param {boolean} options.canWalkInLava 是否可以在熔岩中行走（默认：false）
    * @param {boolean} options.isAmphibious 是否可以在水下行走（默认：false）
    * @returns {Map} 包含 minecraft:navigation.walk 组件的 Map 对象
    * @throws {Error} 如果参数无效。
    */
    static setNavigationWalk(options = {}) {
        // 默认值
        const {
            avoidDamageBlocks = false,
            avoidPortals = false,
            avoidSun = false,
            avoidWater = false,
            blocksToAvoid = [],
            canBreach = false,
            canBreakDoors = false,
            canFloat = false,
            canJump = true,
            canOpenDoors = false,
            canOpenIronDoors = false,
            canPassDoors = true,
            canPathFromAir = false,
            canPathOverLava = false,
            canPathOverWater = false,
            canSink = true,
            canSwim = false,
            canWalk = true,
            canWalkInLava = false,
            isAmphibious = false,
        } = options;

        // 构建组件
        const navigationWalkComponent = {
            avoid_damage_blocks: avoidDamageBlocks,
            avoid_portals: avoidPortals,
            avoid_sun: avoidSun,
            avoid_water: avoidWater,
            blocks_to_avoid: blocksToAvoid,
            can_breach: canBreach,
            can_break_doors: canBreakDoors,
            can_float: canFloat,
            can_jump: canJump,
            can_open_doors: canOpenDoors,
            can_open_iron_doors: canOpenIronDoors,
            can_pass_doors: canPassDoors,
            can_path_from_air: canPathFromAir,
            can_path_over_lava: canPathOverLava,
            can_path_over_water: canPathOverWater,
            can_sink: canSink,
            can_swim: canSwim,
            can_walk: canWalk,
            can_walk_in_lava: canWalkInLava,
            is_amphibious: isAmphibious,
        };

        // 返回 Map 对象
        const navigationWalkMap = new Map();
        navigationWalkMap.set("minecraft:navigation.walk", navigationWalkComponent);
        return navigationWalkMap;
    }

    /**
     * 创建 minecraft:movement.basic 组件。
     * @param {number} maxTurn 实体每 tick 可以转向的最大角度（默认：30.0）
     * @returns {Map} 包含 minecraft:movement.basic 组件的 Map 对象
     * @throws {Error} 如果参数无效。
     */
    static setMovementBasic(maxTurn = 30.0) {
        // 参数验证
        if (typeof maxTurn !== "number" || maxTurn < 0) {
            throw new Error("maxTurn 必须是一个非负数");
        }

        // 返回 Map 对象
        const movementBasicMap = new Map();
        movementBasicMap.set("minecraft:movement.basic", {
            max_turn: maxTurn,
        });
        return movementBasicMap;
    }

    /**
     * 创建 minecraft:projectile 组件。
     * @param {Object} options 配置选项
     * @param {number} options.anchor 发射锚点（默认：0）
     * @param {number} options.angleOffset 角度偏移（默认：0.0）
     * @param {boolean} options.catchFire 是否点燃目标（默认：false）
     * @param {boolean} options.critParticleOnHurt 是否生成暴击粒子（默认：false）
     * @param {boolean} options.destroyOnHurt 是否在击中时销毁（默认：false）
     * @param {string} options.filter 过滤的实体（可选）
     * @param {boolean} options.fireAffectedByGriefing 是否受游戏规则影响（默认：false）
     * @param {number} options.gravity 重力值（默认：0.05）
     * @param {string} options.hitSound 击中声音（可选）
     * @param {string} options.hitGroundSound 击中地面声音（可选）
     * @param {boolean} options.homing 是否追踪目标（默认：false）
     * @param {number} options.inertia 空气惯性（默认：0.99）
     * @param {boolean} options.isDangerous 是否对玩家危险（默认：false）
     * @param {boolean} options.knockback 是否击退目标（默认：true）
     * @param {boolean} options.lightning 是否召唤闪电（默认：false）
     * @param {number} options.liquidInertia 水中惯性（默认：0.6）
     * @param {boolean} options.multipleTargets 是否可击中多个目标（默认：true）
     * @param {number[]} options.offset 发射偏移量（默认：[0, 0, 0]）
     * @param {number} options.onFireTime 着火时间（默认：0.0）
     * @param {Object} options.onHit 击中时的行为（可选）
     * @param {string} options.particle 碰撞粒子（默认："ironcrack"）
     * @param {number} options.power 初始速度（默认：1.3）
     * @param {number} options.reflectImmunity 反射免疫时间（默认：0.0）
     * @param {boolean} options.reflectOnHurt 是否反射（默认：false）
     * @param {string} options.shootSound 发射声音（可选）
     * @param {boolean} options.shootTarget 是否朝向目标发射（默认：true）
     * @param {boolean} options.shouldBounce 是否反弹（默认：false）
     * @param {boolean} options.splashPotion 是否为喷溅药水（默认：false）
     * @param {number} options.splashRange 喷溅范围（默认：4）
     * @param {boolean} options.stopOnHurt 是否在击中时停止（默认：false）
     * @param {number} options.uncertaintyBase 基础精度（默认：0）
     * @param {number} options.uncertaintyMultiplier 精度倍数（默认：0）
     * @returns {Map} 包含 minecraft:projectile 组件的 Map 对象
     * @throws {Error} 如果参数无效。
     */
    static setProjectile(options = {}) {
        // 默认值
        const {
            anchor
            = 0,
            angleOffset
            = 0.0,
            catchFire
            = false,
            critParticleOnHurt
            = false,
            destroyOnHurt
            = false,
            filter
            = null,
            fireAffectedByGriefing
            = false,
            gravity
            = 0.05,
            hitSound
            = null,
            hitGroundSound
            = null,
            homing
            = false,
            inertia
            = 0.99,
            isDangerous
            = false,
            knockback
            = true,
            lightning
            = false,
            liquidInertia
            = 0.6,
            multipleTargets
            = true,
            offset
            = [0, 0, 0],
            onFireTime
            = 0.0,
            onHit
            = null,
            particle
            = "ironcrack",
            power
            = 1.3,
            reflectImmunity
            = 0.0,
            reflectOnHurt
            = false,
            shootSound
            = null,
            shootTarget
            = true,
            shouldBounce
            = false,
            splashPotion
            = false,
            splashRange
            = 4,
            stopOnHurt
            = false,
            uncertaintyBase
            = 0,
            uncertaintyMultiplier
            = 0,
        } = options;

        // 构建组件
        const projectileComponent = {
            anchor
            ,
            angle_offset: angleOffset,
            catch_fire: catchFire,
            crit_particle_on_hurt: critParticleOnHurt,
            destroy_on_hurt: destroyOnHurt,
            fire_affected_by_griefing: fireAffectedByGriefing,
            gravity
            ,
            homing
            ,
            inertia
            ,
            is_dangerous: isDangerous,
            knockback
            ,
            lightning
            ,
            liquid_inertia: liquidInertia,
            multiple_targets: multipleTargets,
            offset
            ,
            on_fire_time: onFireTime,
            particle
            ,
            power
            ,
            reflect_immunity: reflectImmunity,
            reflect_on_hurt: reflectOnHurt,
            shoot_target: shootTarget,
            should_bounce: shouldBounce,
            splash_potion: splashPotion,
            splash_range: splashRange,
            stop_on_hurt: stopOnHurt,
            uncertainty_base: uncertaintyBase,
            uncertainty_multiplier: uncertaintyMultiplier,
        };

        // 添加可选参数
        if (filter) projectileComponent.filter = filter;
        if (hitSound) projectileComponent.hit_sound = hitSound;
        if (hitGroundSound) projectileComponent.hit_ground_sound = hitGroundSound;
        if (onHit) projectileComponent.on_hit = onHit;
        if (shootSound) projectileComponent.shoot_sound = shootSound;

        // 返回 Map 对象
        const projectileMap = new Map();
        projectileMap.set("minecraft:projectile", projectileComponent);
        return projectileMap;
    }



}