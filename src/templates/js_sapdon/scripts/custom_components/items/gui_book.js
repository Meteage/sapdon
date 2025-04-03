import { world } from "@minecraft/server";
import { ActionFormData} from "@minecraft/server-ui";

const item_ui_list ={
    "thaumcraft:thaumonomicon":"guidebook"
};

var page_index = 0;
/** @type {import("@minecraft/server").ItemCustomComponent} */
export const GuiBookItemComponent = {
    onUse({itemStack,source}){
        if(source.typeId != "minecraft:player") return
        showGuidebook(source,item_ui_list[itemStack.typeId])
    }
}

function showGuidebook(target,ui){
    const form = new ActionFormData()
    .title(ui)
    .body("page_index"+ page_index)
    .button("test1")
    .button("test2")
    
    form.show(target).then((response) => {
        if (response.selection === 0) {
            page_index--;
            world.sendMessage("上一页")
            showGuidebook(target,ui)

        }
        else if (response.selection === 1) {
            page_index++;
            world.sendMessage("下一页")
            showGuidebook(target,ui)
        }
    });
}