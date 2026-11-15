import { Button } from '../../elements/button.js'
import { ButtonMapping } from '../../buttonMapping.js'
import { Control } from '../../properties/control.js'
import { DataBindingObject } from '../../dataBindingObject.js'
import { FormButton } from './formButton.js'
import { FormButtonGrid } from './formButtonGrid.js'
import { Grid } from '../../elements/grid.js'
import { GridProp } from '../../properties/gridProp.js'
import { Image } from '../../elements/image.js'
import { Input } from '../../properties/input.js'
import { Label } from '../../elements/label.js'
import { Layout } from '../../properties/layout.js'
import { Panel } from '../../elements/panel.js'
import { ServerFormUI } from './serverFormUI.js'
import { Sprite } from '../../properties/sprite.js'
import { StackPanel } from '../../elements/stackPanel.js'
import { Text } from '../../properties/text.js'
import { UISystem } from '../system.js'
import { UIElement } from '../../elements/uiElement.js'

/**
 * SapdonGuideBook —— 帕秋莉式手册（分类索引 INDEX + 词条列表 CAT + 内容页 ENT + home/prev/next 导航）。
 *
 * 线协议（运行时发射）：
 *   body = "INDEX"              → 索引页 p0（左封面 + 右半页 ≤16 张分类卡）
 *   body = "IDX|p<N>"           → 索引页 p1+（左右半页各 ≤8 张卡，先填左列再填右列）
 *   body = "CAT:<id>|p<N>"      → 分类页（p0 左简介/右 list，p1+ 左右 list）
 *   body = "ENT:<id>:<gi>|p<N>" → 词条内容页（按 pageType 渲染、可分页）
 *   title = "sapdon_ui:<name>"
 *   button(...)                 → 集合 form_buttons：分类按钮 idx<i> or 导航，均 exact-match 门控
 *
 * 索引页（INDEX）分页规则：
 *   每页最多 IDX_PER_PAGE(16) 张分类卡；p0 用右半页（4 列 × ≤4 行 = ≤16），
 *   p1+ 左右半页各一列（4 列 × ≤2 行 = ≤8/列），**先填左列再填右列**；
 *   卡片绑定名 = 分类在 build() 入参里的全局序号（idx0..idxN），跨页唯一。
 *   分类 ≤16 时只有 p0，body 仍是历史上的 "INDEX"（旧脚本无需改动）。
 *
 * ⚠️ p1+ 的 body 用 "IDX|p<N>" 而非 "INDEX|p<N>"：门控是「包含」匹配（见 gateLayout），
 *    "INDEX|p1" 会同时命中 p0 的 "INDEX"，让封面与 p0 卡格一起亮起来；
 *    "IDX|p1" 不含 "INDEX" 子串，两页互斥。
 */

export type GuideBookPageType = 'text' | 'crafting' | 'spotlight' | 'image'

/**
 * 手册里由框架渲染的固定标签（i18n 接入点）。
 *
 * ⚠️ 框架**不做任何 lang 键解析**：这里拿到什么字符串就原样交给 `Text.setText`，
 *    JSON UI 自己会解析 `fz.gb.ui.chapter` 这类键。所以传 lang 键的项目**必须**
 *    在 `RP/texts/*.lang` 里定义该键，否则界面显示裸键名。
 * ⚠️ 默认值 = 历史上的中文字面量，**故意保持现状**：不传 labels 的项目产物逐字节不变
 *    （回归基线见 AGENTS.md / doc/guidebook.md：guidebook_demo 的 book.json 587870 字节）。
 */
export interface GuideBookLabels {
    /** CAT 页章节列表的标题 */
    chapter: string
    /** INDEX 页索引卡列的标题 */
    category: string
}

/** 手册固定标签的默认值（= 历史字面量，改它会让所有既有项目产物变化） */
export const DEFAULT_GUIDE_BOOK_LABELS: GuideBookLabels = {
    chapter: '章节',
    category: '类别',
}

export interface GuideBookOptions {
    /** 覆盖框架渲染的固定标签（只传要改的键，其余走默认值） */
    labels?: Partial<GuideBookLabels>
}

export interface GuideBookChapter {
    name: string
    icon: string
    /** 词条正文（多行，ENT 页逐行渲染；text 类型按 5 行/半页分页） */
    lines: string[]
    /** 页类型（默认 text） */
    pageType?: GuideBookPageType
    /** crafting：3×3 合成格（9 项，空位 ''）+ 输出图标 */
    craft?: { grid: string[]; output: string }
    /** spotlight：大图标 + 描述 */
    spotlight?: { icon: string; desc: string }
    /** image：整页图 + 说明 */
    image?: { texture: string; caption: string }
}

export interface GuideBookCategory {
    /** 英文 id（路由用，如 intro / routing / controls / undecided） */
    id: string
    /** 中文标题（左页标题 / 索引卡名称） */
    title: string
    /** 分类图标（索引卡） */
    icon: string
    /** 简介正文（左页，多行，逐行渲染） */
    introLines: string[]
    /** 右页章节条目 */
    chapters: GuideBookChapter[]
}

/**
 * INDEX 索引卡排布参数（与 CAT 列表页的视觉节奏一致：半页宽一列、每行 4 张卡）。
 *   p0 ：右半页 4 列 × ≤4 行 = ≤16 张（左半页是封面）
 *   p1+：左半页 4 列 × ≤2 行 + 右半页 4 列 × ≤2 行 = ≤16 张/页（先左后右）
 */
const IDX_COLS = 4
const IDX_ROWS_P0 = 4
const IDX_ROWS_COL = 2
const IDX_PER_PAGE = IDX_COLS * IDX_ROWS_P0 // = 16
const IDX_PER_COL = IDX_COLS * IDX_ROWS_COL // = 8（p1+ 每半页容量）
/**
 * INDEX 页在运行期 form 里的**前导槽位数**：prev / home / next 固定占槽 0-2，
 * 所以第一张分类卡永远落在槽 3（与 CAT/ENT 页的 `<id>_e<gi>` 起始槽一致）。
 * ⚠️ 卡片注册进 FormButtonGrid 时用的 index 必须是**槽位序号**（历史上写死 `3 + i`）：
 *    Bedrock 的集合格盘靠 grid_position（行优先序号）把格子绑到对应的 form 按钮，
 *    视觉落点由 addButton 的 pos 决定 —— 见 addIndexColumn 的注释。
 */
const IDX_SLOT_BASE = 3

const NAV_TEXTURES: Record<string, [string, string, string]> = {
    prev_button: ['textures/ui/book_pageleft_default', 'textures/ui/book_pageleft_hover', 'textures/ui/book_pageleft_pressed'],
    next_button: ['textures/ui/book_pageright_default', 'textures/ui/book_pageright_hover', 'textures/ui/book_pageright_pressed'],
    home_button: ['textures/ui/book_shiftleft_default', 'textures/ui/book_shiftleft_hover', 'textures/ui/book_shiftleft_pressed'],
}

export class SapdonGuideBook {
    private system: UISystem
    private namespace: string
    /** UI 文件的 namespace = `ns_nm`（文件名同它；框架的命名约定，见 `SapdonFormUI`） */
    private uiNamespace: string
    private name: string
    private size: [number | string, number | string]
    private background: string
    private debug = false
    /** 框架渲染的固定标签（i18n；默认值 = 历史中文字面量） */
    private labels: GuideBookLabels = { ...DEFAULT_GUIDE_BOOK_LABELS }
    private coverTitle = '  Sapdon 手册 \n           1st 版 by meteage'
    private coverLines = [
        'hi 开发者，欢迎使用 Sapdon 手册。',
        '本手册为基岩版开发者提供了简单容易的',
        '手册前置库。',
    ]

    constructor(
        identifier: string,
        size: [number, number] = [320, 207],
        background: string = 'textures/ui/book_back',
        options: GuideBookOptions = {},
    ) {
        const [namespace, name] = identifier.split(':')
        this.namespace = namespace
        this.name = name
        // UI 文件与 namespace 都用 `ns_nm`：`gateddemo:book` → `ui/gateddemo_book.json`
        this.uiNamespace = `${namespace}_${name}`
        this.size = size
        this.background = background
        this.setLabels(options.labels ?? {})
        this.system = new UISystem(`${this.uiNamespace}:${this.uiNamespace}`, 'ui/')

        // 路由：server_form 只加 factory（指向本文件的 root）；根面板在本类注册
        // （手册的内容/按键面板在 build() 里才建，构造期只拿得到引用串 ⇒ 这里用低层接口而非 SapdonFormUI；
        //   挂载顺序 root → 各面板 也决定了产物里的键序，动它会破坏 guidebook_demo 的逐字节基线）
        ServerFormUI.registerPage({
            panelId: `sapdon_ui:${name}`,
            name,
            contentPanel: `${this.uiNamespace}.${name}_content_panel`,
            buttonsPanel: `${this.uiNamespace}.${name}_buttons_panel`,
        })
        this.system.addElement(
            ServerFormUI.createPageRoot({
                panelId: `sapdon_ui:${name}`,
                contentRef: `${this.uiNamespace}.${name}_content_panel`,
                buttonsRef: `${this.uiNamespace}.${name}_buttons_panel`,
            })
        )
    }

    enableDebug(): this {
        this.debug = true
        return this
    }

    /** 自定义封面：标题（可含 \n）+ 简介行 */
    setCover(title: string, lines: string[]): this {
        this.coverTitle = title
        this.coverLines = lines
        return this
    }

    /**
     * 覆盖框架渲染的固定标签（章节 / 类别）。
     * 只传要改的键，其余保持**当前值**（增量合并，可反复调用）——
     * 传 lang 键如 'fz.gb.ui.chapter' 时由 JSON UI 自行解析。
     */
    setLabels(labels: Partial<GuideBookLabels>): this {
        this.labels = {
            chapter: labels.chapter ?? this.labels.chapter,
            category: labels.category ?? this.labels.category,
        }
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
    private catListColumn(c: GuideBookCategory, k: number, side: string, start: number, end: number, slotBase: number): UIElement {
        const col = new StackPanel(`cat_list_${c.id}_p${k}_${side}`, undefined)
            .setOrientation('vertical')
            .setLayout(new Layout().setSize(['100%', '100%']))
        col.addStack(['100%', '5%'], new Panel(`sp_c1_${c.id}_p${k}_${side}`))
        col.addStack(['100%', '10%'],
            new Label(`chapter_title_${c.id}_p${k}_${side}`, undefined).setText(new Text().setText(this.labels.chapter).setColor([0, 0, 0]).setTextAlignment('center'))
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
            topBtn.addButton(slotBase + j, new FormButton(key).setBinding(key).setTexture('', 'textures/ui/promotion_slot', ''), [0, 0])
            rowPanel.addControl(topBtn.build())
            rows.addStack(['100%', '10%'], rowPanel)
        }
        col.addStack(['100%', '80%'], rows)
        return col
    }

    /** 介绍列（标题 + 分割线 + 简介逐行）——仅 p0 左页 */
    private catIntroColumn(c: GuideBookCategory, k: number): UIElement {
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
    private catPages(c: GuideBookCategory): UIElement[] {
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
                spread.addStack(['50%', '100%'], this.catListColumn(c, k, 'r', 0, Math.min(PER_ROW, total), IDX_SLOT_BASE))
            } else {
                const base = PER_ROW + (k - 1) * PER_PAGE
                const leftEnd = Math.min(base + PER_ROW, total)
                const rightEnd = Math.min(leftEnd + PER_ROW, total)
                spread.addStack(['50%', '100%'], this.catListColumn(c, k, 'l', base, leftEnd, IDX_SLOT_BASE))
                spread.addStack(['50%', '100%'], this.catListColumn(c, k, 'r', leftEnd, rightEnd, IDX_SLOT_BASE + (leftEnd - base)))
            }
            page.addControl(spread)
            pages.push(page)
        }
        return pages
    }

    /** ENT 词条内容页（L3）：按 pageType 分派布局；text 按 5 行/半页分页；门控 ENT:<id>:<gi>|p<N> */
    private entPages(c: GuideBookCategory, gi: number): UIElement[] {
        const ch = c.chapters[gi]
        const type = ch.pageType ?? 'text'
        const LINES_PER_HALF = 5   // 每半页最多 5 行
        const pageCount = type === 'text' ? Math.max(1, Math.ceil(ch.lines.length / (LINES_PER_HALF * 2))) : 1
        const pages: UIElement[] = []
        for (let ep = 0; ep < pageCount; ep++) {
            const tag = `ENT:${c.id}:${gi}|p${ep}`
            const page = new Panel(`ent_${c.id}_${gi}_p${ep}`)
                .setLayout(new Layout().setSize(['95%', '90%']))
                .setControl(new Control().setLayer(5))
            this.gateLayout(page, tag)
            if (this.debug) page.enableDebug()

            const spread = new StackPanel(`ent_spread_${c.id}_${gi}_p${ep}`, undefined)
                .setOrientation('horizontal')
                .setLayout(new Layout().setSize(['100%', '100%']))

            // 左页：空白5 / 标题10 / 分割5 / 正文（按类型）
            const left = new StackPanel(`ent_left_${c.id}_${gi}_p${ep}`, undefined)
                .setOrientation('vertical')
                .setLayout(new Layout().setSize(['100%', '100%']))
            left.addStack(['100%', '5%'], new Panel(`ent_sp1_${c.id}_${gi}_p${ep}`))
            left.addStack(['100%', '10%'],
                new Label(`ent_title_${c.id}_${gi}_p${ep}`, undefined).setText(new Text().setText(ch.name).setColor([0, 0, 0]).setTextAlignment('center'))
            )
            left.addStack(['100%', '5%'], new UIElement(`ent_div_${c.id}_${gi}_p${ep}`, undefined, 'settings_common.option_group_section_divider'))

            // 右页（垂直 StackPanel；text 类型会把后半正文放进来，其他类型保持为空）
            const right = new StackPanel(`ent_right_${c.id}_${gi}_p${ep}`, undefined)
                .setOrientation('vertical')
                .setLayout(new Layout().setSize(['100%', '100%']))

            if (type === 'crafting') {
                // 三部分：合成台(3×3 Grid) + 箭头 + 产物，水平 StackPanel
                const craftArea = new StackPanel(`ent_craft_${c.id}_${gi}_p${ep}`, undefined)
                    .setOrientation('horizontal')
                    .setLayout(new Layout().setSize(['100%', '100%']))
                // ① 3×3 合成台：一个整体 Grid，背景统一，区分仅在于有无物品
                const grid = new Grid(`ent_grid_${c.id}_${gi}_p${ep}`)
                    .setGridProp(new GridProp().setGridDimensions([3, 3]))
                    .setLayout(new Layout().setSize(['100%', '100%']))
                for (let idx = 0; idx < 9; idx++) {
                    const tex = ch.craft?.grid[idx]
                    const cell = new Panel(`ent_cell_${c.id}_${gi}_p${ep}_${idx}`)
                        .setLayout(new Layout().setSize(['100%', '100%']))
                        .addControl(
                            new Image(`ent_cellslot_${c.id}_${gi}_p${ep}_${idx}`, undefined)
                                .setSprite(new Sprite().setTexture('textures/ui/slot_enabled'))
                                .setLayout(new Layout().setSize(['100%', '100%']))
                        )
                    if (tex) {
                        cell.addControl(
                            new Image(`ent_cellitem_${c.id}_${gi}_p${ep}_${idx}`, undefined)
                                .setSprite(new Sprite().setTexture(tex))
                                .setLayout(new Layout().setSize(['88%', '88%']).setAnchorTo('center'))
                        )
                    }
                    grid.addGridItem([idx % 3, Math.floor(idx / 3)], cell, `grid_item_${idx}`)
                }
                craftArea.addStack(['44%', '100%'], grid)
                // ② 箭头（官方 textures/ui/arrow）
                craftArea.addStack(['14%', '100%'],
                    new Image(`ent_arrow_${c.id}_${gi}_p${ep}`, undefined)
                        .setSprite(new Sprite().setTexture('textures/ui/arrow'))
                        .setLayout(new Layout().setSize(['70%', '26%']).setAnchorTo('center'))
                )
                // ③ 产物（单个槽）
                craftArea.addStack(['32%', '100%'],
                    new Panel(`ent_outputslot_${c.id}_${gi}_p${ep}`)
                        .setLayout(new Layout().setSize(['78%', '78%']).setAnchorTo('center'))
                        .addControl(
                            new Image(`ent_outputslotbg_${c.id}_${gi}_p${ep}`, undefined)
                                .setSprite(new Sprite().setTexture('textures/ui/slot_enabled'))
                                .setLayout(new Layout().setSize(['100%', '100%']))
                        )
                        .addControl(
                            new Image(`ent_output_${c.id}_${gi}_p${ep}`, undefined)
                                .setSprite(new Sprite().setTexture(ch.craft?.output ?? ''))
                                .setLayout(new Layout().setSize(['88%', '88%']).setAnchorTo('center'))
                        )
                )
                left.addStack(['100%', '42%'], craftArea)
            } else if (type === 'spotlight') {
                left.addStack(['100%', '40%'],
                    new Image(`ent_spot_${c.id}_${gi}_p${ep}`, undefined)
                        .setSprite(new Sprite().setTexture(ch.spotlight?.icon ?? ''))
                        .setLayout(new Layout().setSize(['60%', '100%']).setAnchorTo('center'))
                )
                // 描述按 \n 拆成多行、左对齐渲染，避免单行长文本溢出
                const spotDescLines = (ch.spotlight?.desc ?? '').split('\n')
                spotDescLines.forEach((ln, di) => {
                    left.addStack(['100%', '8%'],
                        new Label(`ent_spotdesc_${c.id}_${gi}_p${ep}_${di}`, undefined).setText(new Text().setText(ln).setColor([0, 0, 0]).setTextAlignment('left'))
                    )
                })
            } else if (type === 'image') {
                left.addStack(['100%', '60%'],
                    new Image(`ent_img_${c.id}_${gi}_p${ep}`, undefined)
                        .setSprite(new Sprite().setTexture(ch.image?.texture ?? ''))
                        .setLayout(new Layout().setSize(['80%', '100%']).setAnchorTo('center'))
                )
                left.addStack(['100%', '15%'],
                    new Label(`ent_imgcap_${c.id}_${gi}_p${ep}`, undefined).setText(new Text().setText(ch.image?.caption ?? '').setColor([0, 0, 0]).setTextAlignment('left'))
                )
            } else {
                // text：先填左半页（最多 5 行），超出再填右半页；整体超过 10 行才分页
                const start = ep * LINES_PER_HALF * 2
                const end = Math.min(start + LINES_PER_HALF * 2, ch.lines.length)
                const leftEnd = Math.min(start + LINES_PER_HALF, end)
                for (let i = start; i < end; i++) {
                    const lineLabel = new Label(`ent_line_${c.id}_${gi}_p${ep}_${i}`, undefined)
                        .setText(new Text().setText(ch.lines[i]).setColor([0, 0, 0]).setTextAlignment('left'))
                    if (i < leftEnd) {
                        left.addStack(['100%', '15%'], lineLabel)
                    } else {
                        right.addStack(['100%', '15%'], lineLabel)
                    }
                }
            }

            spread.addStack(['50%', '100%'], left)
            spread.addStack(['50%', '100%'], right)
            page.addControl(spread)
            pages.push(page)
        }
        return pages
    }

    /** 一张索引卡：上图标、下名称（绑定名 = 分类全局序号 idx<i>） */
    private catCard(c: GuideBookCategory, i: number): FormButton {
        // 图标不再铺满整卡，名称独立放在下方，避免文字被图标遮挡
        return new FormButton(`idx${i}`)
            .setBinding(`idx${i}`)
            .setSize('80%', '80%')
            .setTexture('', 'textures/ui/promotion_slot', '')
            .addControl(
                new Image(`idx_icon_${i}`, undefined)
                    .setSprite(new Sprite().setTexture(c.icon))
                    .setLayout(new Layout().setSize(['60%', '60%']).setAnchorFrom('top_middle').setAnchorTo('top_middle').setOffset([0, -2]))
            )
            .addControl(
                new Label(`idx_name_${i}`, undefined)
                    .setText(new Text().setText(c.title).setColor([0, 0, 0]).setTextAlignment('center'))
                    .setLayout(new Layout().setSize(['100%', '30%']).setAnchorFrom('bottom_middle').setAnchorTo('bottom_middle').setOffset([0, -2]))
            )
    }

    /**
     * 往 col 里挂一列索引卡：空 5% / 标题 10% / 分割线 3% / 卡格 rows 行 / 分割线 3% / 余量。
     * 卡格 = 4 列 × rows 行的 FormButtonGrid，装 cards[start, end)（全局序号，先左后右逐行填）。
     * ids 由调用方给定，便于 p0 沿用历史元素名（right_index / cat_row / sp_end …）。
     *
     * ⚠️ slotBase = 本列第一张卡在运行期 form 里的**槽位序号**（INDEX 页固定 3：prev/home/next 占 0-2）。
     *    FormButtonGrid.addButton 的 index 会被编码成 grid_position，而 Bedrock 的集合格盘是靠
     *    grid_position（行优先序号）**把格子绑到对应的 form 按钮**上；视觉落点由第二个参数 pos 决定。
     *    所以 index 必须是槽位序号（历史上就是 `3 + i`），写成 0/1/2… 会让卡片绑到 no_prev/no_home/
     *    no_next 等占位槽，门控 `($binding_button_text = #form_button_text)` 全部不成立 → 卡片整片消失。
     */
    private addIndexColumn(
        col: StackPanel,
        ids: { spTop: string; title: string; divTop: string; row: string; divBottom: string; spBottom: string },
        cats: GuideBookCategory[],
        start: number,
        end: number,
        rows: number,
        slotBase: number,
    ): void {
        col.addStack(['100%', '5%'], new Panel(ids.spTop))
        col.addStack(['100%', '10%'],
            new Label(ids.title, undefined).setText(new Text().setText(this.labels.category).setColor([0, 0, 0]).setTextAlignment('center'))
        )
        col.addStack(['100%', '3%'], new UIElement(ids.divTop, undefined, 'settings_common.option_group_section_divider'))

        const grid = new FormButtonGrid(ids.row, { size: ['90%', '90%'], dimensions: [IDX_COLS, rows] })
        for (let i = start; i < end; i++) {
            const j = i - start
            grid.addButton(slotBase + j, this.catCard(cats[i], i), [j % IDX_COLS, Math.floor(j / IDX_COLS)])
        }
        // 卡格高度：每行 20%（= 历史单行高度），最多吃到 79%（给上下两条分割线留位）
        const gridH = Math.min(79, rows * 20)
        col.addStack(['100%', `${gridH}%`], grid.build())
        col.addStack(['100%', '3%'], new UIElement(ids.divBottom, undefined, 'settings_common.option_group_section_divider'))
        const rest = 79 - gridH
        if (rest > 0) col.addStack(['100%', `${rest}%`], new Panel(ids.spBottom))
    }

    /** 索引卡分几页：p0 容量 16，p1+ 每页 16（左 8 + 右 8） */
    private indexPageCount(total: number): number {
        return total <= IDX_PER_PAGE ? 1 : 1 + Math.ceil((total - IDX_PER_PAGE) / IDX_PER_PAGE)
    }

    build(categories: GuideBookCategory[]): this {
        const ns = `${this.uiNamespace}.${this.name}`

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
        // 门控 "INDEX" 命中所有索引页 body（p0 = "INDEX"，p1+ = "IDX|pN"，见类注释）
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
                    .setText(new Text().setText(this.coverTitle)
                    .setColor([0, 0, 0]).setTextAlignment('left'))
                    .setLayout(new Layout().setSize(['100%', '100%']).setAnchorTo('center'))
            )
        left.addStack(['100%', '5%'], new Panel('sp_top')) // 标题带上侧 5% 空隙
        left.addStack(['100%', '20%'], ribbonBar)
        left.addStack(['100%', '5%'], new Panel('sp_top')) // 标题带下侧 5% 空隙
        this.coverLines.forEach((ln) => left.addStack(['100%', '15%'],
            new Label('cover_line', undefined).setText(new Text().setText(ln).setColor([0, 0, 0]).setTextAlignment('left'))
        ))
        spread.addStack(['50%', '100%'], left)

        // 右半页：索引页 p0 的分类卡（4 列 × ≤4 行 = ≤16 张；分类 ≤4 时就是历史版式）
        const total = categories.length
        const idxPageCount = this.indexPageCount(total)
        const p0End = Math.min(IDX_PER_PAGE, total)
        const p0Rows = Math.max(1, Math.ceil(p0End / IDX_COLS))
        const right = new StackPanel('right_index', undefined)
            .setOrientation('vertical')
            .setLayout(new Layout().setSize(['100%', '100%']))
        this.addIndexColumn(right, {
            spTop: 'sp0', title: 'cat_title', divTop: 'div1', row: 'cat_row', divBottom: 'div2', spBottom: 'sp_end',
        }, categories, 0, p0End, p0Rows, IDX_SLOT_BASE)
        spread.addStack(['50%', '100%'], right)

        index.addControl(spread)
        content.addControl(index)

        // INDEX p1+（≥17 个分类才有）：卡片占满左右半页，每页 16 = 左列 8（先填）+ 右列 8
        for (let k = 1; k < idxPageCount; k++) {
            const page = new Panel(`index_page_${k}`)
                .setLayout(new Layout().setSize(['95%', '90%']))
                .setControl(new Control().setLayer(5))
            this.gateLayout(page, `IDX|p${k}`)
            if (this.debug) page.enableDebug()

            const pSpread = new StackPanel(`idx_spread_p${k}`, undefined)
                .setOrientation('horizontal')
                .setLayout(new Layout().setSize(['100%', '100%']))
            const base = IDX_PER_PAGE + (k - 1) * IDX_PER_PAGE
            const leftEnd = Math.min(base + IDX_PER_COL, total)
            const rightEnd = Math.min(leftEnd + IDX_PER_COL, total)
            // 同一页两列用同一个 rows，保证标题/分割线左右对齐
            const rows = Math.max(1, Math.ceil(Math.max(leftEnd - base, rightEnd - leftEnd) / IDX_COLS))
            // 空列（末页右列常为空）不放「类别」标题与分割线，留白纸页即可
            const addCol = (side: 'l' | 'r', start: number, end: number) => {
                if (end <= start) {
                    pSpread.addStack(['50%', '100%'], new Panel(`idx_col_p${k}_${side}_empty`))
                    return
                }
                const col = new StackPanel(`idx_col_p${k}_${side}`, undefined)
                    .setOrientation('vertical')
                    .setLayout(new Layout().setSize(['100%', '100%']))
                // 槽位：左列从槽 3 起，右列接在左列卡片之后（槽位序号必须与运行期 form 的按钮顺序一致）
                const slotBase = IDX_SLOT_BASE + (side === 'l' ? 0 : leftEnd - base)
                this.addIndexColumn(col, {
                    spTop: `idx_sp_top_p${k}_${side}`, title: `idx_title_p${k}_${side}`, divTop: `idx_div_top_p${k}_${side}`,
                    row: `idx_row_p${k}_${side}`, divBottom: `idx_div_bottom_p${k}_${side}`, spBottom: `idx_sp_bottom_p${k}_${side}`,
                }, categories, start, end, rows, slotBase)
                pSpread.addStack(['50%', '100%'], col)
            }
            addCol('l', base, leftEnd)
            addCol('r', leftEnd, rightEnd)
            page.addControl(pSpread)
            content.addControl(page)
        }

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

        // ENT 页（L3）：每个词条的内容页容器（layer 5，ENT:<id>:<gi>|p<N> 门控）
        categories.forEach((c) => c.chapters.forEach((_, gi) => this.entPages(c, gi).forEach((pg) => content.addControl(pg))))

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
