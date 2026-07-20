import { system } from "@minecraft/server"
import { CustomCropGrowthBlockComponent } from "./blocks/crop.js"
import { FallingBlockComponet } from "./blocks/fallingBlock.js"
import { HeadRotationBlockComponent } from "./blocks/headRotation.js"
import { IntercardinalOrientationComponent } from "./blocks/intercardinalOrientation.js"
import { GuiBookItemComponent } from "./items/guiBook.js"

export function registerBuiltinComponents() {
    system.beforeEvents.startup.subscribe((init) => {
        init.blockComponentRegistry.registerCustomComponent(
            "sapdon:crop_growth", CustomCropGrowthBlockComponent
        )
        init.blockComponentRegistry.registerCustomComponent(
            "sapdon:fallingblock", FallingBlockComponet
        )
        init.blockComponentRegistry.registerCustomComponent(
            "sapdon:head_rotation", HeadRotationBlockComponent
        )
        init.blockComponentRegistry.registerCustomComponent(
            "sapdon:intercardinal_orientation", IntercardinalOrientationComponent
        )
        init.itemComponentRegistry.registerCustomComponent(
            "sapdon:guibook", GuiBookItemComponent
        )
    })
}
