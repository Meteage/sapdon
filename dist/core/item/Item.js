import { ItemComponent } from "./ItemComponents.js";
import { AddonItem, AddonItemDefinition, AddonItemDescription } from "../addon/item/item.js";
import { AddonMenuCategory } from "../addon/menu_category.js";
export class Item {
    /**
     * 物品类
     * @param {string} identifier 物品唯一标识符
     * @param {string} category 菜单栏分类 可选："construction", "nature", "equipment", "items", and "none"
     * @param {string} texture 物品纹理
     * @param {Object} options 可选参数
     * @param {string} options.group 分组
     * @param {boolean} options.hide_in_command 是否在命令中隐藏，默认为 false
     */
    constructor(identifier, category, texture, options = {}) {
        // 参数校验
        if (!identifier || typeof identifier !== "string") {
            throw new Error("identifier is required and must be a string");
        }
        if (!category || typeof category !== "string") {
            throw new Error("category is required and must be a string");
        }
        if (!texture || typeof texture !== "string") {
            throw new Error("texture is required and must be a string");
        }
        const { group, hide_in_command = false, max_stack_size = 64, } = options;
        this.identifier = identifier;
        this.category = category;
        this.texture = texture;
        this.group = group;
        this.hide_in_command = hide_in_command;
        this.components = new Map();
        // 初始化默认组件
        this.addComponent(ItemComponent.combineComponents(ItemComponent.setIcon(this.texture), ItemComponent.setMaxStackSize(max_stack_size)));
    }
    /**
     * 添加组件
     * @param {Map} componentMap 组件 Map
     */
    addComponent(componentMap) {
        if (!componentMap || !(componentMap instanceof Map)) {
            throw new Error("componentMap is required and must be a Map");
        }
        for (const [key, value] of componentMap.entries()) {
            this.components.set(key, value);
        }
        return this;
    }
    /**
     * 移除组件
     * @param {string} key 组件名称
     */
    removeComponent(key) {
        if (!key || typeof key !== "string") {
            throw new Error("key is required and must be a string");
        }
        this.components.delete(key);
        return this;
    }
    /**
     * 将物品转换为 JSON 格式
     * @returns {Object} JSON 格式的物品对象
     */
    toJson() {
        const item = new AddonItem("1.21.40", // 格式版本
        new AddonItemDefinition(new AddonItemDescription(this.identifier, new AddonMenuCategory(this.category, this.group, this.hide_in_command)), Object.fromEntries(this.components) // 将 Map 转换为普通对象
        ));
        return item.toJson();
    }
}
