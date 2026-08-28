import { DataBindingObject } from "../../dataBindingObject.js";
import { Modifications, UIElement } from "../../elements/uiElement.js";
import { Panel } from "../../elements/panel.js";
import { UISystem } from "../system.js";

/**
 * sapdon_ui: 页面壳路由系统（生成 server_form.json）
 *
 * 采用 Bedrock Wiki「Modifying Server Forms — Action Form」官方路由：
 *   main_screen_content ─(modification: insert_back controls)→ sapdon_form_factory
 *     └─ factory { name: server_form_factory, control_ids.long_form } → @server_form.sapdon_long_form_panel
 *          └─ (modifications insert_back) 所有注册页 Panel（$panel_id 前缀门控）
 *             └─ content@$user_content_panel (下) + buttons@$user_buttons_panel (上)
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
    private static _factories: unknown[] = [];
    private static _pageCount = 0;

    private static _ensureBuilt(): UISystem {
        if (this._system) return this._system;

        const system = new UISystem(`${this.NS}:${this.NS}`, "ui/");
        this._system = system;

        // main_screen_content(vanilla)：注入每页一个 gated factory（modifications 合法）
        const mainScreenContent = new UIElement("main_screen_content")
            .addProp("size", ["fill", "fill"])
            .addModification({
                array_name: "controls",
                operation: Modifications.OPERATION.INSERT_BACK,
                value: this._factories,
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

    /** 页面根壳：在页面自己的 UISystem 里生成 <name> 元素（门控 + content/buttons 子控件 + 变量），供工厂 long_form 引用 */
    static createPageRoot(reg: { name: string; panelId: string; contentRef: string; buttonsRef: string }): UIElement {
        const page = new Panel(reg.name)
            .addVariable("panel_id", reg.panelId)
            .addVariable("title_text", "#title_text")
            .addVariable("form_text", "#form_text")
            .addControl(new UIElement("content", undefined, reg.contentRef))
            .addControl(new UIElement("buttons", undefined, reg.buttonsRef));
        // 门控：#title_text 含 <panelId> 前缀即命中（如 sapdon_ui:book），用 not((A-B)=A) 判定
        page.dataBinding.addDataBinding(new DataBindingObject().setBindingName("#title_text"));
        page.dataBinding.addDataBinding(
            new DataBindingObject()
                .setBindingType("view")
                .setSourcePropertyName(`(not( (#title_text - '${reg.panelId}') = #title_text))`)
                .setTargetPropertyName("#visible")
        );
        return page;
    }

    /** 注册一个自定义页面：向 main_screen_content 追加一个纯 gated factory（long_form → @<页ns>.<name>），门控在页面根 */
    static registerPage(reg: SapdonPageRegistration): void {
        this._ensureBuilt();

        const name = reg.name ?? `page${this._pageCount}`;
        const contentRef = reg.contentPanel instanceof UIElement ? reg.contentPanel.id : reg.contentPanel;
        const ns = typeof contentRef === 'string' && contentRef.includes('.') ? contentRef.split('.')[0] : this.NS;

        // 纯 factory（不 gate；gate 落在页面根 <name>）
        const factory = new UIElement(`sapdon_form_factory_${name}`, "panel")
            .addProp("factory", {
                name: "server_form_factory",
                control_ids: { long_form: `@${ns}.${name}` },
            });
        this._factories.push(factory.serialize());
        this._pageCount++;
    }

    static getSystem(): UISystem | null {
        return this._system ?? this._ensureBuilt();
    }
}