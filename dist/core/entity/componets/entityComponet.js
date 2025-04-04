export class EntityComponent {
    static setDamageSensor(deals_damage) {
        return new Map().set("minecraft:damage_sensor", {
            "triggers": {
                "deals_damage": deals_damage
            }
        });
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
        if ((typeof value !== "number" && typeof value !== "object") ||
            (typeof value === "number" && value <= 0) ||
            (typeof value === "object" &&
                (typeof value.range_min !== "number" ||
                    typeof value.range_max !== "number" ||
                    value.range_min <= 0 ||
                    value.range_max <= 0))) {
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
    static setPhysics(has_collision = true, has_gravity = true, push_towards_closest_space = false) {
        // 参数验证
        if (typeof has_collision !== "boolean" ||
            typeof has_gravity !== "boolean" ||
            typeof push_towards_closest_space !== "boolean") {
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
    static setCustomNameable(allowNameTagRenaming = true, alwaysShow = false, defaultTrigger = null, nameActions = []) {
        // 参数验证
        if (typeof allowNameTagRenaming !== "boolean" ||
            typeof alwaysShow !== "boolean") {
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
        const { avoidDamageBlocks = false, avoidPortals = false, avoidSun = false, avoidWater = false, blocksToAvoid = [], canBreach = false, canBreakDoors = false, canFloat = false, canJump = true, canOpenDoors = false, canOpenIronDoors = false, canPassDoors = true, canPathFromAir = false, canPathOverLava = false, canPathOverWater = false, canSink = true, canSwim = false, canWalk = true, canWalkInLava = false, isAmphibious = false, } = options;
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
        const { anchor = 0, angleOffset = 0.0, catchFire = false, critParticleOnHurt = false, destroyOnHurt = false, filter = null, fireAffectedByGriefing = false, gravity = 0.05, hitSound = null, hitGroundSound = null, homing = false, inertia = 0.99, isDangerous = false, knockback = true, lightning = false, liquidInertia = 0.6, multipleTargets = true, offset = [0, 0, 0], onFireTime = 0.0, onHit = null, particle = "ironcrack", power = 1.3, reflectImmunity = 0.0, reflectOnHurt = false, shootSound = null, shootTarget = true, shouldBounce = false, splashPotion = false, splashRange = 4, stopOnHurt = false, uncertaintyBase = 0, uncertaintyMultiplier = 0, } = options;
        // 构建组件
        const projectileComponent = {
            anchor,
            angle_offset: angleOffset,
            catch_fire: catchFire,
            crit_particle_on_hurt: critParticleOnHurt,
            destroy_on_hurt: destroyOnHurt,
            fire_affected_by_griefing: fireAffectedByGriefing,
            gravity,
            homing,
            inertia,
            is_dangerous: isDangerous,
            knockback,
            lightning,
            liquid_inertia: liquidInertia,
            multiple_targets: multipleTargets,
            offset,
            on_fire_time: onFireTime,
            particle,
            power,
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
        if (filter)
            projectileComponent.filter = filter;
        if (hitSound)
            projectileComponent.hit_sound = hitSound;
        if (hitGroundSound)
            projectileComponent.hit_ground_sound = hitGroundSound;
        if (onHit)
            projectileComponent.on_hit = onHit;
        if (shootSound)
            projectileComponent.shoot_sound = shootSound;
        // 返回 Map 对象
        const projectileMap = new Map();
        projectileMap.set("minecraft:projectile", projectileComponent);
        return projectileMap;
    }
}
