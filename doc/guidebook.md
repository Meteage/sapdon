# SapdonGuideBook —— 帕秋莉式手册框架类

`SapdonGuideBook` 是 Sapdon 提供的**帕秋莉式手册（Guidebook）**框架类。它让你用**纯数据声明**的方式，快速做出一本"分类索引 → 词条列表 → 内容页"的三层手册，并内置多种页类型、分页与导航。

- **三层结构**：`INDEX`（分类索引）→ `CAT`（词条列表）→ `ENT`（词条内容页）。
- **浏览器式导航**：每屏固定 `prev / home / next`，`home` 随时回首页。
- **多种页类型**：`text` / `crafting` / `spotlight` / `image`。
- **自动分页**：正文超过一屏自动翻页；分类词条超过 8 条自动分页。
- **路由驱动**：运行时通过 Server Form 的 `body` 路径 + 按钮槽位显隐，无需每个页面单独写路由。

> 示例见 `examples/guidebook_demo`（打开游戏手持木棍右键即可看到成品）。

---

## 1. 引入

```ts
import { SapdonGuideBook } from '@sapdon/core'
import { registry } from '@sapdon/core'
```

配套类型：
```ts
import type { GuideBookCategory, GuideBookChapter, GuideBookPageType } from '@sapdon/core'
```

---

## 2. 快速开始

在项目的 `main.ts`（框架构建入口）里：

```ts
import { SapdonGuideBook, registry } from '@sapdon/core'

const book = new SapdonGuideBook('mymod:book', [320, 207], 'textures/ui/book_back')

book.build([
    {
        id: 'intro', title: '介绍', icon: 'textures/items/book_writable',
        introLines: ['欢迎使用这本手册。', '它由 SapdonGuideBook 构建。'],
        chapters: [
            { name: '这是什么', icon: 'textures/items/book_writable', lines: ['这是一本帕秋莉式手册。', '分三层：索引→列表→内容。'] },
            { name: '如何打开', icon: 'textures/items/paper', lines: ['手持木棍右键打开本手册。'] },
        ],
    },
])

registry.submit()
```

### 构造函数签名

```ts
new SapdonGuideBook(
    identifier: string,                          // "namespace:name"，如 "mymod:book"
    size: [number, number] = [320, 207],         // 手册画布尺寸
    background: string = 'textures/ui/book_back' // 背景贴图
)
```

### 常用方法

| 方法 | 说明 |
|---|---|
| `.build(categories: GuideBookCategory[])` | 传入分类数据，生成全部页面；返回 `this` |
| `.setCover(title, lines)` | 自定义封面标题（可含 `\n`）与简介行，如 `.setCover('  我的手册 \\n            by Me', ['第一行简介', '第二行简介'])` |
| `.enableDebug()` | 开启调试（显示 `#form_text` 当前值 / 格子描边） |
| `.getSystem()` | 返回内部 `UISystem` |

调用链结束前记得 `registry.submit()`，把注册的 UI 数据提交给构建工具生成 `book.json`。

---

## 3. 数据结构

### `GuideBookCategory`（分类）

```ts
interface GuideBookCategory {
    id: string            // 路由 id（英文，如 "intro"），唯一
    title: string         // 中文标题（索引卡名称 / 左页标题）
    icon: string          // 索引卡图标贴图路径
    introLines: string[]  // 分类简介（左半页逐行渲染）
    chapters: GuideBookChapter[]  // 词条列表
}
```

### `GuideBookChapter`（词条）

```ts
interface GuideBookChapter {
    name: string          // 词条名（列表行 / 内容页标题）
    icon: string          // 列表行图标
    lines: string[]       // 正文（text 页逐行渲染）
    pageType?: 'text' | 'crafting' | 'spotlight' | 'image'  // 默认 text
    craft?: { grid: string[]; output: string }  // crafting 页
    spotlight?: { icon: string; desc: string }  // spotlight 页
    image?: { texture: string; caption: string } // image 页
}
```

> ⚠️ 词条名 **不要以 `#` 开头**（如 `#foo 门控`）。Bedrock 会把以 `#` 开头的文本当作绑定，渲染成空。需要表现 `#` 时放在句子中间或写成 `foo 门控`。

---

## 4. 页类型（`pageType`）

| `pageType` | 说明 | 相关字段 |
|---|---|---|
| `text`（默认） | 逐行渲染正文，支持分页 | `lines` |
| `crafting` | 3×3 合成台 + 箭头 + 单个产物格 | `craft.grid`（9 项，空位 `''`）+ `craft.output` |
| `spotlight` | 大图标 + 描述 | `spotlight.icon` + `spotlight.desc`（含 `\n` 会多行） |
| `image` | 整页图 + 说明 | `image.texture` + `image.caption` |

`crafting` 示例：

```ts
{
    name: '合成示例', icon: 'textures/items/iron_ingot', pageType: 'crafting',
    craft: {
        grid: ['textures/items/iron_ingot','textures/items/iron_ingot','textures/items/iron_ingot',
               'textures/items/iron_ingot','','textures/items/iron_ingot',
               'textures/items/iron_ingot','','textures/items/iron_ingot'],
        output: 'textures/items/iron_leggings',
    },
    lines: ['铁锭 → 铁护腿'],
}
```

---

## 5. 路由协议（运行时）

手册内容由**固定布局 + 门控**驱动：布局容器按 `body` 路径显隐，按钮按 `form_button_text` 精确显隐。具体由项目的 `scripts/index.ts` 用 `ActionFormData` 发射。

- **`title`**：固定为 `sapdon_ui:<name>`（如 `sapdon_ui:book`）。
- **`body`（路径）**：
  - `"INDEX"` → 分类索引页
  - `"CAT:<id>|p<N>"` → 分类页（`N` 为分类页码，`p0` 左简介右列表）
  - `"ENT:<id>:<gi>|p<N>"` → 词条内容页（`gi` 为词条序号，`N` 为内容页码）

### 按钮槽位（顺序固定）

| 页面 | 槽位 |
|---|---|
| INDEX | `[no_prev, no_home, no_next, idx0..3]`（三导航全隐藏） |
| CAT | `[prev\|no_prev, home, next\|no_next, <id>_e<num>...]` |
| ENT | `[prev, home, next\|no_next]` |

占位键 `no_prev / no_home / no_next` 不代表任何注册按钮，从而让对应导航按钮**隐藏**。

### 分页规则

- **CAT 列表**：每列最多 8 行。`p0` 右列 8 行；`p1+` 左 8 + 右 8（=16 行/页）。
- **ENT 正文（text）**：左右半页各最多 5 行，先填左半页、超出再填右半页；**整体超过 10 行才分页**。

运行时脚本里需要维护两个与 `main.ts` 数据对齐的量：

```ts
// scripts/index.ts
const CATS = ["intro", "pages", "routing", "controls"];                 // 与 main.ts 分类 id 对齐（含顺序）
const CAT_CHAPTERS: Record<string, number> = { intro: 4, pages: 6, routing: 6, controls: 6 }; // 每分类词条数
const ENT_PAGES: Record<string, number> = { pages_e4: 2 };              // 需要多页的 text 词条 → 页数(ceil(lines/10))
```

> 若某 text 词条行数超过 10，`main.ts` 会用 `ENT_PAGES` 里的页数来让 next/prev 生效。忘加会导致分页无法翻动。

---

## 6. 手写运行时路由（`scripts/index.ts` 参考）

项目里还需一个"脚本入口"（build.config 的 `scriptEntry`），示例为 `scripts/index.ts`，用木棍右键打开手册：

```ts
import { world, Player } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

const CATS = ["intro", "pages", "routing", "controls"];
const CAT_CHAPTERS = { intro: 4, pages: 6, routing: 6, controls: 6 };
const ENT_PAGES = { pages_e4: 2 };
const TITLE = "sapdon_ui:book";
const NO_PREV = "no_prev", NO_HOME = "no_home", NO_NEXT = "no_next";

function openIndex(p: Player): void {
    const f = new ActionFormData().title(TITLE).body("INDEX");
    f.button(NO_PREV); f.button(NO_HOME); f.button(NO_NEXT);
    CATS.forEach((_, i) => f.button(`idx${i}`));
    f.show(p).then((r) => {
        if (r.canceled) return;
        const s = r.selection!;
        if (s >= 3 && s - 3 < CATS.length) openCat(p, CATS[s - 3], 0);
        else openIndex(p);
    });
}

function openCat(p: Player, id: string, page: number): void {
    const total = CAT_CHAPTERS[id] ?? 0;
    const start = page === 0 ? 0 : 8 + (page - 1) * 16;
    const end = Math.min(start + (page === 0 ? 8 : 16), total);
    const f = new ActionFormData().title(TITLE).body(`CAT:${id}|p${page}`);
    f.button(page > 0 ? "prev_button" : NO_PREV);
    f.button("home_button");
    f.button(end < total ? "next_button" : NO_NEXT);
    for (let i = start; i < end; i++) f.button(`${id}_e${i}`);
    f.show(p).then((r) => {
        if (r.canceled) return;
        const s = r.selection!;
        if (s === 0 && page > 0) openCat(p, id, page - 1);
        else if (s === 1) openIndex(p);
        else if (s === 2 && end < total) openCat(p, id, page + 1);
        else if (s >= 3) { const gi = start + (s - 3); if (gi < total) openEnt(p, id, gi, page, 0); }
    });
}

function openEnt(p: Player, id: string, gi: number, fromPage: number, ep: number): void {
    const pc = ENT_PAGES[`${id}_e${gi}`] ?? 1;
    const f = new ActionFormData().title(TITLE).body(`ENT:${id}:${gi}|p${ep}`);
    f.button("prev_button"); f.button("home_button");
    f.button(ep < pc - 1 ? "next_button" : NO_NEXT);
    f.show(p).then((r) => {
        if (r.canceled) return;
        const s = r.selection!;
        if (s === 0) ep > 0 ? openEnt(p, id, gi, fromPage, ep - 1) : openCat(p, id, fromPage);
        else if (s === 1) openIndex(p);
        else if (s === 2 && ep < pc - 1) openEnt(p, id, gi, fromPage, ep + 1);
    });
}

world.afterEvents.itemUse.subscribe((e) => {
    if (e.itemStack.typeId === "minecraft:stick" && e.source.typeId === "minecraft:player")
        openIndex(e.source as Player);
});
```

> **打开触发**默认是手持**木棍右键**（`minecraft:stick`）。若手册由某个具体物品打开（如 more-golem 的指南书），把 `e.itemStack.typeId` 换成该物品的 id，或改为在物品的 `onUse` 自定义组件里直接调 `openIndex(player)`。

---

## 7. 完整教程（从零做一个手册）

**步骤 1：创建项目**
```bash
npx sapdon create my_guide
cd my_guide
```

**步骤 2：在 `main.ts` 里声明手册**
```ts
import { SapdonGuideBook, registry } from '@sapdon/core'

const book = new SapdonGuideBook('my_guide:book', [320, 207])

book.build([
    {
        id: 'start', title: '开始', icon: 'textures/items/book_writable',
        introLines: ['我的第一本手册。'],
        chapters: [
            { name: '序言', icon: 'textures/items/book_writable', lines: ['欢迎使用 SapdonGuideBook。'] },
            { name: '合成演示', icon: 'textures/items/iron_ingot', pageType: 'crafting',
              craft: { grid: ['textures/items/iron_ingot','','','','','','','',''], output: 'textures/items/iron_ingot' },
              lines: ['一格铁锭 → 输出铁锭。'] },
        ],
    },
])

registry.submit()
```

**步骤 3：写运行时路由**（见第 6 节 `scripts/index.ts`），并把 `CATS` / `CAT_CHAPTERS` / `ENT_PAGES` 对齐到你的分类与词条数。

**步骤 4：构建 & 进游戏**
```bash
sapdon build ./
```
进入游戏手持**木棍**右键即可打开手册。

**步骤 5（可选）：`build.config` 配置**
```json
{
  "buildOptions": {
    "buildEntry": "main.ts",
    "scriptEntry": "scripts/index.ts",
    "scriptOutput": "scripts/index.js",
    "buildMode": "dev",
    "dependencies": [
      { "module_name": "@minecraft/server-ui", "version": "2.1.0" },
      { "module_name": "@minecraft/server", "version": "2.8.0" }
    ]
  }
}
```
> `dependencies` 里的 `@minecraft/server-ui` 是运行时路由（`ActionFormData`）必需的，别忘了。

---

## 8. 常见问题

- **词条文字为空 / 显示异常**：词条名或文案以 `#` 开头会被当作绑定。去掉开头的 `#`。
- **合成页输出是品红/黑格**：`craft.output` 引用了一个不存在的贴图。换成有效的（如 `textures/items/iron_leggings`）。
- **文本词条点 next 翻不动**：`ENT_PAGES` 里没给它配页数。`ENT_PAGES[`${catId}_e${gi}`] = Math.ceil(lines.length / 10)`。
- **想显示字面 `#`**：不要放在字符串开头，如 `form_text 门控`。
