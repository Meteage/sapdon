import { DataBindingObject } from "../../dataBindingObject.js";
import { Modifications, UIElement } from "../../elements/uiElement.js";
import { Panel } from "../../elements/panel.js";
import { UISystem } from "../system.js";

/**
 * `server_form` 路由壳（生成 `RP/ui/server_form.json`）。
 *
 * 采用 Bedrock Wiki「Modifying Server Forms — Action Form」官方路由：
 *   main_screen_content ─(modification: insert_back controls)→ sapdon_form_factory_<屏幕名>
 *     └─ factory { name: server_form_factory, control_ids.long_form } → @<屏幕 ns>.root
 *          └─ root 面板（`$panel_id` 前缀门控，屏幕自己 UI 文件里的唯一根）
 *             └─ content@<ns>.<内容面板>（下） + buttons@<ns>.<按键面板>（上）
 *   vanilla long_form ─(modification: bindings)→ title 含 'sapdon_ui:' 时隐藏原生表单
 *
 * **每个 UI 文件只有一个根，元素 id 固定 `root`**（与 HUD 的 `root_panel`、容器的
 * `container_root_panel` 同一套「根面板」约定）：工厂一律导航到 `@<ns>.root`，
 * 具体显隐门控写在 root 上。多页面**不**靠多个根，而是在内容面板里用门控做（见手册 / PagePanel）。
 *
 * 关键收益：自定义页处于 main_screen_content 作用域 → #form_text / #title_text 均可解析。
 *
 * 日常用法见 `SapdonFormUI`（构造一个 UI 文件即自动调这里的注册）。
 */
export interface SapdonPageRegistration {
    /** 触发此屏的 ActionForm title，形如 `sapdon_ui:<屏幕名>` */
    panelId: string;
    /** 内容面板元素，或其 `ns.id` 引用串 */
    contentPanel: UIElement | string;
    /** 按键面板元素，或其 `ns.id` 引用串 */
    buttonsPanel?: UIElement | string;
    /** 屏幕名（同时是 gated factory 的 id 后缀）；缺省 `pageN` */
    name?: string;
}

export class ServerFormUI {
    /** 路由前缀：ActionForm title 含此前缀时隐藏原生表单并点亮自定义屏 */
    static readonly MARKER = "sapdon_ui:";
    static readonly NS = "server_form";
    /** 屏幕根面板的元素 id —— 每个 UI 文件里唯一，工厂的 `long_form` 永远指向 `@<ns>.root` */
    static readonly ROOT = "root";

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

    /**
     * 屏幕根面板：元素 id 固定 `root`，挂在屏幕自己的 UI 文件里。
     *
     * root 上写**显隐门控**（`$panel_id` 前缀匹配 title），root 下装两块：内容面板 + 按键面板。
     * 一个 UI 文件只应有**一个** root（同名 element 会互相覆盖）。
     */
    static createPageRoot(reg: { panelId: string; contentRef: string; buttonsRef: string }): UIElement {
        const root = new Panel(this.ROOT)
            .addVariable("panel_id", reg.panelId)
            .addVariable("title_text", "#title_text")
            .addVariable("form_text", "#form_text")
            .addControl(new UIElement("content", undefined, reg.contentRef))
            .addControl(new UIElement("buttons", undefined, reg.buttonsRef));
        // 门控：#title_text 含 <panelId> 前缀即命中（如 sapdon_ui:book），用 not((A-B)=A) 判定
        root.dataBinding.addDataBinding(new DataBindingObject().setBindingName("#title_text"));
        root.dataBinding.addDataBinding(
            new DataBindingObject()
                .setBindingType("view")
                .setSourcePropertyName(`(not( (#title_text - '${reg.panelId}') = #title_text))`)
                .setTargetPropertyName("#visible")
        );
        return root;
    }

    /**
     * 注册一屏：向 `main_screen_content` 追加一个 gated factory（`long_form` → `@<屏幕 ns>.root`）。
     * 门控在 root 上，不在这里 —— 所以 root 必须已进对应的 UI 文件（见 `createPageRoot` / `SapdonFormUI`）。
     */
    static registerPage(reg: SapdonPageRegistration): void {
        this._ensureBuilt();

        const name = reg.name ?? `page${this._pageCount}`;
        const contentRef = reg.contentPanel instanceof UIElement ? reg.contentPanel.id : reg.contentPanel;
        const ns = typeof contentRef === 'string' && contentRef.includes('.') ? contentRef.split('.')[0] : this.NS;

        const factory = new UIElement(`sapdon_form_factory_${name}`, "panel")
            .addProp("factory", {
                name: "server_form_factory",
                control_ids: { long_form: `@${ns}.${this.ROOT}` },
            });
        this._factories.push(factory.serialize());
        this._pageCount++;
    }

    static getSystem(): UISystem | null {
        return this._system ?? this._ensureBuilt();
    }
}
