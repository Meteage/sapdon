export namespace RotationTypes {
    let CARDINAL: string;
    let FACING: string;
    let BLOCK_FACE: string;
    let LOG: string;
}
export class RotatableBlock extends BasicBlock {
    /**
     * 可旋转方块类
     * @param {string} identifier 方块唯一标识符
     * @param {string} category 菜单栏分类
     * @param {Array} textures_arr 纹理数组 [上,下,东,西,南,北]
     * @param {Object} options 可选参数
     * @param {string} options.group 分组，默认为 "construction"
     * @param {boolean} options.hide_in_command 是否在命令中隐藏，默认为 false
     * @param {string} options.rotationType 旋转类型，默认为 "cardinal"
     * @param {number} options.yRotationOffset 初始旋转偏移量，默认为 180
     */
    constructor(identifier: string, category: string, textures_arr: any[], options?: {
        group: string;
        hide_in_command: boolean;
        rotationType: string;
        yRotationOffset: number;
    });
    #private;
}
import { BasicBlock } from "./basicBlock.js";
