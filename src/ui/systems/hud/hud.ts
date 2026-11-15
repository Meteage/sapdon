import { UIElement } from "../../elements/uiElement.js";
import { UISystem } from "../system.js";


export namespace HudUISystem {

    const hudSystem = new UISystem("hud:hud_screen","ui/");
    
    const hudRootElements:any[] = [];

    //前缀
    const PREFIX = "ui.hud.";

    /**
     * 获取HUD UI系统实例
     * @returns The HUD UI System instance
     */
    export function getInstance(): UISystem {
        return hudSystem;
    }

    //移除默认的title文本
    hudSystem.addElement(
        new UIElement("hud_title_text/title_frame",undefined,undefined)
        .addModification({
            "array_name": "bindings",
            "operation": "insert_back",
            "value": [
                {
                "binding_name": "#hud_title_text_string",
                "binding_type": "global"
                },
                {
                    "binding_type": "view",
                    "source_property_name": "(not (%.7s * #hud_title_text_string = '"+PREFIX+"'))",
                    "target_property_name": "#visible"
                }
            ]
        })
    )
    
    
    //注册
    export function registerElement(element:UIElement){
        hudSystem.addElement(element);
    }

    //挂载元素 向根面板添加元素
    export function mountRootElement(element:UIElement){
        hudRootElements.push(element.serialize());
        registerElement(
            new UIElement("root_panel",undefined,undefined)
            .addModification({
                "array_name": "controls",
                "operation": "insert_front",
                "value": hudRootElements
            })
        );
    }
}