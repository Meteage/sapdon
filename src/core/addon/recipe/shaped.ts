import { AddonRecipe } from "./baseRecipe.js";
import { RecipeTypes } from "./data.js";

export class AddonRecipeShaped extends AddonRecipe {
    constructor(format_version: string, definitions: Record<string, any>) {
        super(format_version, RecipeTypes.Shaped, definitions);
    }

    assumeSymmetry(): void {
        this.definitions.assume_symmetry = true;
    }

    key(key: Record<string, any>): this {
        this.definitions.key = key;
        return this;
    }

    pattern(pattern: string[]): this {
        this.definitions.pattern = pattern;
        return this;
    }

    priority(priority: number): this {
        this.definitions.priority = priority;
        return this;
    }

    output(item: string | Record<string, any>): this {
        this.definitions.result = typeof item == "string" ? { item } : item;
        return this;
    }

    static create(ver: string, def: Record<string, any>): AddonRecipeShaped {
        return new AddonRecipeShaped(ver, def)
    }
}

export class AddonRecipeShaped_1_12 extends AddonRecipeShaped {
    constructor(definitions: Record<string, any> = {}) {
        super("1.12", definitions);
    }
}

export class AddonRecipeShaped_1_17 extends AddonRecipeShaped {
    constructor(definitions: Record<string, any> = {}) {
        super("1.17", definitions);
    }
}

export class AddonRecipeShaped_1_19 extends AddonRecipeShaped {
    constructor(definitions: Record<string, any> = {}) {
        super("1.19", definitions);
    }
}

export class AddonRecipeShaped_1_20 extends AddonRecipeShaped {
    constructor(definitions: Record<string, any> = {}) {
        super("1.20", definitions);
    }
}
