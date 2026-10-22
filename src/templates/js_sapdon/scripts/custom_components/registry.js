import { system } from "@minecraft/server";
import { CustomCropGrowthBlockComponent } from "./cropComponent.js";
import { GuiBookItemComponent } from "./items/gui_book.js";

// ⚠️ 自定义组件必须在 system.beforeEvents.startup 里注册。
// 用 world.beforeEvents.worldInitialize 会太晚，引擎启动时报
// "this component was found in the input, but is not present in the Schema"。
// 详见 doc/dev/known-pitfalls.md。

export const registerCustomItemComponent = () => {
    system.beforeEvents.startup.subscribe((init) => {
        init.itemComponentRegistry.registerCustomComponent(
            "sapdon:guibook",
            GuiBookItemComponent
        );
    });
}

export const registerCustomBlockComponent = () => {
    system.beforeEvents.startup.subscribe((init) => {
        init.blockComponentRegistry.registerCustomComponent(
            "sapdon:crop_growth",
            CustomCropGrowthBlockComponent
        );
    });
}
