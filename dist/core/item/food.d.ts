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
    constructor(identifier: string, category: string, texture: string, options?: {
        group: string;
        hide_in_command: boolean;
        animation: string;
        canAlwaysEat: boolean;
        nutrition: number;
        saturationModifier: number;
    });
}
import { Item } from "./item.js";
