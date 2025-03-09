import { BlockTypes, world } from "@minecraft/server";

const HeavyBlockList = ["sapdon:falling_block"];
/** @type {import("@minecraft/server").BlockCustomComponent} */
export const HeavyBlockComponent = {
    onTick({block,dimension}){
        if( ! block.below().isAir) return
        block.setType("minecraft:air")
        const location = block.center();
        location.y -= 0.5;
        dimension.spawnEntity("sapdon:falling_block_entity",location)
    }
}
