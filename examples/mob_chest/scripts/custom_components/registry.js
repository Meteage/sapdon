
import { BlockWithEntityComponent } from "./block/block_with_entity.js";
import { CustomCropGrowthBlockComponent } from "./block/cropComponent.js";
import { HeavyBlockComponent } from "./block/heavy_block.js";
import { GuiBookItemComponent } from "./items/gui_book.js";
import { world } from "@minecraft/server";

export const registerCustomItemComponent = ()=>{
    world.beforeEvents.worldInitialize.subscribe(({ itemComponentRegistry }) => {
        itemComponentRegistry.registerCustomComponent("sapdon:guibook",GuiBookItemComponent);
    });
}

export const registerCustomBlockComponent = ()=>{
    world.beforeEvents.worldInitialize.subscribe(({ blockComponentRegistry }) => {
        blockComponentRegistry.registerCustomComponent(
            "sapdon:heavy_block",
            HeavyBlockComponent
        );
        blockComponentRegistry.registerCustomComponent(
            "sapdon:block_with_entity",
            BlockWithEntityComponent
        );
        blockComponentRegistry.registerCustomComponent(
            "sapdon:crop_growth",
            CustomCropGrowthBlockComponent
        );
    });
}

