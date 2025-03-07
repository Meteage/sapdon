export namespace FeatureAPI {
    function createOreFeature(identifier: any, count: any, replace_rules: any): OreFeature;
    function createFeatureRules(identifier: any, places_feature: any): FeatureRule;
}
import { OreFeature } from "../feature/OreFeature.js";
import { FeatureRule } from "../feature_rule/FeatureRule.js";
