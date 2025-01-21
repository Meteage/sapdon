import { AddonRecipe } from "./recipe.js";
import { RecipeTypes } from "./data.js";

export class AddonRecipeShaped extends AddonRecipe {
	constructor(format_version, definitions) {
		super(format_version, RecipeTypes.Shaped, definitions);
	}

	assumeSymmetry() {
		this.definitions.assume_symmetry = true;
	}

	key(key) {
		this.definitions.key = key;
		return this;
	}

	pattern(pattern) {
		this.definitions.pattern = pattern;
		return this;
	}

	priority(priority) {
		this.definitions.priority = priority;
		return this;
	}

	output(item) {
		this.definitions.result = typeof item == "string" ? { item } : item;
		return this;
	}
}

export class AddonRecipeShaped_1_12 extends AddonRecipeShaped {
	constructor(definitions) {
		super("1.12", RecipeTypes.Shaped, definitions);
	}
}

export class AddonRecipeShaped_1_17 extends AddonRecipeShaped {
	constructor(definitions) {
		super("1.17", RecipeTypes.Shaped, definitions);
	}
}

export class AddonRecipeShaped_1_19 extends AddonRecipeShaped {
	constructor(definitions) {
		super("1.19", RecipeTypes.Shaped, definitions);
	}
}

export class AddonRecipeShaped_1_20 extends AddonRecipeShaped {
	constructor(definitions) {
		super("1.20", RecipeTypes.Shaped, definitions);
	}
}
