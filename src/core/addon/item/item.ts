import { Serializer } from "../../../utils/index.js"

export class AddonItem {
    format_version: string
    definitions: AddonItemDefinition

    constructor(format_version: string, definitions: AddonItemDefinition) {
        this.format_version = format_version;
        this.definitions = definitions;
    }

    @Serializer
    toObject(): Record<string, any> {
        return {
            format_version: this.format_version,
            ["minecraft:item"]: this.definitions
        }
    }
}

export class AddonItemDefinition {
    description: AddonItemDescription
    components: Record<string, any>

    constructor(description: AddonItemDescription, components: Record<string, any>) {
        this.description = description;
        this.components = components;
    }
}

export class AddonItemDescription {
    identifier: string
    menu_category: any

    constructor(identifier: string, menu_category: any) {
        this.identifier = identifier;
        this.menu_category = menu_category;
    }
}
