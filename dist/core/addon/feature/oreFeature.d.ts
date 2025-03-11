export class AddonOreFeature {
    constructor(format_version: any, definition: any);
    format_version: any;
    definition: any;
    toJson(): {
        format_version: any;
        "minecraft:ore_feature": any;
    };
}
export class AddonOreFeatureDescription {
    constructor(identifier: any);
    identifier: any;
}
export class AddonOreFeatureDefinition {
    constructor(description: any, count: any, replace_rules: any);
    description: any;
    count: any;
    replace_rules: any;
}
