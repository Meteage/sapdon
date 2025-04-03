import { AddonOreFeature, AddonOreFeatureDefinition, AddonOreFeatureDescription } from "../addon/feature/oreFeature.js";
import { Serializer, serialize } from "../../utils/index.js"

export class OreFeature {
    constructor(identifier,count,replace_rules){
        this.identifier = identifier;
        this.count = count;
        this.replace_rules = replace_rules;
    }
    @Serializer
    toObject(){
        return serialize(new AddonOreFeature(
            "1.17.0",
            new AddonOreFeatureDefinition(
                new AddonOreFeatureDescription(this.identifier),
                this.count,
                this.replace_rules
            )
        ))
    }
}