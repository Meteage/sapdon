import { AddonRecipe } from "./baseRecipe.js";
import { RecipeTypes } from "./data.js";

export class AddonRecipeFurnace extends AddonRecipe {
	constructor(format_version, definitions) {
		super(format_version, RecipeTypes.Furnace, definitions);
	}

	/**
	 * @param {'1.12'|'1.17'} ver 
	 * @param {any} def 
	 */
	static create(ver, def) {
		return new AddonRecipeFurnace(ver, def)
	}

	input(item, data, count) {
		var input;
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
