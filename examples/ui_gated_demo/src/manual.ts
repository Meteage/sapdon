import {
    Button, ButtonMapping, Control, DataBindingObject, FormButton, FormButtonGrid, Image, Input, Label,
    Layout, Panel, SapdonServerUI, Sprite, StackPanel, Text, UISystem, UIElement,
} from '@sapdon/core'

/**
 * ManualBook —— 帕秋莉式手册（B1：Index 分类索引 + Text 动态文本页 + home/prev/next 导航）。
 *
 * 线协议（运行时发射）：
 *   body = "INDEX"         → 显示分类索引网格（子按钮 = 各分类，setBinding 精确门控）
 *   body = "TXT|<正文>"     → 显示文本页（Label 绑定 #form_text - "TXT|"，动态文本）
 *   title = "sapdon_ui:<name>"
 *   button(...)            → 集合 form_buttons：分类按钮 or 导航，均 exact-match 门控
 */

export interface ManualChapter {
    name: string
    icon: string
    /** 词条正文（多行，ENT 页逐行渲染） */
    lines: string[]
}

export interface ManualCategory {
    /** 英文 id（路由用，如 intro / routing / controls / undecided） */
    id: string
    /** 中文标题（左页标题） */
    title: string
    /** 简介正文（左页，多行，逐行渲染） */
    introLines: string[]
    /** 右页章节条目（4 条，暂不跳转） */
    chapters: ManualChapter[]
}

const NAV_TEXTURES: Record<string, [string, string, string]> = {
    prev_button: ['textures/ui/book_pageleft_default', 'textures/ui/book_pageleft_hover', 'textures/ui/book_pageleft_pressed'],
    next_button: ['textures/ui/book_pageright_default', 'textures/ui/book_pageright_hover', 'textures/ui/book_pageright_pressed'],
    home_button: ['textures/ui/book_shiftleft_default', 'textures/ui/book_shiftleft_hover', 'textures/ui/book_shiftleft_pressed'],
}

export class ManualBook {
    private system: UISystem
    private namespace: string
    private name: string
    private size: [number | string, number | string]
    private background: string
    private debug = false

    constructor(identifier: string, size: [number, number] = [320, 207], background: string = 'textures/ui/book_back') {
        const [namespace, name] = identifier.split(':')
        this.namespace = namespace
        this.name = name
        this.size = size
        this.background = background
        this.system = new UISystem(identifier, 'ui/')

        // 路由：server_form 只加 factory；页面根 <name> 在本文件注册
        SapdonServerUI.registerPage({
            panelId: `sapdon_ui:${name}`,
            name,
            contentPanel: `${namespace}.${name}_content_panel`,
            buttonsPanel: `${namespace}.${name}_buttons_panel`,
        })
        this.system.addElement(
            SapdonServerUI.createPageRoot({
                name,
                panelId: `sapdon_ui:${name}`,
                contentRef: `${namespace}.${name}_content_panel`,
                buttonsRef: `${namespace}.${name}_buttons_panel`,
            })
        )
    }

    enableDebug(): this {
        this.debug = true
        return this
    }

    /** 布局容器：<tag> 命中 #form_text（含 tag 即显示） */
    private gateLayout(elem: UIElement, tag: string): void {
        elem.addVariable('gtag', tag)
        elem.dataBinding.addDataBinding(
            new DataBindingObject().setBindingType('view')
                .setSourcePropertyName(`(not( (#form_text - $gtag) = #form_text))`)
                .setTargetPropertyName('#visible')
        )
    }

    private navButton(key: string): FormButton {
        const t = NAV_TEXTURES[key]
        const anchor = key === 'prev_button' ? 'bottom_left' : key === 'next_button' ? 'bottom_right' : 'bottom_middle'
        return new FormButton(key)
            .setBinding(key)
            .setTexture(t[0], t[1], t[2])
            .setAnchor(anchor)
            .setSize(24, 24)
    }

    private closeButton(): UIElement {
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

    /** NeoGuidebook 书页纸面：页脊 + 页边模板（左/右半页） */
    private bookPagePane(side: 'left' | 'right'): UIElement {
        const cr = side === 'left' ? 'book.page_crease_left_image' : 'book.page_crease_right_image'
        const ed = side === 'left' ? 'book.page_edge_left_image' : 'book.page_edge_right_image'
        const edOffset = side === 'left' ? [7, -1] : [-7, -1]
        const pane = new Panel(`book_${side}_panel`).setLayout(new Layout().setSize(['100%', '100%']))
        pane.addControl(
            new UIElement('page_crease_image', undefined, cr)
                .addProp('size', ['100% - 40px', '100% - 14px'])
                .addProp('offset', [0, -2])
        )
        pane.addControl(
            new UIElement('page_edge_image', undefined, ed)
                .addProp('size', ['100% - 7px', '100% - 16px'])
                .addProp('offset', edOffset)
        )
        return pane
    }

    /** 全幅纸页基底：横向 50/50 左右半页（crease+edge），layer 0 常显 */
    private bookPageBase(): UIElement {
        const stack = new StackPanel('book_page_base', undefined)
            .setOrientation('horizontal')
            .setLayout(new Layout().setSize(['100%', '100%']))
        stack.addStack(['50%', '100%'], this.bookPagePane('left'))
        stack.addStack(['50%', '100%'], this.bookPagePane('right'))
        return stack
    }

    /** 给游离 FormButton 注入集合/门控绑定（非 FormButtonGrid 场景，如章节条目行） */
    private wireButton(btn: FormButton): void {
        btn.dataBinding.addDataBinding(
            new DataBindingObject().setBindingType('collection_details').setBindingCollectionName('form_buttons')
        )
        btn.dataBinding.addDataBinding(
            new DataBindingObject().setBindingType('collection')
                .setBindingCollectionName('form_buttons')
                .setBindingName('#form_button_text')
        )
        btn.dataBinding.addDataBinding(
            new DataBindingObject().setBindingType('view')
                .setSourcePropertyName('($binding_button_text = #form_button_text)')
                .setTargetPropertyName('#visible')
        )
    }

    /** 章节列表列（章节标题 + 分割线 + ≤8 行条目） */
    private catListColumn(c: ManualCategory, k: number, side: string, start: number, end: number): UIElement {
        const col = new StackPanel(`cat_list_${c.id}_p${k}_${side}`, undefined)
            .setOrientation('vertical')
            .setLayout(new Layout().setSize(['100%', '100%']))
        col.addStack(['100%', '5%'], new Panel(`sp_c1_${c.id}_p${k}_${side}`))
        col.addStack(['100%', '10%'],
            new Label(`chapter_title_${c.id}_p${k}_${side}`, undefined).setText(new Text().setText('章节').setColor([0, 0, 0]).setTextAlignment('center'))
        )
        col.addStack(['100%', '5%'], new UIElement(`div_c_${c.id}_p${k}_${side}`, undefined, 'settings_common.option_group_section_divider'))
        const rows = new StackPanel(`cat_rows_${c.id}_p${k}_${side}`, undefined)
            .setOrientation('vertical')
            .setLayout(new Layout().setSize(['100%', '100%']))
        for (let gi = start; gi < end; gi++) {
            const ch = c.chapters[gi]
            const j = gi - start
            const key = `${c.id}_e${gi}`
            const rowPanel = new Panel(`item_panel_${c.id}_p${k}_${side}_${j}`).setLayout(new Layout().setSize(['100%', '100%']))
            const contentStack = new StackPanel(`item_${c.id}_p${k}_${side}_${j}`, undefined)
                .setOrientation('horizontal')
                .setLayout(new Layout().setSize(['100%', '100%']))
            contentStack.addStack(['15%', '100%'], new Panel(`sp_i1_${c.id}_p${k}_${side}_${j}`))
            contentStack.addStack(['10%', '100%'],
                new Image(`item_image_${c.id}_p${k}_${side}_${j}`, undefined).setSprite(new Sprite().setTexture(ch.icon))
            )
            contentStack.addStack(['60%', '100%'],
                new Label(`item_name_${c.id}_p${k}_${side}_${j}`, undefined).setText(new Text().setText(ch.name).setColor([0, 0, 0]).setTextAlignment('left'))
            )
            contentStack.addStack(['15%', '60%'], new Panel(`sp_i2_${c.id}_p${k}_${side}_${j}`))
            rowPanel.addControl(contentStack)
            // 顶层透明整行按钮（default 透明、hover 高亮），整行可点
            const topBtn = new FormButtonGrid(key, { size: ['100%', '100%'], dimensions: [1, 1] })
            topBtn.addButton(3 + j, new FormButton(key).setBinding(key).setTexture('', 'textures/ui/promotion_slot', ''), [0, 0])
            rowPanel.addControl(topBtn.build())
            rows.addStack(['100%', '10%'], rowPanel)
        }
        col.addStack(['100%', '80%'], rows)
        return col
    }

    /** 介绍列（标题 + 分割线 + 简介逐行）——仅 p0 左页 */
    private catIntroColumn(c: ManualCategory, k: number): UIElement {
        const col = new StackPanel(`cat_intro_col_${c.id}_p${k}`, undefined)
            .setOrientation('vertical')
            .setLayout(new Layout().setSize(['100%', '100%']))
        col.addStack(['100%', '5%'], new Panel(`sp_l1_${c.id}_p${k}`))
        col.addStack(['100%', '10%'],
            new Label(`cat_title_${c.id}_p${k}`, undefined).setText(new Text().setText(c.title).setColor([0, 0, 0]).setTextAlignment('center'))
        )
        col.addStack(['100%', '5%'], new UIElement(`div_l_${c.id}_p${k}`, undefined, 'settings_common.option_group_section_divider'))
        c.introLines.forEach((ln, i) =>
            col.addStack(['100%', '15%'],
                new Label(`cat_intro_${c.id}_p${k}_${i}`, undefined).setText(new Text().setText(ln).setColor([0, 0, 0]).setTextAlignment('left'))
            )
        )
        return col
    }

    /**
     * CAT 页（L2）：按词条数分页容器，门控 CAT:<id>|p<N>。
     * p0：左=介绍，右=章节 list（≤8）；p1+：左、右都是章节 list（容量 8+8=16，先填左列再右列）。
     */
    private catPages(c: ManualCategory): UIElement[] {
        const PER_ROW = 8
        const PER_PAGE = 16 // p1+ 容量：左 8 + 右 8
        const total = c.chapters.length
        const pageCount = 1 + Math.max(0, Math.ceil(Math.max(0, total - PER_ROW) / PER_PAGE))
        const pages: UIElement[] = []
        for (let k = 0; k < pageCount; k++) {
            const tag = `CAT:${c.id}|p${k}`
            const page = new Panel(`cat_${c.id}_p${k}`)
                .setLayout(new Layout().setSize(['95%', '90%']))
                .setControl(new Control().setLayer(5))
            this.gateLayout(page, tag)
            if (this.debug) page.enableDebug()

            const spread = new StackPanel(`cat_spread_${c.id}_p${k}`, undefined)
                .setOrientation('horizontal')
                .setLayout(new Layout().setSize(['100%', '100%']))

            if (k === 0) {
                spread.addStack(['50%', '100%'], this.catIntroColumn(c, k))
                spread.addStack(['50%', '100%'], this.catListColumn(c, k, 'r', 0, Math.min(PER_ROW, total)))
            } else {
                const base = PER_ROW + (k - 1) * PER_PAGE
                const leftEnd = Math.min(base + PER_ROW, total)
                const rightEnd = Math.min(leftEnd + PER_ROW, total)
                spread.addStack(['50%', '100%'], this.catListColumn(c, k, 'l', base, leftEnd))
                spread.addStack(['50%', '100%'], this.catListColumn(c, k, 'r', leftEnd, rightEnd))
            }
            page.addControl(spread)
            pages.push(page)
        }
        return pages
    }

    /** ENT 词条内容页（L3）：左=词条标题+正文逐行，右=空；门控 ENT:<id>:<gi>|（尾部 | 避免 1/10 前缀串误判） */
    private entPage(c: ManualCategory, gi: number): UIElement {
        const ch = c.chapters[gi]
        const tag = `ENT:${c.id}:${gi}|`
        const page = new Panel(`ent_${c.id}_${gi}`)
            .setLayout(new Layout().setSize(['95%', '90%']))
            .setControl(new Control().setLayer(5))
        this.gateLayout(page, tag)
        if (this.debug) page.enableDebug()

        const spread = new StackPanel(`ent_spread_${c.id}_${gi}`, undefined)
            .setOrientation('horizontal')
            .setLayout(new Layout().setSize(['100%', '100%']))

        // 左页：空白5 / 标题10 / 分割5 / 正文逐行15%
        const left = new StackPanel(`ent_left_${c.id}_${gi}`, undefined)
            .setOrientation('vertical')
            .setLayout(new Layout().setSize(['100%', '100%']))
        left.addStack(['100%', '5%'], new Panel(`ent_sp1_${c.id}_${gi}`))
        left.addStack(['100%', '10%'],
            new Label(`ent_title_${c.id}_${gi}`, undefined).setText(new Text().setText(ch.name).setColor([0, 0, 0]).setTextAlignment('center'))
        )
        left.addStack(['100%', '5%'], new UIElement(`ent_div_${c.id}_${gi}`, undefined, 'settings_common.option_group_section_divider'))
        ch.lines.forEach((ln, i) =>
            left.addStack(['100%', '15%'],
                new Label(`ent_line_${c.id}_${gi}_${i}`, undefined).setText(new Text().setText(ln).setColor([0, 0, 0]).setTextAlignment('left'))
            )
        )

        // 右页：空
        const right = new Panel(`ent_right_${c.id}_${gi}`).setLayout(new Layout().setSize(['100%', '100%']))

        spread.addStack(['50%', '100%'], left)
        spread.addStack(['50%', '100%'], right)
        page.addControl(spread)
        return page
    }

    build(categories: ManualCategory[]): this {
        const ns = `${this.namespace}.${this.name}`

        // ---- 内容面板：大背景(layer0) + 纸页基底(layer0) + 内容层(layer5) ----
        const content = new Panel(`${this.name}_content_panel`).setLayout(new Layout().setSize(this.size as any))
        if (this.debug) content.enableDebug()
        content.addControl(new Image('book_background').setSprite(new Sprite().setTexture(this.background))) // layer 0：大背景
        content.addControl(this.bookPageBase()) // layer 0：纸页基底（全幅对开 crease+edge）
        if (this.debug) {
            // 调试：整本书中间上方显示当前 #form_text（body）值，layer 30 盖过一切
            content.addControl(
                new Label('form_debug', undefined)
                    .setText(new Text().setText('#form_text').setColor([0, 0, 0]).setTextAlignment('center'))
                    .setLayout(
                        new Layout().setSize(['100%', '8%'])
                            .setAnchorFrom('top_middle').setAnchorTo('top_middle').setOffset([0, 6])
                    )
                    .setControl(new Control().setLayer(30))
            )
        }

        // INDEX：内容层（layer 5），100% 全幅，盖在纸页之上
        const index = new Panel('index_layout')
            .setLayout(new Layout().setSize(['95%', '90%']))  //微调适配画面
            .setControl(new Control().setLayer(5))
        this.gateLayout(index, 'INDEX')
        if (this.debug) index.enableDebug()

        const spread = new StackPanel('index_spread', undefined)
            .setOrientation('horizontal')
            .setLayout(new Layout().setSize(['100%', '100%']))

        // 左半页：封面内容（纸页已在基底，这里仅放内容，layer 5）
        const left = new StackPanel('left_cover', undefined)
            .setOrientation('vertical')
            .setLayout(new Layout().setSize(['100%', '100%']))
        const ribbonBar = new Panel('cover_ribbon').setLayout(
            new Layout().setSize(['100%', '100%']).setOffset(["-8%" as any,0])
        )
            .addControl(new Image('ribbon_bg').setSprite(new Sprite().setTexture('textures/ui/saleribbon')).setLayout(new Layout().setSize(['100%', '100%'])))
            .addControl(
                new Label('cover_title', undefined)
                    .setText(new Text().setText('  Sapdon 手册 \n           1st 版 by meteage')
                    .setColor([0, 0, 0]).setTextAlignment('left'))
                    .setLayout(new Layout().setSize(['100%', '100%']).setAnchorTo('center'))
            )
        left.addStack(['100%', '5%'], new Panel('sp_top')) // 标题带上侧 5% 空隙
        left.addStack(['100%', '20%'], ribbonBar)
        left.addStack(['100%', '5%'], new Panel('sp_top')) // 标题带下侧 5% 空隙
        const coverLines = [
            'hi 开发者，欢迎使用 Sapdon 手册。',
            '本手册为基岩版开发者提供了简单容易的',
            '手册前置库。',
        ]
        coverLines.forEach((ln) => left.addStack(['100%', '15%'],
            new Label('cover_line', undefined).setText(new Text().setText(ln).setColor([0, 0, 0]).setTextAlignment('left'))
        ))
        spread.addStack(['50%', '100%'], left)

        // 右半页：分类索引内容（layer 5）
        const right = new StackPanel('right_index', undefined)
            .setOrientation('vertical')
            .setLayout(new Layout().setSize(['100%', '100%']))
        right.addStack(['100%', '5%'], new Panel('sp0'))
        right.addStack(['100%', '10%'],
            new Label('cat_title', undefined).setText(new Text().setText('类别').setColor([0, 0, 0]).setTextAlignment('center'))
        )
        right.addStack(['100%', '3%'], new UIElement('div1', undefined, 'settings_common.option_group_section_divider'))
                
        const catRow = new FormButtonGrid(`cat_row`,{size:["90%","90%"],dimensions:[4,1]})
        const INDEX_ICONS = ['textures/items/book_writable', 'textures/items/comparator', 'textures/items/paper', 'textures/items/iron_ingot']
        INDEX_ICONS.forEach((ic, i) =>
            catRow.addButton(3+i,new FormButton(`idx${i}`).setBinding(`idx${i}`).setTexture(ic, ic, ic).setSize("60%","60%"),[i,0])
        )
        right.addStack(['100%', '20%'], catRow.build())
        right.addStack(['100%', '3%'], new UIElement('div2', undefined, 'settings_common.option_group_section_divider'))
        right.addStack(['100%', '59%'], new Panel('sp_end'))
        spread.addStack(['50%', '100%'], right)

        index.addControl(spread)
        content.addControl(index)

        // TXT：动态文本页（layer 5）
        const txt = new Panel('text_layout')
            .setLayout(new Layout().setSize(['100%', '100%']))
            .setControl(new Control().setLayer(5))
        this.gateLayout(txt, 'TXT|')
        if (this.debug) txt.enableDebug()
        const txtLabel = new Label('text_body', undefined)
            .setText(new Text().setText('TXT|').setColor([0, 0, 0]).setTextAlignment('left'))
            .setLayout(new Layout().setSize(['80%', '80%']).setAnchorTo('center'))
        if (this.debug) txtLabel.enableDebug()
        txtLabel.dataBinding.addDataBinding(
            new DataBindingObject().setBindingType('view')
                .setSourcePropertyName(`(#form_text - 'TXT|')`)
                .setTargetPropertyName('#text')
        )
        txt.addControl(txtLabel)
        content.addControl(txt)

        // CAT 页（L2）：每个分类的页容器（layer 5，CAT:<id>|p<N> 门控）
        categories.forEach((c) => this.catPages(c).forEach((pg) => content.addControl(pg)))

        // ENT 页（L3）：每个词条一个内容页容器（layer 5，ENT:<id>:<gi>| 门控）
        categories.forEach((c) => c.chapters.forEach((_, gi) => content.addControl(this.entPage(c, gi))))

        // ---- 按键面板：导航网格 + 关闭 ----
        const buttons = new Panel(`${this.name}_buttons_panel`).setControl(new Control().setLayer(10)).setLayout(new Layout().setSize(this.size as any))
        if (this.debug) buttons.enableDebug()
        buttons.addControl(this.closeButton())
        const navGrid = new FormButtonGrid('nav_grid', { dimensions: [3, 1], size: ['100%', '100%'] })
        if (this.debug) navGrid.enableDebug()
        ;(['prev_button', 'home_button', 'next_button']).forEach((k, i) => navGrid.addButton(i, this.navButton(k),[i,0]))
        buttons.addControl(navGrid.build())

        this.system.addElement(content)
        this.system.addElement(buttons)
        return this
    }

    getSystem(): UISystem {
        return this.system
    }
}