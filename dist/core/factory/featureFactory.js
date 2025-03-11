import { OreFeature } from "../feature/oreFeature.js";
import { FeatureRule } from "../feature-rule/featureRule.js";
import { GRegistry } from "../registry.js";
const registerFeature = (feature) => {
    const feature_name = feature.identifier.split(":")[feature.identifier.split(":").length - 1];
    GRegistry.register(feature_name, "behavior", "features/", feature);
};
const registerFeatureRule = (feature_rule) => {
    const feature_rule_name = feature_rule.identifier.split(":")[feature_rule.identifier.split(":").length - 1];
    GRegistry.register(feature_rule_name, "behavior", "feature_rules/", feature_rule);
};
export const FeatureAPI = {
    createOreFeature: function (identifier, count, replace_rules) {
        const feature = new OreFeature(identifier, count, replace_rules);
        registerFeature(feature);
        return feature;
    },
    createFeatureRules: function (identifier, places_feature) {
        const feature_rules = new FeatureRule(identifier, places_feature);
        registerFeatureRule(feature_rules);
        return feature_rules;
    }
};
