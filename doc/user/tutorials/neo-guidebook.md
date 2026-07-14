# NeoGuidebook 指南书教程

本教程将带你一步步创建一个带自定义 UI 的技术指南手册。

---

## 目录

1. [准备工作](#1-准备工作)
2. [创建构建入口](#2-创建构建入口)
3. [定义书页内容](#3-定义书页内容)
4. [编写运行时脚本](#4-编写运行时脚本)
5. [注册物品组件](#5-注册物品组件)
6. [构建与部署](#6-构建与部署)
7. [完整示例](#7-完整示例)

---

## 1. 准备工作

确保你的项目已经初始化：

```bash
npm init
npm install @sapdon/core @sapdon/cli
npm install @minecraft/server@2.8.0 @minecraft/server-ui@2.1.0
```

项目结构：

```
my_guidebook/
├── main.ts               # 构建入口（定义 UI 和物品）
├── tsconfig.json          # TypeScript 配置
├── build.config           # 构建配置
├── mod.info              # 模块信息
├── package.json
├── scripts/
│   ├── index.ts          # 运行时入口
│   ├── lib/
│   │   └── page_bridge.ts  # Bridge 导航库
│   ├── custom_components/
│   │   ├── registry.ts   # 组件注册
│   │   └── items/
│   │       └── gui_book.ts # 物品交互
│   └── page_ids.json     # 由构建自动生成
├── dev/                  # 构建输出目录
│   ├── guidebook_BP/
│   └── guidebook_RP/
└── res/                  # 资源文件
```

### build.config

```json
{
  "formatVersion": 2,
  "buildOptions": {
    "useHMR": true,
    "buildMode": "development",
    "buildEntry": "main.ts",
    "scriptEntry": "scripts/index.ts",
    "scriptOutput": "scripts/index.js",
    "useJs": false,
    "buildDir": "dev/",
    "dependencies": [
      { "module_name": "@minecraft/server-ui", "version": "2.1.0" },
      { "module_name": "@minecraft/server",   "version": "2.8.0" }
    ],
    "resource": { "path": "res/", "resourceHints": true }
  },
  "versionType": "release"
}
```

### mod.info

```json
{
  "name": "guidebook",
  "description": "我的技术手册",
  "author": "you",
  "version": "1.0.0",
  "min_engine_version": "1.26.30"
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ESNext",
    "strict": true,
    "outDir": "./dev"
  },
  "include": ["scripts/**/*.ts", "main.ts"]
}
```

---

## 2. 创建构建入口

`main.ts` 在构建时运行，负责定义物品和 UI 布局。

```typescript
import fs from "fs"
import path from "path"
import {
    ItemAPI, ItemComponent, registry,
    NeoGuidebook, NeoGuidebookPage
} from '@sapdon/core'

// 2.1 创建物品
const item = ItemAPI.createItem("my_mod:guidebook", "items", "book_icon")
item.format_version = "1.21.90"
item.addComponent(ItemComponent.setCustomComponentV2("my_mod:book_component", {}))
item.addComponent(ItemComponent.setMaxStackSize(1))
item.addComponent(ItemComponent.setDisplayName("技术手册"))
item.addComponent(ItemComponent.setInteractButton("打开手册"))

// 2.2 创建指南书 UI
const book = new NeoGuidebook("my_mod:guidebook", "ui/", [320, 207], {
    debug: true,
    buttons: { close: { visible: false } },
    textures: {
        homeDefault: "textures/ui/book_shiftleft_default",
        homeHover:   "textures/ui/book_shiftleft_hover",
        homePressed: "textures/ui/book_shiftleft_pressed",
    }
})

// 2.3 注册页面（见下一节）
// ...

// 2.4 生成 page_ids.json
const pageIds: string[] = book.getPageIds()
fs.writeFileSync(
    path.join(process.cwd(), "scripts", "page_ids.json"),
    JSON.stringify(pageIds, null, 2)
)

// 2.5 提交注册
registry.submit()
```

---

## 3. 定义书页内容

### 3.1 创建单页

```typescript
const cover = new NeoGuidebookPage("cover")
    .addEmptySpace(["100%", "5%"])
    .addBookTitleBar("技术手册\n     by You", ["100%", "15%"])
    .addEmptySpace(["100%", "3%"])
    .addBookText(
        "这里是手册的介绍内容。\n可以跨越多行。",
        ["100%", "60%"]
    )
```

### 3.2 双页布局

```typescript
// 左页
const ch1_left = new NeoGuidebookPage("ch1_left")
    .addEmptySpace(["100%", "5%"])
    .addCategoryTitle("第一章", ["100%", "15%"])
    .addDivider(["100%", "3%"])
    .addBookText("第一章的内容...", ["100%", "60%"])
    .addEmptySpace(["100%", "12%"])

// 右页
const ch1_right = new NeoGuidebookPage("ch1_right")
    .addEmptySpace(["100%", "5%"])
    .addCategoryTitle("补充说明", ["100%", "15%"])
    .addDivider(["100%", "3%"])
    .addBookText("补充内容...", ["100%", "65%"])
    .addEmptySpace(["100%", "7%"])

// 注册为双页
book.addDoublePageStack("page_index1", ch1_left.getPanel(), ch1_right.getPanel())
```

### 3.3 章节目录

```typescript
const chapter_list = new NeoGuidebookPage("chapter_list")
    .addChapters([
        { chapter_name: "第一章", chapter_texture: "textures/items/map" },
        { chapter_name: "第二章", chapter_texture: "textures/items/iron_ingot" },
        { chapter_name: "第三章", chapter_texture: "textures/items/book_writable" },
    ])
    .buildChapterList()

// 封面 + 目录作为首页
book.addDoublePageStack("page_index0", cover.getPanel(), chapter_list.getPanel())
```

### 3.4 合成表示例

```typescript
const recipe_page = new NeoGuidebookPage("recipe")
    .addEmptySpace(["100%", "5%"])
    .addCategoryTitle("合成配方", ["100%", "15%"])
    .addDivider(["100%", "3%"])
    .addRecipeGrid(2, 3, [
        "textures/items/iron_ingot",
        "textures/items/iron_ingot",
        "textures/items/iron_ingot",
        "textures/items/stick",
        "textures/items/stick",
        "textures/items/stick",
    ], ["100%", "40%"])
```

### 3.5 注册所有页面

```typescript
// 按 page_index0 ~ page_indexN 顺序注册
book.addDoublePageStack("page_index0", cover.getPanel(), chapter_list.getPanel())
book.addDoublePageStack("page_index1", ch1_left.getPanel(), ch1_right.getPanel())
book.addSinglePageStack("page_index2", recipe_page.getPanel())
```

---

## 4. 编写运行时脚本

### 4.1 page_bridge.ts（导航管理器）

```typescript
import { ActionFormData, ActionFormResponse } from "@minecraft/server-ui"
import { world, Player } from "@minecraft/server"

interface PageCallbacks {
    onEnter?: (pageId: string, index: number) => void
    onLeave?: (pageId: string, index: number) => void
}

interface BridgeOptions {
    debug?: boolean
}

export class NeoGuidebookBridge {
    private uiName: string
    private pageIds: string[]
    private totalPages: number
    private hooks: Map<string, PageCallbacks>
    private currentIndex: number
    private debug: boolean

    constructor(uiName: string, pageIds: string[], options: BridgeOptions = {}) {
        this.uiName = uiName
        this.pageIds = pageIds
        this.totalPages = pageIds.length
        this.hooks = new Map()
        this.currentIndex = 0
        this.debug = options.debug === true
    }

    private log(...args: string[]): void {
        if (this.debug) world.sendMessage("[Guidebook] " + args.join(" "))
    }

    onPage(pageId: string, callbacks: PageCallbacks): this {
        this.hooks.set(pageId, callbacks)
        return this
    }

    show(player: Player, startIndex: number = 0): void {
        this.currentIndex = Math.max(0, Math.min(startIndex, this.totalPages - 1))
        this.open(player)
    }

    open(player: Player): void {
        const pageId = this.pageIds[this.currentIndex]
        const hook = this.hooks.get(pageId)
        if (hook?.onEnter) hook.onEnter(pageId, this.currentIndex)

        const form = new ActionFormData()
            .title(this.uiName)
            .body(pageId)

        const actions: string[] = []
        const hasPrev = this.currentIndex > 0
        const hasNext = this.currentIndex < this.totalPages - 1
        const hasHome = this.currentIndex !== 0
        const isChapterList = this.currentIndex === 0

        // 按钮文字必须匹配 JSON UI 的 $binding_button_text
        if (hasPrev) { form.button("prev_button"); actions.push("prev") }
        if (hasNext) { form.button("next_button"); actions.push("next") }
        if (hasHome) { form.button("home_button"); actions.push("home") }

        // 首页显示章节选择按钮
        if (isChapterList) {
            for (let i = 1; i < this.totalPages; i++) {
                form.button(`item_${i - 1}_button`)
                actions.push(`goto:${i}`)
            }
        }

        form.show(player).then((response: ActionFormResponse) => {
            if (response.canceled) {
                if (hook?.onLeave) hook.onLeave(pageId, this.currentIndex)
                return
            }

            const action = actions[response.selection!]
            if (!action) return

            const prev = this.currentIndex
            if (action === "prev") this.currentIndex--
            else if (action === "next") this.currentIndex++
            else if (action === "home") this.currentIndex = 0
            else if (action.startsWith("goto:"))
                this.currentIndex = parseInt(action.split(":")[1], 10)

            if (hook?.onLeave) hook.onLeave(pageId, prev)
            if (this.currentIndex !== prev) this.open(player)
        })
    }
}
```

> **重要**：`form.button()` 的参数**不是显示文字**，而是 JSON UI 绑定的键名。必须与 `neo_guidebook.json` 中对应按钮的 `$binding_button_text` 一致。

### 4.2 gui_book.ts（物品交互）

```typescript
import { world, ItemCustomComponent, ItemComponentUseEvent } from "@minecraft/server"
import { NeoGuidebookBridge } from "../lib/page_bridge"
import pageIds from "../page_ids.json"

const DEBUG: boolean = true

const bridge = new NeoGuidebookBridge("my_mod:guidebook", pageIds, { debug: DEBUG })

export const GuiBookItemComponent: ItemCustomComponent = {
    onUse(event: ItemComponentUseEvent, params: any): void {
        const player = event.source
        if (player.typeId != "minecraft:player") return
        bridge.show(player, 0)
    }
}
```

---

## 5. 注册物品组件

### 5.1 registry.ts

```typescript
import { GuiBookItemComponent } from "./items/gui_book"
import { system, world, StartupEvent } from "@minecraft/server"

const DEBUG: boolean = false
let registered: boolean = false

export const registerCustomItemComponent = (): void => {
    system.beforeEvents.startup.subscribe((initEvent: StartupEvent) => {
        if (registered) return
        registered = true
        if (DEBUG) world.sendMessage("[Registry] registering my_mod:book_component")
        initEvent.itemComponentRegistry.registerCustomComponent(
            "my_mod:book_component",
            GuiBookItemComponent
        )
    })
}
```

> `registerCustomComponent` 的第一个参数**必须**与 `main.ts` 中 `setCustomComponentV2()` 的第一个参数一致。

### 5.2 scripts/index.ts（运行时入口）

```typescript
import { registerCustomItemComponent } from "./custom_components/registry"
registerCustomItemComponent()
```

---

## 6. 构建与部署

### 6.1 构建

```bash
npm run build
```

构建完成后：
- `dev/guidebook_BP/` — 行为包（manifest.json + scripts/ + items/）
- `dev/guidebook_RP/` — 资源包（manifest.json + ui/ + textures/）

### 6.2 部署

将 `dev/guidebook_BP` 和 `dev/guidebook_RP` 复制到 Minecraft 的 `development_behavior_packs` / `development_resource_packs` 目录：

```
C:/Users/你的用户名/AppData/Local/Packages/
  Microsoft.MinecraftUWP_8wekyb3d8bbwe/LocalState/games/
    com.mojang/development_behavior_packs/guidebook_BP/
    com.mojang/development_resource_packs/guidebook_RP/
```

### 6.3 在游戏中启用

1. 创建一个新世界或打开现有世界
2. 设置 → 行为包 → 添加 `guidebook_BP`
3. 设置 → 资源包 → 添加 `guidebook_RP`
4. 进入游戏，获取物品：`/give @s sapdon:neo_guidebook`

---

## 7. 完整示例

以下是一个完整的最小化指南书示例：

### main.ts

```typescript
import fs from "fs"
import path from "path"
import {
    ItemAPI, ItemComponent, registry,
    NeoGuidebook, NeoGuidebookPage
} from '@sapdon/core'

// 物品
const item = ItemAPI.createItem("my_mod:guidebook", "items", "book_icon")
item.format_version = "1.21.90"
item.addComponent(ItemComponent.setCustomComponentV2("my_mod:book_component", {}))
item.addComponent(ItemComponent.setMaxStackSize(1))
item.addComponent(ItemComponent.setDisplayName("快速入门手册"))
item.addComponent(ItemComponent.setInteractButton("打开"))

// 指南书
const book = new NeoGuidebook("my_mod:guidebook", "ui/", [320, 207])

// 封面
const cover = new NeoGuidebookPage("cover")
    .addEmptySpace(["100%", "5%"])
    .addBookTitleBar("快速入门手册", ["100%", "15%"])
    .addEmptySpace(["100%", "3%"])
    .addBookText("欢迎使用快速入门手册！", ["100%", "60%"])

// 第一章
const ch1 = new NeoGuidebookPage("ch1")
    .addEmptySpace(["100%", "5%"])
    .addCategoryTitle("第一章：基础", ["100%", "15%"])
    .addDivider(["100%", "3%"])
    .addBookText("这是第一章的内容。", ["100%", "72%"])

// 第二章
const ch2 = new NeoGuidebookPage("ch2")
    .addEmptySpace(["100%", "5%"])
    .addCategoryTitle("第二章：进阶", ["100%", "15%"])
    .addDivider(["100%", "3%"])
    .addBookText("这是第二章的内容。", ["100%", "72%"])

// 注册页面
book.addDoublePageStack("page_index0", cover.getPanel(), ch1.getPanel())
book.addDoublePageStack("page_index1", ch2.getPanel(), ch2.getPanel())

// 输出 page_ids
fs.writeFileSync(
    path.join(process.cwd(), "scripts", "page_ids.json"),
    JSON.stringify(book.getPageIds(), null, 2)
)

registry.submit()
```

### 运行时文件

`scripts/index.ts`:
```typescript
import { registerCustomItemComponent } from "./custom_components/registry"
registerCustomItemComponent()
```

`scripts/custom_components/registry.ts`:
```typescript
import { GuiBookItemComponent } from "./items/gui_book"
import { system, StartupEvent } from "@minecraft/server"

let registered: boolean = false

export const registerCustomItemComponent = (): void => {
    system.beforeEvents.startup.subscribe((initEvent: StartupEvent) => {
        if (registered) return
        registered = true
        initEvent.itemComponentRegistry.registerCustomComponent(
            "my_mod:book_component",
            GuiBookItemComponent
        )
    })
}
```

`scripts/custom_components/items/gui_book.ts`:
```typescript
import { world, ItemCustomComponent, ItemComponentUseEvent } from "@minecraft/server"
import { NeoGuidebookBridge } from "../lib/page_bridge"
import pageIds from "../../page_ids.json"

const bridge = new NeoGuidebookBridge("my_mod:guidebook", pageIds)

export const GuiBookItemComponent: ItemCustomComponent = {
    onUse(event: ItemComponentUseEvent, params: any): void {
        const player = event.source
        if (player.typeId != "minecraft:player") return
        bridge.show(player, 0)
    }
}
```

`scripts/lib/page_bridge.ts`:
```typescript
import { ActionFormData, ActionFormResponse } from "@minecraft/server-ui"
import { world, Player } from "@minecraft/server"

interface PageCallbacks {
    onEnter?: (pageId: string, index: number) => void
    onLeave?: (pageId: string, index: number) => void
}

interface BridgeOptions {
    debug?: boolean
}

export class NeoGuidebookBridge {
    private uiName: string
    private pageIds: string[]
    private totalPages: number
    private hooks: Map<string, PageCallbacks>
    private currentIndex: number
    private debug: boolean

    constructor(uiName: string, pageIds: string[], options: BridgeOptions = {}) {
        this.uiName = uiName
        this.pageIds = pageIds
        this.totalPages = pageIds.length
        this.hooks = new Map()
        this.currentIndex = 0
        this.debug = options.debug === true
    }

    private log(...args: string[]): void {
        if (this.debug) world.sendMessage("[Guidebook] " + args.join(" "))
    }

    onPage(pageId: string, callbacks: PageCallbacks): this {
        this.hooks.set(pageId, callbacks)
        return this
    }

    show(player: Player, startIndex: number = 0): void {
        this.currentIndex = Math.max(0, Math.min(startIndex, this.totalPages - 1))
        this.open(player)
    }

    open(player: Player): void {
        const pageId = this.pageIds[this.currentIndex]
        const hook = this.hooks.get(pageId)
        if (hook?.onEnter) hook.onEnter(pageId, this.currentIndex)

        const form = new ActionFormData()
            .title(this.uiName)
            .body(pageId)

        const actions: string[] = []
        const hasPrev = this.currentIndex > 0
        const hasNext = this.currentIndex < this.totalPages - 1
        const hasHome = this.currentIndex !== 0
        const isChapterList = this.currentIndex === 0

        if (hasPrev) { form.button("prev_button"); actions.push("prev") }
        if (hasNext) { form.button("next_button"); actions.push("next") }
        if (hasHome) { form.button("home_button"); actions.push("home") }

        if (isChapterList) {
            for (let i = 1; i < this.totalPages; i++) {
                form.button(`item_${i - 1}_button`)
                actions.push(`goto:${i}`)
            }
        }

        form.show(player).then((response: ActionFormResponse) => {
            if (response.canceled) {
                if (hook?.onLeave) hook.onLeave(pageId, this.currentIndex)
                return
            }

            const action = actions[response.selection!]
            if (!action) return

            const prev = this.currentIndex
            if (action === "prev") this.currentIndex--
            else if (action === "next") this.currentIndex++
            else if (action === "home") this.currentIndex = 0
            else if (action.startsWith("goto:"))
                this.currentIndex = parseInt(action.split(":")[1], 10)

            if (hook?.onLeave) hook.onLeave(pageId, prev)
            if (this.currentIndex !== prev) this.open(player)
        })
    }
}
```

---

## 常见问题

### Q: 为什么按钮不显示？

检查 `form.button()` 的参数是否与 JSON UI 中 `$binding_button_text` 一致。按钮文字**不是**显示文本，而是绑定键名。

### Q: 为什么显示原版表单而不是自定义 UI？

检查 `title()` 的参数与 `new NeoGuidebook()` 的 identifier 是否一致。

### Q: 翻页后页面空白？

检查 `body()` 的参数是否与注册时的 `page_id` 完全一致。

### Q: 物品拿在手上右键没反应？

1. 检查 manifest.json 的依赖版本是否正确（`2.8.0` / `2.1.0`）
2. 检查注册的组件名是否与物品 JSON 中的一致
3. 检查控制台是否有版本冲突错误
