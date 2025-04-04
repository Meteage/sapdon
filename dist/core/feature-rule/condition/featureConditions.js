import { BiomeFilter } from "./biomeFilter.js";
/**
 * 表示功能规则生成条件的类
 */
export class FeatureConditions {
    constructor() {
        this.conditions = {
            placement_pass: "underground_pass", // 默认值
            "minecraft:biome_filter": []
        };
    }
    /**
     * 设置生成阶段（placement_pass）
     * @param {string} pass - 生成阶段标识符（如 "underground_pass"）
     * @returns {FeatureConditions} 返回自身以支持链式调用
     */
    setPlacementPass(pass) {
        this.conditions.placement_pass = pass;
        return this;
    }
    /**
     * 设置生物群系过滤器
     * @param {BiomeFilter} biomeFilter - 生物群系过滤条件对象
     * @returns {FeatureConditions} 返回自身以支持链式调用
     */
    setBiomeFilter(biomeFilter) {
        this.conditions["minecraft:biome_filter"] = biomeFilter.toJson();
        return this;
    }
    /**
     * 转换为 JSON 格式
     * @returns {Object} 返回生成条件对象
     */
    toJson() {
        return this.conditions;
    }
}
