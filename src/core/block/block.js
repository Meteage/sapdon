
import { BasicBlock } from "./BasicBlock.js";
import { BlockComponent } from "./blockComponent.js";

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
    constructor(identifier, category, variantDatas, options = {}) {
        console.log("options:",options);
        // 检查 variantDatas 是否有效
        if (!Array.isArray(variantDatas) || variantDatas.length === 0) {
            throw new Error('variantDatas 必须是一个非空数组');
        }


        // 调用父类构造函数
        super(identifier, category, variantDatas[0]["textures"], options);

        this.options = options;
        this.variantDatas = variantDatas;

        // 初始化方块
        this.#init();
    }

    /**
     * 初始化方块（私有方法）
     * @param {Array} variantDatas 方块的变体数据
     * @param {Object} options 材质属性
     */
    #init() {
        // 注册方块状态
        this.registerState("sapdon:block_variant_tag", {
            values: {
                min: 0,
                max: this.variantDatas.length > 1 ? this.variantDatas.length - 1 : 1
            }
        });

        // 为每个变体创建材质实例
        this.variantDatas.forEach((variant, index) => {
            const material_instances = this.#createMaterialInstances(variant.textures, this.options);
            const condition = `q.block_state('sapdon:block_variant_tag') == ${index}`;

            // 添加材质实例组件
            this.addPermutation(condition, BlockComponent.setMaterialInstances(material_instances));
        });
    }

    /**
     * 创建材质实例（私有方法）
     * @param {Array} textures 纹理数组
     * @param {Object} options 材质属性
     * @returns {Object} 材质实例对象
     */
    #createMaterialInstances(textures) {
        
        
        const material_instances = {};
        const sides = ["*", "up", "down", "north", "south", "east", "west"];
        
        textures.forEach((texture, index) => {
            material_instances[sides[index]] = {
                texture: texture,
                ambient_occlusion: this.options.ambient_occlusion || true,
                face_dimming: this.options.face_dimming || true,
                render_method: this.options.render_method || "alpha_test"
            }
        });

        return material_instances;
    }
}

/*
// 示例用法
const block = new Block("sapdon:block", "construction", [
    { stateTag: 1, textures: ["garlic_stage_0"] },
    { stateTag: 2, textures: ["garlic_stage_1"] },
    { stateTag: 3, textures: ["garlic_stage_2"] },
    { stateTag: 4, textures: ["garlic_stage_3"] },
], {
    ambient_occlusion: false,
    face_dimming: false,
    render_method: "blend"
});
console.log(block);
debugger
*/