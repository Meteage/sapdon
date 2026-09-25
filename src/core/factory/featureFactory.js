import { OreFeature } from "../feature/oreFeature.js";
import { TreeFeature } from "../feature/treeFeature.js";
import { FeatureRule } from "../feature-rule/featureRule.js";
import { GRegistry } from "../registry.js";

const registerFeature = (feature)=>{
    const feature_name = feature.identifier.split(":")[feature.identifier.split(":").length - 1];
    GRegistry.register(feature_name,"behavior","features/",feature);
};

const registerFeatureRule = (feature_rule)=>{
    const feature_rule_name = feature_rule.identifier.split(":")[feature_rule.identifier.split(":").length - 1];
    GRegistry.register(feature_rule_name,"behavior","feature_rules/",feature_rule);
};

export const FeatureAPI = {
    createOreFeature: function(identifier,count,replace_rules) {
        const feature = new OreFeature(identifier,count,replace_rules);
        registerFeature(feature);
        return feature;
    },
    /**
     * 树地物（`minecraft:tree_feature`）。
     * @param {string} identifier 形如 `"ns:rubber_tree"`（冒号后的名字会成为产物文件名，必须与 identifier 一致）
     * @param {import("../feature/treeFeature.js").TreeFeatureSpec} spec 组件表（键名与引擎逐字相同）
     * @returns {import("../feature/treeFeature.js").TreeFeature} 已注册的树地物实例
     * @throws spec 不合法时抛错（缺树干、两个树冠、组件名拼错、方块引用形状不对…）
     */
    createTreeFeature: function(identifier,spec) {
        const feature = new TreeFeature(identifier,spec);
        registerFeature(feature);
        return feature;
    },
    createFeatureRules: function(identifier,places_feature) {
        const feature_rules = new FeatureRule(identifier,places_feature);
        registerFeatureRule(feature_rules);
        return feature_rules;
    }
};