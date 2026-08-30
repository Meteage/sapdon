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
        id: 'intro', title: '介绍', icon: 'textures/items/book_writable',
        introLines: [
            'hi 开发者，欢迎使用 Sapdon 手册。',
            '本手册由 sapdon 开发框架开发、构建，',
            '详细的项目地址 1 为 xxx。',
        ],
        chapters: [
            { name: '这是什么', icon: 'textures/items/book_writable', lines: ['Sapdon 手册是一套帕秋莉式的手册系统，', '基于 Server Form 的 #form_text 路由驱动。'] },
            { name: '三层结构', icon: 'textures/items/comparator', lines: ['INDEX 分类索引 → CAT 词条列表 → ENT 词条页，', '层层下钻，home 回首页。'] },
            { name: '页类型', icon: 'textures/items/paper', lines: ['词条页支持 Text / Crafting / Spotlight / Image，', '由 pageType 决定布局。'] },
            { name: '路由协议', icon: 'textures/items/iron_ingot', lines: ['body 携带路径：INDEX / CAT:<id>|p<N> / ENT:<id>:<gi>|，', '脚本按路径发射按钮集合。'] },
        ],
    },
    {
        id: 'routing', title: '路由', icon: 'textures/items/comparator',
        introLines: [
            '每页一个独立 factory，',
            '页面根以 #title_text 前缀门控；',
            '#form_text 控布局。',
        ],
        chapters: chapters(8),
    },
    {
        id: 'controls', title: '控件', icon: 'textures/items/paper',
        introLines: [
            'FormButton 无文字贴图按钮，',
            '由 FormButtonGrid 注入',
            '集合/门控绑定。',
        ],
        chapters: [
            { name: 'FormButton', icon: 'textures/items/book_writable', lines: ['无文字贴图按钮，基底 @common.button，', '三态纹理由 setTexture 提供。'] },
            { name: 'FormButtonGrid', icon: 'textures/items/comparator', lines: ['格盘负责摆位，并向 FormButton 注入', '集合/门控三组绑定。'] },
            { name: 'form_text 门控', icon: 'textures/items/paper', lines: ['布局容器用前缀匹配显隐，', 'body 即当前节点 id。'] },
            { name: '导航槽', icon: 'textures/items/iron_ingot', lines: ['每屏固定 [prev, home, next] 槽位，', '不需要时把键改名为 no_* 来隐藏。'] },
            {
                name: '合成示例', icon: 'textures/items/iron_ingot', pageType: 'crafting',
                craft: {
                    grid: ['textures/items/iron_ingot', 'textures/items/iron_ingot', 'textures/items/iron_ingot', 'textures/items/iron_ingot', '', 'textures/items/iron_ingot', 'textures/items/iron_ingot', '', 'textures/items/iron_ingot'],
                    output: 'textures/items/iron_leggings',
                },
                lines: ['铁锭 → 铁护腿', '3×3 布局由 craft.grid 指定。'],
            },
            {
                name: '聚焦示例', icon: 'textures/items/book_writable', pageType: 'spotlight',
                spotlight: { icon: 'textures/items/book_writable', desc: 'Spotlight 页：大图标 + 描述。' },
                lines: [],
            },
            {
                name: '图片示例', icon: 'textures/items/paper', pageType: 'image',
                image: { texture: 'textures/ui/book_back', caption: 'Image 页：整页图 + 说明。' },
                lines: [],
            },
            {
                name: '多页词条', icon: 'textures/items/comparator',
                lines: [
                    '这是一段演示词条多页的内容。',
                    '第 2 行：每页最多渲染 5 行。',
                    '第 3 行：超出则通过 next 翻页。',
                    '第 4 行：首页的 prev 返回分类。',
                    '第 5 行：本页结束。',
                    '第 6 行：下一页从这里开始。',
                    '第 7 行：下一页的 prev 是上一页。',
                    '第 8 行：home 随时回 INDEX。',
                    '第 9 行：接近结尾。',
                    '第 10 行：最后一页，next 隐藏。',
                ],
            },
            ...chapters(3),
        ],
    },
    {
        id: 'undecided', title: '未定', icon: 'textures/items/iron_ingot',
        introLines: [
            '该分类尚未确定内容。',
        ],
        chapters: chapters(5),
    },
])

registry.submit()