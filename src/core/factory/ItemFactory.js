import { Chestplate } from "../item/armor.js";
import { Attachable } from "../item/Attachable.js";
import { Food } from "../item/Food.js";
import { Item } from "../item/item.js";
import { GRegistry } from "../registry.js";

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
     * @param {boolean} options.hide_in_command - 是否在命令中隐藏物品。
     * @returns {Item} 创建的物品。
     */
    createItem: function (identifier, category, texture, options = {}) {
        if (!identifier || !category || !texture) {
            throw new Error("必须提供 identifier、category 和 texture。");
        }

        const item = new Item(identifier, category, texture, options);
        registerItem(item, {});
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
};