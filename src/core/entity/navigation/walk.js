export const Navigation = {
    /**
     * 创建 minecraft:navigation.walk 组件的配置。
     * @param {Object} options - 配置选项。
     * @param {boolean} [options.avoid_damage_blocks=false] - 是否避免伤害方块。
     * @param {boolean} [options.avoid_portals=false] - 是否避免传送门。
     * @param {boolean} [options.avoid_sun=false] - 是否避免阳光。
     * @param {boolean} [options.avoid_water=false] - 是否避免水。
     * @param {Array} [options.blocks_to_avoid=[]] - 需要避免的方块列表。
     * @param {boolean} [options.can_breach=false] - 是否可以突破方块。
     * @param {boolean} [options.can_break_doors=false] - 是否可以破坏门。
     * @param {boolean} [options.can_jump=true] - 是否可以跳跃。
     * @param {boolean} [options.can_open_doors=false] - 是否可以开门。
     * @param {boolean} [options.can_open_iron_doors=false] - 是否可以开铁门。
     * @param {boolean} [options.can_pass_doors=true] - 是否可以通过门。
     * @param {boolean} [options.can_path_from_air=false] - 是否可以从空中寻路。
     * @param {boolean} [options.can_path_over_lava=false] - 是否可以在熔岩上寻路。
     * @param {boolean} [options.can_path_over_water=false] - 是否可以在水上寻路。
     * @param {boolean} [options.can_sink=true] - 是否可以沉入水中。
     * @param {boolean} [options.can_swim=false] - 是否可以游泳。
     * @param {boolean} [options.can_walk=true] - 是否可以行走。
     * @param {boolean} [options.can_walk_in_lava=false] - 是否可以在熔岩中行走。
     * @param {boolean} [options.is_amphibious=false] - 是否是两栖动物。
     * @returns {Map} - 包含 minecraft:navigation.walk 组件的 Map 对象。
     */
    walk: function (options = {}) {
        // 默认值
        const defaultOptions = {
            avoid_damage_blocks: false,
            avoid_portals: false,
            avoid_sun: false,
            avoid_water: false,
            blocks_to_avoid: [],
            can_breach: false,
            can_break_doors: false,
            can_jump: true,
            can_open_doors: false,
            can_open_iron_doors: false,
            can_pass_doors: true,
            can_path_from_air: false,
            can_path_over_lava: false,
            can_path_over_water: false,
            can_sink: true,
            can_swim: false,
            can_walk: true,
            can_walk_in_lava: false,
            is_amphibious: false
        };

        // 合并用户提供的选项和默认值
        const finalOptions = { ...defaultOptions, ...options };

        // 返回 Map 对象
        const navigationMap = new Map();
        navigationMap.set("minecraft:navigation.walk", finalOptions);
        return navigationMap;
    }
};