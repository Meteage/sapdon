/**
 * 表示功能规则生成条件的类
 */
export class FeatureConditions {
    conditions: {
        placement_pass: string;
        "minecraft:biome_filter": any[];
    };
    /**
     * 设置生成阶段（placement_pass）
     * @param {string} pass - 生成阶段标识符（如 "underground_pass"）
     * @returns {FeatureConditions} 返回自身以支持链式调用
     */
    setPlacementPass(pass: string): FeatureConditions;
    /**
     * 设置生物群系过滤器
     * @param {BiomeFilter} biomeFilter - 生物群系过滤条件对象
     * @returns {FeatureConditions} 返回自身以支持链式调用
     */
    setBiomeFilter(biomeFilter: BiomeFilter): FeatureConditions;
    /**
     * 转换为 JSON 格式
     * @returns {Object} 返回生成条件对象
     */
    toJson(): any;
}
import { BiomeFilter } from "./biomeFilter.js";
