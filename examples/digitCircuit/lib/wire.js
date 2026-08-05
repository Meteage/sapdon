import { BlockComponent, BlockAPI } from '@sapdon/core';

export class BlockWire {
    constructor(identifier, category, variantDatas, options = {}){
        const block = BlockAPI.createBlock(identifier, category, variantDatas, options);
        const sides = ["north", "south", "east", "west", "top", "bottom"];

        block.registerState("sapdon:signal_strength", { values: { min: 0, max: 15 } });

        const bone_visibility = {};
        for(let key in sides){
            block.registerState(`wire:${sides[key]}`,
                [0,1]
            );
            bone_visibility[sides[key]] = `q.block_state('wire:${sides[key]}') == 1`;
        }
        bone_visibility["core"] = `q.block_state('sapdon:signal_strength') > 0`;

        block.addComponent(
            BlockComponent.setGeometry('geometry.wire', { bone_visibility })
        )

        block.addComponent(
            BlockComponent.setRedstoneConductivity(true, true)
        )

        block.addComponent(
            BlockComponent.setRedstoneConsumer(0, true)
        )

        block.addComponent(
            BlockComponent.setTick([5, 10], true)
        )

        block.addComponent(
            BlockComponent.setCustomComponents(["sapdon:wire_tick"])
        )

        this.block = block;
    }
}
