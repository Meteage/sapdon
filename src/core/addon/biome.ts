import { Serializer } from "../../utils/index.js";

interface AddonBiomeDefinitionComponents {
    [key: string]: any;
}

export class AddonBiome {
    format_version: string
    definition: AddonBiomeDefinition

    constructor(format_version: string, definition: AddonBiomeDefinition) {
        this.format_version = format_version;
        this.definition = definition;
    }

    @Serializer
    toObject(): Record<string, any> {
        return {
            format_version: this.format_version,
            ["minecraft:biome"]: this.definition
        }
    }
}

export class AddonBiomeDescription {
    identifier: string

    constructor(identifier: string) {
        this.identifier = identifier;
    }
}

export class AddonBiomeDefinition {
    description: AddonBiomeDescription
    components: AddonBiomeDefinitionComponents

    constructor(description: AddonBiomeDescription, components: AddonBiomeDefinitionComponents) {
        this.description = description;
        this.components = components;
    }
}
