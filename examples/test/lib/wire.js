import { BlockComponent } from "../../../src/core/block/blockComponent.js";
import { BlockAPI } from "../../../src/core/factory/BlockFactory.js";

export class  BlockWire {
    constructor(identifier, category, variantDatas, options = {}){
        const block = BlockAPI.createBlock(identifier, category, variantDatas, options);
        const sides = ["north", "south", "east", "west", "top", "bottom"];
        const bone_visibility = {};
        for(let key in sides){
            block.registerState(`wire:${sides[key]}`,
                [0,1]
            );
            bone_visibility[sides[key]] = `q.block_state('wire:${sides[key]}') == 1`;
        }
        block.addComponent(
            BlockComponent.setGeometry("geometry.wire",bone_visibility)
        );
        
    }
}