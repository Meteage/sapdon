export class FeatureRule {
    constructor(identifier: any, places_feature: any);
    identifier: any;
    places_feature: any;
    condition: FeatureConditions;
    distribution: FeatureDistribution;
    setPlacementPass(pass: any): void;
    setBiomeFilter(biomeFilter: any): void;
    setIterations(iterations: any): void;
    setAxisDistribution(axis: any, config: any): void;
    toJson(): {
        format_version: any;
        "minecraft:feature_rules": any;
    };
}
import { FeatureConditions } from "./condition/FeatureConditions.js";
import { FeatureDistribution } from "./distribution/FeatureDistribution.js";
