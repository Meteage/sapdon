import { AddonRecipe } from "./recipe.js";
import { RecipeTypes } from "./data.js";

export class AddonRecipeShapeless extends AddonRecipe {
	constructor(format_version, definitions) {
		super(format_version, RecipeTypes.Shapeless, definitions);
	}

	priority(priority) {
		this.definitions.priority = priority;
		return this;
	}

	ingredients(ingredients) {
		this.definitions.ingredients = ingredients;
		return this;
	}

	output(item) {
		this.definitions.result = typeof item == "string" ? { item } : item;
		return this;
	}
}

export class AddonRecipeShapeless_1_12 extends AddonRecipeShapeless {
	constructor(definitions) {
		super("1.12", definitions);
	}
}

export class AddonRecipeShapeless_1_17 extends AddonRecipeShapeless {
	constructor(definitions) {
		super("1.17", definitions);
	}
}
