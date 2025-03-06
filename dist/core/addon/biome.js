export class AddonBiome {
    constructor(format_version, definition) {
        this.format_version = format_version;
        this.definition = definition;
    }
    toJson() {
        return {
            format_version: this.format_version,
            ["minecraft:biome"]: this.definition
        };
    }
}
export class AddonBiomeDescription {
    constructor(identifier) {
        this.identifier = identifier;
    }
}
export class AddonBiomeDefinition {
    /**
     *
     * @param {AddonBiomeDescription} description
     */
    constructor(description, components) {
        this.description = description;
        this.components = components;
    }
}
