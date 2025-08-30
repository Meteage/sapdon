import { world } from "@minecraft/server";
import { ActionFormData} from "@minecraft/server-ui";

const item_ui_list ={
    "sapdon:neo_guidebook":"neo_guidebook",
    "minecraft:stick":""
};

let page_index = 0;

function myLog(log){
    //world.sendMessage(log);
}

/** @type {import("@minecraft/server").ItemCustomComponent} */
export const GuiBookItemComponent = {
    onUse({itemStack,source}){
        myLog(itemStack.typeId)
        if(source.typeId != "minecraft:player") return
        showGuidebook(source,item_ui_list[itemStack.typeId])
        //showTestGuideBook(source,"")
    }
}

const page_list = [];

function createPage(ui){
    //首页
    const form = new ActionFormData()
    .title(ui)
    .body("page_index0")
    //.button("prev_button")
    .button("next_button") 

    /*
    .button("chatper_1")  //傀儡功能
    .button("chatper_2")  //傀儡行为
    .button("chatper_3")  //傀儡合成
    */

    for(let i = 0;i<3;i++){
        form.button(`item_${i}_button`)
        form.button(`item_${i}_warning`)
    }

    //2 功能与行为
    const form2 = new ActionFormData()
    .title(ui)
    .body("page_index1")
    .button("prev_button")
    .button("next_button")
    .button("home_button")

    //3 合成
    const form3 = new ActionFormData()
    .title(ui)
    .body("page_index2")
    .button("prev_button")
    //.button("next_button")
    .button("home_button")

    page_list.push(form);
    page_list.push(form2);
    page_list.push(form3);
}


function showGuidebook(target,ui){

    if(page_list.length == 0) createPage(ui);

    const form = page_list[page_index];
    switch(page_index){
        case 0:
            form.show(target).then((response) => {
                myLog("response.selection:"+response.selection)
                switch(response.selection){
                    case 0:
                        page_index++;
                        myLog("下一页")
                        showGuidebook(target,ui);
                        break;
                    case 1:
                        page_index = 1;
                        myLog("傀儡功能")
                        showGuidebook(target,ui);
                        break;
                    case 3:
                        page_index = 1;
                        myLog("傀儡行为")
                        showGuidebook(target,ui);
                        break;
                    case 5:
                        page_index = 2;
                        myLog("傀儡合成")
                        showGuidebook(target,ui);
                        break;
                }
            });
            break;
        case 1:
            form.show(target).then((response) => {
                switch(response.selection){
                    case 0:
                        page_index--;
                        myLog("上一页")
                        showGuidebook(target,ui);
                        break;
                    case 1:
                        page_index++;
                        myLog("下一页")
                        showGuidebook(target,ui);
                        break;
                    case 2:
                        page_index = 0;
                        myLog("首页")
                        showGuidebook(target,ui);
                        break;
                }
            });
            break;
        case 2:
            form.show(target).then((response) => {
                switch(response.selection){
                    case 0:
                        page_index--;
                        myLog("上一页")
                        showGuidebook(target,ui);
                        break;
                    case 1:
                        page_index = 0;
                        myLog("首页")
                        showGuidebook(target,ui);
                        break;
                }
            });
            break;
    }  
}