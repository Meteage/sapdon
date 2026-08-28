import { Control, Image, Label, Layout, Panel, Sprite, StackPanel, Text, UIElement } from '@sapdon/core'

/**
 * 页面内容块 —— 只负责"渲染内容本身"，不设固定尺⼨/offset。
 * 尺寸与排布由页面用 StackPanel.addStack(size, block) 决定。
 * 模块级自增 id 保证同页多块不重名。
 */

let __blockUid = 0
function uid(prefix: string): string {
    return `${prefix}_${__blockUid++}`
}

/** 填充所在格 */
function fill(el: UIElement): UIElement {
    return el.setLayout(new Layout().setSize(['100%', '100%']).setAnchorTo('center'))
}

/** 页标题（居中深色） */
export function PageTitle(text: string): UIElement {
    return fill(
        new Label(uid('title'), undefined)
            .setText(new Text().setText(text).setColor([0, 0, 0]).setTextAlignment('center'))
            .setControl(new Control().setLayer(5))
    )
}

/** 正文段（左对齐深色） */
export function PageBody(text: string): UIElement {
    return fill(
        new Label(uid('body'), undefined)
            .setText(new Text().setText(text).setColor([0, 0, 0]).setTextAlignment('left'))
            .setControl(new Control().setLayer(5))
    )
}

/** 留白占位 */
export function Spacer(): UIElement {
    return fill(new Panel(uid('spacer')))
}

/** 水平分割线 */
export function Divider(): UIElement {
    return fill(
        new UIElement(uid('divider'), undefined, 'settings_common.option_group_section_divider')
            .setControl(new Control().setLayer(5))
    )
}

/** 图标 + 文字 行 */
export function IconLine(icon: string, text: string): UIElement {
    return fill(
        new StackPanel(uid('iconline'), undefined)
            .setOrientation('horizontal')
            .setControl(new Control().setLayer(5))
            .addStack(['20%', '100%'], new Image(uid('ico'), undefined).setSprite(new Sprite().setTexture(icon)))
            .addStack(['80%', '100%'], new Label(uid('txt'), undefined).setText(new Text().setText(text).setColor([0, 0, 0]).setTextAlignment('left')))
    )
}