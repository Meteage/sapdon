import { AddonOreFeature, AddonOreFeatureDefinition, AddonOreFeatureDescription } from "../addon/feature/oreFeature.js";

export class OreFeature {
    constructor(identifier,count,replace_rules){
        this.identifier = identifier;
        this.count = count;
        this.replace_rules = replace_rules;
    }
    toJson(){
        return new AddonOreFeature(
            "1.17.0",
            new AddonOreFeatureDefinition(
                new AddonOreFeatureDescription(this.identifier),
                this.count,
                this.replace_rules
            )
        ).toJson();
    }
}