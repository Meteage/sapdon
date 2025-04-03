import { Serializer } from "../../utils/index.js"

export class AddonFeatureRule {
    constructor(format_version,denifition){
        this.format_version = format_version;
        this.denifition = denifition;
    }
    @Serializer
    toObject(){
        return {
            format_version: this.format_version,
            ["minecraft:feature_rules"]: this.denifition
        }
    }
}

export class AddonFeatureRuleDenifition {
    constructor(description,conditions,distribution){
        this.description = description;
        this.conditions = conditions;
        this.distribution = distribution;
    }
}

export class AddonFeatureRuleDecription {
    constructor(identifier,places_feature){
        this.identifier = identifier;
        this.places_feature = places_feature;
    }
}


