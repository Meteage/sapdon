# NeoGuidebook 实战经验教程

> 基于 `examples/digitCircuit` 真实接入跑通的实战总结。API 细节见 `api/neo-guidebook.md`；本文聚焦**能直接照抄的流程**和**踩过的坑**。

---

## 目录

1. [真实可用的 API 速览](#1-真实可用的-api-速览)
2. [完整工作流：构建时 + 运行时](#2-完整工作流构建时--运行时)
3. [构建时：定义书页（main.mjs）](#3-构建时定义书页mainmjs)
4. [运行时：物品开书（scripts/index.js）](#4-运行时物品开书scriptsindexjs)
5. [必须避免的坑](#5-必须避免的坑)
6. [验证清单](#6-验证清单)

---

## 1. 真实可用的 API 速览

框架在 `src/core/ui/systems/neoGuibook/` 提供两个高层类，构建时（main）使用：

| 类 | 用途 |
|---|---|
| `NeoGuidebook(identifier, path, size?, options?)` | 整本书：注册页面、按钮、背景 |
| `NeoGuidebookPage(id, size?)` | 单页内容：标题/正文/分割线/章节/分类 |

```js
// main.mjs（构建时）
import { NeoGuidebook, NeoGuidebookPage } from '@sapdon/core'

const book = new NeoGuidebook("my_mod:guidebook", "ui/", [320, 207], {
    debug: false,
    buttons: { prev: { visible: true }, next: { visible: true }, home: { visible: true }, close: { visible: true } },
    // textures: { prevDefault: "...", ... }  // 可选自定义按钮贴图
})
```

### NeoGuidebook 方法

| 方法 | 说明 |
|---|---|
| `addDoublePageStack(page_id, leftPanel, rightPanel, ratio?)` | 双页跨页，`ratio` 默认 `["50%","100%"]` |
| `addSinglePageStack(page_id, panel)` | 单页铺满 |
| `addCustomButton(config)` | 自定义按钮（id/position/offset/size/纹理/bindingButtonName） |
| `getPageIds(): string[]` | 全部页面 id，用于生成运行时清单 |
| `getPageCount(): number` | 页数 |

### NeoGuidebookPage 方法（链式）

| 方法 | 默认尺寸 | 说明 |
|---|---|---|
| `addCategoryTitle(text, size?)` | `["100%","10%"]` | 居中标题 |
| `addBookTitleBar(text, size?)` | `["100%","15%"]` | 顶部横幅标题 |
| `addBookText(text, size?)` | `["100%","15%"]` | 左对齐正文（支持 `\n` 换行） |
| `addEmptySpace(size?)` | `["100%","5%"]` | 空占位 |
| `addDivider(size?)` | `["100%","5%"]` | 分割线 |
| `addRecipeGrid(row, col, items, size?)` | `["100%","30%"]` | 配方网格（纹理路径数组） |
| `addBookCategory(title, row, col, buttons, size?)` | — | 物品分类网格 |
| `addChapter(name, texture)` / `addChapters([...])` | — | 章节目录项 |
| `buildChapterList()` | — | 生成"Chapters"目录块 |
| `getPanel(): Panel` | — | 交给 `addDoublePageStack` 用 |

> **注意**：`NeoGuidebookPage.addChapter/addChapters` 只是**声明数据**，必须再调 `buildChapterList()` 才会渲染成目录块。

---

## 2. 完整工作流：构建时 + 运行时

```
构建时 (main.mjs)                         运行时 (scripts/index.js)
──────────────────                       ──────────────────────────
NeoGuidebook(...) 定义书页                物品 custom component
  → 自动写 RP/ui/<name>.json               onUse →
  → 自动更新 RP/ui/server_form.json          new ActionFormData()
  → fs.writeFileSync(guide_pages.js)          .title("<书名>")
getPageIds() 写 scripts/guide_pages.js        .body(page_id)
                                               .button("prev_button") ...
```

三个产物必须同时存在，缺一 UI 打不开：

| 产物 | 作用 | 谁生成 |
|---|---|---|
| `dev/<proj>_RP/ui/<name>.json` | 书页 UI 控件 | `registry.submit()` 自动 |
| `dev/<proj>_RP/ui/server_form.json` | title 绑定 + 按钮工厂 | `ServerUISystem.bindingTitlewithContent` 自动 |
| `dev/<proj>_RP/ui/_ui_defs.json` | 声明所有 UI 文件 | `UISystemRegistry` 自动 |

> `server_form.json` 的 title 绑定是**累加**的（`#title_text - 'guidebook'`），加第二个书会自动并列，互不冲突。

---

## 3. 构建时：定义书页（main.mjs）

### 3.1 物品

```js
ItemAPI.createItem("my_mod:guidebook", ItemCategory.Equipment, "book_writable", {
    maxStackSize: 1,
    group: GROUP_TOOL,
    formatVersion: "1.21.90",
}).addComponent(
    ItemComponent.combineComponents(
        ItemComponent.setDisplayName("我的手册"),
        ItemComponent.setInteractButton("打开手册"),     // 必须！否则 onUse 不触发
        ItemComponent.setHandEquipped(true),
        ItemComponent.setCustomComponents(["my_mod:guidebook"])  // 组件名与运行时一致
    )
)
```

### 3.2 书页

```js
const cover = new NeoGuidebookPage("cover")
    .addEmptySpace(["100%", "8%"])
    .addBookTitleBar("我的手册\n    使用指导", ["100%", "18%"])
    .addBookText("这是正文。\n支持多行。", ["100%", "46%"])

const toc = new NeoGuidebookPage("toc")
    .addChapters([
        { chapter_name: "第一章", chapter_texture: "textures/items/iron_ingot" },
        { chapter_name: "第二章", chapter_texture: "textures/items/stick" },
    ])
    .buildChapterList()

book.addDoublePageStack("page_index0", cover.getPanel(), toc.getPanel())
book.addDoublePageStack("page_index1", leftPage.getPanel(), rightPage.getPanel())
```

### 3.3 生成页面清单（必须写成 .js）

```js
const pageIds = book.getPageIds()
fs.writeFileSync(
    path.join(process.cwd(), "scripts", "guide_pages.js"),
    "export const PAGE_IDS = " + JSON.stringify(pageIds, null, 2) + ";\n"
)
```

> 运行时导入路径固定为 `./guide_pages.js`（见下节），文件名别改。

---

## 4. 运行时：物品开书（scripts/index.js）

```js
import { ActionFormData } from "@minecraft/server-ui"
import { PAGE_IDS } from "./guide_pages.js"

// startup 回调内：
init.itemComponentRegistry.registerCustomComponent("my_mod:guidebook", {
    onUse(event) {
        const player = event.source
        if (!player || player.typeId !== "minecraft:player") return
        openGuidebook(player, 0)
    },
})

function openGuidebook(player, index) {
    const ids = PAGE_IDS.length ? PAGE_IDS : ["page_index0"]
    const current = Math.max(0, Math.min(index, ids.length - 1))
    const pageId = ids[current]

    const form = new ActionFormData()
        .title("guidebook")        // ← identifier 的 name 部分，不带命名空间！
        .body(pageId)              // ← 必须是 addDoublePageStack 的 page_id

    const actions = []
    if (current > 0) { form.button("prev_button"); actions.push("prev") }
    if (current < ids.length - 1) { form.button("next_button"); actions.push("next") }
    if (current !== 0) { form.button("home_button"); actions.push("home") }
    if (current === 0) {
        for (let i = 1; i < ids.length; i++) {
            form.button(`item_${i - 1}_button`)   // 目录跳转按钮
            actions.push(`goto:${i}`)
        }
    }

    form.show(player).then((response) => {
        if (response.canceled) return
        const action = actions[response.selection]
        if (!action) return
        if (action === "prev") openGuidebook(player, current - 1)
        else if (action === "next") openGuidebook(player, current + 1)
        else if (action === "home") openGuidebook(player, 0)
        else if (action.startsWith("goto:")) openGuidebook(player, parseInt(action.split(":")[1], 10))
    }).catch(() => {})
}
```

### 按钮文字是"键名"不是显示文本

`form.button("prev_button")` 的参数必须与 JSON UI 里按钮的 `$binding_button_text` 严格一致，否则按钮不显示/不可点。内置按钮键名：

| 键名 | 行为 |
|---|---|
| `prev_button` | 上一页 |
| `next_button` | 下一页 |
| `home_button` | 回首页 |
| `item_<N>_button` | 目录跳转到第 N+1 页 |

---

## 5. 必须避免的坑

### 坑 1：`title()` 参数是 identifier 的 name 部分

`new NeoGuidebook("sapdon:guidebook", ...)` → `ActionFormData.title("guidebook")`。
带命名空间（`"sapdon:guidebook"`）会匹配不上 server_form 绑定 → 显示原版表单而不是自定义 UI。

### 坑 2：页面清单必须写 `.js`，不能写 `.json`

sapdon 的 dev server 把 scripts 做**模块拼接打包**（不是 webpack/esbuild），`import("./page_ids.json", {with:{type:"json"}})` 这种动态导入不会被处理，运行时直接 undefined。正确做法是 main.mjs 生成 `export const PAGE_IDS = [...]` 的 `.js` 文件，静态 `import` 会被拼进产物。

### 坑 3：新增依赖后必须删 manifest 重建

manifest.json 只在**首次构建**时生成，之后 build 不会自动追加新依赖。加了 `@minecraft/server-ui` 后不删旧 manifest，游戏报 `Module [@minecraft/server-ui] is unrecognized`（或 version conflict），**整个脚本 context 创建失败、所有脚本都不跑**。

```bash
Remove-Item dev/<proj>_BP/manifest.json, dev/<proj>_RP/manifest.json -Force
npm run build
```

### 坑 4：server-ui 版本要匹配 server

`@minecraft/server` 2.6.0 必须配 `@minecraft/server-ui` **2.x**（如 2.1.0）。1.x 的 server-ui-bindings 内部要 server 1.3.0，与 2.6.0 冲突 → `version conflict for module @minecraft/server`。

### 坑 5：物品必须有 `interact_button` 才能触发 onUse

自定义组件 `onUse` 依赖 `minecraft:interact_button` 存在；不加则手持右键无反应。用 `ItemComponent.setInteractButton("打开手册")`。

### 坑 6：icon 引用原版纹理名要查原版 item_texture.json

`minecraft:icon` 的值必须匹配原版 `resource_pack/textures/item_texture.json` 的 `texture_data` 键，否则报 `Missing referenced asset xxx`。**原版书纹理名是 `book_writable`，没有 `book`**。`stick`、`iron_ingot` 等原版物品名通常可用。

### 坑 7：`addChapter/addChapters` 需配 `buildChapterList()`

只 `addChapters([...])` 不调 `buildChapterList()`，目录块不会渲染。

### 坑 8：调试时查看 ContentLog

游戏内无报错弹窗，运行时错误在 `<APPDATA>\Minecraft Bedrock\logs\ContentLog*.txt`。搜索关键字：`guidebook`、`server-ui`、`Missing referenced`、`version conflict`、`failed to create context`。该路径文件不能用 Grep 工具搜，用 PowerShell `Select-String -Path`。

### 坑 9：部署后要重进世界加载新包

游戏 dev 包同步后需重新进入世界让 addon 重载；`manifest.json` 变更（如新增依赖）尤其如此，否则仍在跑旧上下文。

---

## 6. 验证清单

构建后核对以下文件都存在：

```text
dev/<proj>_BP/manifest.json            # dependencies 含 @minecraft/server-ui（2.x）
dev/<proj>_BP/items/sapdon_guidebook.json
dev/<proj>_RP/ui/guidebook.json        # 含 page_index0..N_page_panel
dev/<proj>_RP/ui/server_form.json      # 含 source_property_name: ((#title_text - 'guidebook') = #title_text)
dev/<proj>_RP/ui/_ui_defs.json         # ui_defs 含 ui/guidebook.json
scripts/guide_pages.js                 # export const PAGE_IDS
dev/<proj>_BP/scripts/index.js         # 含 openGuidebook + registerCustomComponent("...guidebook")
```

游戏内验证：

1. `/give @s sapdon:guidebook`
2. 手持右键 → 出现书本 UI（翻页按钮 / 目录跳转）
3. 若显示的是原版表单 → 检查 title 参数（坑 1）
4. 若右键无反应 → 检查 interact_button（坑 5）与 ContentLog（坑 8）
