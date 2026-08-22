import { world } from "@minecraft/server";
import { ActionFormData} from "@minecraft/server-ui";
world.afterEvents.itemUse.subscribe((event)=>{
    if(event.itemStack.typeId == "minecraft:apple"){
        const form = new ActionFormData()
        .title("sapdon_ui:test_ui")
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
    else if (event.itemStack.typeId == "minecraft:golden_apple"){
        const form = new ActionFormData()
        .title("test_native")
        .body("原生路径测试")
        .button("确定")
        form.show(event.source).then((response) => {
            world.sendMessage("原生路径按钮被点击: " + response.selection)
        });
    }
    else if (event.itemStack.typeId == "minecraft:diamond"){
        const form = new ActionFormData()
        .title("sapdon_ui:test")
        .body("sapdon 自定义界面测试")
        const W = 8;
        const H = 8;

        for(let h=0;h<H;h++)
            for(let w=0;w<W;w++)
                form.button(`${h*W+w}`)


        form.show(event.source).then((response) => {
            world.sendMessage("sapdon_ui:test 按钮被点击: " + response.selection)
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