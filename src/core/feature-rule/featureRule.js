import { AddonFeatureRule, AddonFeatureRuleDecription, AddonFeatureRuleDenifition } from "../addon/featureRule.js";
import { FeatureConditions } from "./condition/featureConditions.js";
import { FeatureDistribution } from "./distribution/featureDistribution.js";
import { Serializer, serialize } from "@utils"

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