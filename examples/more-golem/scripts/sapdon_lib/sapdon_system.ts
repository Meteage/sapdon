import { system, world } from "@minecraft/server";
import { FallingBlockComponet } from "./custom_components/blocks/fallingblockCompont.js";
import { CustomCropGrowthBlockComponent } from "./custom_components/blocks/cropComponent.js";
import { GuiBookItemComponent } from "./custom_components/items/gui_book.js";

export namespace sapdon_system {
    //register
    system.beforeEvents.startup.subscribe((init)=>{
        init.blockComponentRegistry.registerCustomComponent(
            "sapdon:fallingblock",FallingBlockComponet
        )
        init.blockComponentRegistry.registerCustomComponent(
            "sapdon:sapdon:crop_growth",CustomCropGrowthBlockComponent
        )
    })

    system.beforeEvents.startup.subscribe((init)=>{
        init.itemComponentRegistry.registerCustomComponent(
            "sapdon:guibook",GuiBookItemComponent
        )
    })
}
