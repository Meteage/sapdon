export class AddonBlock {
    /**
     * Addon方块类
     * @param {string} format_version 格式版本
     * @param {AddonBlockDefinition} definitions 方块定义
     */
    constructor(format_version: string, definitions: AddonBlockDefinition);
    format_version: string;
    definitions: AddonBlockDefinition;
    toJson(): {
        format_version: string;
        "minecraft:block": AddonBlockDefinition;
    };
}
export class AddonBlockDefinition {
    /**
     * 方块定义类
     * @param {AddonBlockDescription} description 方块描述
     * @param {Object} components 方块组件
     * @param {Array} permutations 方块变体
     */
    constructor(description: AddonBlockDescription, components: any, permutations?: any[]);
    description: AddonBlockDescription;
    components: any;
    permutations: any[];
}
export class AddonBlockDescription {
    /**
     * 方块描述类
     * @param {string} identifier 唯一标识符
     * @param {map} traits 方块特性
     * @param {map} states 方块状态
     * @param {AddonMenuCategory} menu_category
     */
    constructor(identifier: string, traits: map, states: map, menu_category: AddonMenuCategory);
    identifier: string;
    traits: map;
    states: map;
    menu_category: AddonMenuCategory;
}
import { AddonMenuCategory } from "../menu_category.js";
