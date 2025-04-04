export class Armor {
    constructor(identifier: any, category: any, item_texture: any, texture_path: any, options?: {});
    identifier: any;
    item: Item;
    attachable: Attachable;
    setArrachableGeometry(key: any, geometry: any): this;
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
import { Item } from "./item.js";
import { Attachable } from "./attachable.js";
