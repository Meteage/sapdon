import { UIElement } from "../../elements/uiElement.js";
import { UISystem } from "../system.js";
import { ServerFormUI } from "./serverFormUI.js";

/**
 * 一个 sapdon 自定义屏 = **一个 UI 文件** = 一条路由（`SapdonCustomForm` 屏）。
 *
 * 构造即把「内容面板 + 按键面板」挂进文件，并建好**唯一的根面板** `root`
 * （`$panel_id` + `#title_text` 前缀门控 + 两个 `content@`/`buttons@` 引用），
 * 同时向 `server_form.json` 注册指向 `@<ns_nm>.root` 的 gated factory —— 调用方不需要再手写
 * `ServerFormUI.createPageRoot()` / `registerPage()`。
 *
 * ```ts
 * const content_panel = new Panel("apple_content_panel")
 * const buttons_panel = new Panel("apple_buttons_panel")
 * const apple = new SapdonFormUI("sapdon_ui:apple", content_panel, buttons_panel)   // → ui/sapdon_ui_apple.json
 * ```
 *
 * 标识串 `"ns:nm"` → **UI 文件与 namespace 都是 `ns_nm`**（`sapdon_ui:apple` → `ui/sapdon_ui_apple.json`，
 * namespace `sapdon_ui_apple`，引用前缀同它）；`nm` 另决定 gated factory 的 id 后缀与路由面板
 * `panelId = sapdon_ui:<nm>`。
 *
 * ⚠️ **一个文件只有一个 root**：多页面不靠多个根，而是在内容面板里用门控做（见 `PagePanelManage`）。
 * 要多个屏就各 new 一个；**`ns_nm` 相同 = 同名文件互相覆盖**（`_ui_defs` 也会重复）。
 */
export class SapdonFormUI {
    private system: UISystem;
    /** UI 文件的 namespace = `ns_nm`（文件里的引用前缀用的就是它） */
    private uiNamespace: string;
    private name: string;
    /** 本屏的路由面板（ActionForm title 用它点亮本屏） */
    private panelId: string;

    /**
     * @param identifier 屏标识 `"ns:nm"`（UI 文件名与 namespace 都取 `ns_nm`）
     * @param content 内容面板
     * @param buttons 按键面板（根面板固定渲染两块，缺一个引擎会报引用缺失）
     * @throws 标识串不含 `:`、或两个面板不是 UI 元素时抛错（防止 `undefined` 静默进产物）
     */
    constructor(identifier: string, content: UIElement, buttons: UIElement) {
        const parts = String(identifier ?? "").split(":");
        const ns = parts[0];
        const name = parts[1];
        if (!ns || !name) {
            throw new Error(`SapdonFormUI 的标识串必须是 "ns:nm"（UI 文件名 = ns_nm）：收到 ${identifier}`);
        }
        if (!(content instanceof UIElement)) {
            throw new Error(`SapdonFormUI("${identifier}") 需要内容面板（UI 元素）`);
        }
        if (!(buttons instanceof UIElement)) {
            throw new Error(`SapdonFormUI("${identifier}") 需要按键面板（UI 元素）`);
        }

        this.name = name;
        this.uiNamespace = `${ns}_${name}`;
        this.panelId = `${ServerFormUI.MARKER}${name}`;
        this.system = new UISystem(`${this.uiNamespace}:${this.uiNamespace}`, "ui/");

        // 两块面板进本文件
        this.system.addElement(content);
        this.system.addElement(buttons);

        const contentRef = `${this.uiNamespace}.${content.id}`;
        const buttonsRef = `${this.uiNamespace}.${buttons.id}`;

        // 屏幕根面板（元素 id 固定 `root`，门控写在它上面）进本文件；gated factory 进 server_form.json
        this.system.addElement(
            ServerFormUI.createPageRoot({ panelId: this.panelId, contentRef, buttonsRef })
        );
        ServerFormUI.registerPage({
            panelId: this.panelId,
            name,
            contentPanel: contentRef,
            buttonsPanel: buttonsRef,
        });
    }

    /** 本屏的 UI 文件（想再 `addElement` 加东西时用） */
    getSystem(): UISystem {
        return this.system;
    }
}
