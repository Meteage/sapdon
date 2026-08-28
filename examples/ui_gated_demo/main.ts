import { registry } from '@sapdon/core'
import { ManualBook } from './src/manual'

const PLACEHOLDER_ICONS = ['textures/items/book_writable', 'textures/items/comparator', 'textures/items/paper', 'textures/items/iron_ingot']
const CHAPTERS = PLACEHOLDER_ICONS.map((icon, i) => ({ name: `词条${i + 1}`, icon }))

// 帕秋莉式手册：分类索引 → CAT:<id>（左简介 + 右章节条目）
const book = new ManualBook('gateddemo:book', [320, 207]).enableDebug()

book.build([
    {
        id: 'intro', title: '介绍',
        introLines: [
            'hi 开发者，欢迎使用 Sapdon 手册。',
            '本手册由 sapdon 开发框架开发、构建，',
            '详细的项目地址 1 为 xxx。',
        ],
        chapters: CHAPTERS,
    },
    {
        id: 'routing', title: '路由',
        introLines: [
            '每页一个独立 factory，',
            '页面根以 #title_text 前缀门控；',
            '#form_text 控布局。',
        ],
        chapters: CHAPTERS,
    },
    {
        id: 'controls', title: '控件',
        introLines: [
            'FormButton 无文字贴图按钮，',
            '由 FormButtonGrid 注入',
            '集合/门控绑定。',
        ],
        chapters: CHAPTERS,
    },
    {
        id: 'undecided', title: '未定',
        introLines: [
            '该分类尚未确定内容。',
        ],
        chapters: CHAPTERS,
    },
])

registry.submit()