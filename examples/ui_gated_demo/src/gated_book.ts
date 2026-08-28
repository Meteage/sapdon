import {
    Button, ButtonMapping, Control, DataBindingObject, FormButton, FormButtonGrid, Image, Input,
    Label, Layout, Panel, SapdonServerUI, Sprite, Text, UISystem, UIElement,
} from '@sapdon/core'

/**
 * 一页 = 一个内容元素 + 一个按钮组（对称门控）。
 * 内容/按钮组都以 page_id 门控；组内按钮以 setBinding(text) 门控。
 */

/** 一枚按钮 + 叠加式绝对落点（透传给 FormButtonGrid.addButton 的 pos，不传则走基坐标） */
export type GatedButton = { btn: FormButton; pos?: [number, number] }

export type GatedPage = {
    id: string
    content: UIElement
    buttons: GatedButton[]
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
    private size: [number|string, number|string]
    private background: string
    private name: string
    private namespace: string

    constructor(identifier: string, size: [number|string, number|string] = [320, 207], background: string = 'textures/ui/book_back') {
        const [namespace, name] = identifier.split(':')
        this.name = name
        this.namespace = namespace
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

        // 页面根壳：在本书的 UI 文件里注册 <name>（供 server_form 工厂 long_form 引用）
        this.system.addElement(
            SapdonServerUI.createPageRoot({
                name,
                panelId: `sapdon_ui:${name}`,
                contentRef: `${namespace}.${name}_content_panel`,
                buttonsRef: `${namespace}.${name}_buttons_panel`,
            })
        )
    }

    /** 注册一页：内容元素 + 该页按钮组（每枚 { btn, pos? }，按钮需已 setBinding） */
    addPage(id: string, content: UIElement, buttons: GatedButton[] = []): this {
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

/** 退出按钮：一次按压映射 menu_select → menu_exit 关闭表单（全局常显） */
    private createCloseButton(): UIElement {
        return new Button('close_button')
            .setLayout(new Layout().setSize([14, 14]).setAnchorFrom('top_right').setAnchorTo('top_right'))
            .setInput(new Input().setButtonMappings([
                new ButtonMapping().setMappingType('pressed')
                    .setFromButtonId('button.menu_select')
                    .setToButtonId('button.menu_exit'),
            ]))
            .addControls([
                new UIElement('default', undefined, 'book.close_button_default'),
                new UIElement('hover', undefined, 'book.close_button_hover'),
                new UIElement('pressed', undefined, 'book.close_button_pressed'),
            ])
    }

    build(): void {
        // —— 内容面板：多内容页，按 binding_text 门控 ——
        const content_panel = new Panel(`${this.name}_content_panel`)
            .setLayout(new Layout().setSize(this.size))
            .addControl(new Image('gated_book_background').setSprite(new Sprite().setTexture(this.background)))

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
            // 每个页面一个 FormButtonGrid：按钮必须 addButton 进去才生效（游离按钮绑定无效）
            const grid = new FormButtonGrid(`${p.id}_buttons`, { dimensions: [Math.max(p.buttons.length, 1), 1], size: ['100%', '100%'] }).enableDebug()
            p.buttons.forEach((b, i) => grid.addButton(i, b.btn, b.pos))
            const built = grid.build()
            this.gate(built, p.id)
            groups_root.addControl(built)
        }
        buttons_panel.addControl(groups_root)
        buttons_panel.addControl(this.createCloseButton())

        this.system.addElement(content_panel)
        this.system.addElement(buttons_panel)
    }

    getSystem(): UISystem {
        return this.system
    }
}