import { DataBindingObject } from "../../dataBindingObject.js";
import { Button } from "../../elements/button.js";
import { Image } from "../../elements/image.js";
import { Panel } from "../../elements/panel.js";
import { UIElement } from "../../elements/uiElement.js";
import { Layout } from "../../properties/layout.js";
import { Sprite } from "../../properties/sprite.js";
import { UISystem } from "../system.js";

/**
 * sapdon_ui: 页面壳路由系统（生成 server_form.json）
 *
 * 结构：
 *   third_party_server_screen@common.base_screen (type:screen)
 *     └─ $screen_content = custom_full_screen
 *          ├─ native_form@main_screen_content        (title 含 'sapdon_ui:' ? 隐藏 : 显示)
 *          └─ sapdon_custom_full@sapdon_screen_content (title 含 'sapdon_ui:' 显示)
 *               └─ (页面各自) @server_form.custom_panel_content (panel_id 精确匹配)
 *                    ├─ content@$user_content_panel   (下)
 *                    └─ buttons@$user_buttons_panel   (上)
 */
export interface SapdonPageRegistration {
    panelId: string;
    contentPanel: UIElement | string;
    buttonsPanel?: UIElement | string;
    /** 页面控件�?默认 pageN) */
    name?: string;
}

export class SapdonServerUI {
    static readonly MARKER = "sapdon_ui:";
    static readonly NS = "server_form";

    private static _system: UISystem | null = null;
    private static _screenContent: Panel | null = null;
    private static _pageCount = 0;

    /** 框架侧固定提供的按钮项模�?form_button@common_buttons.light_text_button */
    static createFormButtonTemplate(): UIElement {
        const formButtonTemplate = new Button("form_button", "common_buttons.light_text_button")
            .addVariable("pressed_button_name", "button.form_button_click")
            .setLayout(new Layout().setSize([16, 16]).setAnchorFrom("top_left").setAnchorTo("top_left"))
            .addVariable("button_text", "#form_button_text")
            .addVariable("button_text_binding_type", "collection")
            .addVariable("button_text_grid_collection_name", "form_buttons")
            .addVariable("button_text_max_size", ["100%", 20]);
        formButtonTemplate.dataBinding.addDataBinding(
            new DataBindingObject().setBindingType("collection_details").setBindingCollectionName("form_buttons")
        );
        return formButtonTemplate;
    }

    /** 框架侧固定提供的纹理按钮模板 sapdon_textured_button@common.button（三态纹理 + 门控） */
    static createTexturedButtonTemplate(): UIElement {
        const tpl = new Button("sapdon_textured_button", "common.button")
            .addVariable("pressed_button_name", "button.form_button_click")
            .addVariable("default_texture|default", "textures/ui/focus_border_white")
            .addVariable("hover_texture|default", "textures/ui/focus_border_white")
            .addVariable("pressed_texture|default", "textures/ui/focus_border_white")
            .addVariable("binding_button_text|default", "")
            .addControls([
                new Image("default").setSprite(new Sprite().setTexture("$default_texture")),
                new Image("hover").setSprite(new Sprite().setTexture("$hover_texture")),
                new Image("pressed").setSprite(new Sprite().setTexture("$pressed_texture")),
            ]);
        tpl.dataBinding.addDataBinding(
            new DataBindingObject().setBindingType("collection_details").setBindingCollectionName("form_buttons")
        );
        tpl.dataBinding.addDataBinding(
            new DataBindingObject()
                .setBindingType("collection")
                .setBindingCollectionName("form_buttons")
                .setBindingName("#form_button_text")
        );
        tpl.dataBinding.addDataBinding(
            new DataBindingObject()
                .setBindingType("view")
                .setSourcePropertyName("($binding_button_text = #form_button_text)")
                .setTargetPropertyName("#visible")
        );
        return tpl;
    }

    /** 通用页面壳 custom_panel_content: panel_id 精确匹配 + 内容(下)/按键(上) */
    static createPanelContentShell(): UIElement {
        const shell = new Panel("custom_panel_content")
            .setLayout(new Layout().setSize(["100%", "100%"]))
            .addControl(new UIElement("content", undefined, "$user_content_panel"))
            .addControl(new UIElement("buttons", undefined, "$user_buttons_panel"));
        shell.dataBinding.addDataBinding(new DataBindingObject().setBindingName("#title_text"));
        shell.dataBinding.addDataBinding(
            new DataBindingObject()
                .setBindingType("view")
                .setSourcePropertyName("(#title_text = $panel_id)")
                .setTargetPropertyName("#visible")
        );
        return shell;
    }

    private static _ensureBuilt(): UISystem {
        if (this._system) return this._system;

        const system = new UISystem(`${this.NS}:${this.NS}`, "ui/");
        this._system = system;

        system.addElement(this.createFormButtonTemplate());
        system.addElement(this.createTexturedButtonTemplate());
        system.addElement(this.createPanelContentShell());

        // custom_full_screen：native vs sapdon 分流
        const nativeForm = new UIElement("native_form", undefined, `${this.NS}.main_screen_content`);
        nativeForm.dataBinding.addDataBinding(new DataBindingObject().setBindingName("#title_text"));
        nativeForm.dataBinding.addDataBinding(
            new DataBindingObject()
                .setBindingType("view")
                .setSourcePropertyName(`((#title_text - '${this.MARKER}') = #title_text)`)
                .setTargetPropertyName("#visible")
        );
        const customFullScreen = new Panel("custom_full_screen")
            .setLayout(new Layout().setSize(["100%", "100%"]))
            .addControl(nativeForm)
            .addControl(new UIElement("sapdon_custom_full", undefined, `${this.NS}.sapdon_screen_content`));
        system.addElement(customFullScreen);

        // sapdon_screen_content：sapdon_ui: 前缀可见, 装注册页
        const screenContent = new Panel("sapdon_screen_content")
            .setLayout(new Layout().setSize(["100%", "100%"]));
        screenContent.dataBinding.addDataBinding(new DataBindingObject().setBindingName("#title_text"));
        screenContent.dataBinding.addDataBinding(
            new DataBindingObject()
                .setBindingType("view")
                .setSourcePropertyName(`(not ((#title_text - '${this.MARKER}') = #title_text))`)
                .setTargetPropertyName("#visible")
        );
        system.addElement(screenContent);
        this._screenContent = screenContent;

        // 退出动画抑制元素
        system.addElement(
            new UIElement("screen_exit_animation_pop_wait")
                .addProp("anim_type", "offset")
                .addProp("easing", "linear")
                .addProp("duration", 0.1)
                .addProp("from", [0, 0])
                .addProp("to", [0, 0])
                .addProp("play_event", "screen.exit_pop")
                .addProp("end_event", "screen.exit_end")
        );

        // third_party_server_screen：挂载路由 + 抑制退出动画 + 取消键
        const screen = new UIElement("third_party_server_screen", "screen", "common.base_screen")
            .addProp("button_mappings", [
                { from_button_id: "button.menu_cancel", to_button_id: "button.menu_exit", mapping_type: "global" },
            ])
            .addVariable("screen_content", `${this.NS}.custom_full_screen`)
            .addVariable("screen_animations", [`@${this.NS}.screen_exit_animation_pop_wait`])
            .addVariable("background_animations", [`@${this.NS}.screen_exit_animation_pop_wait`]);
        system.addElement(screen);

        return system;
    }

    /** 注册一个自定义页面到 sapdon_screen_content */
    static registerPage(reg: SapdonPageRegistration): void {
        const system = this._ensureBuilt();
        const screenContent = this._screenContent!;

        const name = reg.name ?? `page${this._pageCount}`;
        const page = new UIElement(name, "panel", `${this.NS}.custom_panel_content`)
            .addVariable("panel_id", reg.panelId)
            .addVariable("user_content_panel", reg.contentPanel instanceof UIElement ? reg.contentPanel.id : reg.contentPanel);
        if (reg.buttonsPanel != null) {
            page.addVariable("user_buttons_panel", reg.buttonsPanel instanceof UIElement ? reg.buttonsPanel.id : reg.buttonsPanel);
        }

        screenContent.addControl(page.serialize());

        this._pageCount++;
        void system;
    }

    static getSystem(): UISystem | null {
        return this._system ?? this._ensureBuilt();
    }
}
