import { DataBindingObject } from "../../dataBindingObject.js";
import { Button } from "../../elements/button.js";
import { Modifications, UIElement } from "../../elements/uiElement.js";
import { Panel } from "../../elements/panel.js";
import { Layout } from "../../properties/layout.js";
import { UISystem } from "../system.js";

/**
 * sapdon_ui: 页面壳路由系统（生成 server_form.json）
 *
 * 采用 Bedrock Wiki「Modifying Server Forms — Action Form」官方路由：
 *   main_screen_content ─(modification: insert_back controls)→ sapdon_form_factory
 *     └─ factory { name: server_form_factory, control_ids.long_form } → @server_form.sapdon_long_form_panel
 *          └─ 所有注册页 @custom_panel_content（$panel_id 前缀门控）
 *             ├─ content@$user_content_panel   (下)
 *             └─ buttons@$user_buttons_panel   (上)
 *   vanilla long_form ─(modification: bindings)→ title 含 'sapdon_ui:' 时隐藏原生表单
 *
 * 关键收益：自定义页处于 main_screen_content 作用域 → #form_text / #title_text 均可解析。
 */
export interface SapdonPageRegistration {
    panelId: string;
    contentPanel: UIElement | string;
    buttonsPanel?: UIElement | string;
    /** 页面控件名（默认 pageN） */
    name?: string;
}

export class SapdonServerUI {
    static readonly MARKER = "sapdon_ui:";
    static readonly NS = "server_form";

    private static _system: UISystem | null = null;
    private static _pagesPanel: Panel | null = null;
    private static _pageCount = 0;

    /** 框架侧固定提供的按钮项模板：form_button@common_buttons.light_text_button */
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

    /** 通用页面壳 custom_panel_content: panel_id 前缀匹配 + 内容(下)/按键(上) + 向下传绑定名变量 */
    static createPanelContentShell(): UIElement {
        const shell = new Panel("custom_panel_content")
            .setLayout(new Layout().setSize(["100%", "100%"]))
            .addControl(new UIElement("content", undefined, "$user_content_panel"))
            .addControl(new UIElement("buttons", undefined, "$user_buttons_panel"))
            // 变量传递：注册页内容/按钮面板可读 $title_text / $form_text（值为绑定名，作用域内解析）
            .addVariable("title_text", "#title_text")
            .addVariable("form_text", "#form_text");
        shell.dataBinding.addDataBinding(new DataBindingObject().setBindingName("#title_text"));
        shell.dataBinding.addDataBinding(
            new DataBindingObject()
                .setBindingType("view")
                // title 含 $panel_id 前缀即命中（允许 `:pageId` 后缀，如 sapdon_ui:book:page1）
                .setSourcePropertyName(`((#title_text - $panel_id) != #title_text)`)
                .setTargetPropertyName("#visible")
        );
        return shell;
    }

    private static _ensureBuilt(): UISystem {
        if (this._system) return this._system;

        const system = new UISystem(`${this.NS}:${this.NS}`, "ui/");
        this._system = system;

        system.addElement(this.createFormButtonTemplate());
        system.addElement(this.createPanelContentShell());

        // sapdon_long_form_panel：所有注册页的容器（main_screen_content 作用域内，#title_text/#form_text 可用）
        const pagesPanel = new Panel("sapdon_long_form_panel")
            .setLayout(new Layout().setSize(["100%", "100%"]));
        pagesPanel.dataBinding.addDataBinding(new DataBindingObject().setBindingName("#title_text"));
        system.addElement(pagesPanel);
        this._pagesPanel = pagesPanel;

        // main_screen_content：注入 factory（Wiki Action Form 路由）
        const sapdonFormFactory = new UIElement("sapdon_form_factory", "panel")
            .addProp("factory", {
                name: "server_form_factory",
                control_ids: { long_form: `@${this.NS}.sapdon_long_form_panel` },
            });
        const mainScreenContent = new UIElement("main_screen_content").addModification({
            array_name: "controls",
            operation: Modifications.OPERATION.INSERT_BACK,
            value: [sapdonFormFactory.serialize()],
        });
        system.addElement(mainScreenContent);

        // long_form：title 含 'sapdon_ui:' 时隐藏原生表单
        const longForm = new UIElement("long_form").addModification({
            array_name: "bindings",
            operation: Modifications.OPERATION.INSERT_BACK,
            value: [
                new DataBindingObject().setBindingName("#title_text"),
                new DataBindingObject()
                    .setBindingType("view")
                    .setSourcePropertyName(`((#title_text - '${this.MARKER}') = #title_text)`)
                    .setTargetPropertyName("#visible"),
            ],
        });
        system.addElement(longForm);

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

        // third_party_server_screen：screen_content 回归 vanilla main_screen_content
        const screen = new UIElement("third_party_server_screen", "screen", "common.base_screen")
            .addProp("button_mappings", [
                { from_button_id: "button.menu_cancel", to_button_id: "button.menu_exit", mapping_type: "global" },
            ])
            .addVariable("screen_content", `${this.NS}.main_screen_content`)
            .addVariable("screen_animations", [`@${this.NS}.screen_exit_animation_pop_wait`])
            .addVariable("background_animations", [`@${this.NS}.screen_exit_animation_pop_wait`]);
        system.addElement(screen);

        return system;
    }

    /** 注册一个自定义页面到 sapdon_long_form_panel */
    static registerPage(reg: SapdonPageRegistration): void {
        const system = this._ensureBuilt();
        const pagesPanel = this._pagesPanel!;

        const name = reg.name ?? `page${this._pageCount}`;
        const page = new UIElement(name, "panel", `${this.NS}.custom_panel_content`)
            .addVariable("panel_id", reg.panelId)
            .addVariable("user_content_panel", reg.contentPanel instanceof UIElement ? reg.contentPanel.id : reg.contentPanel);
        if (reg.buttonsPanel != null) {
            page.addVariable("user_buttons_panel", reg.buttonsPanel instanceof UIElement ? reg.buttonsPanel.id : reg.buttonsPanel);
        }

        pagesPanel.addControl(page.serialize());

        this._pageCount++;
        void system;
    }

    static getSystem(): UISystem | null {
        return this._system ?? this._ensureBuilt();
    }
}