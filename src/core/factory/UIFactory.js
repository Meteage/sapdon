import { GRegistry } from "../GRegistry.js";
import { Image } from "../ui/elements/Image.js";
import { Label } from "../ui/elements/Label.js";
import { Panel } from "../ui/elements/Panel.js";
import { UIElement } from "../ui/elements/UIElement.js";
import { UISystem } from "../ui/systems/UISystem.js";



const registerUIsystem = (ui_system)=>{
    GRegistry.register(ui_system.name,"behavior",ui_system.path,ui_system);
};

export const UiAPI = {
    createUISystem(identifier,path){
        const ui_system = new UISystem(identifier,path);
        registerUIsystem(ui_system);
        return ui_system;
    },
    createUIElement(id,type,template){
        const ui_element = new UIElement(id,type,template);
        return ui_element;
    },
    createPanel(id,template){
        const panel = new Panel(id,template);
        return panel;
    },
    createImage(id,template){
        const image = new Image(id,template);
        return image;
    },
    createLabel(id,template){
        const label = new Label(id,template);
        return label;
    }

}