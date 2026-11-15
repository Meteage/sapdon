import { registerFallbackBlockComponent, registerFallbackItemComponent } from "../components/registry.js"
import { BLOCK_WITH_ENTITY_ID, BlockWithEntityComponent } from "./blocks/blockWithEntity.js"
import { CustomCropGrowthBlockComponent } from "./blocks/crop.js"
import { FallingBlockComponet } from "./blocks/fallingBlock.js"
import { HeadRotationBlockComponent } from "./blocks/headRotation.js"
import { IntercardinalOrientationComponent } from "./blocks/intercardinalOrientation.js"
import { GuiBookItemComponent } from "./items/guiBook.js"

/**
 * 注册框架内置的自定义组件（`sapdon:*`）。在运行期脚本顶层调用一次；重复调用幂等。
 *
 * 全部走**兜底**通道（`registerFallbackBlockComponent` / `registerFallbackItemComponent`）：
 * - 项目自己注册了同一 id → 项目实现生效，内置实现跳过（一条 warn）；
 * - 同一世界里另一个 sapdon 包已注册同一 id → 沿用那一份实现（一条 warn，见 `sharedFallbackComponents()`）。
 */
export function registerBuiltinComponents() {
    registerFallbackBlockComponent(BLOCK_WITH_ENTITY_ID, BlockWithEntityComponent)
    registerFallbackBlockComponent("sapdon:crop_growth", CustomCropGrowthBlockComponent)
    registerFallbackBlockComponent("sapdon:fallingblock", FallingBlockComponet)
    registerFallbackBlockComponent("sapdon:head_rotation", HeadRotationBlockComponent)
    registerFallbackBlockComponent("sapdon:intercardinal_orientation", IntercardinalOrientationComponent)
    registerFallbackItemComponent("sapdon:guibook", GuiBookItemComponent)
}
