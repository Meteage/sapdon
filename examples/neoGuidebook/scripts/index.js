import { world } from "@minecraft/server";
import { registerCustomBlockComponent, registerCustomItemComponent } from "./custom_components/registry";

world.afterEvents.itemStartUse.subscribe((eventData) => {
   if(eventData.itemStack.typeId === "mincraft:stick"){
        
   }
});

registerCustomBlockComponent();
registerCustomItemComponent();