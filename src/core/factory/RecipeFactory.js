import { Registry } from "../registry.js";
import { RecipeTags } from "../addon/recipe/data.js";
import { AddonRecipeFurnace_1_17 } from "../addon/recipe/recipeFurnace.js";
import { AddonRecipeShaped_1_20 } from "../addon/recipe/recipeShaped.js";
import { AddonRecipeShapeless_1_17 } from "../addon/recipe/recipeShapeless.js";

class RecipeRegistry extends Registry {
	registerSimpleFurnace(identifier, output, input) {
		return this.registerFurnace(identifier).tags([RecipeTags.Furnace]).input(input).output(output);
	}

	registerFurnace(identifier) {
		return this.register(new AddonRecipeFurnace_1_17().identifier(identifier));
	}

	registerSimpleShaped(identifier, output, pattern, key) {
		return this.registerShaped(identifier).tags([RecipeTags.CraftingTable]).pattern(pattern).key(key).output(output);
	}

	registerShaped(identifier) {
		return this.register(new AddonRecipeShaped_1_20().identifier(identifier));
	}

	registerSimpleShapeless(identifier, output, ingredients) {
		return this.registerShapeless(identifier).tags([RecipeTags.CraftingTable]).ingredients(ingredients).output(output);
	}

	registerShapeless(identifier) {
		return this.register(new AddonRecipeShapeless_1_17().identifier(identifier));
	}

	generate(generator) {
		this.getAll().forEach(value => generator.recipe(value));
	}
}

export const RecipeAPI = new RecipeRegistry();