export namespace ItemAPI {
    function createItem(identifier: string, category: string, texture: string, options?: {
        group: string;
        hight_resolution: boolean;
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
    function createHelmetArmor(identifier: any, item_texture: any, texture_path: any, options?: {}): Helmet;
    function createBootArmor(identifier: any, item_texture: any, texture_path: any, options?: {}): Boot;
    function createLeggingsArmor(identifier: any, item_texture: any, texture_path: any, options?: {}): Leggings;
}
import { Item } from "../item/item.js";
import { Food } from "../item/food.js";
import { Attachable } from "../item/attachable.js";
import { Chestplate } from "../item/armor.js";
import { Helmet } from "../item/armor.js";
import { Boot } from "../item/armor.js";
import { Leggings } from "../item/armor.js";
