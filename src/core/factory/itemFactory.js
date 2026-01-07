import { create } from "lodash";
import { Boot, Chestplate, Helmet, Leggings } from "../item/armor.js"
import { Attachable } from "../item/attachable.js";
import { Food } from "../item/food.js";
import { Item } from "../item/item.js";
import { GRegistry } from "../registry.js";
import { FlipbookItem } from "../item/flipbookItem.js";
import { registerBlock } from "./blockFactory.js";

const registerItem = (itemData, attachableData) => {
    // 如果 itemData 存在且不为空，则注册
    if (itemData && Object.keys(itemData).length > 0) {
        GRegistry.register(itemData.identifier.replace(":", "_"), "behavior", "items/", itemData);
    }

    // 如果 attachableData 存在且不为空，则注册
    if (attachableData && Object.keys(attachableData).length > 0) {
        GRegistry.register(attachableData.identifier.replace(":", "_"), "resource", "attachables/", attachableData);
    }
};

// 物品创建的工厂函数
export const ItemAPI = {
    /**
     * 创建一个普通物品。
     * @param {string} identifier - 物品的唯一标识符。
     * @param {string} category - 物品在创造菜单中的分类（如 "construction", "nature"）。
     * @param {string} texture - 物品的纹理。
     * @param {Object} options - 额外选项。
     * @param {string} options.group - 物品的分组。
     * @param {boolean} options.hight_resolution -是否是高分辨率 
     * @param {boolean} options.hide_in_command - 是否在命令中隐藏物品。
     * @returns {Item} 创建的物品。
     */
    createItem: function (identifier, category, texture, options = {}) {
        if (!identifier || !category || !texture) {
            throw new Error("必须提供 identifier、category 和 texture。");
        }

        const item = new Item(identifier, category, texture, options);
        let attachable  = {};
        if (options.hide_in_command === true){
            attachable = new Attachable(identifier)
            .addMaterial("default", "entity_alphatest")
            .addMaterial("enchanted", "entity_alphatest_glint")
            .addTexture("default", `textures/items/${texture}`)
            .addTexture("enchanted","textures/misc/enchanted_item_glint")
            .addGeometry("default","geometry.large_item")
        }
        registerItem(item, attachable);
        return item;
    },

    /**
     * 创建一个食物物品。
     * @param {string} identifier - 食物的唯一标识符。
     * @param {string} category - 食物在创造菜单中的分类。
     * @param {string} texture - 食物的纹理。
     * @param {Object} options - 额外选项。
     * @param {string} options.group - 食物的分组。
     * @param {boolean} options.hide_in_command - 是否在命令中隐藏食物。
     * @param {string} options.animation - 食用时的动画（默认："eat"）。
     * @param {boolean} options.canAlwaysEat - 是否总是可以食用。
     * @param {number} options.nutrition - 食物的营养价值。
     * @param {number} options.saturationModifier - 饱和度修正值。
     * @returns {Food} 创建的食物物品。
     */
    createFood: function (identifier, category, texture, options = {}) {
        if (!identifier || !category || !texture) {
            throw new Error("必须提供 identifier、category 和 texture。");
        }

        const food = new Food(identifier, category, texture, {
            animation: "eat",
            canAlwaysEat: false,
            nutrition: 0,
            saturationModifier: 1,
            ...options, // 用传入的选项覆盖默认值
        });

        registerItem(food, {});
        return food;
    },

    /**
     * 创建一个可附着物品。
     * @param {string} identifier - 可附着物品的唯一标识符。
     * @param {string} texture - 可附着物品的纹理。
     * @param {string} material - 可附着物品的材质。
     * @param {Object} options - 额外选项。
     * @returns {Attachable} 创建的可附着物品。
     */
    createAttachable: function (identifier, texture, material, options = {}) {
        if (!identifier || !texture || !material) {
            throw new Error("必须提供 identifier、texture 和 material。");
        }

        const attachable = new Attachable(identifier);
        attachable.addTexture("default", texture);
        attachable.addMaterial("default", material);
        registerItem({}, attachable);
        return attachable;
    },
    createChestplateArmor: function (identifier, item_texture, texture_path, options = {}) {
        const item = new Chestplate(identifier, item_texture, texture_path, options);
        registerItem(item.item, item.attachable);
        return item;
    },
    createHelmetArmor: function (identifier, item_texture, texture_path, options = {}) {
        const item = new Helmet(identifier, item_texture, texture_path, options);
        registerItem(item.item, item.attachable);
        return item;
    },
    createBootArmor: function (identifier, item_texture, texture_path, options = {}) {
        const item = new Boot(identifier, item_texture, texture_path, options);
        registerItem(item.item, item.attachable);
        return item;
    },
    createLeggingsArmor: function (identifier, item_texture, texture_path, options = {}) {
        const item = new Leggings(identifier, item_texture, texture_path, options);
        registerItem(item.item, item.attachable);
        return item;
    },
    //注释
    /**
	 * 创建并注册翻书物品
	 * 
	 * @param {string}identifier - 物品的唯一标识符（如："my_mod:flipbook_item"）
	 * @param {string}category - 物品所属的分类（如："construction", "equipment"等）
	 * @param {string}texture - 纹理名称（不包含路径和后缀，如："my_flipbook_texture"）
	 * @param {Object?}options - 可选的配置参数对象
	 * @param {string?}options.group - 物品分组，用于在创造模式物品栏中分组显示
	 * @param {boolean?}options.hide_in_command - 是否在命令自动补全中隐藏该物品
	 * @param {number?}options.ticks_per_frame - 每个动画帧持续的游戏刻数（tick），默认8刻
	 * @param {number?}options.max_stack_size - 物品的最大堆叠数量
	 * @param {string?}options.format_version - 资源包的格式版本号
	 */
    createFlipbookItem: function (identifier, category, texture, options = {}) {
        if (!identifier || !category || !texture) {
            throw new Error("必须提供 identifier、category 和 texture。");
        }
        const flipbookItem = new FlipbookItem(identifier, category, texture, options);
        registerItem(flipbookItem, {});
        registerBlock(flipbookItem.block);
        return flipbookItem;
    },
};