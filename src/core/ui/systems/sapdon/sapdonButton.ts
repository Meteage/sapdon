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

/**
 * SapdonTexturedButton：sapdon 页面壳内的纹理按钮。
 * 默认模板固定为 server_form.sapdon_textured_button（三态纹理 + binding_button_text 门控）。
 */
export class SapdonTexturedButton extends UIElement {
    constructor(id: string, bindingButtonName?: string) {
        super(id, "button", "server_form.sapdon_textured_button");
        if (bindingButtonName != null) {
            this.addVariable("binding_button_text", bindingButtonName);
        }
    }

    setDefaultTexture(texture: string): this {
        this.addVariable("default_texture", texture);
        return this;
    }

    setHoverTexture(texture: string): this {
        this.addVariable("hover_texture", texture);
        return this;
    }

    setPressedTexture(texture: string): this {
        this.addVariable("pressed_texture", texture);
        return this;
    }

    /** 设置锚点对齐 */
    setAnchor(anchor: string, size: [number | string, number | string] = [24, 24]): this {
        this.setLayout(new Layout().setSize(size as [any, any]).setAnchorFrom(anchor).setAnchorTo(anchor));
        return this;
    }
}