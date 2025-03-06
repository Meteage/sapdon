export class BiomeComponent {
    /**
     * 将多个组件集合合并为一个。
     * @param {...Map} componentMaps - 多个组件集合。
     * @returns {Map} - 合并后的组件集合。
   */
    static combineComponents(...componentMaps) {
        return new Map(componentMaps.flatMap(map => [...map]));
    }
    /**
     * 设置生物群系的气候参数
     * @param {number} downfall - 降水量（范围通常为 0 到 1）
     * @param {number} snow_accumulation - 积雪量（范围通常为 0 到 1）
     * @param {number} temperature - 温度（范围通常为 0 到 1）
     * @returns {Map} 返回一个包含气候参数的 Map 对象，键为 "minecraft:climate"
     */
    static setClimate(downfall, snow_accumulation, temperature) {
        return new Map([
            ["minecraft:climate", {
                    downfall: downfall,
                    snow_accumulation: snow_accumulation,
                    temperature: temperature
                }]
        ]);
    }
    /**
     * 设置生物群系的世界高度参数（通常用于生成地形）
     * @param {Object} noise_params - 噪声参数，用于控制地形生成
     * @returns {Map} 返回一个包含高度参数的 Map 对象，键为 "minecraft:overworld_height"
     */
    static setOverworldHeight(noise_params) {
        return new Map([
            ["minecraft:overworld_height", {
                    noise_params: noise_params
                }]
        ]);
    }
    /**
     * 设置生物群系的表面参数（如地表材料、海底材料等）
     * @param {Object} params - 表面参数对象，包含以下属性：
     * @param {number} params.sea_floor_depth - 海底深度
     * @param {string} params.sea_floor_material - 海底材料（如 "minecraft:sand"）
     * @param {string} params.foundation_material - 基础材料（如 "minecraft:stone"）
     * @param {string} params.mid_material - 中间层材料（如 "minecraft:dirt"）
     * @param {string} params.top_material - 顶层材料（如 "minecraft:grass_block"）
     * @param {string} params.sea_material - 海洋材料（如 "minecraft:water"）
     * @returns {Map} 返回一个包含表面参数的 Map 对象，键为 "minecraft:surface_parameters"
     */
    static setSurfaceParameters(params) {
        const { sea_floor_depth, sea_floor_material, foundation_material, mid_material, top_material, sea_material } = params;
        return new Map([
            ["minecraft:surface_parameters", {
                    sea_floor_depth: sea_floor_depth,
                    sea_floor_material: sea_floor_material,
                    foundation_material: foundation_material,
                    mid_material: mid_material,
                    top_material: top_material,
                    sea_material: sea_material
                }]
        ]);
    }
    /**
    * 设置生物群系在生成时的规则（如适用于哪些气候类型）
    * @returns {Map} 返回一个包含生成规则的 Map 对象，键为 "minecraft:overworld_generation_rules"
    */
    static setOverworldGenerationRules(medium_weight, warm_weight, cold_weight) {
        return new Map([
            ["minecraft:overworld_generation_rules", {
                    "generate_for_climates": [
                        ["medium", medium_weight], // 适用于中等气候，权重为 100
                        ["warm", warm_weight], // 适用于温暖气候，权重为 100
                        ["cold", cold_weight] // 适用于寒冷气候，权重为 100
                    ]
                }]
        ]);
    }
}
