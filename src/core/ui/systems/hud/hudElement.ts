import { DataBindingObject } from "../../dataBindingObject.js";
import { Panel } from "../../elements/panel.js";
import { UIElement } from "../../elements/uiElement.js";

const HudDataComponent = {
    "data_control": {
        "type": "panel",
        "size": [0, 0],
        "property_bag": {
            "#preserved_text": ""
        },
        "bindings": [
            {
                "binding_name": "#hud_title_text_string"
            },
            {
                "binding_name": "#hud_title_text_string",
                "binding_name_override": "#preserved_text",
                "binding_condition": "visibility_changed"
            },
            {
                "binding_type": "view",
                "source_property_name": "(not (#hud_title_text_string = #preserved_text) and not ((#hud_title_text_string - $update_string) = #hud_title_text_string))",
                "target_property_name": "#visible"
            }
        ]
    }
} as const;

//
const PREFIX = "ui.hud.";

export class HudStatePanel {
    private root_panel: Panel;
    private ui_id: string;

    constructor(public name: string) { 
        this.ui_id = PREFIX + name;
        this.root_panel = new Panel(name,undefined);
        this.root_panel.addVariable("update_string",this.ui_id);
        this.root_panel.addControl(HudDataComponent);
    }
    public addStateControl(state:string | number, control: UIElement) {
         control.dataBinding.addDataBinding(
            new DataBindingObject()
            .setBindingType("view")
            .setSourceControlName("data_control")
            .setSourcePropertyName(`(#preserved_text)`)
            .setTargetPropertyName("#text")
        )
        control.dataBinding.addDataBinding(
            new DataBindingObject()
            .setBindingType("view")
            .setSourcePropertyName(`(#text = '${this.ui_id}.${state}')`)
            .setTargetPropertyName("#visible")
        )
        this.root_panel.addControl(control);
        return this;
    }
    public getPanel(){
        return this.root_panel;
    }
}