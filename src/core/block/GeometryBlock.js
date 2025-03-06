import { BasicBlock } from "./BasicBlock.js";
import { BlockComponent } from "./blockComponent.js";

export class GeometryBlock extends BasicBlock{
    /**
     * 带模型方块类
     * @param {string} identifier 方块标识符 由命名空间和方块名组成 例如 "my_mod:stone"
     * @param {string} category 方块的分类 "construction", "nature", "equipment", "items", and "none"
     * @param {string} geometry 模型标识符
     * @param {Object} material_instances 材质实例对象
     * @param {Object} options 可选参数
     */
    constructor(identifier, category, geometry, material_instances, options = {}) {
        super(identifier, category, [material_instances["*"]["texture"]], options);
        this.addComponent(
            BlockComponent.combineComponents(
                BlockComponent.setGeometry(geometry),
                BlockComponent.setMaterialInstances(material_instances)
            )
        )
    }
}