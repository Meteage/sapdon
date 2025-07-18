import { world } from "@minecraft/server";
import { ActionFormData, ModalFormData} from "@minecraft/server-ui";

const item_ui_list ={
    "sapdon:neo_guidebook":"test_book",
    "minecraft:stick":""
};

let page_index = 0;
const max_page = 5;

/** @type {import("@minecraft/server").ItemCustomComponent} */
export const GuiBookItemComponent = {
    onUse({itemStack,source}){
        world.sendMessage(itemStack.typeId)
        if(source.typeId != "minecraft:player") return
        //showGuidebook(source,item_ui_list[itemStack.typeId])
        showTestGuideBook(source,"")
    }
}

function showTestGuideBook(target,ui){
  
const player = target

const modalForm = new ModalFormData().title("Example Modal Controls for §o§7ModalFormData§r");
modalForm.label("测试文本")

modalForm.submitButton("测试按键")
modalForm.submitButton("测试按键1")
modalForm.submitButton("测试按键22")

modalForm.toggle("Toggle w/o default");
modalForm.toggle("Toggle w/ default", {
    tooltip:"托尔斯泰"
});

modalForm.slider("Slider w/o default", 0, 50, {
    defaultValue:5,
    tooltip:"烟台市"
});
modalForm.slider("Slider w/ default", 0, 50, {
    defaultValue:30
});

modalForm.dropdown("Dropdown w/o default", ["option 1", "option 2", "option 3"]);
modalForm.dropdown("Dropdown w/ default", ["option 1", "option 2", "option 3"], {
    defaultValueIndex:1
});

modalForm.textField("Input w/o default", "type text here");
modalForm.textField("Input w/ default", "type text here", {
    defaultValue:"this is default"
});

modalForm
.show(player)
.then((formData) => {
player.sendMessage(`Modal form results: ${JSON.stringify(formData.formValues, undefined, 2)}`);
})


}


function showGuidebook(target,ui){
    const form = new ActionFormData()
    .title(ui)
    .body("page_index"+ page_index)
    .button("prev_button","textures/items/diamond")
    .button("next_button","textures/items/apple")
    .label("阿巴巴爸爸")
    .header("haader")
    .divider()
    if(page_index != 0) form.button("home_button");

    switch(page_index){
        case 0:
            //首页
            form.button("chaper_1")  //傀儡类别
            form.button("chaper_2")  //傀儡收获
            form.button("chaper_3")  //傀儡取物
            form.button("chaper_4")  //傀儡耕种

            form.show(target).then((response) => {
                if(response.selection === 0){
                    page_index--;
                    world.sendMessage("上一页")
                    showGuidebook(target,ui);
                }
                else if(response.selection ===1 ){
                    page_index++;
                    world.sendMessage("下一页")
                    showGuidebook(target,ui);
                }
                else if(response.selection === 2 && page_index != 0){
                    page_index = 0;
                    world.sendMessage("返回首页")
                    showGuidebook(target,ui);
                }
                else {
                    // 章节选择
                    const chapter = response.selection - (page_index != 0 ? 3 : 2);
                    page_index = chapter + 1;
                    showGuidebook(target,ui);
                }
            });
        break;
        case 1:
            //傀儡类别
            for(let i = 0;i<8;i++){
                form.button(`item_${i}_button`)
                form.button(`item_${i}_warning`)
            }
            
            form.show(target).then((response) => {
                if(response.selection === 0){
                    page_index--;
                    showGuidebook(target,ui);
                }
                else if(response.selection ===1 ){
                    page_index++;
                    showGuidebook(target,ui);
                }
                else if(response.selection === 2){
                    page_index = 0;
                    showGuidebook(target,ui);
                }
            });
        break;
        case 2:
            //稻田傀儡
            form.show(target).then((response) => {
                if(response.selection === 0){
                    page_index--;
                    showGuidebook(target,ui);
                }
                else if(response.selection ===1 ){
                    page_index++;
                    showGuidebook(target,ui);
                }
                else if(response.selection === 2){
                    page_index = 0;
                    showGuidebook(target,ui);
                }
            });
        break;
        case 3:
            //傀儡任务页
            for(let i = 0;i<7;i++){
                form.button(`item_${i}_button`)
                form.button(`item_${i}_warning`)
            }
            
            form.show(target).then((response) => {
                if(response.selection === 0){
                    page_index--;
                    showGuidebook(target,ui);
                }
                else if(response.selection ===1 ){
                    page_index++;
                    showGuidebook(target,ui);
                }
                else if(response.selection === 2){
                    page_index = 0;
                    showGuidebook(target,ui);
                }
            });
        break;
        case 4:
            //傀儡取物
            form.show(target).then((response) => {
                if(response.selection === 0){
                    page_index--;
                    showGuidebook(target,ui);
                }
                else if(response.selection ===1 ){
                    page_index++;
                    showGuidebook(target,ui);
                }
                else if(response.selection === 2){
                    page_index = 0;
                    showGuidebook(target,ui);
                }
            });
        break;
        case 5:
            //傀儡耕种
            form.show(target).then((response) => {
                if(response.selection === 0){
                    page_index--;
                    showGuidebook(target,ui);
                }
                else if(response.selection ===1 ){
                    page_index++;
                    showGuidebook(target,ui);
                }
                else if(response.selection === 2){
                    page_index = 0;
                    showGuidebook(target,ui);
                }
            });
        break;
        default:
            page_index = 0;
            showGuidebook(target,ui)
        break;
    }
}