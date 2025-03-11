/**
 * 表示功能规则分布配置的类
 */
export class FeatureDistribution {
    distribution: {
        iterations: number;
        coordinate_eval_order: string;
        x: any;
        y: any;
        z: any;
    };
    /**
     * 设置迭代次数
     * @param {number} iterations - 放置尝试次数
     * @returns {FeatureDistribution} 返回自身以支持链式调用
     */
    setIterations(iterations: number): FeatureDistribution;
    /**
     * 设置坐标轴的分布规则
     * @param {"x" | "y" | "z"} axis - 坐标轴
     * @param {CoordinateDistribution} config - 分布配置
     * @returns {FeatureDistribution} 返回自身以支持链式调用
     */
    setAxisDistribution(axis: "x" | "y" | "z", config: CoordinateDistribution): FeatureDistribution;
    /**
     * 转换为 JSON 格式
     * @returns {Object} 返回分布规则对象
     */
    toJson(): any;
}
import { CoordinateDistribution } from "./coordinateDistribution.js";
