import { Attachable } from "./attachable.js";
import { Item } from "./item.js";
import { ItemComponent } from "./itemComponents.js";
import { ItemCategory, type ItemOptions } from "./types.js";

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
 */
export interface ArmorSpec {
    group: string;
    geometry: string;
    script: string;
    protection: number;
    slot: string;
    displayName: string;
}

/**
 * 盔甲选项
 */
export interface ArmorOptions extends ItemOptions {
    displayName?: string;
}

/**
 * 各盔甲类型的规格配置表
 */
const ARMOR_TYPES: Record<ArmorType, ArmorSpec> = {
    [ArmorType.Chestplate]: {
        group: "minecraft:itemGroup.name.chestplate",
        geometry: "geometry.player.armor.chestplate",
        script: "v.chest_layer_visible = 0.0;",
        protection: 5,
        slot: "slot.armor.chest",
        displayName: "我的自定义胸甲",
    },
    [ArmorType.Helmet]: {
        group: "minecraft:itemGroup.name.helmet",
        geometry: "geometry.player.armor.helmet",
        script: "v.helmet_layer_visible = 0.0;",
        protection: 3,
        slot: "slot.armor.head",
        displayName: "我的自定义头盔",
    },
    [ArmorType.Boots]: {
        group: "minecraft:itemGroup.name.boots",
        geometry: "geometry.player.armor.boots",
        script: "v.boot_layer_visible = 0.0;",
        protection: 4,
        slot: "slot.armor.feet",
        displayName: "我的自定义靴子",
    },
    [ArmorType.Leggings]: {
        group: "minecraft:itemGroup.name.leggings",
        geometry: "geometry.player.armor.leggings",
        script: "v.leg_layer_visible = 0.0;",
        protection: 6,
        slot: "slot.armor.legs",
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
            .addRenderController("controller.render.armor")
            .addGeometry("default", spec.geometry)
            .setScript("parent_setup", spec.script);

        this.item.addComponent(
            ItemComponent.combineComponents(
                ItemComponent.setDisplayName(options.displayName ?? spec.displayName),
                ItemComponent.setMaxStackSize(1),
                ItemComponent.setWearable(spec.protection, spec.slot)
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
