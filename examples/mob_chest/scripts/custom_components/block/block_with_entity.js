import {EquipmentSlot, ItemStack, world } from "@minecraft/server";

const BlockEntities = {
    "mob_chest:chest":"mob_chest:chest_entity",
};

// 门控键 = 容器标题 = 实体 nametag；切这一行换面板：
//   "calib_test"     → 框架生成的坐标校准面板（3 行等距梯，20px 格位）
//   "slot_test"      → 手写对照件（enabled:true vs enabled:false 的机制 A/B）
//   "sapdon_furnace" → 框架生成的自定义熔炉面板（原版熔炉排布：2 输入叠放 + 1 产物 + 进度条）
const CONTAINER_UI_GATE = "sapdon_furnace"

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
                block.setPermutation(block.permutation.withState("sapdon:block_or_entity",1));
                break;
        }
    },
    onPlayerInteract({block,dimension,player,face,faceLocation}) {
        world.sendMessage("interact");
       const block_typeId = block.typeId;
       const block_entity_typeId = BlockEntities[block_typeId];
       switch(block_typeId){
           case "mob_chest:chest":
               const block_entity = dimension.getEntitiesAtBlockLocation(block.center())[0];

               //设置名字（= 容器门控键 $new_container_title：实体容器取 nametag）
               //   候选键见文件顶部的 CONTAINER_UI_GATE
               block_entity.nameTag = CONTAINER_UI_GATE
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
       }
    }
};