export namespace ItemAPI {
    function createItem(identifier: string, category: string, texture: string, options?: {
        group: string;
        hide_in_command: boolean;
    }): Item;
    function createFood(identifier: string, category: string, texture: string, options?: {
        group: string;
        hide_in_command: boolean;
        animation: string;
        canAlwaysEat: boolean;
        nutrition: number;
        saturationModifier: number;
    }): Food;
    function createAttachable(identifier: string, texture: string, material: string, options?: any): Attachable;
    function createChestplateArmor(identifier: any, item_texture: any, texture_path: any, options?: {}): Chestplate;
}
import { Item } from "../item/Item.js";
import { Food } from "../item/Food.js";
import { Attachable } from "../item/Attachable.js";
import { Chestplate } from "../item/armor.js";
