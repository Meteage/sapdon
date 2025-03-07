import { OreFeature } from "../feature/OreFeature.js";
import { BiomeFilter } from "../feature_rule/condition/BiomeFilter.js";
import { CoordinateDistribution } from "../feature_rule/distribution/CoordinateDistribution.js";
import { FeatureRule } from "../feature_rule/FeatureRule.js";
import { BasicBlock } from "./BasicBlock.js";
export class OreBlock {
    constructor(identifier, category, textures_arr, options = {}) {
        this.block = new BasicBlock(identifier, category, textures_arr, options);
        this.feature = new OreFeature(`${identifier}_ore_feature`, 6, [
            {
                "places_block": identifier,
                "may_replace": ["minecraft:stone"]
            },
        ]);
        this.feature_rules = new FeatureRule(`${identifier}_orefeatre_rule`, `${identifier}_ore_feature`);
        this.feature_rules.condition.setPlacementPass("underground_pass").setBiomeFilter(new BiomeFilter().addLogicGroup("any_of", [
            { test: "has_biome_tag", operator: "==", value: "overworld" },
            { test: "has_biome_tag", operator: "==", value: "overworld_generation" }
        ]));
        this.feature_rules.distribution.setIterations(10)
            .setAxisDistribution("x", new CoordinateDistribution("uniform", [0, 16]))
            .setAxisDistribution("y", new CoordinateDistribution("uniform", [0, 64]))
            .setAxisDistribution("z", new CoordinateDistribution("uniform", [0, 16]));
    }
}
