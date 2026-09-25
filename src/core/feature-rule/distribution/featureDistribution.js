import { CoordinateDistribution } from "./coordinateDistribution.js";
import { Serializer, serialize } from "../../../utils/index.js"

/**
 * 表示功能规则分布配置的类
 */
export class FeatureDistribution {
    constructor() {
        this.distribution = {
            iterations: 10, // 默认值
            coordinate_eval_order: "zyx",
            x: serialize(new CoordinateDistribution()),
            y: serialize(new CoordinateDistribution()),
            z: serialize(new CoordinateDistribution()),
        };
    }

    /**
     * 设置迭代次数
     * @param {number} iterations - 放置尝试次数
     * @returns {FeatureDistribution} 返回自身以支持链式调用
     */
    setIterations(iterations) {
        this.distribution.iterations = iterations;
        return this;
    }

    /**
     * 设置坐标轴的分布规则
     * @param {"x" | "y" | "z"} axis - 坐标轴
     * @param {CoordinateDistribution} config - 分布配置
     * @returns {FeatureDistribution} 返回自身以支持链式调用
     */
    setAxisDistribution(axis, config) {
        this.distribution[axis] = serialize(config);
        return this;
    }

    /**
     * 把某个坐标轴设成 Molang 表达式（把 y 贴到地表就是
     * `query.heightmap(variable.worldx, variable.worldz)`），与 `setAxisDistribution()` 二选一。
     * @param {"x" | "y" | "z"} axis - 坐标轴
     * @param {string} molang - 非空 Molang 表达式
     * @returns {FeatureDistribution} 返回自身以支持链式调用
     */
    setAxisMolang(axis, molang) {
        if (typeof molang !== "string" || molang.trim().length === 0) {
            throw new Error(`[sapdon] feature rule 的 ${axis} 轴 Molang 必须是非空字符串，实测 ${JSON.stringify(molang)}`);
        }
        this.distribution[axis] = molang;
        return this;
    }

    /**
     * 设置「每区块散植」的整体触发几率：命中才跑 `iterations` 次。
     * 不调用 = 不写该字段（引擎默认必触发）；期望个数 ≈ `iterations × numerator / denominator`。
     * @param {number} numerator - 分子（≥0）
     * @param {number} denominator - 分母（>0）
     * @returns {FeatureDistribution} 返回自身以支持链式调用
     */
    setScatterChance(numerator, denominator = 1) {
        if (!Number.isFinite(numerator) || numerator < 0) {
            throw new Error(`[sapdon] feature rule 的 scatter_chance 分子必须是 ≥0 的数，实测 ${JSON.stringify(numerator)}`);
        }
        if (!Number.isFinite(denominator) || denominator <= 0) {
            throw new Error(`[sapdon] feature rule 的 scatter_chance 分母必须是 >0 的数，实测 ${JSON.stringify(denominator)}`);
        }
        this.distribution.scatter_chance = { numerator, denominator };
        return this;
    }

    /**
     * 转换为 JSON 格式
     * @returns {Object} 返回分布规则对象
     */
    @Serializer
    toObject() {
        return this.distribution;
    }
}