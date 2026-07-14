# NeoGuidebook API 参考

NeoGuidebook 是基于 Minecraft Bedrock JSON UI 体系的指南书生成框架。使用链式 API 声明式构建页面，构建时自动序列化为 JSON UI，运行时通过 ActionFormData 触发显示。

---

## 目录

1. [概览](#1-概览)
2. [NeoGuidebook 类](#2-neoguidebook-类)
3. [NeoGuidebookPage 类](#3-neoguidebookpage-类)
4. [NeoGuidebookBridge 类](#4-neoguidebookbridge-类)
5. [ItemComponent 辅助](#5-itemcomponent-辅助)
6. [page_ids.json 生成](#6-page_idsjson-生成)
7. [运行时注册](#7-运行时注册)

---

## 1. 概览

### 工作流程

```
构建时 (main.ts)                     运行时 (index.ts)
─────────────────                   ─────────────────
ItemAPI.createItem()                system.beforeEvents.startup
  + setCustomComponentV2()            → registerCustomComponent()
  + setMaxStackSize()                 → onUse(event, params)
  + setDisplayName()                    → ActionFormData
  + setInteractButton()                   .title("book_name")
                                         .body("page_id")
NeoGuidebook("ns:name")               → 按钮 .button("prev_button")
  + addDoublePageStack(id, L, R)        .show(player)
  + addSinglePageStack(id, P)
  + addCustomButton(config)           NeoGuidebookBridge
                                     → 上一页/下一页/首页/章节跳转
registry.submit()
→ neo_guidebook.json                 page_ids.json
→ server_form.json                   供 Bridge 获取页面列表
→ page_ids.json
```

### 脚本 ↔ JSON UI 绑定

| ActionForm API | JSON UI 变量 | 说明 |
|----------------|-------------|------|
| `.title("name")` | `#title_text` | 选择自定义 UI 皮肤（匹配 server_form.json 注册名） |
| `.body("page_id")` | `#form_text` | 切换可见页面（匹配页面的 `$binding_text`） |
| `.button("text")` | `#form_button_text` | 匹配按钮的 `$binding_button_text`，控制哪个按钮 visible |

---

## 2. NeoGuidebook 类

用于创建指南书 UI 系统。

```typescript
import { NeoGuidebook } from '@sapdon/core'

const book = new NeoGuidebook(identifier, path, size?, options?)
```

### 构造参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `identifier` | `string` | 是 | — | 格式 `"命名空间:名称"`，如 `"my_mod:guidebook"` |
| `path` | `string` | 是 | — | UI 文件路径，通常 `"ui/"` |
| `size` | `[number, number]` | 否 | `[320, 207]` | 面板像素尺寸 |
| `options` | `object` | 否 | `{}` | 可选配置（见下文） |

### options 配置项

```typescript
{
    debug?: boolean                  // 是否输出调试信息
    buttons?: {
        prev?: { visible: boolean }  // 上一页按钮
        next?: { visible: boolean }  // 下一页按钮
        home?: { visible: boolean }  // 首页按钮
        close?: { visible: boolean } // 关闭按钮
    }
    textures?: {
        prevDefault?: string         // 上一页默认纹理
        prevHover?: string           // 上一页悬停纹理
        prevPressed?: string         // 上一页按压纹理
        nextDefault?: string         // 下一页默认纹理
        nextHover?: string           // 下一页悬停纹理
        nextPressed?: string         // 下一页按压纹理
        homeDefault?: string         // 首页默认纹理
        homeHover?: string           // 首页悬停纹理
        homePressed?: string         // 首页按压纹理
    }
}
```

### 方法

#### addDoublePageStack(page_id, left_page, right_page)

注册一个双页跨页（左右两页同时显示）。

```typescript
book.addDoublePageStack(
    'page_index0',          // page_id: string — 唯一标识，用于 body() 跳转
    leftPanel,              // left_page: Panel — NeoGuidebookPage.getPanel()
    rightPanel,             // right_page: Panel
    size?: [string, string] // 可选，左右比例，默认 ["50%","50%"]
)
```

#### addSinglePageStack(page_id, page)

注册一个单页（占满整个表单宽度）。

```typescript
book.addSinglePageStack(
    'page_index7',          // page_id: string
    pagePanel,              // page: Panel
    size?: [string, string] // 可选尺寸
)
```

#### addCustomButton(config)

添加自定义按钮。

```typescript
book.addCustomButton({
    id: 'my_button',                 // 按钮 ID
    defaultTexture: 'textures/ui/...',
    hoverTexture?: 'textures/ui/...',
    pressedTexture?: 'textures/ui/...',
    anchorFrom?: 'bottom_left',       // 锚点
    anchorTo?: 'bottom_left',
    offset?: [number, number],
    size?: [number | string, number | string]
})
```

#### getPageIds()

获取所有已注册页面的 ID 数组。

```typescript
const ids: string[] = book.getPageIds()
// → ["page_index0", "page_index1", ...]
```

#### getPageCount()

获取页面总数。

```typescript
const count: number = book.getPageCount()
```

---

## 3. NeoGuidebookPage 类

用于构建单个页面的内容。

```typescript
import { NeoGuidebookPage } from '@sapdon/core'

const page = new NeoGuidebookPage(id, size?)
```

### 构造参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | `string` | 是 | — | 页面唯一 ID |
| `size` | `[string, string]` | 否 | `["100%","100%"]` | 页面尺寸，百分比格式 |

### 布局方法

所有方法返回 `this`，支持链式调用。

#### addBookText(text, size?)

```typescript
page.addBookText(
    '这是正文内容',           // text: string
    ['100%', '70%']          // size?: [string, string]
)
```

#### addCategoryTitle(title, size?)

```typescript
page.addCategoryTitle(
    '架构概述',               // title: string
    ['100%', '15%']          // size?: [string, string]
)
```

#### addBookTitleBar(text, size?)

```typescript
page.addBookTitleBar(
    '欢迎使用手册',           // text: string
    ['100%', '15%']          // size?: [string, string]
)
```

#### addEmptySpace(size?)

```typescript
page.addEmptySpace(['100%', '5%'])
```

#### addDivider(size?)

```typescript
page.addDivider(['100%', '3%'])
```

#### addRecipeGrid(row, col, items, size?)

```typescript
page.addRecipeGrid(
    2,                                   // row: number
    3,                                   // col: number
    ['textures/items/iron_ingot', ...],  // items: string[]
    ['100%', '30%']                      // size?: [string, string]
)
```

#### addBookCategory(title, row, col, buttons, size?)

```typescript
page.addBookCategory(
    '物品分类',                           // title: string
    2,                                   // row: number
    3,                                   // col: number
    [{ id: 'tools', texture: '...' }],  // buttons
    ['100%', '60%']                      // size?: [string, string]
)
```

#### addChapter(name, texture)

```typescript
page.addChapter('架构概述', 'textures/items/map')
```

#### addChapters(chapters)

```typescript
page.addChapters([
    { chapter_name: '架构概述', chapter_texture: 'textures/items/map' },
    { chapter_name: '核心类',   chapter_texture: 'textures/items/iron_ingot' },
])
```

#### buildChapterList()

```typescript
page.buildChapterList()
```

#### getPanel()

```typescript
const panel = page.getPanel()
book.addDoublePageStack('page_0', panel, rightPanel)
```

#### clear()

```typescript
page.clear()
```

---

## 4. NeoGuidebookBridge 类

运行时导航管理器，封装了 ActionFormData 的显示和页面切换逻辑。

```typescript
import { NeoGuidebookBridge } from '<path>/page_bridge'

const bridge = new NeoGuidebookBridge(uiName, pageIds, options?)
```

### 构造参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `uiName` | `string` | 是 | 书名字，必须与 `title()` 一致 |
| `pageIds` | `string[]` | 是 | 页面 ID 列表，来自 `getPageIds()` |
| `options` | `object` | 否 | `{ debug: boolean }` |

### 方法

#### show(player, startIndex)

```typescript
bridge.show(player, 0)  // player: Player, startIndex: number
```

#### onPage(pageId, callbacks)

```typescript
bridge.onPage('page_index0', {
    onEnter: (pageId: string, index: number) => { /* 进入页面时调用 */ },
    onLeave: (pageId: string, index: number) => { /* 离开页面时调用 */ },
})
```

### 内置按钮映射

| ActionForm 按钮文字 | 对应 JSON UI 控件 | 行为 |
|-------------------|------------------|------|
| `"prev_button"` | 上一页按钮 | `currentIndex--` |
| `"next_button"` | 下一页按钮 | `currentIndex++` |
| `"home_button"` | 首页按钮 | `currentIndex = 0` |
| `"item_X_button"` | 章节选择按钮 | `currentIndex = X+1` |

---

## 5. ItemComponent 辅助

```typescript
import { ItemComponent } from '@sapdon/core'

// 设置自定义物品组件（指南书的核心）
ItemComponent.setCustomComponentV2('sapdon:neo_guibook', {})

// 其他物品组件
ItemComponent.setMaxStackSize(1)
ItemComponent.setDisplayName('我的手册')
ItemComponent.setInteractButton('打开')
```

### setCustomComponentV2(componentName, options)

参数 `componentName` 必须与运行时 `registerCustomComponent()` 注册的名字一致。这个值也会出现在物品 JSON 的 `components` 中。

---

## 6. page_ids.json 生成

`main.ts` 中调用 `getPageIds()` 后将结果写入文件，供运行时脚本使用：

```typescript
const pageIds: string[] = neo_guidebook.getPageIds()
fs.writeFileSync(
    path.join(process.cwd(), 'scripts', 'page_ids.json'),
    JSON.stringify(pageIds, null, 2)
)
```

生成的 `page_ids.json` 示例：

```json
["page_index0", "page_index1", "page_index2", "page_index3"]
```

---

## 7. 运行时注册

```typescript
// registry.ts — v2 API
import { system, world } from "@minecraft/server"
import { GuiBookItemComponent } from "./items/gui_book"

let registered = false

system.beforeEvents.startup.subscribe((initEvent: StartupEvent) => {
    if (registered) return
    registered = true
    initEvent.itemComponentRegistry.registerCustomComponent(
        "sapdon:neo_guibook",
        GuiBookItemComponent
    )
})
```
