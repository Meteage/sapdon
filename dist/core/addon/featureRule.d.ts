export class AddonFeatureRule {
    constructor(format_version: any, denifition: any);
    format_version: any;
    denifition: any;
    toJson(): {
        format_version: any;
        "minecraft:feature_rules": any;
    };
}
export class AddonFeatureRuleDenifition {
    constructor(description: any, conditions: any, distribution: any);
    description: any;
    conditions: any;
    distribution: any;
}
export class AddonFeatureRuleDecription {
    constructor(identifier: any, places_feature: any);
    identifier: any;
    places_feature: any;
}
