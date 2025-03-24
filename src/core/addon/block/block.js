import { AddonMenuCategory } from "../menuCategory.js";
import { Serializer } from "@utils"

export class AddonBlock {
    /**
     * Addon方块类
     * @param {string} format_version 格式版本
     * @param {AddonBlockDefinition} definitions 方块定义
     */
    constructor(format_version,definitions){
        this.format_version = format_version;
        this.definitions = definitions;
    }
    @Serializer
    toObject(){
        return {
            format_version:this.format_version,
            ["minecraft:block"]:this.definitions
        }
    }
}

export class AddonBlockDefinition{
    /**
     * 方块定义类
     * @param {AddonBlockDescription} description 方块描述
     * @param {Object} components 方块组件
     * @param {Array} permutations 方块变体
     */
    constructor(description,components,permutations=[]){
        this.description = description;
        this.components = components;
        this.permutations = permutations;
    }
}

export class AddonBlockDescription {
    /**
     * 方块描述类
     * @param {string} identifier 唯一标识符
     * @param {map} traits 方块特性
     * @param {map} states 方块状态
     * @param {AddonMenuCategory} menu_category 
     */
    constructor(identifier, traits, states, menu_category){
        this.identifier = identifier;
        this.traits = traits;
        this.states = states;
        this.menu_category = menu_category;
    }
}