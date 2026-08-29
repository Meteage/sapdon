import { registry } from '@sapdon/core'
import { ManualBook } from './src/manual'

const PLACEHOLDER_ICONS = ['textures/items/book_writable', 'textures/items/comparator', 'textures/items/paper', 'textures/items/iron_ingot']
// 每分类词条数：intro 4 / layout 8 / controls 12 / undecided 5（>8 触发分页）
function chapters(n: number): { name: string; icon: string; lines: string[] }[] {
    return Array.from({ length: n }, (_, i) => ({
        name: `词条${i + 1}`,
        icon: PLACEHOLDER_ICONS[i % 4],
        lines: [`这是「词条${i + 1}」的内容占位行一。`, `这是「词条${i + 1}」的内容占位行二。`],
    }))
}

// 帕秋莉式手册：分类索引 → CAT:<id>|p<N>（p0 左简介/右 list，p1+ 左右 list）
const book = new ManualBook('gateddemo:book', [320, 207])

book.build([
    {
        id: 'intro', title: '介绍',
        introLines: [
            'hi 开发者，欢迎使用 Sapdon 手册。',
            '本手册由 sapdon 开发框架开发、构建，',
            '详细的项目地址 1 为 xxx。',
        ],
        chapters: chapters(4),
    },
    {
        id: 'routing', title: '路由',
        introLines: [
            '每页一个独立 factory，',
            '页面根以 #title_text 前缀门控；',
            '#form_text 控布局。',
        ],
        chapters: chapters(8),
    },
    {
        id: 'controls', title: '控件',
        introLines: [
            'FormButton 无文字贴图按钮，',
            '由 FormButtonGrid 注入',
            '集合/门控绑定。',
        ],
        chapters: chapters(12),
    },
    {
        id: 'undecided', title: '未定',
        introLines: [
            '该分类尚未确定内容。',
        ],
        chapters: chapters(5),
    },
])

registry.submit()