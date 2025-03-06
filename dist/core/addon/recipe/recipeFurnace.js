import { AddonRecipe } from "./recipe.js";
import { RecipeTypes } from "./data.js";
export class AddonRecipeFurnace extends AddonRecipe {
    constructor(format_version, definitions) {
        super(format_version, RecipeTypes.Furnace, definitions);
    }
    input(item, data, count) {
        var input;
        if (!data && !count) {
            input = item;
        }
        else {
            input = { item };
            if (data)
                input.data = data;
            if (count)
                input.count = count;
        }
        this.definitions.input = input;
        return this;
    }
    output(item) {
        this.definitions.output = item;
        return this;
    }
}
export class AddonRecipeFurnace_1_12 extends AddonRecipeFurnace {
    constructor(definitions = {}) {
        super("1.12", definitions);
    }
}
export class AddonRecipeFurnace_1_17 extends AddonRecipeFurnace {
    constructor(definitions = {}) {
        super("1.17", definitions);
    }
}
