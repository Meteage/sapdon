import { Serializer } from "../../../utils/index.js"

/**
 * 表示单个坐标轴（x/y/z）分布规则的类
 */
export class CoordinateDistribution {
    /**
     * @param {"uniform" | "triangle"} distribution - 分布类型
     * @param {Array<number>} extent - 范围（如 [0, 16]）
     */
    constructor(distribution = "uniform", extent = [0, 16]) {
        this.distribution = distribution;
        this.extent = extent;
    }

    /**
     * 转换为 JSON 格式
     * @returns {Object} 返回坐标分布配置
     */
    @Serializer
    toObject() {
        return {
            distribution: this.distribution,
            extent: this.extent
        };
    }
}