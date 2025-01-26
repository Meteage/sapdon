import { BasicBlock } from "../block/BasicBlock.js";
import { Block } from "../block/block.js";
import { RotatableBlock } from "../block/RotatableBlock.js";
import { GRegistry } from "../registry.js";


export const BlockAPI = {
    /**
     * 
     * @param {Block} block 
     */
    registerBlock: function(block) {
        const block_name = block.identifier.replace(":", "_");
        GRegistry.register(block_name, "behavior", "blocks/", block);
    },
  
    /**
     * 基础方块类
     * @param {string} identifier 方块唯一标识符
     * @param {string} category 菜单栏分类 可选："construction", "nature", "equipment", "items", and "none"
     * @param {Array} textures_arr 纹理数组 [上,下,东,西,南,北]
     * @param {Object} options 可选参数
     * @param {string} options.group 分组，默认为 "construction"
     * @param {boolean} options.hide_in_command 是否在命令中隐藏，默认为 false
     */
    createBasicBlock: function(identifier, category, textures_arr, options = {}){
        const block = new BasicBlock(identifier, category, textures_arr, options);
        this.registerBlock(block);
        return block;
    },
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
    createBlock: function(identifier, category, variantDatas, options = {}){
        const block = new Block(identifier, category, variantDatas, options);
        this.registerBlock(block);
        return block;
    },
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

    createRotatableBlock(identifier, category, textures_arr, options = {}){
        const block = new RotatableBlock(identifier, category, textures_arr, options = {});
        this.registerBlock(block);
        return block;
    }
}

