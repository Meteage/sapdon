import { Serializer } from "../../../utils/index.js"

export class AddonOreFeature {
    format_version: string
    definition: AddonOreFeatureDefinition

    constructor(format_version: string, definition: AddonOreFeatureDefinition) {
        this.format_version = format_version;
        this.definition = definition;
    }

    @Serializer
    toObject(): Record<string, any> {
        return {
            format_version: this.format_version,
            ["minecraft:ore_feature"]: this.definition
        }
    }
}

export class AddonOreFeatureDescription {
    identifier: string

    constructor(identifier: string) {
        this.identifier = identifier;
    }
}

export class AddonOreFeatureDefinition {
    description: AddonOreFeatureDescription
    count: number
    replace_rules: any[]

    constructor(description: AddonOreFeatureDescription, count: number, replace_rules: any[]) {
        this.description = description;
        this.count = count;
        this.replace_rules = replace_rules;
    }
}
