import { Serializer } from "../../../utils/index.js"

export class AddonRecipe {
    format_version: string
    recipe_type: string
    definitions: Record<string, any>

    constructor(format_version: string, recipe_type: string, definitions: Record<string, any> = {}) {
        this.format_version = format_version;
        this.recipe_type = recipe_type;
        this.definitions = definitions;
    }

    getId(): string {
        return this.definitions.description.identifier;
    }

    identifier(identifier: string): this {
        this.definitions.description = { identifier };
        return this;
    }

    tags(tags: string[]): this {
        this.definitions.tags = tags;
        return this;
    }

    @Serializer
    toObject(): Record<string, any> {
        const json: Record<string, any> = { format_version: this.format_version };
        json[this.recipe_type] = this.definitions;
        return json;
    }
}
