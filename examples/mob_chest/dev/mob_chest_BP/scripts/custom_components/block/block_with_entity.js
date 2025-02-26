import {EquipmentSlot, ItemStack, world } from "@minecraft/server";

const BlockEntities = {
    "mob_chest:chest":"mob_chest:chest_entity",
};

/** @type {import("@minecraft/server").BlockCustomComponent} */
export const BlockWithEntityComponent = {
    onPlace({block,dimension,previousBlock}) {
        const place_position = {
            x:block.center().x,
            y:block.center().y -0.5,
            z:block.center().z
        };
        const block_entity_typeId = BlockEntities[block.typeId];
        world.sendMessage("block_entity:"+block_entity_typeId);
        dimension.spawnEntity(block_entity_typeId,place_position);

        const block_typeId = block.typeId;
        switch(block_typeId){
            case "mob_chest:chest":
                block.setPermutation(block.permutation.withState("sapdon:block_variant_tag",1));
                break;
        }
    },
    onPlayerInteract({block,dimension,player,face,faceLocation}) {
        /*world.sendMessage("interact");
       const block_typeId = block.typeId;
       const block_entity_typeId = BlockEntities[block_typeId];
       switch(block_typeId){
           case "mob_chest:chest":
               const block_entity = dimension.getEntitiesAtBlockLocation(block.center())[0];
               //获取属性
               const chest_state = block_entity.getProperty("mob_chest:chest_state");
               world.sendMessage("chest_state:"+chest_state);
               if(chest_state === "open"){
                   //设置属性
                   block_entity.setProperty("mob_chest:chest_state","close");
                }else{
                    //设置属性
                    block_entity.setProperty("mob_chest:chest_state","open");
                }
               break;
       }*/
    }
};