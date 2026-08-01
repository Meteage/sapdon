import { Armor, ArmorType } from "../item/armor.js"
import { Attachable } from "../item/attachable.js";
import { Food } from "../item/food.js";
import { Item } from "../item/item.js";
import { GRegistry } from "../registry.js";
import { FlipbookItem, type FlipbookItemOptions } from "../item/flipbookItem.js";
import { ItemCatalog } from "../item/itemCatalog.js";
import { registerBlock } from "./blockFactory.js";
import { ItemCategory, type ItemOptions, type FoodOptions, type CreateModelItemOptions } from "../item/types.js";

interface RegistrableData {
    identifier: string;
    toObject(): any;
    [key: string]: any;
}

const registerItem = (itemData: Partial<RegistrableData> = {}, attachableData: Partial<RegistrableData> = {}) => {
    // 如果 itemData 存在且不为空，则注册
    if (itemData && Object.keys(itemData).length > 0) {
        GRegistry.register(itemData.identifier!.replace(":", "_"), "behavior", "items/", itemData);
    }

    // 如果 attachableData 存在且不为空，则注册
    if (attachableData && Object.keys(attachableData).length > 0) {
        GRegistry.register(attachableData.identifier!.replace(":", "_"), "resource", "attachables/", attachableData);
    }
};

// 物品创建的工厂函数
export const ItemAPI = {
    /**
     * 创建一个普通物品。
     * @param identifier 物品的唯一标识符。
     * @param category 物品在创造菜单中的分类，见 {@link ItemCategory}。
     * @param texture 物品的纹理。
     * @param options 额外选项。
     * @returns 创建的物品。
     */
    createItem(identifier: string, category: ItemCategory, texture: string, options: ItemOptions = {}): Item {
        if (!identifier || !category || !texture) {
            throw new Error("必须提供 identifier、category 和 texture。");
        }

        const item = new Item(identifier, category, texture, options);
        registerItem(item, {});
        return item;
    },

    /**
     * 创建一个大型物品（Item + Attachable）。
     * 用于在手持时显示为大型 3D 模型（如部分 3D 物品）。
     * @param identifier 物品的唯一标识符。
     * @param category 物品在创造菜单中的分类，见 {@link ItemCategory}。
     * @param texture 物品的纹理。
     * @param options 额外选项。
     * @returns 创建的物品。
     */
    createLargeItem(identifier: string, category: ItemCategory, texture: string, options: ItemOptions = {}): Item {
        if (!identifier || !category || !texture) {
            throw new Error("必须提供 identifier、category 和 texture。");
        }

        const item = new Item(identifier, category, texture, options);
        const attachable = new Attachable(identifier)
            .addMaterial("default", "entity_alphatest")
            .addMaterial("enchanted", "entity_alphatest_glint")
            .addTexture("default", `textures/items/${texture}`)
            .addTexture("enchanted", "textures/misc/enchanted_item_glint")
            .addGeometry("default", "geometry.large_item")
        registerItem(item, attachable);
        return item;
    },

    /**
     * 创建一个 3D 手持物品（Item + Attachable + 内置默认握持动画）。
     * 采用 Bedrock Wiki "Attachables" 的 Method 2（model binding）：attachable 使用
     * scripts.animate 按 context.is_first_person 切换首/第三人称动画，并搭配
     * controller.render.item_default 渲染控制器。内置动画姿态参照官方示例
     * （首/第三人称各用固定值），骨骼名须与用户 geometry 中的根骨骼一致。
     * 用户需自行将几何模型放入 RP（geometry 根骨骼应使用
     * "q.item_slot_to_bone_name(c.item_slot)" 绑定槽位）。
     * @param identifier 物品的唯一标识符（如 "my_mod:model_sword"）。
     * @param category 物品在创造菜单中的分类，见 {@link ItemCategory}。
     * @param icon 物品图标（创造菜单/物品栏显示的短名，需登记在 item_texture.json）。
     *             与 texture 相互独立，可分别指定。
     * @param texture attachable 的 3D 贴图路径。传完整路径（如 "textures/entity/skeleton/skeleton"）
     *                将直接用作贴图；传短名（如 "amethyst_shard"）则自动拼接 "textures/items/" 前缀。
     * @param geometry 用户几何标识符（如 "geometry.my_model"）。
     * @param options 额外选项，见 {@link CreateModelItemOptions}。
     * @returns 创建的物品。
     */
    createModelItem(identifier: string, category: ItemCategory, icon: string, texture: string, geometry: string, options: CreateModelItemOptions = {}): Item {
        if (!identifier || !category || !icon || !texture || !geometry) {
            throw new Error("必须提供 identifier、category、icon、texture 和 geometry。");
        }

        const {
            boneName = "rightitem",
            material = "entity",
            holdFirstPerson = {},
            holdThirdPerson = {},
        } = options;

        // 贴图路径：完整路径直接用，短名补 textures/items/ 前缀
        const attachableTexture = texture.includes("/") ? texture : `textures/items/${texture}`;

        const item = new Item(identifier, category, icon, { ...options, icon });

        const animationId = `animation.${identifier.replace(":", ".")}`;
        const attachable = new Attachable(identifier, "1.10.0")
            .addMaterial("default", material)
            .addMaterial("enchanted", "entity_alphatest_glint")
            .addTexture("default", attachableTexture)
            .addTexture("enchanted", "textures/misc/enchanted_item_glint")
            .addGeometry("default", geometry)
            .addAnimation("hold_first_person", `${animationId}.hold_first_person`)
            .addAnimation("hold_third_person", `${animationId}.hold_third_person`)
            .setScript("animate", [
                { hold_first_person: "context.is_first_person == 1.0" },
                { hold_third_person: "context.is_first_person == 0.0" },
            ])
            .addRenderController("controller.render.item_default");
        item.attachable = attachable;

        registerItem(item, attachable);

        // 注册内置默认握持动画（首/第三人称，固定值，参照官方 Attachables 示例）
        const firstPersonBones = {
            position: holdFirstPerson.position ?? [0, 14.5, 2.4],
            rotation: holdFirstPerson.rotation ?? [27, -39, -159],
            ...(holdFirstPerson.scale !== undefined ? { scale: holdFirstPerson.scale } : {}),
        };
        const thirdPersonBones = {
            position: holdThirdPerson.position ?? [0, 19, -4],
            rotation: holdThirdPerson.rotation ?? [-20, -32.5, 0],
            scale: holdThirdPerson.scale ?? 0.65,
        };

        GRegistry.register(
            `${identifier.replace(":", "_")}_anim`,
            "resource",
            "animations/",
            {
                format_version: "1.10.0",
                animations: {
                    [`${animationId}.hold_first_person`]: {
                        loop: true,
                        bones: {
                            [boneName]: firstPersonBones,
                        },
                    },
                    [`${animationId}.hold_third_person`]: {
                        loop: true,
                        bones: {
                            [boneName]: thirdPersonBones,
                        },
                    },
                },
            }
        );

        return item;
    },

    /**
     * 创建一个食物物品。
     * @param identifier 食物的唯一标识符。
     * @param category 食物在创造菜单中的分类，见 {@link ItemCategory}。
     * @param texture 食物的纹理。
     * @param options 额外选项。
     * @returns 创建的食物物品。
     */
    createFood(identifier: string, category: ItemCategory, texture: string, options: FoodOptions = {}): Food {
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
     * @param identifier 可附着物品的唯一标识符。
     * @param texture 可附着物品的纹理。
     * @param material 可附着物品的材质。
     * @param options 额外选项。
     * @returns 创建的可附着物品。
     */
    createAttachable(identifier: string, texture: string, material: string, options: ItemOptions = {}): Attachable {
        if (!identifier || !texture || !material) {
            throw new Error("必须提供 identifier、texture 和 material。");
        }

        const attachable = new Attachable(identifier);
        attachable.addTexture("default", texture);
        attachable.addMaterial("default", material);
        registerItem({}, attachable);
        return attachable;
    },

    /**
     * 创建一个胸甲（Item + Attachable）。
     * @param identifier 物品的唯一标识符。
     * @param item_texture 物品图标纹理名称。
     * @param texture_path 盔甲模型纹理路径。
     * @param options 额外选项。
     * @returns 创建的盔甲实例。
     */
    createChestplateArmor(identifier: string, item_texture: string, texture_path: string, options: ItemOptions = {}): Armor {
        const armor = new Armor(identifier, item_texture, texture_path, ArmorType.Chestplate, options);
        registerItem(armor.item, armor.attachable);
        return armor;
    },

    /**
     * 创建一个头盔（Item + Attachable）。
     */
    createHelmetArmor(identifier: string, item_texture: string, texture_path: string, options: ItemOptions = {}): Armor {
        const armor = new Armor(identifier, item_texture, texture_path, ArmorType.Helmet, options);
        registerItem(armor.item, armor.attachable);
        return armor;
    },

    /**
     * 创建一个靴子（Item + Attachable）。
     */
    createBootArmor(identifier: string, item_texture: string, texture_path: string, options: ItemOptions = {}): Armor {
        const armor = new Armor(identifier, item_texture, texture_path, ArmorType.Boots, options);
        registerItem(armor.item, armor.attachable);
        return armor;
    },

    /**
     * 创建一个护腿（Item + Attachable）。
     */
    createLeggingsArmor(identifier: string, item_texture: string, texture_path: string, options: ItemOptions = {}): Armor {
        const armor = new Armor(identifier, item_texture, texture_path, ArmorType.Leggings, options);
        registerItem(armor.item, armor.attachable);
        return armor;
    },

    /**
     * 创建并注册翻书物品。
     * @param identifier 物品的唯一标识符（如："my_mod:flipbook_item"）。
     * @param category 物品所属的分类，见 {@link ItemCategory}。
     * @param texture 纹理名称（不包含路径和后缀，如："my_flipbook_texture"）。
     * @param options 可选的配置参数对象。
     * @returns 创建的翻书物品。
     */
    createFlipbookItem(identifier: string, category: ItemCategory, texture: string, options: FlipbookItemOptions = {}): FlipbookItem {
        if (!identifier || !category || !texture) {
            throw new Error("必须提供 identifier、category 和 texture。");
        }
        const flipbookItem = new FlipbookItem(identifier, category, texture, options);
        registerItem(flipbookItem, {});
        registerBlock(flipbookItem.block as any);
        return flipbookItem;
    },

    /**
     * 创建物品目录（生成 BP/item_catalog/crafting_item_catalog.json）。
     * 用于指定物品在创造菜单与配方手册中的分组位置。
     * @param formatVersion 格式版本，默认 "1.26.30"
     * @returns 物品目录实例
     */
    createItemCatalog(formatVersion?: string): ItemCatalog {
        const catalog = new ItemCatalog(formatVersion);
        GRegistry.register('crafting_item_catalog', 'behavior', 'item_catalog/', catalog);
        return catalog;
    },
};
