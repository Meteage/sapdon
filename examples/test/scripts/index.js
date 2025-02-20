import {Direction, world } from "@minecraft/server"
import { registerCustomBlockComponent, registerCustomItemComponent } from "./custom_components/registry.js";

//自定义组件的注册
registerCustomBlockComponent();
registerCustomItemComponent();

const wireBlock = [];


world.afterEvents.itemUseOn.subscribe((event) => {
    const block = event.block;
    const blockId = event.block.typeId;
    const blockFace = event.blockFace;
    if(blockId == "sapdon:wire"){
        world.sendMessage("if wire");
        switch(blockFace){
            case Direction.North:
                world.sendMessage("north");
                //设置方块状态
                block.setPermutation(
                    block.permutation.withState("wire:north",1)
                )
                const north_block = block.north();
                if(north_block.typeId == "sapdon:wire"){
                    world.sendMessage("north is wire");
                    north_block.setPermutation(
                        north_block.permutation.withState("wire:south",1)
                    )
                }
                break;
            case Direction.South:
                world.sendMessage("south");
                block.setPermutation(
                    block.permutation.withState("wire:south",1)
                )
                const south_block = block.south();
                if(south_block.typeId == "sapdon:wire"){
                    world.sendMessage("south is wire");
                    south_block.setPermutation(
                        south_block.permutation.withState("wire:north",1)
                    )
                }
                break;
            case Direction.East:
                world.sendMessage("east");
                block.setPermutation(
                    block.permutation.withState("wire:east",1)
                )
                const east_block = block.east();
                if(east_block.typeId == "sapdon:wire"){
                    world.sendMessage("east is wire");
                    east_block.setPermutation(
                        east_block.permutation.withState("wire:west",1)
                    )
                }
                break;
            case Direction.West:    
                world.sendMessage("west");
                block.setPermutation(
                    block.permutation.withState("wire:west",1)
                )
                const west_block = block.west();
                if(west_block.typeId == "sapdon:wire"){
                    world.sendMessage("west is wire");
                    west_block.setPermutation(
                        west_block.permutation.withState("wire:east",1)
                    )
                }
                break;
            case Direction.Up:
                world.sendMessage("up");
                block.setPermutation(
                    block.permutation.withState("wire:top",1)
                )
                const up_block = block.above();
                if(up_block.typeId == "sapdon:wire"){
                    world.sendMessage("up is wire");
                    up_block.setPermutation(
                        up_block.permutation.withState("wire:bottom",1)
                    )
                }
                break;
            case Direction.Down:    
                world.sendMessage("down");
                block.setPermutation(
                    block.permutation.withState("wire:bottom",1)
                )
                const down_block = block.below();
                if(down_block.typeId == "sapdon:wire"){
                    world.sendMessage("down is wire");
                    down_block.setPermutation(
                        down_block.permutation.withState("wire:top",1)
                    )
                }
                break;
        }
    }
    world.sendMessage("blockId:"+event.block.typeId);
})


