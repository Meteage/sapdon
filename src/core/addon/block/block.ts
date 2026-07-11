import { AddonMenuCategory } from "../menuCategory.js";
import { Serializer } from "../../../utils/index.js"

export class AddonBlock {
    format_version: string
    definitions: AddonBlockDefinition

    constructor(format_version: string, definitions: AddonBlockDefinition) {
        this.format_version = format_version;
        this.definitions = definitions;
    }

    @Serializer
    toObject(): Record<string, any> {
        return {
            format_version: this.format_version,
            ["minecraft:block"]: this.definitions
        }
    }
}

export class AddonBlockDefinition {
    description: AddonBlockDescription
    components: Record<string, any>
    permutations: any[]

    constructor(description: AddonBlockDescription, components: Record<string, any>, permutations: any[] = []) {
        this.description = description;
        this.components = components;
        this.permutations = permutations;
    }
}

export class AddonBlockDescription {
    identifier: string
    traits: Record<string, any>
    states: Record<string, any>
    menu_category: AddonMenuCategory

    constructor(identifier: string, traits: Record<string, any>, states: Record<string, any>, menu_category: AddonMenuCategory) {
        this.identifier = identifier;
        this.traits = traits;
        this.states = states;
        this.menu_category = menu_category;
    }
}
