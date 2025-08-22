import { world } from "@minecraft/server";
import { ActionFormData, ModalFormData} from "@minecraft/server-ui";

const item_ui_list ={
    "sapdon:neo_guidebook":"neo_guidebook",
    "minecraft:stick":""
};

let page_index = 0;
const max_page = 5;

/** @type {import("@minecraft/server").ItemCustomComponent} */
export const GuiBookItemComponent = {
    onUse({itemStack,source}){
        world.sendMessage(itemStack.typeId)
        if(source.typeId != "minecraft:player") return
        showGuidebook(source,item_ui_list[itemStack.typeId])
        //showTestGuideBook(source,"")
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

    form.button("chatper_1")  //傀儡类别
    form.button("chatper_2")  //傀儡收获
    form.button("chatper_3")  //傀儡取物
    form.button("chatper_4")  //傀儡耕种

    for(let i = 0;i<8;i++){
        form.button(`item_${i}_button`)
        form.button(`item_${i}_warning`)
    }

    if(page_index != 0) form.button("home_button");

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
    });
       
}