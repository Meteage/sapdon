import { Serializer } from "../../utils/index.js"

export class AddonFeatureRule {
    format_version: string
    denifition: AddonFeatureRuleDenifition

    constructor(format_version: string, denifition: AddonFeatureRuleDenifition) {
        this.format_version = format_version;
        this.denifition = denifition;
    }

    @Serializer
    toObject(): Record<string, any> {
        return {
            format_version: this.format_version,
            ["minecraft:feature_rules"]: this.denifition
        }
    }
}

export class AddonFeatureRuleDenifition {
    description: AddonFeatureRuleDecription
    conditions: any
    distribution: any

    constructor(description: AddonFeatureRuleDecription, conditions: any, distribution: any) {
        this.description = description;
        this.conditions = conditions;
        this.distribution = distribution;
    }
}

export class AddonFeatureRuleDecription {
    identifier: string
    places_feature: string

    constructor(identifier: string, places_feature: string) {
        this.identifier = identifier;
        this.places_feature = places_feature;
    }
}
