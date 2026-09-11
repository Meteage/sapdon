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
        // ── 物品 format_version 默认值：1.21.90（原为 1.21.40，见 doc/dev/known-pitfalls.md §1.7）──
        // 为什么提到 1.21.90：
        //   1.21.40 下，若物品用**自定义 item catalog** 分组（`ItemAPI.createItemCatalog().addGroup(...)`
        //   → `menu_category.group = "ns:itemGroup.name.x"`），引擎会把该 group 当「隐含 `minecraft:` 前缀」
        //   解析，于是每次世界加载为**每一个**这样的物品报一条 warning：
        //     The item <X> was created with the group set to 'minecraft:ns:itemGroup.name.x',
        //     but is now being set to 'ns:itemGroup.name.x'
        //   产物里并不存在 `minecraft:ns:`（两侧都是裸 `ns:itemGroup.name.x`，与
        //   https://wiki.bedrock.dev/items/item-catalog 的 `wiki:itemGroup.name.ore` 同形）——
        //   这是**引擎行为**（对应 Mojira MCPE-224150），不是框架把 JSON 写错了。
        //   1.21.90 下引擎按显式字符串比较，告警消失。
        // 实测（2026-09，FZ 项目 157 件物品走默认值）：每次加载 156 条；把**单件**物品改成 1.21.90
        //   （只改已部署副本、不动源码）→ 同一次加载降到 155 条且该物品不再出现。
        //   `examples/digitCircuit/main.mjs` 一直显式传 `formatVersion: "1.21.90"`，日志里该告警 0 条。
        // 仍可按物品覆盖 `format_version`：上面同时解构了 `format_version` 与 `formatVersion` 两个键名
        //   （`formatVersion = format_version`，故二者都认，后者优先）。
        // ⚠️ `ItemCatalog` 自己的 `format_version`（`itemCatalog.ts:40`，默认 "1.26.30"）是
        //   **catalog 文件**的格式版本，与物品的 format_version 无关，不要跟着改。
        this.format_version = formatVersion ?? "1.21.90";
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
