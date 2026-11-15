import { DataBindingObject } from "../../dataBindingObject.js";
import { UIElement } from "../../elements/uiElement.js";

/** 门控模式：`prefix` = body 以 tag 开头即命中（手册那套）；`eq` = body 与 tag 全等 */
export type PageGateMode = "prefix" | "eq";

/** 一页：面板 + 它的门控标签（运行期 `.body(tag)` 要 emit 的串） */
export interface PagePanelPage {
    /** 该页的根面板（会被挂进门控容器） */
    panel: UIElement;
    /** 门控标签；缺省用面板 id */
    tag?: string;
    /** 覆盖本页用的 Molang 变量名（缺省 `gtag` / `binding_text`） */
    variable?: string;
}

export interface PagePanelOptions {
    /** 门控容器：一屏之内的内容面板（通常就是 `SapdonFormUI` 的内容面板） */
    container: UIElement;
    /** 初始页；也可以在构造后链式 `addPage()` */
    pages?: PagePanelPage[];
    /** 门控模式，缺省 `prefix` */
    mode?: PageGateMode;
}

const DEFAULT_VARIABLE: Record<PageGateMode, string> = { prefix: "gtag", eq: "binding_text" };

function gateExpression(mode: PageGateMode, variable: string): string {
    // prefix：`#form_text` 以 tag 开头即命中 —— 这正是手册索引分页的写法（"INDEX" / "IDX|p1" 靠前缀分流）
    return mode === "prefix"
        ? `(not( (#form_text - $${variable}) = #form_text))`
        : `($${variable} = #form_text)`;
}

/**
 * PagePanelManage —— **一屏之内多页面**的构建期管理器（`SapdonCustomForm` 屏的常规做法）。
 *
 * 一个 UI 文件只有一个根 `root`，所以「多页面」不是多个根，而是在**同一份内容面板**里放多块面板，
 * 每块挂一条 `#form_text` 门控：运行期脚本 `.body(tag)` 命中哪一块就显示哪一块。
 * 本类把这套门控（变量 + 绑定 + 挂载顺序）收成一处，省掉手写绑定表达式。
 *
 * ```ts
 * const pager = new PagePanelManage(book_content_panel)          // 也可以传 { container, pages, mode }
 *     .addPage(indexPanel, "INDEX")
 *     .addPage(catPanel, "CAT:weapons")
 *     .build();                                                   // 返回 container（已挂好门控）
 * ```
 *
 * 两种写法都支持：
 *   - `new PagePanelManage(container)` + 链式 `addPage(panel, tag)`
 *   - `new PagePanelManage({ container, pages: [{ panel, tag }], mode })`
 *
 * ★ 它只管**构建期**：运行期仍由脚本自己 `.body(tag)`（`SapdonGuideBook` 侧的 `INDEX_*` 常量就是同一套规则）。
 * ★ 旧的写法（自己 `addVariable` + `addDataBinding`）不受影响，继续可用。
 */
export class PagePanelManage {
    private container: UIElement;
    private mode: PageGateMode;
    private pages: PagePanelPage[] = [];
    private mounted = false;

    constructor(containerOrOptions: UIElement | PagePanelOptions) {
        if (containerOrOptions instanceof UIElement) {
            this.container = containerOrOptions;
            this.mode = "prefix";
        } else if (containerOrOptions && containerOrOptions.container instanceof UIElement) {
            this.container = containerOrOptions.container;
            this.mode = containerOrOptions.mode ?? "prefix";
            for (const page of containerOrOptions.pages ?? []) this.addPage(page.panel, page.tag, page.variable);
        } else {
            throw new Error("PagePanelManage 需要一个门控容器面板（UI 元素），或 { container, pages?, mode? }");
        }
    }

    /**
     * 加一页（同时挂进容器）。
     *
     * @param panel 该页的根面板
     * @param tag 门控标签；缺省用面板 id
     * @param variable 覆盖 Molang 变量名（缺省 `gtag` / `binding_text`）
     * @throws 面板不是 UI 元素时抛错（防止 `undefined` 静默进产物）
     */
    addPage(panel: UIElement, tag?: string, variable?: string): this {
        if (!(panel instanceof UIElement)) {
            throw new Error("PagePanelManage.addPage 需要页面板（UI 元素）");
        }
        const page: PagePanelPage = { panel, tag: tag ?? panel.id, variable };
        this.pages.push(page);

        const varName = variable ?? DEFAULT_VARIABLE[this.mode];
        panel.addVariable(varName, page.tag as string);
        panel.dataBinding.addDataBinding(
            new DataBindingObject()
                .setBindingType("view")
                .setSourcePropertyName(gateExpression(this.mode, varName))
                .setTargetPropertyName("#visible")
        );
        this.container.addControl(panel);
        return this;
    }

    /** `addPage` 的别名（旧写法里叫 add 更顺手） */
    add(panel: UIElement, tag?: string, variable?: string): this {
        return this.addPage(panel, tag, variable);
    }

    /** 门控容器（页面都已挂上）；重复调用幂等 */
    build(): UIElement {
        this.mounted = true;
        return this.container;
    }

    /** 已登记的页（`tag` 与运行期 `.body(tag)` 一一对应，可据此生成脚本侧常量） */
    list(): { tag: string; id: string }[] {
        return this.pages.map((p) => ({ tag: p.tag as string, id: p.panel.id }));
    }

    /** 门控容器是否已 `build()` 过（诊断用） */
    isMounted(): boolean {
        return this.mounted;
    }
}
