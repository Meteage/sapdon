# Sapdon UI 页面壳系统 API 参考

Sapdon UI 是一套「sapdon_ui: 前缀标题路由 + 页面壳」的自定义 Server Form UI 系统。它用 TypeScript 声明式生成 `server_form.json` 路由结构与每个页面的独立 UI 文件，运行时通过 `ActionFormData` 的 title 前缀自动分流：`sapdon_ui:` 开头的标题渲染自定义全屏 UI，其它标题走原版原生表单。

---

## 目录

1. [架构总览](#1-架构总览)
2. [SapdonServerUI 类](#2-sapdonserverui-类)
3. [SapdonPanel 类](#3-sapdonpanel-类)
4. [SapdonButtonPanel 类](#4-sapdonbuttonpanel-类)
5. [SapdonButton 类](#5-sapdonbutton-类)
6. [运行时触发](#6-运行时触发)
7. [已知注意点](#7-已知注意点)

---

## 1. 架构总览

### 生成的文件（`registry.submit()` 后）

| 文件 | 内容 |
|------|------|
| `ui/server_form.json` | 路由壳：屏幕、native/自定义分流、页面壳 `custom_panel_content`、按钮模板 `form_button` |
| `ui/sapdon_ui_xxx.json` | 每个页面一个独立文件（内容面板 + 按键面板） |
| `ui/_ui_defs.json` | 自动登记所有 UI 文件 |

### 路由结构

```
third_party_server_screen@common.base_screen   (type: screen)
└─ $screen_content = custom_full_screen
   ├─ native_form@main_screen_content
   │     visible = title 不含 'sapdon_ui:'
   └─ sapdon_custom_full@sapdon_screen_content
         visible = title 含 'sapdon_ui:'
         └─ (每个注册页) @custom_panel_content   ← $panel_id 精确匹配 title
              ├─ content@$user_content_panel    (下)
              └─ buttons@$user_buttons_panel    (上, 后绘制覆盖)
```

### 脚本 ↔ JSON UI 绑定

| ActionForm API | JSON UI 变量 | 说明 |
|----------------|-------------|------|
| `.title("sapdon_ui:xxx")` | `#title_text` | 前缀 `sapdon_ui:` = 自定义；`$panel_id` 精确匹配页面 |
| `.button("text")` | `#form_button_*` | 集合 `form_buttons`，网格按放置顺序绑定各按钮数据 |

---

## 2. SapdonServerUI 类

负责生成 `server_form.json` 的完整路由壳（屏幕、分流、页面壳、form_button 模板），并提供页面注册入口。

```typescript
import { SapdonServerUI } from '@sapdon/core'

SapdonServerUI.registerPage({
    panelId: "sapdon_ui:apple",          // title 精确匹配值（必须 sapdon_ui: 前缀）
    name: "apple",                        // 页面控件名（默认 pageN）
    contentPanel: "sapdon_ui_apple.apple_content_panel",  // 内容面板引用
    buttonsPanel: "sapdon_ui_apple.apple_buttons_panel",  // 按键面板引用（可选）
})
```

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `panelId` | `string` | ✅ | 触发此页的 ActionForm title（须含 `sapdon_ui:` 前缀） |
| `contentPanel` | `UIElement \| string` | ✅ | 内容面板元素或 `ns.name` 引用 |
| `buttonsPanel` | `UIElement \| string` | ❌ | 按键面板元素或引用（壳固定渲染，缺省会报引用缺失，纯内容页请传空面板） |
| `name` | `string` | ❌ | 注册在 `sapdon_screen_content` 里的控件名 |

### 自动生成的内容

- `third_party_server_screen@common.base_screen`：`$screen_content` 指向 `custom_full_screen`，附带退出动画抑制与 `menu_cancel → menu_exit` 映射。
- `custom_full_screen`：`native_form`（`((#title_text - 'sapdon_ui:') = #title_text)` → 非自定义显示）与 `sapdon_screen_content`（取反）分流。
- `sapdon_screen_content`：`sapdon_ui:` 前缀可见，承载所有注册页。
- `custom_panel_content`：通用页面壳，`(#title_text = $panel_id)` 精确匹配，内容(下)+按键(上)两块。
- `form_button@common_buttons.light_text_button`：框架固定提供的表单按钮模板（16×16，集合绑定 `form_buttons`）。

---

## 3. SapdonPanel 类

每个页面一个独立 UI 文件。把「内容面板 + 按键面板」组装进该页面的命名空间。

```typescript
import { SapdonPanel } from '@sapdon/core'

new SapdonPanel("sapdon_ui_apple")      // 生成 ui/sapdon_ui_apple.json (ns: sapdon_ui_apple)
    .setContent(contentPanel)            // 内容面板 UIElement
    .setButtons(buttonsPanel)            // 按键面板 UIElement
    .build()
```

| 方法 | 说明 |
|------|------|
| `setContent(panel)` | 设置内容面板元素（必须是 UIElement，其 id 即 `ns.xxx` 引用名） |
| `setButtons(panel)` | 设置按键面板元素 |
| `build()` | 返回生成的 `UISystem` |

> 页面的内容/按键面板元素 id 会作为 `registerPage` 里 `contentPanel`/`buttonsPanel` 的引用名，例如 `new Panel("apple_content_panel")` → `"sapdon_ui_apple.apple_content_panel"`。

---

## 4. SapdonButtonPanel 类

构建按键网格面板（grid）。网格通过 `collection_name: form_buttons` 提供每项数据上下文，`place()` 把按钮按 `grid_position` 摆到指定格（内部即 pos_wrap：面板包裹 + `grid_position`）。

```typescript
import { SapdonButtonPanel, SapdonButton } from '@sapdon/core'

const buttons = new SapdonButtonPanel("apple_buttons_panel")
    .setDimensions([2, 1])                       // [列, 行]
    .setCollection("form_buttons")               // 注入表单按钮集合
    .setSize(["100%", "100%"])
    .place([0, 0], new SapdonButton("bt0").setAnchor("bottom_left"))
    .place([1, 0], new SapdonButton("bt1").setAnchor("bottom_right"))
    .build()
```

| 方法 | 说明 |
|------|------|
| `setDimensions([cols, rows])` | 网格尺寸（**列 × 行**） |
| `setCollection(name)` | 注入集合（表单场景固定 `form_buttons`） |
| `setSize(size)` | 网格尺寸 |
| `place([col, row], element)` | 摆一个按钮/控件到指定格（自动包一层 pos_wrap） |
| `build()` | 返回 `Grid` |

> **布局技巧**：`grid_dimensions [2,1]` 把面板切成左右两份；格子内控件默认左上对齐，改锚点 `bottom_left` / `bottom_right` / `top_right` 即可把按钮贴到对应角。

---

## 5. SapdonButton 类

表单按钮的封装：默认模板固定为 `server_form.form_button`（吃 `form_buttons` 集合数据），无需手写模板引用。

```typescript
import { SapdonButton } from '@sapdon/core'

new SapdonButton("bt0")                 // → bt0@server_form.form_button
    .setAnchor("bottom_left")           // 锚点对齐，默认 32×32
```

| 方法 | 说明 |
|------|------|
| `setAnchor(anchor)` | 设置 `anchor_from`/`anchor_to` 对齐（如 `bottom_left`、`bottom_right`、`top_right`），默认尺寸 32×32 |

> 右上角的「退出」这类非集合按钮，请用普通 `Button("exit", "common.button")` + `$pressed_button_name: "button.menu_exit"` 手写，不占用表单按钮集合。

---

## 6. 运行时触发

```typescript
import { world } from "@minecraft/server"
import { ActionFormData } from "@minecraft/server-ui"

world.afterEvents.itemUse.subscribe((event) => {
    if (event.itemStack.typeId == "minecraft:apple") {
        new ActionFormData()
            .title("sapdon_ui:apple")          // 前缀路由 → 自定义页
            .body("...")
            .button("test1").button("test2")   // 喂给集合 form_buttons
            .show(event.source)
    }
})
```

- title 含 `sapdon_ui:` → 自定义全屏 UI；否则原版原生表单。
- 自定义页内的按钮点击通过 `button.form_button_click` 返回 `response.selection`（对应集合下标）。

---

## 7. 已知注意点

1. **`grid_position` 顺序**：本项目约定为 `[列, 行]`（与 `grid_dimensions [列, 行]` 一致）。
2. **grid 内 `offset` 无效**：网格接管子控件定位；要偏移请包一层 panel（pos_wrap），offset 放内层。
3. **`collection_index` 不是合法 UI 属性**：引擎会报 `Unknown property [collection_index]`。每个按钮对应哪个表单按钮，靠 grid 的集合上下文按放置顺序确定，不要用 `collection_index`。
4. **壳固定渲染 content+buttons 两块**：纯内容页也必须提供一个（空的）按键面板，否则 `$user_buttons_panel` 引用缺失报错。
5. **grid 数量绑定**：`#maximum_grid_items` 需 int（用 `#form_button_length`）；collection_panel 才用数组 `#form_button_contents` → `#collection_length`。
6. **裸引用**：页面壳里的 `content@$user_content_panel` / `buttons@$user_buttons_panel` 必须是裸引用（不带 `type`），否则网格类型被覆盖导致 `grid_dimensions`/`grid_position` 报未知属性。
