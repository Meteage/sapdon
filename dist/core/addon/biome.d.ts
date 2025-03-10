export class AddonBiome {
    constructor(format_version: any, definition: any);
    format_version: any;
    definition: any;
    toJson(): {
        format_version: any;
        "minecraft:biome": any;
    };
}
export class AddonBiomeDescription {
    constructor(identifier: any);
    identifier: any;
}
export class AddonBiomeDefinition {
    /**
     *
     * @param {AddonBiomeDescription} description
     */
    constructor(description: AddonBiomeDescription, components: any);
    description: AddonBiomeDescription;
    components: any;
}
