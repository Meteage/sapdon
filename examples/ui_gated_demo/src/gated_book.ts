import {
    Control, DataBindingObject, Image, Label, Layout, Panel, SapdonButton,
    SapdonButtonPanel, SapdonServerUI, Sprite, Text, UISystem, UIElement,
} from '@sapdon/core'

/**
 * 一页 = 一个内容元素 + 一个按钮组（对称门控）。
 * 内容/按钮组都以 page_id 门控；组内按钮以 setBinding(text) 门控。
 */
export type GatedPage = {
    id: string
    content: UIElement
    buttons: SapdonButton[]
}

/**
 * SymGatedBook（test 类）：对称门控书 demo。
 *
 * 模型：内容面板与按钮面板对称——
 *   .body(page_id)          → #form_text    → 该页「内容元素 + 按钮组」激活
 *   .button(text)           → #form_button_text → 组内 setBinding(text) 的按钮可见
 *
 * 只做本模型，不复用原版 NeoGuidebook 逻辑（原代码保留不动）。
 */
export class SymGatedBook {
    private system: UISystem
    private pages: GatedPage[] = []
    private size: [number, number]
    private background: string
    private name: string

    constructor(identifier: string, size: [number, number] = [320, 207], background: string = 'textures/ui/book_back') {
        const [namespace, name] = identifier.split(':')
        this.name = name
        this.size = size
        this.background = background
        this.system = new UISystem(identifier, 'ui/')

        // 注册为 sapdon_ui: 前缀的自定义页面（内容面板 + 按键面板）
        SapdonServerUI.registerPage({
            panelId: `sapdon_ui:${name}`,
            name,
            contentPanel: `${namespace}.${name}_content_panel`,
            buttonsPanel: `${namespace}.${name}_buttons_panel`,
        })
    }

    /** 注册一页：内容元素 + 该页按钮组（按钮需已 setBinding） */
    addPage(id: string, content: UIElement, buttons: SapdonButton[] = []): this {
        this.pages.push({ id, content, buttons })
        return this
    }

    /** 内容/按钮组共用门控：body(page_id) → #form_text 命中时可见（Wiki 路由后再试 #form_text 是否可用） */
    private gate(elem: UIElement, pageId: string): void {
        elem.addVariable('binding_text', pageId)
        elem.dataBinding.addDataBinding(
            new DataBindingObject().setBindingType('view')
                .setSourcePropertyName('($binding_text = #form_text)')
                .setTargetPropertyName('#visible')
        )
    }

    build(): void {
        // —— 内容面板：多内容页，按 binding_text 门控 ——
        const content_panel = new Panel(`${this.name}_content_panel`)
            .setLayout(new Layout().setSize(this.size))
            // .addControl(new Image('gated_book_background').setSprite(new Sprite().setTexture(this.background)))

        const pages_root = new Panel('gated_book_pages_panel')
            .setLayout(new Layout().setSize(['100%', '100%']))
            .setControl(new Control().setLayer(5))
        // .enableDebug()
        for (const p of this.pages) {
            this.gate(p.content, p.id)
            pages_root.addControl(p.content)
        }
        content_panel.addControl(pages_root)

        // 中间显示当前 Form 正文（#form_text = body(page_id)）——隐式解析、置顶渲染
        const form_text = new Label('gated_form_text', undefined)
            .setText(new Text().setText('#form_text').setColor([0, 0, 0]).setTextAlignment('center'))
            .setLayout(new Layout().setSize(['100%', '20%']).setAnchorFrom('center').setAnchorTo('center'))
            .setControl(new Control().setLayer(10))
        content_panel.addControl(form_text)

        // —— 按钮面板：多按钮组，按 binding_text 门控；组内按钮按 setBinding 门控 ——
        const buttons_panel = new Panel(`${this.name}_buttons_panel`)
            .setLayout(new Layout().setSize(this.size))
            .enableDebug()
        const groups_root = new Panel('gated_book_button_groups_panel')
            .setLayout(new Layout().setSize(['100%', '100%']))
            .setControl(new Control().setLayer(5))
            // .enableDebug()
        for (const p of this.pages) {
            // 每个页面一个独立按钮 grid：按钮必须由 grid 管理，游离按钮绑定无效
            const grid = new SapdonButtonPanel(`${p.id}_buttons`)
                .setDimensions([Math.max(p.buttons.length, 1), 1])
                .setSize(['100%', '100%'])
                .setCollection('form_buttons')
                .enableDebug()
            p.buttons.forEach((b, i) => grid.place([i, 0], b))
            const built = grid.build()
            this.gate(built, p.id)
            groups_root.addControl(built)
        }
        buttons_panel.addControl(groups_root)

        this.system.addElement(content_panel)
        this.system.addElement(buttons_panel)
    }

    getSystem(): UISystem {
        return this.system
    }
}