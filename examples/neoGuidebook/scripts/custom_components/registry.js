
import { CustomCropGrowthBlockComponent } from "./cropComponent.js";
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
            "sapdon:crop_growth",
            CustomCropGrowthBlockComponent
        );
    });
}

