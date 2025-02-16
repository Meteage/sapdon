import { updateServerFormSystem } from "../systems/server_form.js";


export class ServerUISystem{
    static #ui_system_list = [];
    static registerUIsystem(form_name,ui_system){
        this.#ui_system_list.push(
            {
                form_name:form_name,
                ui_system:ui_system
            }
        )
        //更新
        updateServerFormSystem(this.#ui_system_list);
    }
    static getAllUISystem(){
        return [...this.#ui_system_list];
    }
}