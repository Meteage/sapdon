import { AddonFeatureRule, AddonFeatureRuleDecription, AddonFeatureRuleDenifition } from "../addon/featureRule.js";
import { FeatureConditions } from "./condition/featureConditions.js";
import { FeatureDistribution } from "./distribution/featureDistribution.js";
import { Serializer, serialize } from "../../utils/index.js"

export class FeatureRule {
  constructor(identifier,places_feature) {
    this.identifier = identifier;   
    this.places_feature = places_feature;
    this.condition = new FeatureConditions();
    this.distribution = new FeatureDistribution();
  }
  setPlacementPass(pass) {
    this.condition.setPlacementPass(pass);
  }
  setBiomeFilter(biomeFilter) {
    this.condition.setBiomeFilter(biomeFilter);
  }
  setIterations(iterations) {
    this.distribution.setIterations(iterations);
  }
  setAxisDistribution(axis, config) {
    this.distribution.setAxisDistribution(axis, config);
  }
  /**
   * 把某个坐标轴设成 Molang 表达式（地表地物要把 y 贴到地表：
   * `query.heightmap(variable.worldx, variable.worldz)`），与 `setAxisDistribution()` 二选一。
   * @param {"x" | "y" | "z"} axis - 坐标轴
   * @param {string} molang - 非空 Molang 表达式
   * @returns {FeatureRule} 返回自身以支持链式调用
   */
  setAxisMolang(axis, molang) {
    this.distribution.setAxisMolang(axis, molang);
    return this;
  }
  /**
   * 设置「每区块散植」的触发几率：命中才跑 `iterations` 次。
   * 不调用 = 不写该字段（引擎默认必触发）。
   * @param {number} numerator - 分子（≥0）
   * @param {number} denominator - 分母（>0）
   * @returns {FeatureRule} 返回自身以支持链式调用
   */
  setScatterChance(numerator, denominator = 1) {
    this.distribution.setScatterChance(numerator, denominator);
    return this;
  }
  @Serializer
    toObject(){
    return serialize(new AddonFeatureRule(
        "1.13.0",
        new AddonFeatureRuleDenifition(
            new AddonFeatureRuleDecription(
                this.identifier,
                this.places_feature
            ),
            serialize(this.condition),
            serialize(this.distribution)
        ))
    )
  }
}