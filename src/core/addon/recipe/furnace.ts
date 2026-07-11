import { AddonRecipe } from "./baseRecipe.js";
import { RecipeTypes } from "./data.js";

export class AddonRecipeFurnace extends AddonRecipe {
    constructor(format_version: string, definitions: Record<string, any>) {
        super(format_version, RecipeTypes.Furnace, definitions);
    }

    static create(ver: string, def: Record<string, any>): AddonRecipeFurnace {
        return new AddonRecipeFurnace(ver, def)
    }

    input(item: string, data?: any, count?: number): this {
        let input: any;
        if (!data && !count) {
            input = item;
        } else {
            input = { item };
            if (data) input.data = data;
            if (count) input.count = count;
        }
        this.definitions.input = input;
        return this;
    }

    output(item: string): this {
        this.definitions.output = item;
        return this;
    }
}

export class AddonRecipeFurnace_1_12 extends AddonRecipeFurnace {
    constructor(definitions: Record<string, any> = {}) {
        super("1.12", definitions);
    }
}

export class AddonRecipeFurnace_1_17 extends AddonRecipeFurnace {
    constructor(definitions: Record<string, any> = {}) {
        super("1.17", definitions);
    }
}
