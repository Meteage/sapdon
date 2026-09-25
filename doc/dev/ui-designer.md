# Sapdon UI Designer —— 可视化 UI 编辑器设计（Qt Designer 范式）

> 本文是**设计文档**（面向框架/工具开发者）：讲清「编辑器长什么样、内部怎么分层、工程文件什么格式、怎么生成代码与 JSON、哪些地方**必须承认失真**」。
> 使用说明见 [`tools/designer/README.md`](../../tools/designer/README.md)；UI 子系统本身见 [`ui-architecture.md`](ui-architecture.md)、实战坑见 [`ui-lessons.md`](ui-lessons.md)。
> 状态：**MVP 已落地**（`tools/designer/`），本文与代码同步维护。

---

## 1. 定位：为什么需要它，以及它**不**是什么

**一句话**：把 `main.ts` 里手写 `new Panel(...).setLayout(...)` 的活，变成「控件箱拖控件 → 画布调锚点 → 属性面板改字段 → 一键出 TS 代码」，并顺手把 `ui-lessons.md` 里的坑做成**实时诊断**。

### 1.1 范围：**只服务 SapdonUI 自己的界面**

（2026-09 用户明确）不需要复刻原版任意界面，只覆盖框架会产出的那几种：

| 覆盖 | 屏幕类型 | 说明 |
|---|---|---|
| `SapdonFormUI` / `ServerFormUI` 屏 | `form` | `sapdon_ui:` 前缀路由 + 「内容面板 + 按键面板」+ `FormButtonGrid` / `FormButton`；**编辑器按规范校验并生成一句话** |
| `SapdonGuideBook` 手册 | `form` | 木框书页、封面缎带、类别索引卡、翻页按钮（`sapdonGuideBook.ts` 的那套布局常量）；多页面 = 内容面板里的 `$gtag` 门控 |
| `ContainerUISystem` / `ChestUISystem` | `容器` | 容器槽位面板（槽位/进度槽的换算在框架侧，编辑器**只负责版面与贴图**，不建模槽位） |
| `HudUISystem` | `hud` | HUD 常驻元素（状态字符串门控）；编辑器**自由摆放**，不校验规范、不预览框架产物 |

> **三类屏幕的边界（2026-09 用户口径）**：`form` / `容器` / `hud` 就这三类。后两类是**自由摆放**：
> 编辑器只管画布与元素，挂载（`ContainerUISystem.addControl` / `HudUISystem.mountRootElement`）与槽位换算由框架/项目侧补，
> **游戏里是否生效由你的挂载代码决定**（编辑器不打包票，也不因此扣分报错）。

不覆盖的：原版任意 screen、`factory`/`custom` 渲染器内部、模板内部结构 —— 一律画占位框，不去猜（见 §5.3）。

### 1.2 三条不可动摇的约束

| # | 约束 | 推论 |
|---|---|---|
| C1 | **产物必须是 sapdon TS 代码**，不是 JSON UI | 编辑器是「写代码的加速器」，不是替代品。生成的代码要能被人接着手改、能进 git diff、能走 `registry.submit()` 全链路。⇒ 见 §6 round-trip 限制 |
| C2 | **JSON UI 没有布局管理器**（除了 `stack_panel` / `grid`），一切靠 `anchor_from/anchor_to/size/offset` | 画布不能像 Qt 那样「拖到哪就存哪」——拖动必须**反解成锚点+偏移**，否则产物在真机上位置漂移。⇒ 见 §5 |
| C3 | **框架只序列化「已赋值」属性**（`serialize()` 用 `for...in` 拷属性包自有字段） | 属性面板必须是**三态**（未赋值 / 已赋值等于默认值 / 已赋值不等于默认值），否则编辑器会把一堆 `anchor_from: 'center'` 写进产物、改变既有渲染。⇒ 见 §4.2 |

---

## 2. Qt Designer 对照映射

映射的总原则：**Qt 的每个概念都尽量挂到 sapdon 已有的机制上**，挂不上的光明正大写进 §9「语义鸿沟」。

| Qt Designer | Sapdon Designer | 落在哪个机制上 |
|---|---|---|
| `.ui` 文件（XML 工程） | `.sui.json` 工程文件 | 自研 JSON 工程格式，见 §4 |
| Widget Box（控件箱） | 控件箱 = `elements/` 的 8 个类 + 模板继承项 | `Panel / StackPanel / CollectionPanel / Grid / Label / Image / Button / ScrollingPanel`；模板项 = `new X(id, 'common.button')`，等价 Qt 的 **promote to custom widget**（§6.2） |
| Form / 画布（含 layout 预览） | 画布（绝对定位渲染 + 网格/流式参考线） | 自研版面引擎 `layout.js`，见 §5 |
| Object Inspector（对象树） | 对象树（`controls` 嵌套 + `grid_position` 标注） | `UIElement.control.addControl()` 的嵌套结构 |
| Property Editor（属性编辑器，含**斜体/加粗表示"已设置"**、Reset） | 分组属性面板 + 「已赋值」标记 + 重置按钮 | 属性包分层：`Layout / Control / Text / Sprite / Input / Sound / GridProp / ScrollView / Factory`，见 §4.2 |
| Signal/Slot Editor（信号槽编辑器） | **门控/绑定编辑器**（`$变量` + `view` 绑定表达式） | `addVariable` + `DataBindingObject`；sapdon 的「UI 逻辑零 JS」= 逻辑全在绑定表达式里，见 §7 |
| Resource Browser（.qrc 资源） | 纹理资源面板（工程 `res/textures/**` + 原版 `textures/ui/*` 常用串） | `Sprite.setTexture` 的取值域 |
| `uic`（.ui → C++ 代码） | `codegen.js`（.sui.json → `main.ts` 片段） | §6 |
| 预览（Preview / Preview in…） | ① 画布实时渲染 ② 「JSON 产物」页签 | ② 是 `uic` 的等价物：把模型摊成**框架会写出的 JSON UI**，见 §7 |
| 编译期 warning（uic 的告警） | 诊断面板（error / warn / info） | 规则表见 §8，依据全部来自 `ui-lessons.md` / `known-pitfalls.md` |
| QLayout（QHBoxLayout/VBoxLayout…） | `stack_panel`（流式）+ `grid`（集合格盘） | **只有这两个**；其它容器一律锚点绝对定位 |
| 属性 `resetProperty()` | 属性面板的「重置」= 从 `props` 里**删键** | 直接对上 C3 |

---

## 3. 架构分层

工具**不依赖** `@sapdon/core`（浏览器里跑不了构建期 Node 代码），而是**镜像**它的四层模型：模型层 ↔ `elements/`，属性 schema ↔ `properties/`，产物层 ↔ `serialize()` + `UISystem.toObject()`。镜像关系由**交叉验证测试**兜底（§7.3），不靠人肉保证。

```
┌────────────────────────────────────────────────────────────────┐
│ 表现层  src/ui/                                                │
│   app.js      编辑器外壳：面板布局、快捷键、撤销栈、存读工程      │
│   canvas.js   画布：矩形渲染 / 选中 / 拖动 / 缩放 / 锚点手柄      │
│   tree.js     对象树：层级、重排、缩进/反缩进                    │
│   inspector.js 属性面板：按属性包分组、三态标记、类型化编辑器      │
├────────────────────────────────────────────────────────────────┤
│ 产物层  src/codegen.js · src/preview.js · src/diagnostics.js     │
│   codegen   → sapdon TS（main.ts 片段）   ← 唯一"给人用"的产物    │
│   preview   → JSON UI 对象（uic 等价物）  ← 唯一"机器判据"的产物  │
│   diagnostics → 规则引擎（§8）                                   │
├────────────────────────────────────────────────────────────────┤
│ 领域层  src/model.js · src/catalog.js · src/layout.js           │
│   model    工程文档（.sui.json）：元素树 / 属性三态 / 绑定 / 变量 │
│   catalog  控件箱 + 属性 schema（包、setter 名、类型、构造默认值） │
│   layout   纯函数版面引擎：锚点解算 + 流式/网格排布（零依赖）      │
└────────────────────────────────────────────────────────────────┘
```

**依赖方向单向**：`ui/* → codegen/preview/diagnostics → model/catalog/layout`；`layout.js` 与 `catalog.js` **零 import**（照 `containerLayout.ts` 的先例），因此能在 Node 里被单测直接跑。

---

## 4. 工程文件格式 `.sui.json`

### 4.1 结构

```jsonc
{
  "formatVersion": 1,
  "tool": "sapdon-designer",
  "uiSystem": { "identifier": "sapdon_ui", "path": "ui/" },          // identifier = ns 段；文件/namespace = ns_nm（首行屏名）
  "screenKind": "form",                                             // form | container | hud（缺省 form；后两类自由摆放）
  "screen": { "name": "book",                                       // 本屏（一个工程一个）：nm 段 + 两块面板
              "content": "book_content_panel", "buttons": "book_buttons_panel" },
  "canvas":   { "size": [320, 207], "zoom": 2 },                    // 仅编辑器用；100% 参照此框解算
  "elements": [ /* 根元素数组，见下；多页管理器也是其中一个节点（非视觉） */ ]
}

// 多页面：**不是**工程级的页面列表，而是 elements 里的一个对象
{
  "id": "book_pager",
  "type": "page_panel_manage",
  "props": { "container": "book_content_panel", "mode": "prefix" },   // 门控容器 + 门控模式
  "pages": [                                                          // 页列表 = tag + 页面板（在它自己的属性面板里编辑）
    { "tag": "INDEX", "panel": "index_panel" },
    { "tag": "CAT:x", "panel": "cat_panel" }
  ]
}
```

元素节点（镜像 `UIElement`）：

```jsonc
{
  "id": "apple_content_panel",     // → new Panel('apple_content_panel')
  "type": "panel",                 // 只读：由控件箱决定，不写进 props
  "template": "common.common_panel",  // 可选 → id 变成 'apple_content_panel@common.common_panel'
  "debug": false,                  // true → .enableDebug()
  "props":   { "size": ["100%", "100%"], "anchor_from": "top_left" },  // ★ 只存"已赋值"字段
  "vars":    { "binding_text": "page1" },                              // → .addVariable()（$ 前缀由框架加）
  "bindings": [ { "type": "view", "source": "($binding_text = #form_text)", "target": "#visible" } ],
  "modifications": [ { "array_name": "controls", "operation": "insert_back", "value": [] } ],
  "gridPosition": [0, 0],          // 仅当父元素是 grid：→ addGridItem 的 grid_position
  "controls": [ /* 子元素，递归 */ ]
}
```

### 4.2 ★ 三态属性（C3 的落地）

`props` 是**稀疏 map**，键存在 ⟺ 框架会把它写进产物。三种状态与编辑器表现：

| 状态 | 表现 | 产物影响 |
|---|---|---|
| 未赋值 | 输入框显示灰色**默认值占位**，值来自 `catalog.js` 的 `default` | 不写进 JSON |
| 已赋值（= 默认值） | 输入框正常色 + 左侧「已赋值」圆点 | **会写进 JSON**（可能与未赋值渲染一致，但结构不同） |
| 已赋值（≠ 默认值） | 输入框正常色 + 圆点 + 加粗 | 会写进 JSON |

**为什么必须这么较真**：`serialize()` 只拷属性包上**存在**的字段，`new Layout()` 不设任何字段时产物里连 `size` 都没有；反过来，一旦给 `Layout` 设了 `size`，产物就多一个 `size` 键。既有基线产物（`guidebook_demo` 的 587870 字节 / sha256 判据）对**逐字节**敏感，编辑器不能无脑写默认值。

> 实现约定：`catalog.js` 里每个属性都声明 `pack`（哪个属性包）、`setter`（链式方法名）、`type`、`default`、`widget`（编辑器控件种类），`codegen.js` 与 `inspector.js` 都只读这一份 schema——**属性面只有一处事实来源**（照 `SLOT_CALIBRATION` 的单一校准点先例）。

### 4.3 幂等与去噪

- 元素 id 在**同一 UI 文件内必须唯一**（`{ [id]: json }` 会互相覆盖 ⇒ 静默丢控件），`model.js` 在新增/改名时自动去重后缀 `_2`。
- `props` 键排序固定（按 `catalog` 声明顺序），保证**同样模型 → 逐字节同样的 TS 与 JSON**（diff 友好，也是单测能 golden 的前提）。

---

## 5. 版面引擎（`layout.js`，纯函数）

### 5.1 锚点模型

```
af = norm(anchor_from ?? 'center')        // ★ 引擎缺省是 center（见下）
at = norm(anchor_to   ?? 'center')
base.x = parent.x + parent.w * af.x + offset.x        // use_anchored_offset 时 offset 在下面第二段再加
base.y = parent.y + parent.h * af.y + offset.y
尺寸：声明了 size → 用它；未声明 → **铺满父级**（af == at 时）或取两锚点跨距（af ≠ at 时）
box.x = base.x - w * at.x                             // ★ anchor_to 决定"往哪边长"
box.y = base.y - h * at.y
```

★ **两条缺省语义是 2026-09 用真机截图与原版资源反推出来的**（先前押错了 `top_left`，用户拿真机截图纠正）：

| 规则 | 证据 | 后果（如果搞错） |
|---|---|---|
| **缺省锚点 = `center`** | `SapdonGuideBook` 的 `cover_title` 只写 `anchor_to:'center'`；真机里标题文字**端正地落在缎带内部**。若缺省是 `top_left`，盒子会偏移半个自身尺寸、一半跑到缎带外 | 所有未声明锚点的元素整体偏移半个自身尺寸——**画布全错位** |
| **缺省 size = 铺满父级** | 原版 `book_screen.json` 与手册产物里的 `book_background` 都只写 `{type:image, texture:textures/ui/book_back}`，**没有 size**，真机里却撑满整本书 | 背景/木框直接变成 0×0 不显示 |

三个必须成立的自检（单测里逐条锁死，见 `tests/designer-layout.test.mjs`）：

| 用例 | 期望 |
|---|---|
| `size:[48,24]` + `anchor_from=top_right` + `anchor_to=top_right` | 盒子右上角贴合父右上角（x = parent.right - 48） |
| `size:[48,24]` + `anchor_from=center` + `anchor_to=center` | 盒子居中 |
| 无 `size` + `anchor_from=top_left` + `anchor_to=bottom_right` | 盒子**拉伸铺满**父容器（Qt 里没有对应物：这是 JSON UI 的"跨锚点=区域"用法） |
| 无 `size` + 缺省锚点（center/center） | 盒子**铺满**父容器（`book_background` 就是这样） |

补充两条实现细节：

- **`anchor` 单值**：`FormButton` 用 `setAnchor(a)` 一次性设 `anchor_from`/`anchor_to`，所以模型里它只有一个 `anchor` 键 —— 版面引擎把 `props.anchor` 当两个锚点的缺省值（其余元素没有这个键，不受影响）。
- **百分比 offset 相对父尺寸**；`fill` 等于父尺寸，`default` 与"不写"同义（= 铺满），**不要**把 `default` 当 0 处理。

### 5.2 容器三种排布模式

| 容器 | 子项定位来源 | 编辑器行为 |
|---|---|---|
| 普通 `panel` / 其它 | 子项自己的锚点（§5.1） | 自由拖动；拖动**反解**为 `offset` 增量（保持锚点不变） |
| `stack_panel` | **引擎顺序流式**（`orientation` 决定主轴）；沿主轴累加子项尺寸 | 子项沿主轴**不可自由拖动**（拖了也无效）⇒ 编辑器只允许改「顺序」与「沿主轴尺寸」；`offset` 给出 warn（§8 #11） |
| `grid` | `grid_position [列, 行]` 决定格位；格位尺寸 = 父尺寸 / `grid_dimensions` | 子项吸附到格位；**`offset` 无效**（`ui-lessons.md` §5）⇒ 画布上把 offset 画成"幽灵偏移"并给 warn（§8 #3）；数组序 ≠ `grid_position` 时再给一条 warn（§8 #21，依据 `known-pitfalls.md` §4.13） |
| `form_button_grid`（组合件） | **两级坐标**：`slot`（运行期 form 槽位序号）→ `grid_position` 基准格；`pos` → **目标格**；`offset = (pos − base) × 100%` 由 `addButton` 自动补偿 | 画布把按钮画在**目标格**（`pos`），并标出它绑的是哪个槽（`slot`）——"槽位序号 ≠ 视觉序号"这条坑在画布上直接可见 |

> **FormButtonGrid 的 pos 语义怎么确定的**：不是猜的，是拿 `examples/more-golem/dev/more-golem_RP/ui/neo_guidebook.json` 的 `nav_grid` 取证 —— 三个导航按钮 `grid_position` 是 `[0,0]/[1,0]/[2,0]`，而 `offset` 全是 `["0%","0%"]`；索引卡则是 `grid_position [3,0]/[0,1]/…` + 负偏移。
> 结论：**最终视觉格 = `pos`**，`offset` 只是把 item 从"槽位推出的基准格"挪到目标格的补偿量。这也解释了为什么手册那边 `addButton(3 + i, card, [i, 0])` 的那个 `3 +` 删不得。

> ★ **绘制顺序与版面解耦**（`paintOrder()`）：版面（rect）永远按文档序算 —— `stack_panel` 的主轴位置就是文档序决定的；
> 而**绘制顺序**按 JSON UI 的 `layer`（同一父级内的 z-order，越大越靠上，缺省 0）**稳定排序**。
> 画布是绝对定位的 div，改 DOM 顺序就等于改 z-order、不影响位置 ✔。
> 线框模式下每个控件的标签会带 `#序号`（绘制序号）与 `L<layer>` —— 想确认"谁盖在谁上面"时看这两个数即可。

> ⚠️ **格位落点还有一层引擎怪癖**：`known-pitfalls.md` §4.13（真机实测）说「落点跟 `controls` **数组顺序**走，`grid_position` 不参与定位」，框架的容器格盘是靠"先按 `grid_position` 行优先排序再发布"规避的。
> 编辑器的画布按 `pos`/`grid_position` 画（与已验证可用的手册产物一致），并额外报一条 warn 提醒两者不一致的情况 —— **不替引擎下结论**，真机才算数。

### 5.3 画布画什么 / 不画什么（**保真度边界**）

画布默认是 **「贴图预览」** 模式：只画画面本身 —— 不描控件框、标签只在**悬停/选中**时出现、格位参考线只画在选中容器上；
要调版面时切 **「线框」**（每个控件描框 + 常显 id/角标，按 mode 上色）。
**门控模拟默认打开**（工程里有 `#visible` 门控时），并自动预填第 1 页 `tag` —— 否则多页内容叠在一起，画布全是重影。

画布会**用真正的资源包贴图**渲染（`serve.mjs` 提供纹理索引与 `/tex/` 出图），因此"看起来像不像真的"取决于下面这张表：

| 已模拟 | 依据 / 实现 |
|---|---|| `image` 的贴图 | 按 `texture` 取图；`keep_ratio: false` → 拉伸铺满，否则 `contain` |
| **纹理定义侧车** | `textures/ui/book_back.json` → `{nineslice_size:14, base_size:[28,28], tiled:…}` 会被**自动套用**到用这张贴图的控件上（节点自己写的属性优先）。原版木框只写一句 `texture` 就能画出来，靠的就是它 |
| `nineslice_size` | 数字或 `[左,上,右,下]` 数组；**四角按源像素原尺寸**、边/中拉伸；**源带退化时取贴边 1px**（`book_back` 28×28 + slice 14 ⇒ 整张只有四角，真机照样画得出木框与米色内页）。九块（源矩形+目标矩形）在 `paint.js` 里算好，DOM 与离屏渲染共用 |
| `form_button` 三态 | `texture_default/hover/pressed` 三层叠加，`hover`/`pressed` 用 CSS 切（就像真机）；**空纹理 = 不给图**，不是缺纹理（手册索引卡就是 `setTexture('', hover, '')`） |
| `tiled` | `true/'x'/'y'` → 平铺 |
| `clip_direction` + `clip_ratio` | 外层按比例裁、内层反向放大背景（正是框架进度槽的用法） |
| `grayscale` / `alpha` | CSS `filter` / `opacity`（只作用元素自身，不传播给子项） |
| Label 文本 | 颜色/`font_size`×`font_scale_factor`/对齐/阴影/`\n` 换行；★ **不按框宽折行**（引擎只在 `\n` 处换行，超长溢出被裁 —— 这正是手册要求"手动 `\n` 拆行"的原因），字号取 8.4 近似引擎的**窄位图字体** |
| `layer` | 同层 z-order，越大越靠上；**绘制顺序**按它稳定排序（版面位置仍由文档序决定，见 §5.2） |
| 缺纹理 / `.tga` / 原版模板 | 缺纹理→斜纹占位；`.tga`→"不能预览"占位；**未解析的模板**→淡虚线框（手册的「类别」分隔线就属于这种，不假装画出来） |

| 刻意不模拟 | 原因 | 画布表现 |
|---|---|---|
| `max_size`/`min_size` 夹取、`inherit_max_sibling_*` | 需要引擎文本测量与兄弟测量 | 极端尺寸下比真机宽松 |
| `uv` / `uv_size` | 要对图片固有尺寸做二次采样 | 原图整张 + 角标「uv 未模拟」 |
| `factory` / `custom` 渲染器、原版模板内部结构 | 不解析 vanilla UI 文件 | 淡虚线占位框（可见但不假装） |
| 集合项（`collection_panel` 展开、`grid` 引擎侧实例） | 实例数由运行期数据决定 | 只画一个样板格 |
| Molang / 绑定表达式求值（`#visible` 的来源） | 需要运行期数据 | 「门控模拟」只认框架会生成的那几种判定式（含手册的 `$gtag` 前缀式），认不出就**不隐藏**并标"未判定" |
| **字体本身** | 引擎用自带位图字体，浏览器没有 | 字号比例按 8.4 近似（引擎字体更窄），字形与断行位置仍有偏差；**不折行**这一点已按引擎行为对齐 |
| 动画、`alpha` 传播、九宫格以外的绘制细节 | —— | 半透明/虚线示意 |

> **铁律（沿用 AGENTS.md）**：画布"看起来对" ≠ 真机对。涉及集合/门控的版面，必须在游戏内走一遍关键页；本环境无法启动 Minecraft，所以编辑器的产物预览与诊断只当**第一道闸**。

### 5.3.1 ★ 没有浏览器怎么看画布：离屏光栅化

本环境没有浏览器（也就截不到 DOM），所以另配了一条"我能亲眼看"的路：

```bash
node tools/designer/tools/rasterize.mjs                 # 默认渲染 samples/guidebook.js 第 1 页
node tools/designer/tools/rasterize.mjs --grid          # 叠上盒子/格位调试线
node tools/designer/tools/rasterize.mjs --page 2        # 换页（--page 0 = 不模拟门控，全部叠着看）
node tools/designer/tools/rasterize.mjs <工程.sui.json> <输出.png>
```

链路：`layout.js` 解算 → `paint.js` 出绘制指令（**与浏览器画布同一份规则**）→ `tools/rasterize.py`（Pillow + 中文字体）画成 PNG，默认落 `.tmp/designer-render.png`。
静态图只画**默认态**（hover/pressed 是鼠标交互才出现的），并按页面门控隐藏其它页 —— 出来的图就"像一张真机截图"。

> 它的价值不只是给我自己看：**改版面/贴图规则后，这张图是唯一能立刻发现"画错了"的手段**（本轮的缺木框、缎带错位、多页重叠、九宫格退化都是这么抓出来的）。

### 5.3.2 拖动语义：为什么不是"点住就拖"

SapdonUI 的界面外层几乎都是**铺满整页的容器**（`index_layout`、`book_content_panel`），
一点住就抓到它、一拖整页跟着飞 —— 用户原话是"各种控件一拖动就散架了"。所以：

| 元素 | 拖动语义 | 怎么拖 |
|---|---|---|
| 小叶子（无子项且未铺满整页） | 改 `offset` | 拖本体，或左上角**移动手柄** |
| 容器 / 铺满整页的大背景 | 改 `offset` | **只能拖移动手柄**（或 `Alt`+拖本体） |
| `stack_panel` 子项 | 在流式里**换顺序** | 手柄或本体（画插入线） |
| `grid` 子项 | **换格位**（吸附） | 同上（画格位预览） |
| `form_button_grid` 子项 | **换目标格 `pos`** | 同上 |

两条硬规矩：
1. **拖动只出幽灵预览，松手才提交** —— 本体不实时跟手，杜绝"边拖边塌"；
2. **本体拖动只对小叶子放行**（`bodyDraggable()`：无子项 + 面积 ≤ 画布 90%），容器与大背景一律走手柄。

图例（画布底部）会实时显示"选中 X：拖动会发生什么"，不用靠猜。

### 5.4 贴图从哪来、怎么判对错
| 环节 | 规则 |
|---|---|
| 来源优先级 | 工程资源包 **覆盖** 原版（与游戏里一致）：`serve.mjs` 先扫原版、后扫工程包，后者覆盖同名路径 |
| 原版包发现 | `--vanilla <RP 目录>` / `SAPDON_DESIGNER_VANILLA`；否则自动找工作区里的 `bedrock-samples*`（深度 ≤3 找 `resource_pack`，含 `textures/` 才算） |
| 工程包 | `--project` / `SAPDON_DESIGNER_PROJECT`，外加自动扫 `examples/<proj>/dev/<proj>_RP` |
| 引用写法 | `textures/...`、**不带扩展名**（引擎语义）；`.png/.jpg/.jpeg/.tga` 由服务端补 |
| ★ **大小写** | 包内文件名**区分大小写**（原版是 `textures/ui/white`，`White` 不存在 —— Windows 的 `Test-Path` 会骗人）。命中/只差大小写/找不到**分三档**：只差大小写给 `info` 并给出规范写法，不当"找不到"制造假告警 |
| `.tga` | 存在但浏览器不能预览 ⇒ 画布给占位，诊断不报错（真机正常） |
| 没有资源包时 | 编辑器照常可用：不画贴图、不判定存在性（`known: null`）、选择器退回文本输入 |

**实测判据**（`tests/designer-textures.test.mjs`）：示例工程引用的 10 张贴图必须逐个能在 `bedrock-samples` 里找到；目录里的 `TEXTURE_SUGGESTIONS` 也必须逐个真实存在（这条就是被 `textures/ui/White` 咬过一次之后加的）。

---

## 6. 代码生成

### 6.1 链式 setter 映射（属性包 → 代码）

`props` 的键按 `catalog` 的 `pack` 分组，生成对应的属性包实例；`addProp` 兜底：

| `props` 键归属 | 生成 |
|---|---|
| `size/offset/anchor_from/anchor_to/max_size/min_size/contained/draggable/use_anchored_offset/inherit_max_sibling_*` | `.setLayout(new Layout().setSize([...]).setAnchorFrom('top_left')...)` |
| `visible/layer/alpha/clips_children/allow_clipping/clip_offset/enable_scissor_test/selected/use_child_anchors/ignored/...` | `.setControl(new Control()...)` |
| `text/color/font_size/text_alignment/shadow/localize/...` | `.setText(new Text()...)` |
| `texture/uv/uv_size/nineslice_size/tiled/clip_direction/clip_ratio/keep_ratio/...` | `.setSprite(new Sprite()...)` |
| `grid_dimensions/maximum_grid_items/grid_item_template/grid_fill_direction/...` | `.setGridProp(new GridProp()...)` |
| `button_mappings/modal/always_listen_to_input/...` | `.setInput(new Input()...)` |
| `sound_name/sound_volume/sound_pitch/...` | `.setSound(new Sound()...)` |
| `scroll_speed/scrollbar_track/...` | `.setScrollView(new ScrollView()...)` |
| `collection_name` | `.setCollectionName('form_buttons')` |
| 其余（`default_control` / `hover_control` / `orientation` / 自定义键…） | `.addProp('key', value)` |

子项与结构：`.addControl(child)`；grid 子项 `.addGridItem([col, row], child)`；变量 `.addVariable(k, v)`；绑定 `.dataBinding.addDataBinding(new DataBindingObject().setBindingType('view').setSourcePropertyName('...').setTargetPropertyName('#visible'))`；调试 `.enableDebug()`。

**屏壳部分**（一个工程 = 一个屏 = 一句话）：

```ts
const sapdon_ui = new SapdonFormUI("sapdon_ui:book", book_content_panel, book_buttons_panel);   // → ui/sapdon_ui_book.json
// 内部已完成「挂内容/按键面板 + 建唯一根面板 root（门控在 root 上） + 注册 server_form 路由」
// 多页面不靠多个根（一个文件只有一个 root）：在内容面板里用门控做（手册即此例）

registry.submit()
```

> ★ **为什么生成 `new SapdonFormUI("ns:nm", 内容面板, 按键面板)`**（2026-09 用户口径：`addElement(createPageRoot({...}))` 那句是多余的）：
> 老写法要把 `name` / `panelId` / `contentRef` / `buttonsRef` 写**两遍**（`createPageRoot` 一遍、`registerPage` 一遍），
> 而它们全部可由「文件标识 + 两块面板」推出来（引用 = `<ns_nm>.<元素 id>`，`panelId = sapdon_ui:<nm>`，factory 指向 `@<ns_nm>.root`）。
> 构造函数把这些全收进框架 —— 生成代码里一个参数都不用写。
>
> ★ **屏幕根面板固定叫 `root`**（`ServerFormUI.ROOT`，与 HUD 的 `root_panel`、容器的 `container_root_panel` 同一套"根面板"约定）：
> 工厂的 `long_form` **一律**是 `@<ns_nm>.root`，显隐门控写在 root 上 ⇒ **一个 UI 文件只能有一个 root**（同名元素互相覆盖）。
> 于是**多页面只能在同一份内容/按键面板里用门控切**（第 2 行起的"视图"就是这些 tag；换了面板要报
> `view-route-not-expressible`）。这就是为什么手册不在文件里堆根、而是在内容面板里做 `$gtag` 门控。
>
> ★ **一个工程 = 一个 UI 文件 = 一个屏**：UI 文件与 namespace 都是 **`ns_nm`**（`new SapdonFormUI("sapdon_ui:book", …)`
> → `ui/sapdon_ui_book.json`，引用前缀 `sapdon_ui_book.xxx`），而
> `UISystemRegistry.registerUISystem` 按 `ui/<name>.json` **覆盖**同路径条目、同时往 `_ui_defs` **重复 push**，
> `GRegistry` 又按 `root|path|name` 去重只留最后一个 —— **同 `ns_nm` 建两次 = 前一个屏的元素被静默丢掉 + `_ui_defs` 出现重复项**。
> 所以要多个屏就各给各的 `ns:nm`；首行的 `panelId` 必须 = `sapdon_ui:<name>`（诊断规则 `main-route-panel-id` 盯着）。
>
> 生成器**只**输出「元素 + 屏壳 + submit」这几段，imports 按实际用到的类动态生成。
> `StackPanel` 的子项一律生成 `addControl`（`addStack(size, content)` 就是「建一个带 size 的 Panel + addControl」的糖，产物结构等价）。

### 6.2 模板继承（Qt 的 promote）

`template` 非空时生成 `new Panel('bg', 'common.common_panel')`（框架内部 id 变 `bg@common.common_panel`）。控件箱内置常用模板项：`common.button`、`common.common_panel`、`common_buttons.light_text_button`（**带 §8 #7 的警告**）、`server_form.form_button`。

### 6.3 ★ Round-trip 限制（C1 的诚实边界）

| 方向 | 支持度 | 说明 |
|---|---|---|
| 模型 → TS | ✅ 完整 | 生成即合法框架代码（交叉验证见 §7.3） |
| TS → 模型（反向解析） | ❌ **MVP 不做** | 手改过的代码无法无损回读（链式调用可任意重排、可混用 `addProp`、可跑循环/函数生成元素）。⇒ 约定：**生成一次，之后以代码为准**；要再可视化编辑就重新在编辑器里画（或把编辑器工程 `.sui.json` 与代码一起提交，二者由人保持同步） |
| 产物 JSON → 模型 | ❌ 不做 | 原生 JSON UI 无 `$变量`/属性包归属信息，反推会丢语义 |

> 若将来要做反向解析，唯一现实路径是「约定子集 + TypeScript AST」（`typescript` 已在依赖里），并且要**明确拒绝**无法解析的构造，而不是猜。列入 §10 的 S3。

---

## 7. 逻辑（门控/绑定）与产物预览

### 7.1 sapdon 的「信号槽」= 绑定表达式

Qt 用信号槽连对象；sapdon 的 UI 里**没有回调**（`ui-lessons.md` §1：JSON UI 只能做算术、`=`、字符串 `-`）。所以逻辑编辑器只做两件事：

1. **变量**：`$binding_text` = 运行时由 `.body(x)` emit 的值（工程里声明为 `vars`）；
2. **门控**：`view` 绑定 `($binding_text = #form_text) → #visible`，即"当前页等于我这一页才可见"。

编辑器提供三个**模板化门控**（选一次就生成正确的表达式，避免手写数组下标/前缀匹配出错）：

| 门控种类 | 绑定源 | 依据 |
|---|---|---|
| 页面门控（内容/按钮组共用） | `($<var> = #form_text)` | `ui-architecture.md` §5.1 `gate()` |
| 按钮门控 | `($<var> = #form_button_text)` | 按钮"激活三件套"之一 |
| HUD 状态门控 | `($<var> = #hud_title_text_string)` | `HudStatePanel` 的状态字符串 |

另提供「按钮激活三件套」一键生成：`collection_details`(form_buttons) + `collection`(form_buttons, `#form_button_text`) + `view` 门控——**三件套必须都在**，少一条按钮就不可点（`ui-lessons.md` §3）。

### 7.2 产物预览（`uic` 的等价物）

`preview.js` 把模型摊成 JSON UI 对象：

```
{ namespace: '<ns>', '<id>': { type, ...已赋值属性包字段, $变量…, bindings, controls: [...], modifications } }
```

语义与 `UIElement.serialize()` + `UISystem.toObject()` **逐字段对齐**（只拷已赋值、`$` 前缀变量并入、`controls` 为子节点序列化数组）。几个必须记住的细节：

- **键带模板**：`UISystem.toObject()` 用 `element.id`（即 `id@template`）当键。所以 `third_party_server_screen` 的键是 `third_party_server_screen@common.base_screen`；`FormButton` 的模板是**类内固定**的（`super(id, 'common.button')`），它的键永远是 `btn_xxx@common.button`。
- **`Grid.addGridItem` 会包一层** `grid_item_N`（不是 `grid_item_<slot>`），`grid_position` 挂在这层包裹面板上；`addButton` 的包裹名则是 `grid_item_<slot 三位补零>`。
- **调试框位置**：普通元素 `.enableDebug()` 排在 `.addControl()` 之前 ⇒ `debug_board` 在 `controls` **首位**；格位子项走 `addGridItem(..., debugColor)`，框架是"先 addControl 再 enableDebug" ⇒ `debug_board` 在**末位**且固定红色。

它同时是"画布之外的第二双眼睛"：属性面板看模型、预览页签看**框架会写出什么**。

### 7.3 交叉验证（不靠人肉保证镜像）

`tests/designer-codegen.test.mjs` 做两件事：

1. **golden**：示例工程 → 生成的 TS 文本与 baseline 逐字节一致、`preview` 与 baseline JSON 深度相等；
2. **交叉验证**：把**同一份示例工程**用**真实框架类**（`dist/core/ui/**`，即 `src/core/ui` 的 tsc 产物）构造一遍，断言 `system.toObject()` 与 `preview.js` 的输出**深度相等**。

⇒ 一旦框架的序列化语义变了（比如新增属性包并入顺序），第 2 条会**先红**，而不是等真机翻车。这是本工具唯一的"防镜像漂移"机制，**不要**为了让测试变绿而放宽它。

### 7.4 多选与几何工具（对齐 / 分布 / 等尺寸）

Qt Designer 的 alignment toolbar 在 sapdon 里对应**改 `offset`/`size` 的纯几何操作**：

| Qt | 这里 | 实现 |
|---|---|---|
| Ctrl 点加减、Shift 点区间、空白处 drag 框选 | `Store.select(id, {add, range})` / `selectMany(ids)`；画布 `.marquee` | `store.selectedIds`（有序，末位 = 主选 = 属性面板编辑的那个）；`store.selection` 恒等于末位 |
| Align Left/Right/Top/Bottom、Align H/V Center | 多选面板 6 个按钮 | `align.js` 的 `alignOps(boxes, mode)`：以**整组包围盒**为基准 |
| Distribute Horizontally/Vertically | 2 个按钮（≥3 个才有意义） | `distributeOps`：两端不动、中间等间距 |
| Same width/height | 同宽/同高/同尺寸 | `sameSizeOps`：以列表首个为基准 |
| Raise / Lower | 层序 ↑↓、`Ctrl+]` / `Ctrl+[` | 改 `layer` 属性（同父级 z-order），不会低于 0 |
| Ctrl+C / Ctrl+V / Ctrl+D | 复制 / 粘贴 / 副本 | `Store.copy/paste/duplicate`：剪贴板存**序列化节点**，粘贴/副本**重建整棵子树的 id** 并 offset +8/+8 |

★ **为什么写像素 offset**：JSON UI 的锚点决定"贴哪边"、offset 决定"再挪多少"；对齐是一次性几何动作（Qt 也是直接改 geometry），写像素最直观、可预测、可撤销。**代价**：原本是百分比（如 `['50%', 0]`）的 offset 会被对齐改成像素值 —— 界面上有明确提示。

★ **框选只选最外层**：整页框选会命中铺满页面的容器，如果连它的 79 个子孙一起选上，"对齐/拖动"就会**叠加变换**（子项被移动两次）。所以命中的祖先若也在选区里，只保留祖先。

---

## 8. 诊断规则（`diagnostics.js`）

规则全部有出处；严重度 `error`（引擎必拒/必炸）> `warn`（大概率出错）> `info`（风格/前兆）。**MVP 已实现 26 条**（`RULES` 是唯一清单，改规则必须连 `why` 一起改）：

| # | rule | 严重度 | 判据 / 出处 |
|---|---|---|---|
| 1 | `id-charset` | error | id 只允许 `A-Za-z0-9_-`（`checkUIName()` 同理：id 同时是门控键与引用名） |
| 2 | `id-duplicate` | error | `{ [id]: json }` 互相覆盖 ⇒ 静默丢控件 |
| 3 | `identifier-charset` | error | identifier 同时是 namespace 与 `ui/<name>.json` 文件名（`known-pitfalls.md` §4.10 同源） |
| 4 | `collection-index` | error | `Unknown property [collection_index]`（`sapdon-ui.md` §7.3） |
| 5 | `pressed-button-name-prop` | error | 必须是变量：`Unknown property [pressed_button_name]`（`ui-lessons.md` §2.2） |
| 6 | `page-id-prefix` | error | 路由靠 `sapdon_ui:` 前缀分流，否则走原生表单 |
| 7 | `page-id-duplicate` | error | `$panel_id` 精确匹配，重复页永远显示同一页 |
| 8 | `page-content-missing` | error | 壳固定渲染 content+buttons，缺引用报错（`sapdon-ui.md` §7.4） |
| 9 | `grid-child-offset` | warn | `ui-lessons.md` §5：grid 内 offset 无效，要包 pos_wrap |
| 10 | `grid-child-position` | warn | 引擎靠 `grid_position` 绑格位（`AGENTS.md` 手册槽位坑） |
| 11 | `grid-order-vs-position` | warn | `known-pitfalls.md` §4.13：落点跟 `controls` 数组顺序走，与 `grid_position` 不一致时真机可能整体错位 |
| 12 | `light-text-button-empty-binding` | warn | 空 `binding_name` ⇒ 整条控制链不渲染（`ui-lessons.md` §2.1） |
| 13 | `page-buttons-missing` | warn | 纯内容页也要给空按键面板 |
| 14 | `form-button-orphan` | warn | 游离按钮没有集合/门控绑定（`ui-lessons.md` §3） |
| 15 | `form-button-texture-partial` | warn | `setTexture(d,h,p)` 三参要一起给；缺的会生成空纹理 Image |
| 16 | `stack-child-offset` | warn | 流式布局接管主轴定位，offset 不生效 |
| 17 | `unknown-prop` | warn | 不在 catalog 里的属性键会被 codegen/preview **静默丢弃**（要么补目录，要么是拼错了） |
| 18 | `stack-child-unsized` | info | 沿主轴未声明尺寸 → 引擎按 default 处理，落位不可预期 |
| 19 | `text-line-length` | info | 中文一行约 16 汉字（手册排版经验），超长建议手动 `\n` |
| 20 | `root-not-referenced` | info | 没被任何页面引用的根元素不会进 UI 文件（生成的是死代码） |
| 21 | `ungated-page` | info | 没有任何 `#visible` 门控：多页会同时可见（单页工程可忽略） |
| 22 | `texture-invalid` | error | 纹理引用带 `..`/空段或不在 `textures/` 下 ⇒ 解析不出文件 |
| 23 | `texture-missing` | warn | 原版包 + 工程包里都找不到（真机报 Missing referenced asset）；**只在编辑器连上资源包索引时才判定** |
| 24 | `texture-case` | info | 只差大小写（包内是 `textures/ui/white`，写了 `White`）；区分大小写的平台/打包会找不到 |
| 25 | `screen-kind-freeform` | info | 屏幕类型是 `容器` / `hud` ⇒ **自由摆放**：编辑器不校验 root/内容/按钮/门控（也不预览框架产物） |
| 26 | `screen-kind-form-empty` | error | `form` 屏一行都没有 ⇒ 生成不出 `SapdonFormUI`（没有内容/按键面板可传） |

> **屏幕类型（`doc.screenKind`，2026-09 三方口径）**：`form` 自定义表单屏（走上面全套规范校验）/ `容器` / `hud` 常驻。
> 后两类**只做元素级校验**（id、属性目录、纹理、grid/stack/form_button 结构），跳过 `root`、内容/按钮面板、`panelId`、门控视图这些 form 专属规则 ——
> 因为它们的文件由 `ContainerUISystem` / `HudUISystem` 落（hud 还写的是**原版** `ui/hud_screen.json`），挂载与槽位换算都在框架/项目侧，编辑器管不到、也不假装管得到。

> 诊断只做**静态可判定**的事。凡是需要引擎/真机才能判的（模板内部结构、引擎侧集合实例、字体度量、绑定表达式求值、格位落点的引擎怪癖）一律**不报结论**，最多像 #11 那样把已知证据摆出来提醒 —— 避免"狼来了"把诊断面板变成噪音。

---

## 9. Qt → sapdon 语义鸿沟清单（别硬套）

| Qt 有、sapdon 没有 | 编辑器怎么处理 |
|---|---|
| 完整布局管理器体系（QGridLayout/QFormLayout/QSpacerItem/stretch） | 只给 `stack_panel`（流式）与 `grid`（集合格盘）两种；其余一律锚点定位。不发明 spacer——`size` 就是 spacer |
| 富控件（QTabWidget/QTableView/QSlider…） | 只有 `panel/stack_panel/collection_panel/grid/label/image/button/scroll_view` 八种；"复合控件"靠模板继承（§6.2） |
| 信号槽（任意对象间回调） | 只有「变量 + 绑定表达式门控」（§7.1）。想要复杂逻辑 ⇒ 回运行期脚本，UI 侧只做显隐/换值 |
| `.qrc` 资源编译、i18n（`.ts`/`.qm`） | 纹理靠 `res/textures/**` 直接引用；文案靠 `RP/texts/*.lang` 键名（框架不解析，Engine 解析） |
| 所见即所得（像素级保真预览） | 画布是近似（§5.3），真机才是判据 |
| `uic` + `moc` 生成 C++（可反向解析） | 只单向生成 TS（§6.3） |
| Qt Designer 的"绝对定位/打破布局"按钮 | 默认就是绝对定位；"打破布局"对应 `grid` 里自动包 pos_wrap |
| 编辑器侧：**多选 + 对齐工具条** | 已对齐（§7.3）：Shift/Ctrl 点加减、Shift 点选一段、空白处框选；≥2 个出对齐（6 向）/分布（≥3）/等尺寸，≥1 个出层序与剪贴板 |

---

## 10. 路线图

| 阶段 | 内容 | 状态 |
|---|---|---|
| **MVP** | 控件箱（8 元素 + 2 组合件）、画布（拖/缩放/格子吸附/锚点手柄/门控模拟/**原版贴图渲染**）、对象树、属性面板（三态 + **贴图选择器**）、门控编辑器（3 模板 + 按钮三件套）、TS 代码生成、JSON 产物预览、24 条诊断、`.sui.json` 存读 + localStorage 草稿、4 个测试文件（91 条，含**与真实框架类的交叉验证**、**执行生成代码**、**原版贴图实测**） | ✅ 已落地 |
| **S1** | 画布内联改文本、复制/粘贴/多选对齐、属性面板搜索、`uv`/`uv_size` 模拟、`addStack` 糖的生成、`.sui.json` 与 `dev/<proj>_RP/ui/*.json` 差异对照视图、贴图拖进画布即建 image | 待办 |
| **S2** | 真机联调：编辑器 → 写 `main.ts` → 触发 `sapdon compile` → 起 dev-server（`SAPDON_DEV_SERVER_PORT`）→ 把产物 JSON 拉回编辑器做「预期 vs 实际」diff；容器版面（`ContainerUISystem` 槽位/进度槽）专用视图 | 待办 |
| **S3** | TS 反向解析（限定子集 + `typescript` AST + 明确拒绝清单）、从既有 `main.ts` 导入工程 | 待办 |
| **不做** | 自研渲染引擎去复刻 JSON UI、绕过框架直接吐 JSON UI、把编辑器做成运行期工具 | —— |

---

## 11. 验收判据（可执行）

```bash
# 1) 纯逻辑：版面引擎锚点模型 + 流式/格位 + form 槽位语义 + 拖动/缩放反解
node tests/designer-layout.test.mjs

# 2) 绘制模型：纹理侧车 / 九宫格退化 / 空纹理 / 模板占位 / 手册 $gtag 门控
node tests/designer-paint.test.mjs

# 3) 纹理路径解析 + ★实测：示例工程与目录建议里的贴图必须真的在原版资源包里
node tests/designer-textures.test.mjs

# 4) 编辑器外壳：自带最小 DOM 桩，跑一遍真实操作路径（控件箱/树/属性/贴图渲染/选择器/撤销/门控）
node tests/designer-app.test.mjs

# 5) 代码生成 + 诊断 + ★与真实框架类的交叉验证（需要 dist/core/ui）
npx tsc && npx tsc-alias && node tests/designer-codegen.test.mjs

# 6) 起编辑器（零依赖静态服务器 + 资源包纹理索引，默认 5178）
node tools/designer/serve.mjs

# 7) 没浏览器也能看画布：离屏光栅化成 PNG（→ .tmp/designer-render.png）
node tools/designer/tools/rasterize.mjs
```

判据（缺一不可）：

1. `designer-layout` 全绿 —— 尤其 §5.1 的四个自检用例（缺省锚点 center、缺省 size 铺满）；
2. `designer-paint` 全绿 —— 九宫格退化、纹理侧车、空纹理、模板占位、`$gtag` 前缀门控；
3. `designer-textures` 全绿 —— 示例工程的每张贴图与目录里的每条建议都必须**在原版包里真实存在**（大小写敏感）；
4. `designer-app` 全绿 —— 编辑器在无浏览器环境下也能跑通主要交互（**这是 UI 模块唯一的自动化验证**）；
5. `designer-codegen` 全绿 —— 含三条**交叉验证**：
   ① 逐元素 `serialize()` 与 `previewElement()` 深度相等；
   ② 一个 UI 文件的 `toObject()` 与 `previewUiFile()` 深度相等；
   ③ `server_form` 路由壳与 `previewServerForm()` 深度相等；
   外加**把生成的 TS 转译、换 import、剥掉 `registry.submit()` 后真的执行一遍**，再对一次产物；
6. 示例工程 `samples/guidebook.js` 是**照着真产物抄的**（`examples/guidebook_demo/dev/guidebook_demo_RP/ui/gateddemo_book.json` + `sapdonGuideBook.ts` 常量）：同样的 `book_background` 无 size + 九宫格、同样的 `index_layout` 95%×90% → 横向 stack → 封面/类别、同样的 `IDX_SLOT_BASE=3` 卡片槽位、同样的 `grid_item_<slot>` 包裹；
7. 离屏渲染出的图**肉眼对得上真机截图**（木框 + 缎带标题 + 左页三行说明 + 右侧「类别」+ 四张原版图标卡 + 底部导航键）——这是本轮唯一能发现"画错了"的手段；
8. 服务器能起来：`/api/config` 报出资源包与纹理数（含带侧车定义的数量）、`/tex/<路径>` 出的是**真图片字节**（PNG magic `89 50 4E 47`）、越界路径 403/404、`index.html` 与全部 `src/**` 200。

> ⚠️ 与框架既有约定一致：**"页面能打开"不等于"真机对"**。编辑器的产物最终仍要在游戏内验证（集合/门控类改动尤其），本环境无法启动 Minecraft。

---

## 12. 本轮新取证的引擎级事实

写这一节是因为它们是**设计决策的直接依据**，而不是"顺手记的笔记"：

### 12.1 FormButtonGrid 的 `pos` 是"目标格"，`offset` 是补偿量

- **证据**：`examples/more-golem/dev/more-golem_RP/ui/neo_guidebook.json` 的 `nav_grid` ——
  `grid_item_000/001/002` 的 `grid_position` = `[0,0]/[1,0]/[2,0]`，三枚按钮的 `offset` **全是 `["0%","0%"]`**（因为 `slot` 推出的基准格恰好等于目标格）；
  而索引/内容页的卡片是 `grid_position [3,0]/[0,1]/…` + **负偏移**（`addButton(3 + i, card, [i, 0])`，`3 +` 是为前三个导航槽让位）。
- **结论**：`视觉格 = pos`，`offset = (pos − slot 推出的基准格) × 100%`。编辑器画布、`preview.js` 的 `grid_item_<slot>` 包裹名与 `offset` 数值都按这条来（交叉验证逐字段对得上）。
- **落地位置**：`layout.js` 的 `form-grid` 分支、`preview.js` 的 `formButtonGridJSON`。

### 12.2 同 `nm` 重复 `new UISystem` 会互相覆盖

> 文档标题里的 "namespace" 是历史措辞：**真正决定文件名的是标识串的 `nm` 段**（`UISystem.name = identifier.split(':')[1]`），
> 不是 namespace 段。所以 `"a:x"` 与 `"b:x"` 会撞同一个 `ui/x.json`。

- **机制**（读源码即可复核）：`UISystemRegistry.registerUISystem` 用 `ui_system.path + name + '.json'` 当 key **覆盖**写 map，同时无条件 `#ui_def_list.push(...)`；
  `GRegistry.register` 之后按 `root|path|name` 去重（`registry.submit()` 里的 `dedupe`）**只留最后一个**。
- **后果**：`new SapdonFormUI('a:x', c, b)` 建两次 ⇒ 前一个实例挂的元素**全部静默丢失**，且 `_ui_defs.json` 里 `ui/x.json` 出现两条。
- **规避**：一个界面只 `new` 一次 `SapdonFormUI`（`nm` 唯一）；同文件里再挂路由用 `getSystem()` 续挂 —— 这正是 §6.1 代码生成规则的由来。

### 12.3 纹理引用**区分大小写**（2026-09，加"缺纹理"诊断时实测）
- **怎么发现的**：新诊断读原版包时报 `textures/ui/White` 找不到，而 PowerShell `Test-Path <rp>/textures/ui/White.png` 明明返回 `True` —— 因为 **Windows 路径不区分大小写**，那个 `True` 是假的。
  查目录真实条目：原版是 `textures/ui/white.png`（全小写）。`ui-architecture.md` 里那处示例写法已一并订正，并加了一句提示。
- **同批被抓出来的错**：`textures/ui/slot_bg`（原版压根没有）、`textures/ui/button_borderless_light_hover`（真名 `button_borderless_lighthover`，没有下划线）。
- **工具侧处理**：命中 / **只差大小写** / 找不到**分三档** —— 只差大小写给 `info` 并给出包内规范写法，不当"找不到"制造假告警（引擎自己在各平台是否区分大小写**尚未真机确认**，所以不把话说死）。
- **守卫**：`catalog.js` 的 `TEXTURE_SUGGESTIONS` 已逐个改成实测存在的写法，并由 `tests/designer-textures.test.mjs` 加了一条"建议必须真实存在"的测试盯着。
- **落地位置**：`textures.js` 的 `resolveTexture`（`caseMismatch`）、`diagnostics.js` 的 `texture-case`、`catalog.js` 的 `TEXTURE_SUGGESTIONS`。

### 12.4 ★ JSON UI 渲染的三条缺省语义（2026-09，靠真机截图 + 原版资源包反推）

这轮"拿原版贴图来显示"的收益不止贴图本身 —— 对着用户的真机截图逐个核对，抓出三条**引擎缺省语义**，先前全押错了：

| # | 事实 | 证据 | 押错的后果 |
|---|---|---|---|
| 1 | **缺省锚点 = `center`**（不是 `top_left`） | `sapdonGuideBook.ts` 的 `cover_title` 只写 `setAnchorTo('center')`；真机截图里标题文字**端正落在缎带内**。若缺省是 top_left，盒子偏移半个自身尺寸、一半在缎带外 | 所有未声明锚点的元素整体错位半个自身尺寸 |
| 2 | **缺省 `size` = 铺满父级**（不是 0） | 原版 `book_screen.json` 与手册产物的 `book_background` 都是 `{type:image, texture:textures/ui/book_back}`，**不写 size**，真机里撑满整本书 | 背景/木框变 0×0，整页没有木框 |
| 3 | **九宫格"源带退化"取贴边 1px**；`nineslice_size` 可为 `[左,上,右,下]` | `textures/ui/book_back.json` = `{nineslice_size:14, base_size:[28,28]}`：28×28 切 14 ⇒ 整张只有四角、边与中带都是 0 宽；真机仍画得出木框与米色内页 ⇒ 引擎必然取贴边 1px 拉伸（`saleribbon` 则是 `[5,5,6,8]` 的数组切片） | 木框只剩四个角，中间是空洞 |

顺带发现 **纹理定义侧车**机制：`textures/ui/<名字>.json` 与 png 同名时，里面声明的 `nineslice_size` / `tiled` / `base_size` 会**自动当默认值**套到用这张贴图的控件上（原版 UI 里满屏都是这种用法；原版包带侧车的 UI 贴图有 338 条）。

- **落地位置**：`layout.js` 的 `ENGINE_DEFAULT_ANCHOR` 与 `measure()`、`paint.js` 的 `ninePieces()`/`imageOps()`、`packScan.mjs` 的 `readTextureDef()`/`readImageSize()`。
- **验证**：`tests/designer-paint.test.mjs` + `tests/designer-layout.test.mjs` 逐条锁死；最终判据是**离屏渲染图与真机截图肉眼一致**（§5.3.1）。
- ⚠️ 第 1/2/3 条目前是"原版资源包 + 真机截图对照"级别的证据，**尚未逐条真机回归**；进游戏时应顺手确认一遍（尤其缺省锚点在其它界面里的表现）。
