import { world } from "@minecraft/server";
import { ActionFormData} from "@minecraft/server-ui";
world.afterEvents.itemUse.subscribe((event)=>{
    if(event.itemStack.typeId == "minecraft:apple"){
        const form = new ActionFormData()
        .title("我的自定义表单")
        .body("阿巴巴")
        .button("test1")
        .button("test2")
        form.show(event.source).then((response) => {
            if (response.selection === 0) {
                world.sendMessage("点击了是")
            }
            else if (response.selection === 1) {
                world.sendMessage("点击了否")
            }
        });
    }

})

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