import { Attachable } from "./Attachable.js";
import { Item } from "./Item.js";
import { ItemComponent } from "./ItemComponents.js";


// 定义 Armor 基类
export class Armor {
    constructor(identifier, category, item_texture, texture_path, options = {}) {
        this.identifier = identifier;
        // 创建物品
        this.item = new Item(identifier, category, item_texture, options);
        // 创建附加物
        this.attachable = new Attachable(identifier, texture_path, "armor");

        // 配置附加物
        this.attachable
            .addTexture("default", texture_path) // 添加默认纹理
            .addMaterial("default", "armor") // 添加默认材质
            .addMaterial("enchanted", "armor_enchanted") // 添加附魔材质
            .addTexture("enchanted", "textures/misc/enchanted_actor_glint") // 添加附魔纹理
            .addGeometry("default", "geometry.player.armor.chestplate") // 添加几何模型
            .addRenderController("controller.render.armor") // 添加渲染控制器
            .setScript("parent_setup", "v.chest_layer_visible = 0.0;"); // 设置脚本
    }
}

// 扩展 Armor 类，实现胸甲
export class Chestplate extends Armor {
    constructor(identifier, item_texture, texture_path, options = {}) {
        super(identifier, "equipment", item_texture, texture_path, options);

        // 自定义胸甲物品
        this.item.addComponent(
            ItemComponent.combineComponents(
                ItemComponent.setDisplayName("我的自定义胸甲"), // 设置显示名称
                ItemComponent.setMaxStackSize(1), // 设置最大堆叠数量
                ItemComponent.setWearable(5, "slot.armor.chest") // 设置为可穿戴，并指定装备槽
            )
        );
    }
}

// 扩展 Armor 类，实现靴子
export class Boot extends Armor {
    constructor(identifier, item_texture, texture_path, options = {}) {
        super(identifier, "equipment", item_texture, texture_path, options);

        // 自定义靴子物品
        this.item.addComponent(
            ItemComponent.combineComponents(
                ItemComponent.setDisplayName("我的自定义靴子"), // 设置显示名称
                ItemComponent.setMaxStackSize(1), // 设置最大堆叠数量
                ItemComponent.setWearable(4, "slot.armor.feet") // 设置为可穿戴，并指定装备槽
            )
        );
    }
}

// 扩展 Armor 类，实现裤子
export class Leggings extends Armor {
    constructor(identifier, item_texture, texture_path, options = {}) {
        super(identifier, "equipment", item_texture, texture_path, options);

        // 自定义裤子物品
        this.item.addComponent(
            ItemComponent.combineComponents(
                ItemComponent.setDisplayName("我的自定义裤子"), // 设置显示名称
                ItemComponent.setMaxStackSize(1), // 设置最大堆叠数量
                ItemComponent.setWearable(6, "slot.armor.legs") // 设置为可穿戴，并指定装备槽
            )
        );
    }
}

// 扩展 Armor 类，实现头盔
export class Helmet extends Armor {
    constructor(identifier, item_texture, texture_path, options = {}) {
        super(identifier, "equipment", item_texture, texture_path, options);

        // 自定义头盔物品
        this.item.addComponent(
            ItemComponent.combineComponents(
                ItemComponent.setDisplayName("我的自定义头盔"), // 设置显示名称
                ItemComponent.setMaxStackSize(1), // 设置最大堆叠数量
                ItemComponent.setWearable(3, "slot.armor.head") // 设置为可穿戴，并指定装备槽
            )
        );
    }
}
