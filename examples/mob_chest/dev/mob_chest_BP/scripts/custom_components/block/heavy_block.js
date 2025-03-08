import { BlockTypes, world } from "@minecraft/server";

const HeavyBlockList = [];
/** @type {import("@minecraft/server").BlockCustomComponent} */
export const HeavyBlockComponent = {
    onPlace({block,dimension,previousBlock}){
        if(!HeavyBlockList.indexOf(block.typeId)) return
        if(block.below().isAir){
            const texture_index = (HeavyBlockList.indexOf(block.typeId) + 1 || 0);
            const block_typeId = block.typeId;
            
            const location = block.center();
            location.y -= 0.5;
            block.setType(BlockTypes.get("minecraft:air"));
            
            const entity = dimension.spawnEntity("ex_nihilo_origin:falling_block", location);
            entity.setProperty("ex_nihilo_origin:textureindex", texture_index);
            // entity.setProperty("ex_nihilo_origin:type", block.typeId);
            entity.setDynamicProperty("ex_nihilo_origin:type", block_typeId);
        }
        
    }
}
