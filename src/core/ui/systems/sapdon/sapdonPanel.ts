import { UIElement } from "../../elements/uiElement.js";
import { UISystem } from "../system.js";

/**
 * SapdonPanel：一个自定义页面 = 一个 UI 文件(text_ui_xxx.json)
 * 由「内容面板 + 按键面板」两个元素组成。
 */
export class SapdonPanel {
    private system: UISystem;

    constructor(namespace: string) {
        // 文件名与 namespace 均取 namespace 串
        this.system = new UISystem(`${namespace}:${namespace}`, "ui/");
    }

    /** 设置内容面板元素 */
    setContent(content: UIElement): this {
        this.system.addElement(content);
        return this;
    }

    /** 设置按键面板元素 */
    setButtons(buttons: UIElement): this {
        this.system.addElement(buttons);
        return this;
    }

    build(): UISystem {
        return this.system;
    }
}