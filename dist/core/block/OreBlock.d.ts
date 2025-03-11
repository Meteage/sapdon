export class OreBlock {
    constructor(identifier: any, category: any, textures_arr: any, options?: {});
    block: BasicBlock;
    feature: OreFeature;
    feature_rules: FeatureRule;
}
import { BasicBlock } from "./basicBlock.js";
import { OreFeature } from "../feature/oreFeature.js";
import { FeatureRule } from "../feature-rule/featureRule.js";
