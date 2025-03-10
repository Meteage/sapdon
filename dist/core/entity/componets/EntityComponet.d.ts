export class EntityComponent {
    static setMovement(speed: any): Map<any, any>;
    static setCollisionBox(width: any, height: any): Map<any, any>;
    /**
       * 将多个组件集合合并为一个。
       * @param {...Map} componentMaps - 多个组件集合。
       * @returns {Map} - 合并后的组件集合。
       */
    static combineComponents(...componentMaps: Map<any, any>[]): Map<any, any>;
    /**
       * 创建 minecraft:health 组件。
       * @param {Object} options 配置选项
       * @param {number} options.max 实体的最大生命值
       * @param {number|Object} options.value 实体的初始生命值（可以是固定值或范围值）
       * @returns {Map} 包含 minecraft:health 组件的 Map 对象
       * @throws {Error} 如果参数无效。
       */
    static setHealth(options?: {
        max: number;
        value: number | any;
    }): Map<any, any>;
    /**
     * 验证 minecraft:health 组件的参数。
     * @param {number} max 最大生命值
     * @param {number|Object} value 初始生命值
     * @throws {Error} 如果参数无效。
     */
    static validateHealthParameters(max: number, value: number | any): void;
    /**
     * 创建 minecraft:physics 组件。
     * @param {boolean} has_collision 是否碰撞（默认：true）
     * @param {boolean} has_gravity 是否受重力影响（默认：true）
     * @param {boolean} push_towards_closest_space 是否在卡住时推向最近空间（默认：false）
     * @returns {Map} 包含 minecraft:physics 组件的 Map 对象
     * @throws {Error} 如果参数不是布尔类型。
     */
    static setPhysics(has_collision?: boolean, has_gravity?: boolean, push_towards_closest_space?: boolean): Map<any, any>;
    /**
   * 创建 minecraft:scale 组件。
   * @param {number} value 实体的缩放比例（默认：1.0）
   * @returns {Map} 包含 minecraft:scale 组件的 Map 对象
   * @throws {Error} 如果参数无效。
   */
    static setScale(value?: number): Map<any, any>;
    /**
   * 创建默认的 minecraft:nameable 组件（不填写参数）。
   * @returns {Map} 包含 minecraft:nameable 组件的 Map 对象
   */
    static setDefaultNameable(): Map<any, any>;
    /**
     * 创建自定义的 minecraft:nameable 组件（填写参数）。
     * @param {boolean} allowNameTagRenaming 是否允许使用命名牌重命名（默认：true）
     * @param {boolean} alwaysShow 是否始终显示名称（默认：false）
     * @param {Object} defaultTrigger 默认触发事件（可选）
     * @param {Array} nameActions 特殊名称及其对应的事件（可选）
     * @returns {Map} 包含 minecraft:nameable 组件的 Map 对象
     * @throws {Error} 如果参数无效。
     */
    static setCustomNameable(allowNameTagRenaming?: boolean, alwaysShow?: boolean, defaultTrigger?: any, nameActions?: any[]): Map<any, any>;
    /**
     * 创建 minecraft:pushable 组件。
     * @param {boolean} isPushable 是否可以被其他实体推动（默认：true）
     * @param {boolean} isPushableByPiston 是否可以被活塞推动（默认：true）
     * @returns {Map} 包含 minecraft:pushable 组件的 Map 对象
     * @throws {Error} 如果参数无效。
     */
    static setPushable(isPushable?: boolean, isPushableByPiston?: boolean): Map<any, any>;
    /**
       * 创建 minecraft:jump.static 组件。
       * @param {number} jumpPower 跳跃的初始垂直速度（默认：0.42）
       * @returns {Map} 包含 minecraft:jump.static 组件的 Map 对象
       * @throws {Error} 如果参数无效。
       */
    static setJumpStatic(jumpPower?: number): Map<any, any>;
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
    static setNavigationWalk(options?: {
        avoidDamageBlocks: boolean;
        avoidPortals: boolean;
        avoidSun: boolean;
        avoidWater: boolean;
        blocksToAvoid: any[];
        canBreach: boolean;
        canBreakDoors: boolean;
        canFloat: boolean;
        canJump: boolean;
        canOpenDoors: boolean;
        canOpenIronDoors: boolean;
        canPassDoors: boolean;
        canPathFromAir: boolean;
        canPathOverLava: boolean;
        canPathOverWater: boolean;
        canSink: boolean;
        canSwim: boolean;
        canWalk: boolean;
        canWalkInLava: boolean;
        isAmphibious: boolean;
    }): Map<any, any>;
    /**
     * 创建 minecraft:movement.basic 组件。
     * @param {number} maxTurn 实体每 tick 可以转向的最大角度（默认：30.0）
     * @returns {Map} 包含 minecraft:movement.basic 组件的 Map 对象
     * @throws {Error} 如果参数无效。
     */
    static setMovementBasic(maxTurn?: number): Map<any, any>;
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
    static setProjectile(options?: {
        anchor: number;
        angleOffset: number;
        catchFire: boolean;
        critParticleOnHurt: boolean;
        destroyOnHurt: boolean;
        filter: string;
        fireAffectedByGriefing: boolean;
        gravity: number;
        hitSound: string;
        hitGroundSound: string;
        homing: boolean;
        inertia: number;
        isDangerous: boolean;
        knockback: boolean;
        lightning: boolean;
        liquidInertia: number;
        multipleTargets: boolean;
        offset: number[];
        onFireTime: number;
        onHit: any;
        particle: string;
        power: number;
        reflectImmunity: number;
        reflectOnHurt: boolean;
        shootSound: string;
        shootTarget: boolean;
        shouldBounce: boolean;
        splashPotion: boolean;
        splashRange: number;
        stopOnHurt: boolean;
        uncertaintyBase: number;
        uncertaintyMultiplier: number;
    }): Map<any, any>;
}
