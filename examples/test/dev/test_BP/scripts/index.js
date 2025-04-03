import { EquipmentSlot, GameMode, world, Direction } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';

/**
 * @param {number} min The minimum integer
 * @param {number} max The maximum integer
 * @returns {number} A random integer between the `min` and `max` parameters (inclusive)
 */
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const maxGrowth = 3;

/** @type {import("@minecraft/server").BlockCustomComponent} */
const CustomCropGrowthBlockComponent = {
    onRandomTick({ block }) {
        const growthChance = 1 / 3;
        if (Math.random() > growthChance) return;

        const growth = block.permutation.getState("sapdon:block_variant_tag");
        block.setPermutation(block.permutation.withState("sapdon:block_variant_tag", growth + 1));
    },
    onPlayerInteract({ block, dimension, player }) {
        if (!player) return;

        const equippable = player.getComponent("minecraft:equippable");
        if (!equippable) return;

        const mainhand = equippable.getEquipmentSlot(EquipmentSlot.Mainhand);
        if (!mainhand.hasItem() || mainhand.typeId !== "minecraft:bone_meal") return;

        if (player.getGameMode() === GameMode.creative) {
            // Grow crop fully
            block.setPermutation(block.permutation.withState("sapdon:block_variant_tag", maxGrowth));
        } else {
            let growth = block.permutation.getState("sapdon:block_variant_tag");

            // Add random amount of growth
            growth += randomInt(1, maxGrowth - growth);
            block.setPermutation(block.permutation.withState("sapdon:block_variant_tag", growth));

            // Decrement stack
            if (mainhand.amount > 1) mainhand.amount--;
            else mainhand.setItem(undefined);
        }

        // Play effects
        const effectLocation = block.center();
        dimension.playSound("item.bone_meal.use", effectLocation);
        dimension.spawnParticle("minecraft:crop_growth_emitter", effectLocation);
    },
};

const item_ui_list ={
    "test:test_book:":"guidebook"
};

var page_index = 0;
/** @type {import("@minecraft/server").ItemCustomComponent} */
const GuiBookItemComponent = {
    onUse({itemStack,source}){
        if(source.typeId != "minecraft:player") return
        showGuidebook(source,item_ui_list[itemStack.typeId]);
    }
};

function showGuidebook(target,ui){
    const form = new ActionFormData()
    .title(ui)
    .body("page_index"+ page_index)
    .button("test1")
    .button("test2");
    
    form.show(target).then((response) => {
        if (response.selection === 0) {
            page_index--;
            world.sendMessage("上一页");
            showGuidebook(target,ui);

        }
        else if (response.selection === 1) {
            page_index++;
            world.sendMessage("下一页");
            showGuidebook(target,ui);
        }
    });
}

const registerCustomItemComponent = ()=>{
    world.beforeEvents.worldInitialize.subscribe(({ itemComponentRegistry }) => {
        itemComponentRegistry.registerCustomComponent("sapdon:guibook",GuiBookItemComponent);
    });
};

const registerCustomBlockComponent = ()=>{
    world.beforeEvents.worldInitialize.subscribe(({ blockComponentRegistry }) => {
        blockComponentRegistry.registerCustomComponent(
            "sapdon:crop_growth",
            CustomCropGrowthBlockComponent
        );
    });
};

//自定义组件的注册
registerCustomBlockComponent();
registerCustomItemComponent();


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
                );
                const north_block = block.north();
                if(north_block.typeId == "sapdon:wire"){
                    world.sendMessage("north is wire");
                    north_block.setPermutation(
                        north_block.permutation.withState("wire:south",1)
                    );
                }
                break;
            case Direction.South:
                world.sendMessage("south");
                block.setPermutation(
                    block.permutation.withState("wire:south",1)
                );
                const south_block = block.south();
                if(south_block.typeId == "sapdon:wire"){
                    world.sendMessage("south is wire");
                    south_block.setPermutation(
                        south_block.permutation.withState("wire:north",1)
                    );
                }
                break;
            case Direction.East:
                world.sendMessage("east");
                block.setPermutation(
                    block.permutation.withState("wire:east",1)
                );
                const east_block = block.east();
                if(east_block.typeId == "sapdon:wire"){
                    world.sendMessage("east is wire");
                    east_block.setPermutation(
                        east_block.permutation.withState("wire:west",1)
                    );
                }
                break;
            case Direction.West:    
                world.sendMessage("west");
                block.setPermutation(
                    block.permutation.withState("wire:west",1)
                );
                const west_block = block.west();
                if(west_block.typeId == "sapdon:wire"){
                    world.sendMessage("west is wire");
                    west_block.setPermutation(
                        west_block.permutation.withState("wire:east",1)
                    );
                }
                break;
            case Direction.Up:
                world.sendMessage("up");
                block.setPermutation(
                    block.permutation.withState("wire:top",1)
                );
                const up_block = block.above();
                if(up_block.typeId == "sapdon:wire"){
                    world.sendMessage("up is wire");
                    up_block.setPermutation(
                        up_block.permutation.withState("wire:bottom",1)
                    );
                }
                break;
            case Direction.Down:    
                world.sendMessage("down");
                block.setPermutation(
                    block.permutation.withState("wire:bottom",1)
                );
                const down_block = block.below();
                if(down_block.typeId == "sapdon:wire"){
                    world.sendMessage("down is wire");
                    down_block.setPermutation(
                        down_block.permutation.withState("wire:top",1)
                    );
                }
                break;
        }
    }
    world.sendMessage("blockId:"+event.block.typeId);
});
