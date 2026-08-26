import {
    Label, Layout, Panel, SapdonButton, Text, UIElement, registry,
} from '@sapdon/core'
import { SymGatedBook } from './src/gated_book'

// ---------- 内容页 helper（唯一 id，深色文字便于阅读） ----------
function page(pageId: string, title: string, body: string): Panel {
    const p = new Panel(`${pageId}_content`).setLayout(new Layout().setSize(['100%', '100%']))
    p.addControl(
        new Label('title', undefined)
            .setText(new Text().setText(title).setColor([0, 0, 0]))
            .setLayout(new Layout().setSize(['100%', '15%']).setOffset([0, 24]))
    )
    p.addControl(
        new Label('body', undefined)
            .setText(new Text().setText(body).setColor([0, 0, 0]))
            .setLayout(new Layout().setSize(['100%', '60%']).setOffset([0, 70]))
    )
    return p
}

// ---------- 页内按钮 helper：SapdonButton + setBinding 门控 + 锚点 ----------
function navBtn(id: string, binding: string, anchor: string): SapdonButton {
    return new SapdonButton(id)
        .setBinding(binding)
        .setLayout(
            new Layout()
                .setSize([24, 24])
                .setAnchorFrom(anchor)
                .setAnchorTo(anchor)
        )
}

// ---------- 3 页：每页各自的内容 + 按钮组（prev/next/home 按页配置） ----------
const book = new SymGatedBook('gateddemo:book', [320, 207])

book.addPage('page1', page('page1', '第一页', '正文：只有 next（跳转到第 2 页）'),
    [navBtn('next', 'next_button', 'bottom_right')])

book.addPage('page2', page('page2', '第二页', '正文：有 prev 与 next'),
    [navBtn('prev', 'prev_button', 'bottom_left'), navBtn('next', 'next_button', 'bottom_right')])

book.addPage('page3', page('page3', '第三页', '正文：有 prev 与 home'),
    [navBtn('prev', 'prev_button', 'bottom_left'), navBtn('home', 'home_button', 'bottom_middle'),navBtn('next', 'next_button', 'bottom_right')])

book.build()

// 生成 server_form.json / book.json / _ui_defs.json
registry.submit()