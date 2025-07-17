import { GRegistry } from "@sapdon/core/registry.js"

export class UISystemRegistry {
    static #ui_system_map = {}
    static #ui_def_list = []
    // 注册 UISystem
    static registerUISystem(ui_system) {
        const ui_system_path = ui_system.path + ui_system.name + ".json"
        this.#ui_system_map[ui_system_path] = ui_system
        this.#ui_def_list.push(ui_system_path)
        GRegistry.register(ui_system.name,"resource",ui_system.path,ui_system);
        GRegistry.register("_ui_defs","resource","ui/",{"ui_defs": this.#ui_def_list});
    }

    // 添加外部 UI 定义
    static addOuterUIdefs(ui_defs) {
        if (!Array.isArray(ui_defs)) {
            throw new Error("参数必须是一个数组")
        }
        this.#ui_def_list.concat(ui_defs)
        GRegistry.register("_ui_defs","resource","ui/",{"ui_defs": this.#ui_def_list});
    }
}

