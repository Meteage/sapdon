export class AddonRecipeShapeless extends AddonRecipe {
    /**
     * @param {'1.12'|'1.17'} ver
     * @param {any} def
     */
    static create(ver: "1.12" | "1.17", def: any): AddonRecipeShapeless;
    constructor(format_version: any, definitions: any);
    priority(priority: any): this;
    ingredients(ingredients: any): this;
    output(item: any): this;
}
export class AddonRecipeShapeless_1_12 extends AddonRecipeShapeless {
    constructor(definitions: any);
}
export class AddonRecipeShapeless_1_17 extends AddonRecipeShapeless {
    constructor(definitions: any);
}
import { AddonRecipe } from "./baseRecipe.js";
