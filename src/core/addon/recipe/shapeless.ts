import { AddonRecipe } from "./baseRecipe.js";
import { RecipeTypes } from "./data.js";

export class AddonRecipeShapeless extends AddonRecipe {
    constructor(format_version: string, definitions: Record<string, any>) {
        super(format_version, RecipeTypes.Shapeless, definitions);
    }

    static create(ver: string, def: Record<string, any>): AddonRecipeShapeless {
        return new AddonRecipeShapeless(ver, def)
    }

    priority(priority: number): this {
        this.definitions.priority = priority;
        return this;
    }

    ingredients(ingredients: any[]): this {
        this.definitions.ingredients = ingredients;
        return this;
    }

    output(item: string | Record<string, any>): this {
        this.definitions.result = typeof item == "string" ? { item } : item;
        return this;
    }
}

export class AddonRecipeShapeless_1_12 extends AddonRecipeShapeless {
    constructor(definitions: Record<string, any>) {
        super("1.12", definitions);
    }
}

export class AddonRecipeShapeless_1_17 extends AddonRecipeShapeless {
    constructor(definitions: Record<string, any>) {
        super("1.17", definitions);
    }
}
