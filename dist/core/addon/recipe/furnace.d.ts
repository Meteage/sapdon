export class AddonRecipeFurnace extends AddonRecipe {
    /**
     * @param {'1.12'|'1.17'} ver
     * @param {any} def
     */
    static create(ver: "1.12" | "1.17", def: any): AddonRecipeFurnace;
    constructor(format_version: any, definitions: any);
    input(item: any, data: any, count: any): this;
    output(item: any): this;
}
export class AddonRecipeFurnace_1_12 extends AddonRecipeFurnace {
    constructor(definitions?: {});
}
export class AddonRecipeFurnace_1_17 extends AddonRecipeFurnace {
    constructor(definitions?: {});
}
import { AddonRecipe } from "./baseRecipe.js";
