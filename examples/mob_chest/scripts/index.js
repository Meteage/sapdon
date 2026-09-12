import {world} from "@minecraft/server";
import { registerCustomBlockComponent } from "./custom_components/registry.js";
import { startProgressBar } from "./progress_bar.js";

registerCustomBlockComponent();
startProgressBar();


world.afterEvents.projectileHitBlock.subscribe((event)=>{
    if(!event.projectile.typeId === "sapdon:falling_block_entity") return
    const targetblock = event.getBlockHit().block.above();
    targetblock.setType("sapdon:falling_block");
})

