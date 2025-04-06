import { world } from "@minecraft/server";
import { ActionFormData} from "@minecraft/server-ui";

const item_ui_list ={
    "sapdon:neo_guidebook":"neo_guidebook",
    "minecraft:stick":"test_book"
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
    .button("prev_button")
    .button("next_button")
    .button("test3")
    .button("test4")

    if(page_index != 0) form.button("home_button");

    
    form.show(target).then((response) => {
        if (response.selection === 0) {
            page_index--;
            world.sendMessage("上一页")
            showGuidebook(target, ui)
        }
        else if (response.selection === 1) {
            page_index++;
            world.sendMessage("下一页")
            showGuidebook(target, ui)
        }
        else if (response.selection === 2) {
            page_index = 1;
            world.sendMessage("章节跳转至 章节1")
            showGuidebook(target, ui)
        }
        else if (response.selection === 3) {
            page_index = 2;
            world.sendMessage("章节跳转至 章节2")
            showGuidebook(target, ui)
        }
        else if (response.selection === 4) {
            page_index = 0;
            world.sendMessage("返回目录")
            showGuidebook(target, ui)
        }
    });
}