# SapdonGuideBook —— 帕秋莉式手册框架类

`SapdonGuideBook` 是 Sapdon 提供的**帕秋莉式手册（Guidebook）**框架类。它让你用**纯数据声明**的方式，快速做出一本"分类索引 → 词条列表 → 内容页"的三层手册，并内置多种页类型、分页与导航。

- **三层结构**：`INDEX`（分类索引）→ `CAT`（词条列表）→ `ENT`（词条内容页）。
- **浏览器式导航**：每屏固定 `prev / home / next`，`home` 随时回首页。
- **多种页类型**：`text` / `crafting` / `spotlight` / `image`。
- **自动分页**：分类卡每页 16 张（超出翻页）；分类词条每页最多 16 行；正文每页 10 行。
- **路由驱动**：运行时通过 Server Form 的 `body` 路径 + 按钮槽位显隐，无需每个页面单独写路由。

> 示例见 `examples/guidebook_demo`（打开游戏手持木棍右键即可看到成品）。
> 索引分页的规则、槽位硬约束与可调常量见 [§5 路由协议](#5-路由协议运行时)。

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
    background: string = 'textures/ui/book_back',// 背景贴图
    options: GuideBookOptions = {}               // 可选，见下
)

interface GuideBookOptions {
    labels?: Partial<GuideBookLabels>            // 覆盖框架渲染的固定标签（只传要改的键）
}

interface GuideBookLabels {
    chapter: string                              // CAT 页章节列表标题，默认 '章节'
    category: string                             // INDEX 页索引卡列标题，默认 '类别'
}
```

### 常用方法

| 方法 | 说明 |
|---|---|
| `.build(categories: GuideBookCategory[])` | 传入分类数据，生成全部页面；返回 `this` |
| `.setCover(title, lines)` | 自定义封面标题（可含 `\n`）与简介行，如 `.setCover('  我的手册 \\n            by Me', ['第一行简介', '第二行简介'])` |
| `.setLabels(labels: Partial<GuideBookLabels>)` | 覆盖框架渲染的固定标签（`章节` / `类别`）；**增量合并、可反复调用、必须在 `build()` 之前**。详见下文「手册的多语言」 |
| `.enableDebug()` | 开启调试（显示 `#form_text` 当前值 / 格子描边） |
| `.getSystem()` | 返回内部 `UISystem` |

调用链结束前记得 `registry.submit()`，把注册的 UI 数据提交给构建工具生成 `book.json`。

### 手册的多语言（`labels`）

框架自己渲染的**固定标签只有两个**：`CAT` 页章节列表的标题（默认 `章节`）和 `INDEX` 页索引卡列的标题（默认 `类别`）。它们可以被覆盖成任意字符串——**包括 lang 键**：

```ts
import { SapdonGuideBook } from '@sapdon/core'

// 方式一：构造第 4 参
const book = new SapdonGuideBook('mymod:book', [320, 207], 'textures/ui/book_back', {
    labels: { chapter: 'fz.gb.ui.chapter', category: 'fz.gb.ui.category' },
})

// 方式二：链式 setLabels（增量合并，可反复调用）
book.setLabels({ chapter: 'fz.gb.ui.chapter' })
book.setLabels({ category: 'fz.gb.ui.category' })   // 上一次设的 chapter 不会被冲掉
```

**五条必须知道的规则**

1. **框架不解析 lang 键**：字符串**原样**交给 `Text.setText`，由 **JSON UI 自己**解析。所以传 `fz.gb.ui.chapter` 这类键的项目**必须**在 `RP/texts/*.lang` 里定义该键，否则界面显示的是**裸键名**。
   > ⚠️「游戏里真的解析成对应语言」这一步**未验证**（本环境无法启动 Minecraft）。
2. **`DEFAULT_GUIDE_BOOK_LABELS = { chapter: '章节', category: '类别' }` 是历史中文字面量，不要改**。改它会让**所有既有项目的产物发生变化**——不传 `labels` 的项目产物必须逐字节不变（回归基线见 §5「向后兼容」的 `examples/guidebook_demo`）。
3. **`setLabels` 是增量合并**（`chapter: labels.chapter ?? this.labels.chapter`）：只传要改的键，其余保持**当前值**，可以反复调用。**不要**指望"未传的键回落默认值"——那样第二次链式调用会把第一次的设置冲掉。
4. **必须在 `build()` 之前调用**：labels 是**构建期**写进元素树的（CAT 页标题、INDEX 栏目标题都在 `build()` 里渲染）。`build()` 之后再调 `setLabels` 对产物没有任何影响。
5. **等价判据**：把中文字面量换成 lang 键时，产物 `ui/*.json` 里应当**只有那两处文本变化**，其余结构（元素数、绑定、`grid_position`、`offset`）逐字节不变。改完先 diff 产物、再进游戏。

**真实案例**：FZ 项目用这条接口把两处栏目标题换成了 `fz.gb.ui.chapter` / `fz.gb.ui.category`，并**去掉了旧的"构建后遍历元素树改文本"临时绕过**。它采用的判据就是上面第 5 条：产物结构逐字节不变。

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
  - `"INDEX"` → 分类索引页第 1 页
  - `"IDX|p<N>"` → 分类索引页第 `N` 页（`N`≥1；只有分类超过 16 个才需要）
  - `"CAT:<id>|p<N>"` → 分类页（`N` 为分类页码，`p0` 左简介右列表）
  - `"ENT:<id>:<gi>|p<N>"` → 词条内容页（`gi` 为词条序号，`N` 为内容页码）

> ⚠️ 索引第 2 页起必须写 `IDX|p<N>`，**不能**写 `INDEX|p<N>`：容器的门控是「包含」
> 匹配（`(not((#form_text - $gtag) = #form_text))`），`"INDEX|p1"` 同样命中索引第 1 页的
> `INDEX`，会让封面与首页卡格一起亮起来。新体 `IDX|p1` 不含 `INDEX` 子串，两页互斥。

### 按钮槽位（顺序固定）

| 页面 | 槽位 |
|---|---|
| INDEX `p0` | `[no_prev, no_home, next\|no_next, idx0..idx15]`（≤16 分类时后三槽全隐藏） |
| INDEX `p1+` | `[prev_button, home_button, next\|no_next, idx…]`（卡片仍从槽 3 起） |
| CAT | `[prev\|no_prev, home, next\|no_next, <id>_e<num>...]` |
| ENT | `[prev, home, next\|no_next]` |

占位键 `no_prev / no_home / no_next` 不代表任何注册按钮，从而让对应导航按钮**隐藏**（仍占槽位，保证后面按钮的槽序不变）。

> ⚠️ **槽位序号是硬约束，不能改动顺序**：框架把每张卡注册进格盘时，用的是它在 form 里的
> **槽位序号**（`addButton(index, …, pos)` 的 `index`，会被编码成 `grid_position`），
> Bedrock 的集合格盘正是靠 `grid_position`（行优先序号）**把格子绑到对应的 form 按钮**上；
> 卡片画在哪一格另由 `pos` 决定（`offset = -基准格 + pos`）。
> 所以 INDEX 页的卡片槽位**必须**从槽 3 开始（prev/home/next 占 0-2，CAT 页的 `<id>_e<gi>` 同理）。
> 若运行期增删了前导按钮、或框架侧误把视觉序号当槽位序号传，卡片会绑到错误（占位）槽，
> 门控 `($binding_button_text = #form_button_text)` 不成立 → **整片卡片不显示**（详见 §8）。

### 分页规则

- **INDEX 分类索引**：**每页最多 16 张卡**，超出自动分页。
  - `p0`（body `"INDEX"`）：左半页是封面，右半页 4 列 × ≤4 行 = ≤16 张。
  - `p1+`（body `"IDX|p<N>"`）：左半页 4 列 × ≤2 行 + 右半页 4 列 × ≤2 行 = ≤16 张/页，**先填左列再填右列**。
  - 卡片绑定名 = 分类在 `build()` 入参里的**全局序号**（`idx0..idxN`，跨页唯一，与页码无关）。
- **CAT 列表**：每列最多 8 行。`p0` 右列 8 行；`p1+` 左 8 + 右 8（=16 行/页）。
- **ENT 正文（text）**：左右半页各最多 5 行，先填左半页、超出再填右半页；**整体超过 10 行才分页**。

#### 索引分页的计算公式

框架实现：`src/core/ui/systems/sapdon/sapdonGuideBook.ts` 的
`IDX_*` 常量（`:73-90`）、`catCard()`（`:457`）、`addIndexColumn()`（`:486`）、`indexPageCount()`（`:515`）、
`p0` 组装（`:574-585`）、`p1+` 组装（`:590-627`）。

| 量 | 公式 | 备注 |
|---|---|---|
| 页数 | `total ≤ 16 ? 1 : 1 + ceil((total − 16) / 16)` | `total` = `build()` 入参的分类数 |
| `p0` 收录 | 前 `min(total, 16)` 张 | 右半页 4 列 |
| `p0` 行数 | `rows = max(1, ceil(收录数 / 4))` | 卡格栈高 `min(79%, 20% × rows)`，余量给底部 spacer |
| `p<k>` 收录 | `[16 + (k−1)·16, +16)` | 左列前 8 张、右列后 8 张 |
| `p<k>` 行数 | `rows = max(1, ceil(max(左列张数, 右列张数) / 4))` | 同页两列共用 `rows`，保证标题/分割线左右对齐 |
| 末页右列为空 | 用 `idx_col_p<k>_r_empty` 占位（不画标题与分割线） | 只在末尾出现，不会出现在中间页 |

#### 卡片 → 槽位 → 格位 对照

第 `j` 张卡（`j` = 该卡在**本页（p0）/ 本列（p1+）内**的序号，从 0 起）：

| 量 | 值 | 由谁决定 |
|---|---|---|
| 绑定名 | `idx<全局序号>` | `FormButton.setBinding()` |
| form 槽位 | `3 + j`（`p1+` 右列继续 `3 + 8 + j`） | 运行期 `ActionFormData.button()` 的顺序 |
| `grid_position` | `[(3+j) % 4, ⌊(3+j) / 4⌋]` | `FormButtonGrid.addButton(index, …)` 的 `index` |
| 视觉格 | `[j % 4, ⌊j / 4⌋]` | `FormButtonGrid.addButton(…, pos)` 的 `pos` |

> 例（4 分类的 `p0`）：`idx0 → 槽3 → grid_position[3,0] → 视觉格[0,0]`、`idx1 → 槽4 → [0,1] → [1,0]`、
> `idx2 → 槽5 → [1,1] → [2,0]`、`idx3 → 槽6 → [2,1] → [3,0]`。
> 这就是生成产物里 `grid_item_003..006` 与 `offset: -300% / (100%,-100%)` 的由来。

#### 可调常量

| 常量 | 默认 | 含义 / 影响 |
|---|---|---|
| `IDX_COLS` | `4` | 每行几张卡（改大→卡更小） |
| `IDX_ROWS_P0` | `4` | `p0` 右半页行数上限（`× IDX_COLS` = 每页容量） |
| `IDX_ROWS_COL` | `2` | `p1+` 每半页行数上限（`× IDX_COLS` = 每半页容量） |
| `IDX_PER_PAGE` | `16` | 每页容量 = `IDX_COLS × IDX_ROWS_P0` |
| `IDX_PER_COL` | `8` | `p1+` 每半页容量 = `IDX_COLS × IDX_ROWS_COL` |
| `IDX_SLOT_BASE` | `3` | 首张卡的 form 槽位序号（导航占 0-2） |

> 目前**没有**公开构造参数：改容量 = 改这几个模块级常量后重建框架。
> 运行期必须同步**同一个容量规则**（见下方 `idxPageCount` / `idxRange` 示例）。

#### 向后兼容

- 分类 **≤16**：只有 `p0`，body 仍是历史上的 `"INDEX"` —— **旧脚本一行都不用改**。
- 分类 **≤4**：索引页产物与引入分页前**逐字节一致**（`examples/guidebook_demo` 的
  `dev/guidebook_demo_RP/ui/gateddemo_book.json` 可作回归基线：587885 字节，
  sha256 `C04672A23AE4FD4F68EF76646316B0DA82DFADA9C8AE80D81A2CEB88A9109988`；
  2026-09 因**根面板元素名固定为 `root`** 与 **UI 文件/namespace 改为 `ns_nm`** 重锁过两次）；
  一旦这个文件不再逐字节相同，就说明索引布局（尤其是槽位编码）被动了。

运行时脚本里需要维护两个与 `main.ts` 数据对齐的量：

```ts
// scripts/index.ts
const CATS = ["intro", "pages", "routing", "controls"];                 // 与 main.ts 分类 id 对齐（含顺序）
const CAT_CHAPTERS: Record<string, number> = { intro: 4, pages: 6, routing: 6, controls: 6 }; // 每分类词条数
const ENT_PAGES: Record<string, number> = { pages_e4: 2 };              // 需要多页的 text 词条 → 页数(ceil(lines/10))

// 索引分页（分类 >16 才用得上）：p0 容量 16，p1+ 每页 16
const IDX_PER_PAGE = 16;
const idxPageCount = (total: number) => (total <= IDX_PER_PAGE ? 1 : 1 + Math.ceil((total - IDX_PER_PAGE) / IDX_PER_PAGE));
const idxRange = (page: number, total: number): [number, number] => {
    const start = page === 0 ? 0 : IDX_PER_PAGE + (page - 1) * IDX_PER_PAGE;
    return [start, Math.min(start + IDX_PER_PAGE, total)];
};
const idxBody = (page: number) => (page === 0 ? "INDEX" : `IDX|p${page}`);
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
    CATS.forEach((_, i) => f.button(`idx${i}`));   // 分类 ≤16 时一页足够
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

### 分类超过 16 个：把 `openIndex` 换成可翻页版本

上面那版 `openIndex` 只在分类 ≤16 时够用（`p1+` 的 body 收不到）。改成下面这版即可支持任意数量：
`p0` 保持 `body = "INDEX"`（**旧行为不变**），`p1+` 用 `body = "IDX|p<k>"`，并在槽 0/2 放 `prev`/`next`。

```ts
const IDX_PER_PAGE = 16;                       // 与框架常量一致（见 §5「可调常量」）
const idxBody = (page: number) => (page === 0 ? "INDEX" : `IDX|p${page}`);
const idxRange = (page: number, total: number): [number, number] => {
    const start = page === 0 ? 0 : IDX_PER_PAGE + (page - 1) * IDX_PER_PAGE;
    return [start, Math.min(start + IDX_PER_PAGE, total)];
};

/** 索引页（可翻页）。p0：三枚导航隐藏（历史行为）；p1+：prev/home 回索引首页、next 翻页 */
function openIndex(p: Player, page = 0): void {
    const total = CATS.length;
    const [start, end] = idxRange(page, total);
    const hasPrev = page > 0;
    const hasNext = end < total;

    // 槽位固定：[prev?, home?, next?, idx<start>..idx<end-1>] —— 卡片必须从槽 3 起（见 §5 槽位硬约束）
    const f = new ActionFormData().title(TITLE).body(idxBody(page));
    f.button(hasPrev ? "prev_button" : NO_PREV);
    f.button(hasPrev ? "home_button" : NO_HOME);
    f.button(hasNext ? "next_button" : NO_NEXT);
    for (let i = start; i < end; i++) f.button(`idx${i}`);

    f.show(p).then((r) => {
        if (r.canceled) return;
        const s = r.selection!;
        if (s === 0 && hasPrev) openIndex(p, page - 1);
        else if (s === 1 && hasPrev) openIndex(p, 0);
        else if (s === 2 && hasNext) openIndex(p, page + 1);
        else if (s >= 3) {
            const ci = start + (s - 3);
            if (ci < end) openCat(p, CATS[ci], 0);
            else openIndex(p, page);
        } else openIndex(p, page);
    });
}
```

> 两处容易踩的点：
> 1. **`p0` 的三个槽位必须留着**（`no_*` 占位即可）—— 卡片就是靠「槽 3 起」绑定的，把卡片挪到槽 0 会整片不显示（§8）。
> 2. **`p1+` 的 body 只能是 `IDX|p<k>`**，写成 `INDEX|p<k>` 会连 `p0` 的封面一起点亮（§5 的门控说明）。
>
> 可参考的实现：`examples/guidebook_demo`（≤16 的简版）、`fz-sapdon/scripts/index.ts` 的 `openIndex(player, page)`（完整版）。

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

### 索引页不显示？（四个高频故障，按症状区分）

1. **右半页「类别」标题和分割线在，但一张卡都没有**（最容易被误判为"框架坏了"）
   - 原因：卡片绑到了错误的 form 槽位 —— `addButton(index, …)` 的 `index` 必须是**槽位序号**
     （`3 + 页内序号`），写成视觉序号（`0/1/2…`）就会让卡片去绑 `no_prev/no_home/no_next/idx0` 这些槽，
     `$binding_button_text ≠ #form_button_text` → 4 张卡全部隐藏。**生成的 JSON 看不出异常**（只差 `grid_position`/`offset` 数值）。
   - 自检：打开产物 `dev/<proj>_RP/ui/guide.json`，找 `cat_row`：
     4 分类时应是 `grid_item_003/004/005/006` + `grid_position [3,0]/[0,1]/[1,1]/[2,1]` +
     `offset ["-300%","0%"] / ["100%","-100%"] …`。若看到 `grid_item_000..003` +
     `grid_position [0,0]/[1,0]…` + `offset ["0%","0%"]`，就是槽位编码被改坏了（见 `formButtonGrid.ts` 的 `addButton` 注释）。
   - 也可以直接跑回归对比：`examples/guidebook_demo`（4 分类）重新构建后，
     `dev/guidebook_demo_RP/ui/book.json` 应与基线**逐字节一致**（见 §5「向后兼容」）。
2. **整个索引页（含封面）都不显示**
   - 原因：运行期 `body` 与门控不匹配。`p0` 必须是 `"INDEX"`；若脚本发的是 `"INDEX|p0"` 之类，
     将命中不了任何容器。
3. **索引第 2 页起「封面和卡片一起亮」/ 两页重叠**
   - 原因：`p1+` 的 `body` 写成了 `"INDEX|p<N>"`。门控是**包含**匹配，它会同时命中 `p0` 的 `"INDEX"`。
     改用 `"IDX|p<N>"`（不含 `INDEX` 子串，两页互斥）。
4. **索引能翻页，但点 `next` 没反应 / 翻到空页**
   - 原因：运行期的容量规则与框架不一致（`p0` 16 张，`p<k>` 16 张 = 左 8 + 右 8），
     或索引页的按钮顺序不是「3 个导航槽 + 卡片」。见 §5「索引分页的计算公式」与 §6 的完整版 `openIndex`。

