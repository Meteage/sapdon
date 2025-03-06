import { UISystem } from "../systems/UISystem.js";

export class UISystemRegistry {
  // 私有静态字段
  static #ui_system_map = new Map();
  static #ui_def_list = [];

  // 注册 UISystem
  static registerUISystem(ui_system) {
    if (!(ui_system instanceof UISystem)) {
      throw new Error("参数必须是 UISystem 类的实例");
    }
    const ui_system_path = ui_system.path + ui_system.name + ".json";
    this.#ui_system_map.set(ui_system_path, ui_system);
  }

  // 获取所有注册的 UISystem
  static getUISystemList() {
    return Array.from(this.#ui_system_map.values());
  }

  // 添加外部 UI 定义
  static addOuterUIdefs(ui_defs) {
    if (!Array.isArray(ui_defs)) {
      throw new Error("参数必须是一个数组");
    }
    this.#ui_def_list = this.#ui_def_list.concat(ui_defs);
  }

  // 获取 UI 定义列表（剔除 "ui/server_form"）
  static getUIdefList() {
    const combinedList = this.#ui_def_list.concat(Array.from(this.#ui_system_map.keys()));
    return combinedList.filter(item => item !== "ui/server_form");
  }
}