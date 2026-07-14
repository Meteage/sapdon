import { system } from "@minecraft/server"
import { CustomCropGrowthBlockComponent } from "./blocks/crop.js"
import { FallingBlockComponet } from "./blocks/fallingBlock.js"
import { GuiBookItemComponent } from "./items/guiBook.js"

export function registerBuiltinComponents() {
    system.beforeEvents.startup.subscribe((init) => {
        init.blockComponentRegistry.registerCustomComponent(
            "sapdon:sapdon:crop_growth", CustomCropGrowthBlockComponent
        )
        init.blockComponentRegistry.registerCustomComponent(
            "sapdon:fallingblock", FallingBlockComponet
        )
        init.itemComponentRegistry.registerCustomComponent(
            "sapdon:guibook", GuiBookItemComponent
        )
    })
}
