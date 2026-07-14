import { CustomCropGrowthBlockComponent } from "./cropComponent"
import { GuiBookItemComponent } from "./items/gui_book"
import { system, world, StartupEvent } from "@minecraft/server"

const DEBUG: boolean = false
let registered: boolean = false

export const registerCustomItemComponent = (): void => {
    system.beforeEvents.startup.subscribe((initEvent: StartupEvent) => {
        if (registered) return
        registered = true
        if (DEBUG) world.sendMessage("[Registry] registering sapdon:neo_guibook")
        initEvent.itemComponentRegistry.registerCustomComponent("sapdon:neo_guibook", GuiBookItemComponent)
    })
}

export const registerCustomBlockComponent = (): void => {
    system.beforeEvents.startup.subscribe((initEvent: StartupEvent) => {
        if (DEBUG) world.sendMessage("[Registry] registering sapdon:crop_growth")
        initEvent.blockComponentRegistry.registerCustomComponent(
            "sapdon:crop_growth",
            CustomCropGrowthBlockComponent
        )
    })
}
