import { GRegistry } from "../registry.js";

/**
 * 物品目录分类
 * 参考 Bedrock Wiki Item Catalog：仅支持 construction / equipment / items / nature 四类
 */
export type ItemCatalogCategory = 'construction' | 'equipment' | 'items' | 'nature'

/**
 * 可展开分组配置
 */
export interface ItemCatalogGroupOptions {
    /**
     * 分组图标使用的物品
     */
    icon?: string
    /**
     * 分组的本地化键，如 "wiki:itemGroup.name.ore"；同时可用作物品/方块的 menu_category.group
     */
    name?: string
}

interface ItemCatalogGroup {
    group_identifier?: { icon: string; name: string }
    items: string[]
}

/**
 * 物品目录
 * 生成 BP/item_catalog/crafting_item_catalog.json，
 * 用于指定物品在创造菜单与配方手册中的分组位置。
 */
export class ItemCatalog {
    format_version: string
    private categories: Record<string, ItemCatalogGroup[]>

    /**
     * @param format_version 格式版本，默认 "1.26.30"
     */
    constructor(format_version = "1.26.30") {
        if (typeof format_version !== "string" || format_version.length === 0) {
            throw new Error('format_version 必须是非空字符串');
        }
        this.format_version = format_version;
        this.categories = {};
    }

    /**
     * 添加一组物品到指定分类
     * @param category 创造菜单分类（construction/equipment/items/nature）
     * @param items 物品标识符列表
     * @param options 可展开分组配置
     * @returns 当前实例，支持链式调用
     */
    addGroup(category: ItemCatalogCategory, items: string[], options: ItemCatalogGroupOptions = {}): this {
        const valid = ['construction', 'equipment', 'items', 'nature'];
        if (!valid.includes(category)) {
            throw new Error(`未知的物品目录分类: ${category}，可选值为 ${valid.join(', ')}`);
        }
        if (!Array.isArray(items) || items.length === 0 || items.some(item => typeof item !== "string")) {
            throw new Error('items 必须是非空字符串数组');
        }

        const group: ItemCatalogGroup = { items: [...items] };
        const { icon, name } = options;
        if (icon !== undefined || name !== undefined) {
            if (typeof icon !== "string" || typeof name !== "string") {
                throw new Error('group_identifier 的 icon 与 name 必须同时为字符串');
            }
            group.group_identifier = { icon, name };
        }

        if (!this.categories[category]) {
            this.categories[category] = [];
        }
        this.categories[category].push(group);
        return this;
    }

    /**
     * 添加单个物品到指定分类
     * @param category 创造菜单分类（construction/equipment/items/nature）
     * @param item 物品标识符
     * @param options 可展开分组配置
     * @returns 当前实例，支持链式调用
     */
    addItem(category: ItemCatalogCategory, item: string, options: ItemCatalogGroupOptions = {}): this {
        return this.addGroup(category, [item], options);
    }

    /**
     * 注册到行为包的 item_catalog/ 目录
     * @returns 当前实例
     */
    register(): this {
        GRegistry.register('crafting_item_catalog', 'behavior', 'item_catalog/', this);
        return this;
    }

    /**
     * 将物品目录转换为 JSON 格式
     * @returns JSON 格式的物品目录对象
     */
    toObject(): Record<string, any> {
        const categories = Object.entries(this.categories).map(([category_name, groups]) => ({
            category_name,
            groups,
        }));

        return {
            format_version: this.format_version,
            "minecraft:crafting_items_catalog": {
                categories,
            },
        };
    }
}
