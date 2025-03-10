import { RecipeTags } from "../addon/recipe/data.js";
import { AddonRecipeFurnace_1_17 } from "../addon/recipe/recipeFurnace.js";
import { AddonRecipeShaped_1_20 } from "../addon/recipe/recipeShaped.js";
import { AddonRecipeShapeless_1_17 } from "../addon/recipe/recipeShapeless.js";
import { GRegistry } from "../GRegistry.js";
class RecipeRegistry {
    /**
     *
     * @param {AddonRecipeFurnace_1_17} recipe
     */
    registerRecipe(recipe) {
        GRegistry.register(recipe.getId().replace(":", "_"), "behavior", "recipes/", recipe);
    }
    registerSimpleFurnace(identifier, output, input) {
        return this.registerFurnace(identifier).tags([RecipeTags.Furnace]).input(input).output(output);
    }
    registerFurnace(identifier) {
        const recipe = new AddonRecipeFurnace_1_17().identifier(identifier);
        this.registerRecipe(recipe);
        return recipe;
    }
    registerSimpleShaped(identifier, output, pattern, key) {
        return this.registerShaped(identifier).tags([RecipeTags.CraftingTable]).pattern(pattern).key(key).output(output);
    }
    registerShaped(identifier) {
        const recipe = new AddonRecipeShaped_1_20().identifier(identifier);
        this.registerRecipe(recipe);
        return recipe;
    }
    registerSimpleShapeless(identifier, output, ingredients) {
        return this.registerShapeless(identifier).tags([RecipeTags.CraftingTable]).ingredients(ingredients).output(output);
    }
    registerShapeless(identifier) {
        const recipe = new AddonRecipeShapeless_1_17().identifier(identifier);
        this.registerRecipe(recipe);
        return recipe;
    }
}
export const RecipeAPI = new RecipeRegistry();
