import { ItemComponent } from "./ItemComponents.js";
import { Item } from "./item.js";

export class Food extends Item {
    /**
     * 物品类
     * @param {string} identifier 物品唯一标识符
     * @param {string} category 菜单栏分类 可选："construction", "nature", "equipment", "items", and "none"
     * @param {string} texture 物品纹理
     * @param {Object} options 可选参数
     * @param {string} options.group 分组 
     * @param {boolean} options.hide_in_command 是否在命令中隐藏，默认为 false
     * @param {string} options.animation 使用动画，默认为 "eat"
     * @param {boolean} options.canAlwaysEat 是否总是可以食用，默认为 false
     * @param {number} options.nutrition 营养价值，默认为 0
     * @param {number} options.saturationModifier 饱和度修正值，默认为 1
     */
    constructor(identifier, category, texture, options = {}) {
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
                ItemComponent.setFoodComponent(
                    canAlwaysEat,
                    nutrition,
                    saturationModifier
                ),
                ItemComponent.setUseAnimation(animation)
            )
        );
    }
}