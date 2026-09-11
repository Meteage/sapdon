import { system } from "@minecraft/server"
import { registerFallbackBlockComponent } from "../components/registry.js"
import { BLOCK_WITH_ENTITY_ID, BlockWithEntityComponent } from "./blocks/blockWithEntity.js"
import { CustomCropGrowthBlockComponent } from "./blocks/crop.js"
import { FallingBlockComponet } from "./blocks/fallingBlock.js"
import { HeadRotationBlockComponent } from "./blocks/headRotation.js"
import { IntercardinalOrientationComponent } from "./blocks/intercardinalOrientation.js"
import { GuiBookItemComponent } from "./items/guiBook.js"

/**
 * 注册框架内置的自定义组件。
 *
 * ★ `sapdon:block_with_entity` 走的是**兜底**通道（`registerFallbackBlockComponent`）：
 *   `TileBlock` 会给**每个**带实体方块挂上这个组件（`src/core/block/tileBlock.js:184`），
 *   而历史上框架自己从不注册它 —— 忘了手工注册的项目会**整份方块被引擎丢掉**
 *   （`this component was found in the input, but is not present in the Schema`）。
 *   走兜底而不是直接注册，是为了**不打断既有项目**：项目自己注册了同一个 id 时，
 *   **项目实现生效**、内置实现被跳过（并打一条 warn）。
 *   完整理由与三种场景见 `src/oc/components/registry.ts` 的文件头注释。
 */
export function registerBuiltinComponents() {
    // ⚠️ 必须与 `system.beforeEvents.startup.subscribe(...)` 用**同一个**注册表入口，
    //    所以这里只是「登记」，真正的 registerCustomComponent 由 registry.ts 在 startup 里做。
    registerFallbackBlockComponent(BLOCK_WITH_ENTITY_ID, BlockWithEntityComponent)

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
