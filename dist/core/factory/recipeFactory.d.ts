export const RecipeAPI: RecipeRegistry;
declare class RecipeRegistry {
    /**
     *
     * @param {AddonRecipeFurnace_1_17} recipe
     */
    registerRecipe(recipe: AddonRecipeFurnace_1_17): void;
    registerSimpleFurnace(identifier: any, output: any, input: any): AddonRecipeFurnace_1_17;
    registerFurnace(identifier: any): AddonRecipeFurnace_1_17;
    registerSimpleShaped(identifier: any, output: any, pattern: any, key: any): AddonRecipeShaped_1_20;
    registerShaped(identifier: any): AddonRecipeShaped_1_20;
    registerSimpleShapeless(identifier: any, output: any, ingredients: any): AddonRecipeShapeless_1_17;
    registerShapeless(identifier: any): AddonRecipeShapeless_1_17;
}
import { AddonRecipeFurnace_1_17 } from "../addon/recipe/furnace.js";
import { AddonRecipeShaped_1_20 } from "../addon/recipe/shaped.js";
import { AddonRecipeShapeless_1_17 } from "../addon/recipe/shapeless.js";
export {};
