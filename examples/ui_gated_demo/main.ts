import { registry } from '@sapdon/core'
import { ManualBook } from './src/manual'

// 帕秋莉式手册：分类索引 → 各词条文本页
const book = new ManualBook('gateddemo:book', [320, 207]).enableDebug()

book.build([
    { key: 'layout', label: '布局', icon: 'textures/items/book_writable', text: '手册用可复用内容块 + 纵向 StackPanel 逐格排布页面，不靠绝对坐标。' },
    { key: 'routing', label: '路由', icon: 'textures/items/comparator', text: '每页一个独立 factory，页面根以 #title_text 前缀门控；#form_text 控布局。' },
    { key: 'buttons', label: '按钮', icon: 'textures/items/paper', text: 'FormButton 无文字贴图按钮，由 FormButtonGrid 注入集合/门控绑定。' },
])

registry.submit()