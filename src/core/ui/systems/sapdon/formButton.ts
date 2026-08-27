import { Button } from "../../elements/button.js";
import { Image } from "../../elements/image.js";
import { Sprite } from "../../properties/sprite.js";

/**
 * FormButton：服务端表单按钮（纯样式）。
 * 只管长什么样（三态纹理 / 尺寸 / 锚点 / 门控键），不含几何与绑定。
 * 必须 addButton 进 FormButtonGrid 才被注入集合/门控绑定并定位生效。
 */
export class FormButton extends Button {
    constructor(id: string) {
        super(id, 'common.button')
        this.addVariable('pressed_button_name', 'button.form_button_click')
    }

    /** 三态纹理 default/hover/pressed */
    setTexture(defaultTex: string, hoverTex: string, pressedTex: string): this {
        this.addControl(new Image('default', undefined).setSprite(new Sprite().setTexture(defaultTex)))
        this.addControl(new Image('hover', undefined).setSprite(new Sprite().setTexture(hoverTex)))
        this.addControl(new Image('pressed', undefined).setSprite(new Sprite().setTexture(pressedTex)))
        return this
    }

    /** 尺寸（原地改，保留锚点/offset） */
    setSize(w: number | string, h: number | string): this {
        this.layout.setSize([w as any, h as any])
        return this
    }

    /** 锚点对齐（原地改，导航贴角用） */
    setAnchor(anchor: string): this {
        this.layout.setAnchorFrom(anchor).setAnchorTo(anchor)
        return this
    }

    /** 门控键：仅当运行时 emit 的 #form_button_text 等于该键时可见（绑定由 Grid 注入） */
    setBinding(key: string): this {
        this.addVariable('binding_button_text', key)
        return this
    }
}