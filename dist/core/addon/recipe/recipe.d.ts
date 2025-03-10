export class AddonRecipe {
    constructor(format_version: any, recipe_type: any, definitions?: {});
    format_version: any;
    recipe_type: any;
    definitions: {};
    getId(): any;
    identifier(identifier: any): this;
    tags(tags: any): this;
    toJson(): {
        format_version: any;
    };
}
