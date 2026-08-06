import { BlockComponent, BlockAPI } from '@sapdon/core';

export class BlockWire {
    constructor(identifier, category, variantDatas, options = {}){
        const block = BlockAPI.createBlock(identifier, category, variantDatas, options);
        const sides = ["north", "south", "east", "west", "up", "down"];
        const bone_visibility = {};
        for(let key in sides){
            block.registerState(`wire_connect:${sides[key]}`,
                [0,1]
            );
            bone_visibility[sides[key]] = `q.block_state('wire_connect:${sides[key]}') == 1`;
        }

        block.addComponent(
            BlockComponent.setGeometry('geometry.wire', { bone_visibility })
        )

        this.block = block;
    }
}
