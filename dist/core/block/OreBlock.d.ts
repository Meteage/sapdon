export class OreBlock {
    constructor(identifier: any, category: any, textures_arr: any, options?: {});
    block: BasicBlock;
    feature: OreFeature;
    feature_rules: FeatureRule;
}
import { BasicBlock } from "./BasicBlock.js";
import { OreFeature } from "../feature/OreFeature.js";
import { FeatureRule } from "../feature_rule/FeatureRule.js";
