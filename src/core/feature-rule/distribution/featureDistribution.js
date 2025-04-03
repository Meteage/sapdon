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
     * 转换为 JSON 格式
     * @returns {Object} 返回分布规则对象
     */
    @Serializer
    toObject() {
        return this.distribution;
    }
}