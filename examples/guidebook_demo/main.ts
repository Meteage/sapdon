import { registry, SapdonGuideBook } from '@sapdon/core'

// 帕秋莉式手册：INDEX 分类索引 → CAT:<id>|p<N> → ENT:<id>:<gi>|p<N>
// 本手册用它"自己介绍自己"，向手册开发者展示这套手册系统自身的各种功能。
const book = new SapdonGuideBook('gateddemo:book', [320, 207])

book.build([
    {
        id: 'intro', title: '简介', icon: 'textures/items/book_writable',
        introLines: [
            'hi 开发者，本手册由 Sapdon 的手册系统构建，',
            '它用自己来介绍自己——',
            '向你展示如何做一本帕秋莉式的手册。',
        ],
        chapters: [
            { name: '这是什么', icon: 'textures/items/book_writable', lines: ['Sapdon 手册是一套帕秋莉式手册系统：', '分类索引 → 词条列表 → 内容页。'] },
            { name: '三层结构', icon: 'textures/items/comparator', lines: ['INDEX 分类索引，CAT 词条列表，ENT 内容页，', '层层下钻，home 随时回首页。'] },
            { name: '如何打开', icon: 'textures/items/paper', lines: ['手持木棍右键打开本手册，', '点击分类卡进入相应内容。'] },
            { name: '内容由数据声明', icon: 'textures/items/iron_ingot', lines: ['所有分类与词条都在 main.ts 里声明，', '改内容 = 改数据，重新构建即可。'] },
        ],
    },
    {
        id: 'pages', title: '页类型', icon: 'textures/items/paper',
        introLines: [
            '词条页由 pageType 决定布局：',
            'text / crafting / spotlight / image 四种，',
            '下面逐类演示。',
        ],
        chapters: [
            { name: 'Text 文本页', icon: 'textures/items/book_writable', lines: ['默认 pageType=text，逐行渲染正文，', '每页最多 10 行（左右各 5），超出自动分页。'] },
            {
                name: 'Crafting 合成页', icon: 'textures/items/iron_ingot', pageType: 'crafting',
                craft: {
                    grid: ['textures/items/iron_ingot', 'textures/items/iron_ingot', 'textures/items/iron_ingot', 'textures/items/iron_ingot', '', 'textures/items/iron_ingot', 'textures/items/iron_ingot', '', 'textures/items/iron_ingot'],
                    output: 'textures/items/iron_leggings',
                },
                lines: ['铁锭围一圈 → 铁护腿', '3×3 布局由 craft.grid 指定。'],
            },
            {
                name: 'Spotlight 聚焦页', icon: 'textures/items/book_writable', pageType: 'spotlight',
                spotlight: { icon: 'textures/items/book_writable', desc: 'Spotlight 页：大图标 + 一段描述。\n适合物品 / 特性的聚焦介绍。' },
                lines: [],
            },
            {
                name: 'Image 图片页', icon: 'textures/items/paper', pageType: 'image',
                image: { texture: 'textures/ui/book_back', caption: 'Image 页：整页图 + 说明文字。' },
                lines: [],
            },
            {
                name: '词条分页演示', icon: 'textures/items/comparator',
                lines: [
                    '这是词条分页的演示：正文超过一屏（10 行）就会分页。',
                    '第 2 行：当前是第 1 页，共 2 页。',
                    '第 3 行：前 5 行先放左半页。',
                    '第 4 行：后 5 行放右半页。',
                    '第 5 行：所以一屏能放 10 行。',
                    '第 6 行：第 1 页到此结束。',
                    '第 7 行：点 next 进入第 2 页。',
                    '第 8 行：第 2 页的 prev 回到第 1 页。',
                    '第 9 行：home 随时回 INDEX。',
                    '第 10 行：第 2 页只剩两行。',
                    '第 11 行：这是第 2 页的最后一行。',
                    '第 12 行：本词条结束，next 隐藏。',
                ],
            },
            { name: '多类型混用', icon: 'textures/items/iron_ingot', lines: ['同一个分类里，不同词条可用不同 pageType，', '互不影响。'] },
        ],
    },
    {
        id: 'routing', title: '路由', icon: 'textures/items/comparator',
        introLines: [
            '手册用 body 携带路径 + 按钮槽位来路由：',
            'INDEX / CAT:<id>|p<N> / ENT:<id>:<gi>|p<N>。',
        ],
        chapters: [
            { name: 'INDEX 分类索引', icon: 'textures/items/book_writable', lines: ['首页展示分类卡（idx0..3），', '点击卡进入对应分类。'] },
            { name: 'CAT 词条列表', icon: 'textures/items/comparator', lines: ['分类页罗列该分类的词条，', '每列最多 8 行，超出则分页。'] },
            { name: 'ENT 内容页', icon: 'textures/items/paper', lines: ['词条内容页，按 pageType 渲染，', 'body 携带 ENT:<id>:<gi>|p<N>。'] },
            { name: 'prev / home / next', icon: 'textures/items/iron_ingot', lines: ['三枚导航按钮固定槽位，', '用 no_* 占位即隐藏不可用的那个。'] },
            { name: '分类分页', icon: 'textures/items/book_writable', lines: ['词条超过 8 条时，CAT 页自动分页：', 'p0 显示右列 8 行，p1+ 左右各 8 行。'] },
            { name: '词条翻页', icon: 'textures/items/comparator', lines: ['正文超过 5 行时 ENT 页分页，', '用 next / prev 翻阅，home 回首页。'] },
        ],
    },
    {
        id: 'controls', title: '控件', icon: 'textures/items/iron_ingot',
        introLines: [
            '手册界面由这些 UI 控件拼装，',
            '每个控件在源码里用类方法声明。',
        ],
        chapters: [
            { name: 'FormButton', icon: 'textures/items/book_writable', lines: ['无文字贴图按钮，基底 @common.button，', '三态纹理由 setTexture 提供。'] },
            { name: 'FormButtonGrid', icon: 'textures/items/comparator', lines: ['格盘负责摆位，并向 FormButton 注入', '集合与门控绑定。'] },
            { name: 'form_text 门控', icon: 'textures/items/paper', lines: ['布局容器用前缀匹配来显隐，', 'body 即当前节点 id。'] },
            { name: 'form_button_text 门控', icon: 'textures/items/iron_ingot', lines: ['按钮按其 setBinding 与发射的', 'form_button_text 精确匹配来显隐。'] },
            { name: 'StackPanel 布局', icon: 'textures/items/book_writable', lines: ['垂直 / 水平堆叠布局，addStack 按比例分块，', '适合把一屏分成上下 / 左右多块。'] },
            { name: 'Panel 容器', icon: 'textures/items/comparator', lines: ['最简单的容器元素，可放背景与控件，', '通过 setLayer 控制叠加次序。'] },
        ],
    },
])

registry.submit()
