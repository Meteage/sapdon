export class AddonItem {
    constructor(format_version: any, definitions: any);
    format_version: any;
    definitions: any;
    toJson(): {
        format_version: any;
        "minecraft:item": any;
    };
}
export class AddonItemDefinition {
    constructor(description: any, components: any);
    description: any;
    components: any;
}
export class AddonItemDescription {
    constructor(identifier: any, menu_category: any);
    identifier: any;
    menu_category: any;
}
