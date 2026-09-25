# Sapdon UI 页面壳系统 API 参考

> 按钮组件采用 `FormButton`（纯样式，`@common.button` 无文字）+ `FormButtonGrid`（格盘，注入集合/门控绑定）。背景与踩坑见 `doc/dev/ui-lessons.md`。

Sapdon UI 是一套「sapdon_ui: 前缀标题路由 + 页面壳」的自定义 Server Form UI 系统。它用 TypeScript 声明式生成 `server_form.json` 路由结构与每个页面的独立 UI 文件，运行时通过 `ActionFormData` 的 title 前缀自动分流：`sapdon_ui:` 开头的标题渲染自定义全屏 UI，其它标题走原版原生表单。

---

## 目录

1. [架构总览](#1-架构总览)
2. [ServerFormUI 类](#2-serverformui-类)
3. [SapdonFormUI 类](#3-sapdonformui-类)
4. [FormButtonGrid 类](#4-formbuttongrid-类)
5. [FormButton 类](#5-formbutton-类)
6. [运行时触发](#6-运行时触发)
7. [已知注意点](#7-已知注意点)

---

## 1. 架构总览

### 生成的文件（`registry.submit()` 后）

| 文件 | 内容 |
|------|------|
| `ui/server_form.json` | 路由壳：4 个元素（`main_screen_content` / `long_form` / 退出动画 / `third_party_server_screen`）+ 每屏一个 gated factory（`long_form` 一律 `@<ns_nm>.root`） |
| `ui/<ns_nm>.json` | 每个 `SapdonFormUI` 一个 UI 文件（内容面板 + 按键面板 + 根面板 `root`）。**文件名与文件里的 `namespace` 都是标识串的 `ns_nm`**（`sapdon_ui:apple` → `ui/sapdon_ui_apple.json`） |
| `ui/_ui_defs.json` | 自动登记所有 UI 文件 |

### 路由结构

```
third_party_server_screen@common.base_screen   (type: screen)
└─ $screen_content = server_form.main_screen_content      ← 直接落在 vanilla 作用域
   ├─ sapdon_form_factory_<屏名>@panel  (factory)
   │     control_ids.long_form = @<ns_nm>.root             ← 指向屏幕自己 UI 文件里的根面板
   │          └─ root Panel （$panel_id 前缀门控 title）
   │               ├─ content@<ns_nm>.<内容面板>   (下)
   │               └─ buttons@<ns_nm>.<按键面板>   (上, 后绘制覆盖)
   └─ (vanilla long_form 的 bindings 被注入) title 含 'sapdon_ui:' ⇒ 原生表单 #visible=false
```

> 自定义页直接挂在 `main_screen_content` 作用域里（而不是另起一块 screen），`#form_text` / `#title_text` 才是可解析的。

### 脚本 ↔ JSON UI 绑定

| ActionForm API | JSON UI 变量 | 说明 |
|----------------|-------------|------|
| `.title("sapdon_ui:xxx")` | `#title_text` | 前缀 `sapdon_ui:` = 自定义；`$panel_id` 精确匹配页面 |
| `.button("text")` | `#form_button_*` | 集合 `form_buttons`，网格按放置顺序绑定各按钮数据 |

---

## 2. ServerFormUI 类

负责生成 `server_form.json` 的路由壳（4 个元素 + 每条路由一个 gated factory），并提供页面注册入口。

> 旧名 `SapdonServerUI` 已改名，**不留别名**：把 `import` 里的名字改成 `ServerFormUI` 即可。

```typescript
import { ServerFormUI } from '@sapdon/core'

ServerFormUI.registerPage({
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
| `name` | `string` | ❌ | 工厂与页面根壳共用的控件名 |

### 自动生成的内容

- `third_party_server_screen@common.base_screen`：`$screen_content` 指向 `server_form.main_screen_content`，附带退出动画抑制与 `menu_cancel → menu_exit` 映射。
- `main_screen_content`：`size:[fill,fill]`，用 `modifications controls.insert_back` 注入**每条路由一个 gated factory**（`factory.control_ids.long_form = @<页 ns>.<页名>`）。
- `long_form`：注入两条 binding —— 声明 `#title_text`，并在 title 含 `sapdon_ui:` 时把**原生表单**置 `#visible = false`。
- `screen_exit_animation_pop_wait`：抑制退场动画的元素。

> 日常只需要 `new SapdonFormUI(...)`（下一节），它会替你调 `registerPage`；只有**一个文件里挂多条路由**时才需要手写：

```typescript
const system = form.getSystem()
system.addElement(ServerFormUI.createPageRoot({ panelId, contentRef, buttonsRef }))
ServerFormUI.registerPage({ panelId, name, contentPanel: contentRef, buttonsPanel: buttonsRef })
```

---

## 3. SapdonFormUI 类

**一个 `SapdonFormUI` = 一个 UI 文件（`ui/<ns_nm>.json`）= 一条路由。**

```typescript
import { SapdonFormUI, Panel } from '@sapdon/core'

const content = new Panel('apple_content_panel') /* …组内容… */
const buttons = new Panel('apple_buttons_panel') /* …放 FormButtonGrid… */

new SapdonFormUI('sapdon_ui:apple', content, buttons)   // 生成 ui/sapdon_ui_apple.json
registry.submit()
```

构造函数一句话办完四件事，**不需要**再手写 `createPageRoot()` / `registerPage()`：

1. 建 `UISystem('ui/<ns_nm>.json')`（文件名与 namespace 都取 `ns_nm`）；
2. 把「内容面板 + 按键面板」挂进该文件；
3. 建**唯一的根面板 `root`**：`$panel_id = sapdon_ui:<nm>`、`#title_text` 前缀门控、两个 `content@`/`buttons@` 引用；
4. 向 `server_form.json` 注册指向 `@<ns_nm>.root` 的 gated factory。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `identifier` | `string` | ✅ | `"ns:nm"`。**UI 文件名与 `namespace` 字段都取 `ns_nm`**（引用前缀同它）；`nm` 另决定 factory id 后缀与 `panelId = sapdon_ui:<nm>` |
| `content` | `UIElement` | ✅ | 内容面板；不是 UI 元素会抛错 |
| `buttons` | `UIElement` | ✅ | 按键面板（根面板固定渲染两块，缺一块引擎会报引用缺失，纯内容页也给个空 `Panel`） |

| 成员 | 说明 |
|------|------|
| `getSystem()` | 取本文件的 `UISystem`（想再 `addElement` 续挂元素时用） |

> `new SapdonFormUI('sapdon_ui:apple', …)` → `ui/sapdon_ui_apple.json`，namespace `sapdon_ui_apple`，引用 `sapdon_ui_apple.apple_content_panel`。
> **`ns_nm` 相同 = 同名文件互相覆盖**（`UISystemRegistry` 按路径覆盖、`_ui_defs` 出现重复项）⇒ 一个屏只 `new` 一次；要多个屏就各给各的 `ns:nm`。

### 一屏多页面：`PagePanelManage`（构建期）

一个 UI 文件**只有一个根面板 `root`**，所以「多页面」不是多个根，而是在**同一份内容面板**里放多块面板、每块挂一条 `#form_text` 门控 —— 运行期脚本 `.body(tag)` 命中哪一块就显示哪一块（手册就是这套）。

```typescript
import { PagePanelManage, Panel } from '@sapdon/core'

const content = new Panel('book_content_panel')
new PagePanelManage(content)                          // ① 容器 + 链式
    .addPage(index_panel, 'INDEX')                    //     tag 缺省 = 面板 id
    .addPage(cat_panel, 'CAT:weapons')
    .build()                                          //     返回容器（幂等）

new PagePanelManage({                                 // ② 一次性给全（等价）
    container: content,
    pages: [{ panel: index_panel, tag: 'INDEX' }],
    mode: 'prefix',                                   //     缺省就是 prefix
})
```

| 成员 | 说明 |
|------|------|
| `new PagePanelManage(container)` / `new PagePanelManage({ container, pages?, mode? })` | 两种写法等价；容器不是 UI 元素会抛错 |
| `addPage(panel, tag?, variable?)`（`add` 是别名） | 加一页：写 `$<variable>` 变量 + `#visible` 门控绑定 + 挂进容器；`tag` 缺省用面板 id |
| `build()` | 返回容器（已挂好各页）；重复调用幂等 |
| `list()` | `tag ↔ 面板 id` 对照，运行期脚本侧常量据此对齐 |

- `mode: 'prefix'`（缺省）= `$gtag` + `(not( (#form_text - $gtag) = #form_text))` —— body **以 tag 开头**即命中（手册的 `"INDEX"` / `"IDX|p1"` 靠前缀分流）。
- `mode: 'eq'` = `$binding_text` + `($binding_text = #form_text)` —— body **与 tag 全等**。
- 运行期仍是脚本自己 `.body(tag)`：本类**只做构建期**的门控与挂载，不碰脚本。
- 旧写法（自己 `addVariable('gtag', …)` + `addDataBinding(…)`）不受影响，继续可用。

---

## 4. FormButtonGrid 类

构建按键格盘（内部一个 `Grid`，`collection_name: form_buttons`）。构造函数必填 `dimensions` + `size`；`addButton(index, btn, pos?)` 逐枚**注入集合/门控绑定**并定位（`FormButton` 只有加进格盘才生效）。

```typescript
import { FormButton, FormButtonGrid } from '@sapdon/core'

const buttons = new FormButtonGrid("apple_buttons_grid", { dimensions: [2, 1], size: ["100%", "100%"] })
    .addButton(0, new FormButton("bt0").setAnchor("bottom_left"))
    .addButton(1, new FormButton("bt1").setAnchor("bottom_right"))
    .build()
```

| 方法 | 说明 |
|------|------|
| `constructor(id, { dimensions, size })` | `dimensions`=**[列, 行]**、`size`=面板大小，均必填 |
| `addButton(index, btn, pos?)` | `index` 决定基准格（`index%cols, index/cols`），`pos` 叠加；注入 collection 三件套绑定 |
| `enableDebug()` | 给每个格子描红调试框 |
| `build()` | 返回 `Grid` |

> **布局技巧**：`dimensions [2,1]` 把面板切成左右两份；按钮自身用 `setAnchor("bottom_left"/"bottom_right"/"top_right")` 贴到对应角。

---

## 5. FormButton 类

表单按钮（纯样式）封装：基底固定 `common.button`（**无文字 label**，绕开 `light_text_button` 的空 `binding_name` 坑），三态纹理由 `setTexture` 提供；集合/门控绑定由 `FormButtonGrid.addButton` 注入。

```typescript
import { FormButton } from '@sapdon/core'

new FormButton("bt0")
    .setTexture("textures/ui/..._default", "textures/ui/..._hover", "textures/ui/..._pressed")
    .setBinding("bt0")              // 门控键：== #form_button_text 时可见（绑定由 Grid 注入）
    .setAnchor("bottom_left")       // 锚点对齐
    .setSize(24, 24)
```

| 方法 | 说明 |
|------|------|
| `setTexture(d, h, p)` | 三态纹理（default / hover / pressed） |
| `setBinding(key)` | 门控键（仅记变量；真正绑定由 `FormButtonGrid` 注入） |
| `setAnchor(anchor)` | 设置锚点对齐（原地改，保留尺寸/offset） |
| `setSize(w, h)` | 设置尺寸（原地改，保留锚点/offset） |

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
