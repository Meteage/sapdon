import { cliRequest } from "../../../cli/dev-server/client.js"
import { server } from "../../../cli/dev-server/server.js"

export class UISystemRegistry {
    // 注册 UISystem
    static registerUISystem(ui_system) {
        const ui_system_path = ui_system.path + ui_system.name + ".json"
        cliRequest('register-ui/system', ui_system_path, ui_system.toJson())
    }

    // 添加外部 UI 定义
    static addOuterUIdefs(ui_defs) {
        if (!Array.isArray(ui_defs)) {
            throw new Error("参数必须是一个数组")
        }
        cliRequest('register-ui/def', ui_defs)
    }
}

export class UISystemRegistryServer {
    // 私有静态字段
    static #ui_system_map = new Map()
    static #ui_def_list = []

    // 获取所有注册的 UISystem
    static getUISystemList() {
        return Array.from(this.#ui_system_map.values())
    }

    // 获取 UI 定义列表（剔除 "ui/server_form"）
    static getUIdefList() {
        const combinedList = this.#ui_def_list.concat(Array.from(this.#ui_system_map.keys()))
        return combinedList.filter(item => item !== "ui/server_form")
    }

    static start() {
        server.handle('register-ui/system', (path, system) => {
            this.#ui_system_map.set(path, system)
        })

        server.handle('register-ui/def', defs => {
            this.#ui_def_list.concat(defs)
        })
    }
}