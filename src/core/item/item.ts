import { ItemComponent } from "./itemComponents.js";
import { Attachable } from "./attachable.js";
import { AddonItem, AddonItemDefinition, AddonItemDescription } from "../addon/item/item.js";
import { AddonMenuCategory } from "../addon/menuCategory.js";
import { Serializer, serialize } from "../../utils/index.js"
import { ItemCategory, type ItemOptions, type ItemComponentMap } from "./types.js";

export class Item {
    identifier: string;
    category: string;
    texture: string;
    group?: string;
    hide_in_command: boolean;
    format_version: string;
    components: ItemComponentMap;
    attachable?: Attachable;

    /**
     * 物品类
     * @param identifier 物品唯一标识符
     * @param category 菜单栏分类，见 {@link ItemCategory}
     * @param texture 物品纹理
     * @param options 可选参数
     */
    constructor(identifier: string, category: ItemCategory, texture: string, options: ItemOptions = {}) {
        // 参数校验
        if (!identifier || typeof identifier !== "string") {
            throw new Error("identifier 为必填项，且必须是字符串");
        }
        if (!category || typeof category !== "string") {
            throw new Error("category 为必填项，且必须是字符串");
        }
        if (!texture || typeof texture !== "string") {
            throw new Error("texture 为必填项，且必须是字符串");
        }
        if (!Object.values(ItemCategory).includes(category)) {
            throw new Error(`未知的物品分类: ${category}，可选值为 ${Object.values(ItemCategory).join(", ")}`);
        }

        const {
            group,
            hide_in_command,
            hideInCommand = hide_in_command,
            max_stack_size,
            maxStackSize = max_stack_size,
            format_version,
            formatVersion = format_version,
            icon,
        } = options;

        this.identifier = identifier;
        this.category = category;
        this.texture = texture;
        this.group = group;
        this.hide_in_command = hideInCommand ?? false;
        this.format_version = formatVersion ?? "1.21.40";
        this.components = new Map();

        // 初始化默认组件（可通过 options.icon 传 null 跳过图标组件）
        const defaultComponents: ItemComponentMap[] = [];
        if (icon !== null) {
            defaultComponents.push(ItemComponent.setIcon(icon ?? this.texture));
        }
        defaultComponents.push(ItemComponent.setMaxStackSize(maxStackSize ?? 64));

        this.addComponent(
            ItemComponent.combineComponents(...defaultComponents)
        );
    }

    /**
     * 添加组件
     * @param componentMap 组件 Map
     */
    addComponent(componentMap: ItemComponentMap): this {
        if (!componentMap || !(componentMap instanceof Map)) {
            throw new Error("componentMap 为必填项，且必须是 Map");
        }
        for (const [key, value] of componentMap.entries()) {
            this.components.set(key, value);
        }
        return this;
    }

    /**
     * 移除组件
     * @param key 组件名称
     */
    removeComponent(key: string): this {
        if (!key || typeof key !== "string") {
            throw new Error("key 为必填项，且必须是字符串");
        }
        this.components.delete(key);
        return this;
    }

    getAttachable(): Attachable | undefined {
        return this.attachable;
    }

    /**
     * 将物品转换为 JSON 格式
     * @returns JSON 格式的物品对象
     */
    @Serializer
    toObject(): Record<string, any> {
        const components = Object.fromEntries(this.components);

        const item = new AddonItem(
            this.format_version,
            new AddonItemDefinition(
                new AddonItemDescription(
                    this.identifier,
                    new AddonMenuCategory(
                        this.category,
                        this.group,
                        this.hide_in_command
                    )
                ),
                components
            )
        );
        return serialize(item) as Record<string, any>;
    }
}
