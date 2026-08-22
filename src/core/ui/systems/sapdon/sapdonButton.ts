import { Layout } from "../../properties/layout.js";
import { UIElement } from "../../elements/uiElement.js";

/**
 * SapdonButton：sapdon 页面壳内的表单按钮。
 * 默认模板固定为 server_form.form_button（集合按钮，吃 form_buttons 数据）。
 */
export class SapdonButton extends UIElement {
    constructor(id: string) {
        super(id, "button", "server_form.form_button");
    }

    /** 设置锚点对齐（如 bottom_left / bottom_right / top_right），默认尺寸 32×32 */
    setAnchor(anchor: string): this {
        this.setLayout(new Layout().setSize([32, 32]).setAnchorFrom(anchor).setAnchorTo(anchor));
        return this;
    }
}