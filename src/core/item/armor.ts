import { Attachable } from "./attachable.js";
import { Item } from "./item.js";
import { ItemComponent } from "./itemComponents.js";
import { ItemCategory, type ItemOptions, type RepairItem } from "./types.js";

/**
 * 盔甲类型枚举
 */
export enum ArmorType {
    Chestplate = "chestplate",
    Helmet = "helmet",
    Boots = "boots",
    Leggings = "leggings",
}

/**
 * 盔甲类型规格
 * 参考 Bedrock Wiki "Custom Armor"：https://wiki.bedrock.dev/items/custom-armor
 */
export interface ArmorSpec {
    group: string;
    geometry: string;
    script: string;
    protection: number;
    slot: string;
    enchantSlot: string;
    maxDurability: number;
    displayName: string;
}

/**
 * 盔甲选项
 * 参考 Bedrock Wiki "Custom Armor"：https://wiki.bedrock.dev/items/custom-armor
 */
export interface ArmorOptions extends ItemOptions {
    displayName?: string;
    /**
     * 附魔槽位与等级（参考 wiki 规范，默认 { slot: 按部位, value: 10 }）
     */
    enchantable?: { slot: string; value?: number };
    /**
     * 最大耐久（参考 wiki 规范，默认按部位：头盔 363 / 胸甲 528 / 护腿 495 / 靴子 429）
     */
    maxDurability?: number;
    /**
     * 修复条目（参考 wiki 规范，默认木棍，每次恢复 25% 最大耐久）
     */
    repairItems?: RepairItem[];
    /**
     * 附加标签（参考 wiki 规范，默认 ["minecraft:is_armor", "minecraft:trimmable_armors"]）
     */
    tags?: string[];
    /**
     * 渲染控制器，默认 "controller.render.armor"（兼容旧版），可传 "controller.render.armor.v2"
     */
    renderController?: string;
}

/**
 * 各盔甲类型的规格配置表
 */
const ARMOR_TYPES: Record<ArmorType, ArmorSpec> = {
    [ArmorType.Chestplate]: {
        group: "minecraft:itemGroup.name.chestplate",
        geometry: "geometry.player.armor.chestplate",
        script: "v.chest_layer_visible = 0.0;",
        protection: 8,
        slot: "slot.armor.chest",
        enchantSlot: "armor_torso",
        maxDurability: 528,
        displayName: "我的自定义胸甲",
    },
    [ArmorType.Helmet]: {
        group: "minecraft:itemGroup.name.helmet",
        geometry: "geometry.player.armor.helmet",
        script: "v.helmet_layer_visible = 0.0;",
        protection: 3,
        slot: "slot.armor.head",
        enchantSlot: "armor_head",
        maxDurability: 363,
        displayName: "我的自定义头盔",
    },
    [ArmorType.Boots]: {
        group: "minecraft:itemGroup.name.boots",
        geometry: "geometry.player.armor.boots",
        script: "v.boot_layer_visible = 0.0;",
        protection: 3,
        slot: "slot.armor.feet",
        enchantSlot: "armor_feet",
        maxDurability: 429,
        displayName: "我的自定义靴子",
    },
    [ArmorType.Leggings]: {
        group: "minecraft:itemGroup.name.leggings",
        geometry: "geometry.player.armor.leggings",
        script: "v.leg_layer_visible = 0.0;",
        protection: 6,
        slot: "slot.armor.legs",
        enchantSlot: "armor_legs",
        maxDurability: 495,
        displayName: "我的自定义裤子",
    },
};

/**
 * 盔甲类
 * 由 ArmorType 数据表驱动，同时生成物品（Item）与可附着物（Attachable）
 */
export class Armor {
    type: ArmorType;
    identifier: string;
    item: Item;
    attachable: Attachable;

    constructor(
        identifier: string,
        item_texture: string,
        texture_path: string,
        type: ArmorType = ArmorType.Chestplate,
        options: ArmorOptions = {}
    ) {
        const spec = ARMOR_TYPES[type];
        if (!spec) {
            throw new Error(`未知的盔甲类型: ${type}，可选值为 ${Object.values(ArmorType).join(", ")}`);
        }

        this.type = type;
        this.identifier = identifier;

        // 克隆 options 并在副本上设置分组，避免污染调用方对象
        this.item = new Item(identifier, ItemCategory.Equipment, item_texture, { ...options, group: spec.group });
        this.attachable = new Attachable(identifier);

        this.attachable
            .addTexture("default", texture_path)
            .addMaterial("default", "armor")
            .addMaterial("enchanted", "armor_enchanted")
            .addTexture("enchanted", "textures/misc/enchanted_actor_glint")
            .addRenderController(options.renderController ?? "controller.render.armor")
            .addGeometry("default", spec.geometry)
            .setScript("parent_setup", spec.script);

        const enchantable = options.enchantable ?? { slot: spec.enchantSlot, value: 10 };

        this.item.addComponent(
            ItemComponent.combineComponents(
                ItemComponent.setDisplayName(options.displayName ?? spec.displayName),
                ItemComponent.setMaxStackSize(1),
                ItemComponent.setWearable(spec.protection, spec.slot),
                ItemComponent.setEnchantable(enchantable.slot, enchantable.value ?? 10),
                ItemComponent.setDurability(options.maxDurability ?? spec.maxDurability, 60, 100),
                ItemComponent.setRepairable(
                    options.repairItems ?? [
                        { items: ["minecraft:stick"], repairAmount: "q.max_durability * 0.25" },
                    ]
                ),
                ItemComponent.setTags(options.tags ?? ["minecraft:is_armor", "minecraft:trimmable_armors"])
            )
        );
    }

    /**
     * 设置可附着物的几何模型
     * @param key 几何模型名称
     * @param geometry 几何模型标识符
     * @returns 当前实例，支持链式调用
     */
    setAttachableGeometry(key: string, geometry: string): this {
        this.attachable.addGeometry(key, geometry);
        return this;
    }

    /**
     * 获取行为包与资源包的 JSON 表示
     * @returns { behavior, resource } 两个包的注册内容
     */
    toObject(): { behavior: Record<string, any>; resource: Record<string, any> } {
        return {
            behavior: this.item.toObject(),
            resource: this.attachable.toObject(),
        };
    }
}
