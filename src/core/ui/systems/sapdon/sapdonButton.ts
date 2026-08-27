import { Layout } from "../../properties/layout.js";
import { UIElement } from "../../elements/uiElement.js";

/**
 * @deprecated 图标/纹理按钮请改用 FormButton（@common.button + 三态纹理 + 门控绑定）。
 * 本类仅为兼容 NeoGuidebook 保留；后续随 guidebook 迁移一并移除。
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