import { cliRequest } from "../../../cli/dev-server/client.js"
import { server } from "../../../cli/dev-server/server.js"

export class UISystemRegistry {
    static #ui_system_map = {}
    static #ui_def_list = []
    // 注册 UISystem
    static registerUISystem(ui_system) {
        const ui_system_path = ui_system.path + ui_system.name + ".json"
        this.#ui_system_map[ui_system_path] = ui_system
    }

    // 添加外部 UI 定义
    static addOuterUIdefs(ui_defs) {
        if (!Array.isArray(ui_defs)) {
            throw new Error("参数必须是一个数组")
        }
        this.#ui_def_list.concat(ui_defs)
    }

    static submit() {
        cliRequest("register-ui/def", this.#ui_def_list)
        cliRequest("register-ui/system", this.#ui_system_map)
    }
}

export class UISystemRegistryServer {
    // 私有静态字段
    static #ui_system_map = {}
    static #ui_def_list = []

    // 获取所有注册的 UISystem
    static getUISystemList() {
        return Object.values(this.#ui_system_map)
    }

    // 获取 UI 定义列表（剔除 "ui/server_form"）
    static getUIdefList() {
        const combinedList = this.#ui_def_list.concat(Object.keys(this.#ui_system_map))
        return combinedList.filter(item => item !== "ui/server_form")
    }

    static startServer() {
        server.handle('register-ui/system', systems => {
            this.#ui_system_map = systems
        })

        server.handle('register-ui/def', defs => {
            this.#ui_def_list = defs
        })
    }
}