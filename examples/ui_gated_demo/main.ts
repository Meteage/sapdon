import {
    FormButton, Label, Layout, Panel, Text, registry,
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

// ---------- 页内按钮 helper：FormButton（纯样式：三态纹理 + setBinding 门控 + 自带角锚） ----------
// binding 名 → 三态纹理（参考 NeoGuidebook：pageleft=上一页 / pageright=下一页 / shiftleft=首页）
const NAV_TEXTURES: Record<string, [string, string, string]> = {
    prev_button: ['textures/ui/book_pageleft_default', 'textures/ui/book_pageleft_hover', 'textures/ui/book_pageleft_pressed'],
    next_button: ['textures/ui/book_pageright_default', 'textures/ui/book_pageright_hover', 'textures/ui/book_pageright_pressed'],
    home_button: ['textures/ui/book_shiftleft_default', 'textures/ui/book_shiftleft_hover', 'textures/ui/book_shiftleft_pressed'],
}

const navBtn = (id: string, binding: string, anchor: string): FormButton =>
    new FormButton(id)
        .setTexture(...NAV_TEXTURES[binding])
        .setBinding(binding)
        .setAnchor(anchor)
        .setSize(24, 24)

// ---------- 3 页：每页各自的内容 + 按钮组（prev/next/home 按页配置） ----------
const book = new SymGatedBook('gateddemo:book', [320, 207])

book.addPage('page1', page('page1', '第一页', '正文：只有 next（跳转到第 2 页）'),
    [{ btn: navBtn('next', 'next_button', 'bottom_right') }])

book.addPage('page2', page('page2', '第二页', '正文：有 prev 与 next'),
    [{ btn: navBtn('prev', 'prev_button', 'bottom_left') }, { btn: navBtn('next', 'next_button', 'bottom_right') ,pos:[1,0]}])

book.addPage('page3', page('page3', '第三页', '正文：有 prev 与 home'),
    [{ btn: navBtn('prev', 'prev_button', 'bottom_left') }, { btn: navBtn('home', 'home_button', 'bottom_middle') ,pos:[1,0]}, { btn: navBtn('next', 'next_button', 'bottom_right') }])

book.build()

// 生成 server_form.json / book.json / _ui_defs.json
registry.submit()