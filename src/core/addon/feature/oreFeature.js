import { Serializer } from "@utils"

export class AddonOreFeature {
    constructor(format_version,definition) {
        this.format_version = format_version;
        this.definition = definition;
    }
    @Serializer
    toObject(){
        return {
            format_version: this.format_version,
            ["minecraft:ore_feature"]: this.definition
        }
    }
}

export class AddonOreFeatureDescription {
    constructor(identifier){
        this.identifier = identifier;
    }
}

export class AddonOreFeatureDefinition {
    constructor(description,count,replace_rules){
        this.description = description;
        this.count = count;
        this.replace_rules = replace_rules;
    }
}