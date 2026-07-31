import { ItemComponent } from "./itemComponents.js";
import { Item } from "./item.js";
import type { FoodOptions, ItemCategory } from "./types.js";

export class Food extends Item {
    /**
     * 食物类
     * @param identifier 物品唯一标识符
     * @param category 菜单栏分类，见 {@link ItemCategory}
     * @param texture 物品纹理
     * @param options 可选参数
     */
    constructor(identifier: string, category: ItemCategory, texture: string, options: FoodOptions = {}) {
        // 继承父类
        super(identifier, category, texture, options);

        // 解构 options 并设置默认值
        const {
            animation = "eat",
            movement = 1,
            useDuration = 1,
            canAlwaysEat = false,
            nutrition = 0,
            saturationModifier = 1,
        } = options;

        // 参数验证
        if (typeof nutrition !== "number" || nutrition < 0) {
            throw new Error('nutrition 必须是一个非负数');
        }
        if (typeof saturationModifier !== "number" || saturationModifier <= 0) {
            throw new Error('saturationModifier 必须是一个正数');
        }
        if (typeof animation !== "string") {
            throw new Error('animation 必须是字符串类型');
        }
        if (typeof canAlwaysEat !== "boolean") {
            throw new Error('canAlwaysEat 必须是布尔类型');
        }

        // 添加组件
        this.addComponent(
            ItemComponent.combineComponents(
                ItemComponent.setUseModifiers(
                    movement,
                    useDuration
                ),
                ItemComponent.setFoodComponent({
                    canAlwaysEat,
                    nutrition,
                    saturationModifier,
                }),
                ItemComponent.setUseAnimation(animation)
            )
        );
    }
}
