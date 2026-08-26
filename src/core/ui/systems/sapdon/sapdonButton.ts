import { Layout } from "../../properties/layout.js";
import { UIElement } from "../../elements/uiElement.js";

/**
 * SapdonButton：sapdon 页面壳内的统一表单按钮。
 * 单一模板 server_form.form_button（= common_buttons.light_text_button），
 * 同时支持文本（$button_text 系列）与三态纹理（$default/hover/pressed_button_texture）。
 */
export class SapdonButton extends UIElement {
    constructor(id: string) {
        super(id, "button", "server_form.form_button");
    }

    /** 设置默认纹理（对应 light_text_button 的 $default_button_texture） */
    setDefaultTexture(texture: string): this {
        this.addVariable("default_button_texture", texture);
        return this;
    }

    /** 设置悬停纹理（$hover_button_texture） */
    setHoverTexture(texture: string): this {
        this.addVariable("hover_button_texture", texture);
        return this;
    }

    /** 设置按下纹理（$pressed_button_texture） */
    setPressedTexture(texture: string): this {
        this.addVariable("pressed_button_texture", texture);
        return this;
    }

    /** 设置锚点对齐（如 bottom_left / bottom_right / top_right），默认尺寸 32×32 */
    setAnchor(anchor: string, size: [number | string, number | string] = [32, 32]): this {
        this.setLayout(new Layout().setSize(size as [any, any]).setAnchorFrom(anchor).setAnchorTo(anchor));
        return this;
    }
}

/**
 * @deprecated 请改用 SapdonButton（已并入 setDefaultTexture/setHoverTexture/setPressedTexture）。
 * 本类保留仅为兼容尚未迁移的 NeoGuidebook，后续随 guidebook 迁移一并移除。
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