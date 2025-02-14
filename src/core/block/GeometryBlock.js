import { BasicBlock } from "./BasicBlock.js";
import { BlockComponent } from "./blockComponent.js";

export class GeometryBlock extends BasicBlock{
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