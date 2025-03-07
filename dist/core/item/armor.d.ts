export class Armor {
    constructor(identifier: any, category: any, item_texture: any, texture_path: any, options?: {});
    identifier: any;
    item: Item;
    attachable: Attachable;
}
export class Chestplate extends Armor {
    constructor(identifier: any, item_texture: any, texture_path: any, options?: {});
}
export class Boot extends Armor {
    constructor(identifier: any, item_texture: any, texture_path: any, options?: {});
}
export class Leggings extends Armor {
    constructor(identifier: any, item_texture: any, texture_path: any, options?: {});
}
export class Helmet extends Armor {
    constructor(identifier: any, item_texture: any, texture_path: any, options?: {});
}
import { Item } from "./Item.js";
import { Attachable } from "./Attachable.js";
