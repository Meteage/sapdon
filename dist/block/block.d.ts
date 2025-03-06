export class Block extends BasicBlock {
    /**
     * 方块类
     * @param {string} identifier 方块的唯一标识符
     * @param {string} category 方块的分类（如 "construction"）
     * @param {Array} variantDatas 方块的变体数据，包含每个变体的状态标签和纹理
     * @param {Object} options 可选参数
     * @param {string} options.group 分组，默认为 "construction"
     * @param {boolean} options.hide_in_command 是否在命令中隐藏，默认为 false
     * @param {boolean} options.ambient_occlusion 是否应用环境光遮蔽，默认为 false
     * @param {boolean} options.face_dimming 是否根据面的方向进行亮度调整，默认为 false
     * @param {string} options.render_method 渲染方法，默认为 "alpha_test"
     */
    constructor(identifier: string, category: string, variantDatas: any[], options?: {
        group: string;
        hide_in_command: boolean;
        ambient_occlusion: boolean;
        face_dimming: boolean;
        render_method: string;
    });
    options: {
        group: string;
        hide_in_command: boolean;
        ambient_occlusion: boolean;
        face_dimming: boolean;
        render_method: string;
    };
    variantDatas: any[];
    addVariantComponent(variantIndex: any, componentMap: any): this;
    #private;
}
import { BasicBlock } from "./BasicBlock.js";
