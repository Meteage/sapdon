
import { BlockWithEntityComponent } from "./block/block_with_entity.js";
import { CustomCropGrowthBlockComponent } from "./block/cropComponent.js";
import { HeavyBlockComponent } from "./block/heavy_block.js";
import { GuiBookItemComponent } from "./items/gui_book.js";
import { system } from "@minecraft/server";

// ⚠️ 必须在 system.beforeEvents.startup 里注册。
// 用 world.beforeEvents.worldInitialize 会**太晚**：方块 JSON 里写了 "sapdon:xxx": {} 但注册
// 发生在引擎校验之后 ⇒ 启动日志报
//   -> components -> sapdon:xxx: this component was found in the input, but is not present in the Schema
// 且随后还报 "Block custom component 'sapdon:xxx' is not being used by a block" —— 方块上的组件等于没挂上。
// 依据：sapdon/doc/dev/known-pitfalls.md §2.1。
export const registerCustomItemComponent = ()=>{
    system.beforeEvents.startup.subscribe((init) => {
        init.itemComponentRegistry.registerCustomComponent("sapdon:guibook",GuiBookItemComponent);
    });
}

export const registerCustomBlockComponent = ()=>{
    system.beforeEvents.startup.subscribe((init) => {
        init.blockComponentRegistry.registerCustomComponent(
            "sapdon:heavy_block",
            HeavyBlockComponent
        );
        init.blockComponentRegistry.registerCustomComponent(
            "sapdon:block_with_entity",
            BlockWithEntityComponent
        );
        init.blockComponentRegistry.registerCustomComponent(
            "sapdon:crop_growth",
            CustomCropGrowthBlockComponent
        );
    });
}
