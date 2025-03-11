export class AddonRecipeShaped extends AddonRecipe {
    /**
     * @param {'1.12'|'1.17'|'1.19'|'1.20'} ver
     * @param {any} def
     */
    static create(ver: "1.12" | "1.17" | "1.19" | "1.20", def: any): AddonRecipeShaped;
    constructor(format_version: any, definitions: any);
    assumeSymmetry(): void;
    key(key: any): this;
    pattern(pattern: any): this;
    priority(priority: any): this;
    output(item: any): this;
}
export class AddonRecipeShaped_1_12 extends AddonRecipeShaped {
    constructor(definitions: any);
}
export class AddonRecipeShaped_1_17 extends AddonRecipeShaped {
    constructor(definitions: any);
}
export class AddonRecipeShaped_1_19 extends AddonRecipeShaped {
    constructor(definitions: any);
}
export class AddonRecipeShaped_1_20 extends AddonRecipeShaped {
    constructor(definitions: any);
}
import { AddonRecipe } from "./baseRecipe.js";
