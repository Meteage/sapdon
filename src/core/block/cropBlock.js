import { Block } from "./block.js";
import { BlockComponent } from "./blockComponent.js";

export class CropBlock extends Block {
    /**
     * 作物方块类
     * @param {string} identifier 方块的唯一标识符
     * @param {string} category 方块的分类 "construction", "nature", "equipment", "items", and "none"
     * @param {Array} variantDatas 方块的变体数据，包含每个变体的状态标签和纹理
     * @param {Object} options 可选参数
     * @param {string} options.group 分组，默认为 "construction"
     * @param {boolean} options.hide_in_command 是否在命令中隐藏，默认为 false
     * @param {boolean} options.ambient_occlusion 是否应用环境光遮蔽，默认为 false
     * @param {boolean} options.face_dimming 是否根据面的方向进行亮度调整，默认为 false
     * @param {string} options.render_method 渲染方法，默认为 "alpha_test"
     */
    constructor(identifier, category, variantDatas, options = {}){
        super(identifier, category, variantDatas, options);
        this.stageNum = variantDatas.length;
        this.addComponent(
            BlockComponent.combineComponents(
                BlockComponent.setCollisionBoxEnabled(false),
                BlockComponent.setGeometry("geometry.crop"),
                BlockComponent.setLightEmission(0),
                BlockComponent.setPlacementFilter(
                    [{
                        "allowed_faces": ["up"],
                        "block_filter": ["minecraft:farmland"]
                    }]
                )
            )
        );
        for (let i = 0; i < this.stageNum; i++) {
            this.addVariantComponent(i,
                BlockComponent.setSelectionBoxCustom(
                    [-8, 0, -8],
                    [16,(i + 1)*this.stageNum/16,16]
                )
            )
        }
    }
}