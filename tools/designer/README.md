# Sapdon UI Designer —— 可视化 UI 编辑器（Qt Designer 范式）

把 `main.ts` 里手写 `new Panel(...).setLayout(...)` 的活，变成「控件箱拖控件 → 画布调锚点 → 属性面板改字段 → 一键出 TS 代码」，并顺手把 `doc/dev/ui-lessons.md` 里的坑做成**实时诊断**。

- **设计文档（先读这个）**：[`doc/dev/ui-designer.md`](../../doc/dev/ui-designer.md) —— Qt 对照映射、分层、工程格式、版面模型、代码生成、诊断规则、路线图
- **范围**：只服务 **SapdonUI 自己的界面**（`SapdonFormUI` / `ServerFormUI` 页面壳 / `SapdonGuideBook` 手册 / `ContainerUISystem` 容器 / `HUD`）——不去复刻原版任意界面，不解析原版模板内部
- **零依赖**：原生 ESM + 原生 DOM，没有打包器、没有 npm 依赖（本仓库没有 vite，受限环境也装不了）
- **单向生成**：编辑器 → TS 代码。手写的代码**不回读**（原因见设计文档 §6.3）

---

## 30 秒上手

```bash
node tools/designer/serve.mjs            # → http://127.0.0.1:5178/
node tools/designer/serve.mjs 6000       # 换端口（或设 SAPDON_DESIGNER_PORT）
```

打开后默认加载示例 **「Sapdon 手册」**（`samples/guidebook.js`）—— 它是**照着真产物抄的**
（`examples/guidebook_demo/dev/guidebook_demo_RP/ui/gateddemo_book.json` + `sapdonGuideBook.ts` 的常量）：
木框书页、封面缎带、右页「类别」+ 四张原版图标卡、底部翻页按钮。顶栏「示例…」可切到最小示例「对称门控小书」。

> **启动总是给默认示例**，不会拿上次的 localStorage 草稿盖掉它（旧草稿会变成一个「有草稿 · 恢复」小胶囊，点一下才套用）。

画布两个模式（工具栏切换）：

| 模式 | 长什么样 | 什么时候用 |
|---|---|---|
| **贴图预览**（默认） | 只画画面本身：不描控件框、标签只在**悬停/选中**时出现、格位参考线只画在选中容器上 | 看"做出来像不像" |
| **线框** | 每个控件都描框（蓝=锚点/绿=流式/紫=格子）+ 常显 `#绘制序号` `id` `type` `L<layer>` | 调版面、查归属、**确认谁盖在谁上面** |

**门控模拟默认是打开的**（工程里有 `#visible` 门控时），并自动预填第 1 页要 emit 的 `#form_text`（页面的 `tag`）——否则多页内容会全叠在一起，看着很乱。

### 拖动移动：先说清"拖了会发生什么"

拖动是这个工具最容易"一拖就散架"的地方（外层容器往往铺满整页，误抓一下整页就飞了）。规则：

| 元素 | 拖动会发生什么 | 怎么拖 |
|---|---|---|
| **小叶子**（标签/图标/按钮，无子项且没铺满整页） | 改 `offset`（锚点不动） | **直接拖本体**，或拖左上角黄色手柄 |
| **容器**（有子项，如整页面板、书壳） | 同上（改 offset） | **只能拖左上角黄色手柄**；或按住 `Alt` 拖本体 |
| **铺满整页的大背景**（`book_background`/`bg`） | 同上 | 同上（避免"点哪都抓到它"） |
| `stack_panel` 子项 | **在流式容器里换顺序**（画布上给插入线） | 拖手柄或本体 |
| `grid` 子项 | **换格位**（吸附到格，画布上给格位预览） | 同上 |
| `form_button_grid` 子项（表单按钮/卡片） | **换目标格 `pos`**（槽位 `slot` 不变，`offset` 自动补偿） | 同上 |

要点：**拖动只出幽灵预览，松手才提交**（本体不会实时跟着鼠标跑，避免"边拖边塌"）；移动手柄在选中元素的**左上角**（黄色），缩放手柄在**右下角**（蓝色）。

改完点 **保存 .sui.json** 存工程；再点 **TS 代码** 页签复制生成结果，粘进项目 `main.ts`。

> 端口 5178 是编辑器自己的，和 sapdon 构建用的 `SAPDON_DEV_SERVER_PORT`（默认 49037）互不干扰。

---

## ★ 没有浏览器也能"看"画布：离屏渲染

本环境（以及 CI）没有浏览器，截不到 DOM。所以另配了一条把画布渲染成 PNG 的路 ——
**用的是和浏览器画布完全相同的规则**（`layout.js` 解算 + `paint.js` 出绘制指令，只换渲染后端）：

```bash
node tools/designer/tools/rasterize.mjs                  # → .tmp/designer-render.png（默认第 1 页）
node tools/designer/tools/rasterize.mjs --page 2         # 换页；--page 0 = 不模拟门控，全叠着看
node tools/designer/tools/rasterize.mjs --grid           # 叠上盒子/格位调试线，核对版面
node tools/designer/tools/rasterize.mjs my.sui.json out.png
```

静态图只画**默认态**（hover/pressed 要鼠标交互），并按页面门控隐藏其它页 —— 出来的图像一张真机截图。
**改版面或贴图规则后，先跑这个再看图**：木框缺失、缎带错位、多页重叠、九宫格退化都是靠它抓出来的。

---

## ★ 贴图：直接拿原版资源来显示

编辑器**不内嵌任何贴图**，运行时从资源包里读真图。启动时它会自己找包，找不到也不会坏——只是画布不画图。

```bash
node tools/designer/serve.mjs                                   # 自动找工作区里的 bedrock-samples*
node tools/designer/serve.mjs --vanilla "D:\...\resource_pack"   # 手动指定原版资源包
node tools/designer/serve.mjs --project "D:\myproj\dev\myproj_RP" # 追加工程资源包（可多次）
```

环境变量：`SAPDON_DESIGNER_VANILLA` / `SAPDON_DESIGNER_PROJECT`（多个用 `;` 分隔）。
**工程包覆盖原版**（与游戏里一致）。启动日志会打印扫到几个包、多少张贴图。

拿原版贴图之后编辑器多了这些能力：

| 位置 | 效果 |
|---|---|
| 画布 | `image` 按 `texture` 出图（`keep_ratio`/`tiled`/`nineslice_size`/`clip_direction`+`clip_ratio`/`grayscale`/`alpha` 都按 JSON UI 语义近似）；`form_button` 画三态，鼠标悬停/按下切图；`label` 画文本（颜色/字号/对齐/阴影） |
| 属性面板 | 纹理属性旁有**实时缩略图**；点「浏览…」打开选择器：搜索 + 缩略图网格，点一下就选中——选出来的都是包内**真实存在**的路径 |
| 诊断 | 新增三条：`texture-invalid`（error）/ `texture-missing`（warn，两个包都找不到）/ `texture-case`（info，只差大小写） |
| 状态栏 | 显示已加载的纹理条数；没连上资源包时会直接告诉你 |

⚠️ 两个已实测的坑：

1. **纹理引用区分大小写**：原版是 `textures/ui/white`，写 `White` 会报 `texture-case`。
   （Windows 上 `Test-Path ...\White.png` 会返回 True —— 那是路径不区分大小写，别被骗。）
2. **`.tga` 浏览器画不出来**：这类贴图存在但画布给占位（真机正常），诊断不报错。

> 编辑器与真机仍有差距（字体不是引擎字体、`uv`/`uv_size` 未模拟、模板内部结构不解析）——完整边界见设计文档 §5.3。

---

## 界面分区（对齐 Qt Designer）

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ 顶部：identifier / 画布尺寸 / 撤销重做 / 打开 / 保存                            │
├───────────────┬───────────────────────────────────────────┬───────────────────┤
│ 控件箱         │  画布 │ JSON 产物 │ TS 代码 │ 诊断          │ 对象树            │
│ 容器/显示/交互 │                                           ├───────────────────┤
│ 组合件         │  （拖/缩放/格子参考线/门控模拟）            │ 属性面板           │
│ 页面           │                                           │ （按属性包分组）    │
├───────────────┴───────────────────────────────────────────┴───────────────────┤
│ 状态栏：最近一次操作 + 元素数 + error/warn/info 计数                            │
└───────────────────────────────────────────────────────────────────────────────┘
```

| Qt Designer | 这里 | 说明 |
|---|---|---|
| Widget Box | 左列「控件箱」 | 8 个元素控件 + 2 个组合件（FormButtonGrid / FormButton） |
| Form / 画布 | 中间「画布」页签 | 绝对定位渲染 + 流式/格位参考线 + 缩放手柄 + **原版贴图渲染** |
| Object Inspector | 右列「对象树」 | `controls` 嵌套；格子子项显示 `grid_position`，表单按钮显示槽位/目标格 |
| Property Editor | 右列「属性面板」 | 按属性包分组（Layout/Control/Text/Sprite/…），**三态**语义；纹理带缩略图 + 选择器 |
| Resource Browser | 「浏览…」贴图选择器 | 资源包真实索引（原版 + 工程包）：**首屏给「常用」+ 按目录分段**（每组 36 个 + 显示更多），搜索才出扁平结果（每次 60 条）；每格缩略图 56px、路径分两行、悬停放大 |
| Signal/Slot Editor | 「数据绑定（门控）」组 | `$变量` + `view` 表达式；内置三种门控模板 + 按钮"激活三件套" |
| `uic` 产物 | 「JSON 产物」页签 | 框架会写出的 `ui/<ns>.json` 与 `server_form.json`，**带语法高亮 + 行号** |
| 编译告警 | 「诊断」页签 | 24 条静态规则，每条带出处（`ui-lessons.md` / `AGENTS.md` / `known-pitfalls.md`） |

---

## 操作

| 位置 | 操作 |
|---|---|
| 顶栏 | **屏幕类型**（`form` 自定义表单 / `容器` / `hud` 常驻）+ `ns` + **屏名** + **内容**/**按键**（本屏的两块面板，下拉选元素）+ 撤销/重做/示例/打开/保存。**本屏就这三个字段**：`panelId` 自动是 `sapdon_ui:<屏名>`、文件是 `ui/<ns>_<屏名>.json` |
| 三列布局 | **两侧可拖**：左列右边、右列左边各有一条拖拽条，拖动实时改宽（双击复位）；宽度存在 `localStorage` 的 `sapdon.designer.sidebars`（与工程草稿分开，换工程不重置版式）。左列 160–640px、右列 220–720px，且始终给中间留 ≥320px |
| 控件箱 | 顶部**筛选框**（按名字/类型/说明筛，Esc 清空 —— Qt 的 Widget Box 搜索框）· 点击 = 加到**当前选中容器**（表头显示 `→ 目标`）；没选中容器则加为兄弟/根；不可放的组合会被拦下并提示。新加的元素会在对象树里**高亮一下** |
| 画布 | 点击选中 · **Shift/Ctrl 点 = 加减多选** · **空白处拖出选框**（框选相交的盒子，只留最外层）· **拖动移动**（规则见下表）· 右下角手柄改 `size` · **Ctrl/⌘+滚轮 = 缩放** · 点空白取消选中 · 图例会实时告诉你"当前元素拖动会发生什么" |
| 画布工具条 | `贴图预览 / 线框` 切换 · **适应**（一键缩到适合窗口）+ 1×/2×/3× · **门控模拟**开关 + 折叠的「值」框（填 `#title_text`/`#form_text`/`#form_button_text`；默认已按第 1 页的 `tag` 预填） |
| 对象树 | 顶部**筛选框**（按 id/类型过滤，保留命中项的祖先）· 点行选中（**Ctrl 点加减、Shift 点选一段**）· 双击 id 改名 · `↑↓` 调顺序 · `⇥` 缩进 · `⇤` 反缩进 · `✕` 删除（这些按钮**悬停/选中时**才出现，平时整行只有类型 + id） |
| **多选面板**（选中 ≥2 个时顶掉属性面板） | Qt 对齐工具条那一套：**左/水平居中/右/顶/垂直居中/底** 对齐、**水平/垂直分布**（≥3 个，两端不动）、**同宽/同高/同尺寸**、**层序 ↑↓**（`layer` ±1）、复制/副本/删除。几何由 `src/align.js` 纯函数算，一次落盘 = **一步撤销** |
| 属性面板 | 顶部**属性名筛选框** · 分组可折叠且**跨选中记忆**（默认只展开第一组）· 已声明 → 编辑器 + `✕` 重置；未声明 → 灰字默认值 + `＋` 赋值 · 纹理属性带缩略图 + 「浏览…」选择器 |
| **多页管理器**（对象，不是面板） | 控件箱「组合件」里的 **PagePanelManage 多页管理器**：放一个、选中它，属性面板里就有 **门控容器 + 门控模式 + 页列表（tag + 页面板）**。它是**非视觉对象**（画布不画框，对象树里一行带「N 页 → 容器」）。没放它就没有页面列表 —— 多页面本来就是这个对象的职责 |
| 快捷键 | `Ctrl+Z`/`Ctrl+Y` 撤销重做 · `Ctrl+S` 保存 · `Ctrl+C`/`Ctrl+V` 复制粘贴 · `Ctrl+D` 就地副本 · `Ctrl+]`/`Ctrl+[` 层序升降 · `Ctrl+A` 全选 · 方向键微调 1px（Shift=10px，**多选时一次挪一批**）· `Alt+方向` 改 size · `Delete` 删除（多选=批量删）· `Ctrl/⌘+滚轮` 缩放画布 |

**工程自动存草稿**（localStorage），误关页面不丢；顶栏「打开 .sui.json」可载入磁盘上的工程。

---

## ★ 属性是"三态"的（这决定了产物长什么样）

框架的 `serialize()` 只把**属性包上已赋值的字段**写进 JSON UI —— 没赋值就一个键都不写。所以：

| 状态 | 面板表现 | 产物 |
|---|---|---|
| 未声明 | 灰字 `未声明（默认 …）` + `＋` | **没有这个字段** |
| 已声明 | 正常色 + 左侧圆点 + `✕` | 有这个字段（哪怕值等于默认值） |
| 点 `✕` | 回到未声明 | 字段被删掉（= Qt 的 `resetProperty()`，**不是**写回默认值） |

既有基线产物对**逐字节**敏感（`guidebook_demo` 的 587880/587870 字节判据），所以别把"填个默认值"当无事发生。

---

## 生成的是什么

- **屏幕类型**决定编辑器管不管「规范」：`form` 屏按规范校验并生成 `new SapdonFormUI("ns:屏名", 内容面板, 按键面板)`（root + 两块面板全由框架建）；**容器 / hud 两类是自由摆放** —— 编辑器只保证你把元素摆出来、生成元素代码 + 一句挂载提示（`ContainerUISystem.addControl` / `HudUISystem.mountRootElement`），**不做 root/内容/按钮/门控 校验，也不预览框架产物**（游戏里是否生效由你的挂载代码决定）。
- **多页面在 `PagePanelManage` 对象上**：放一个管理器、选门控容器、逐页填「tag + 页面板」，生成 `new PagePanelManage(容器).addPage(面板, "TAG")…build()`；产物预览里那些页面板会**真的**被挂进容器并逐块带上 `$gtag` 前缀门控（与框架逐字段交叉验证过）。
- **产物文件名按类型取框架各自的真实规则**：`form` → `ui/<ns_首屏名>.json`；容器 → `ui/<首屏名>.json`（`ContainerUISystem` 既有规则）；`hud` → 原版 `ui/hud_screen.json`。
- **form 屏** 一个工程 = **一个屏** = 一句话 `new SapdonFormUI("ns:屏名", 内容面板, 按键面板)` —— 挂两块面板 + 建**唯一根面板 `root`**（门控写在 root 上）+ 注册指向 `@<ns_屏名>.root` 的 gated factory，全在里面，调用方一个参数都不用重复写。
- **多页面不靠多个根**：一个 UI 文件只有一个 `root`（元素名固定，同名会互相覆盖）⇒ 手册那种多页面要在**同一份内容面板**里用门控切（`$gtag` + `(not((#form_text - $gtag) = #form_text))`）；编辑器里这件事由 **`PagePanelManage` 对象**表达（tag 列表就在它的属性面板里，门控模拟按这些 tag 切预览）。
- 想表达"另一个屏"请另建工程（各给各的 `ns:屏名`；**UI 文件与 namespace 都取 `ns_屏名`** —— `sapdon_ui:book` → `ui/sapdon_ui_book.json`）。
- `StackPanel` 的子项一律生成 `addControl`（`addStack` 是 `size + addControl` 的糖，结构等价）。

---

## 自测（改完这个工具请务必跑）

```bash
node tests/designer-layout.test.mjs      # 版面引擎：锚点/流式/格位/拖动反解（零依赖，直接跑）
node tests/designer-align.test.mjs       # 对齐/分布/等尺寸：纯几何（Qt alignment toolbar 的每种操作）
node tests/designer-paint.test.mjs       # 绘制模型：纹理侧车/九宫格退化/空纹理/模板占位/$gtag 门控
node tests/designer-textures.test.mjs    # 纹理路径解析 + ★实测：示例与目录建议里的贴图必须真在原版包里
node tests/designer-highlight.test.mjs   # 代码/JSON 高亮：★"不改变原文"不变量 + 该着色的着上了
node tests/designer-app.test.mjs         # 编辑器外壳：自带最小 DOM 桩，跑一遍真实操作路径（含贴图渲染/拖动）
npx tsc && npx tsc-alias                 # 交叉验证需要 dist/core/ui（同仓库既有测试约定）
node tests/designer-codegen.test.mjs     # 代码生成 + ★ 与真实框架类交叉验证
node tools/designer/tools/rasterize.mjs  # ★ 眼见为实：把画布渲染成 PNG 看一眼
```

`designer-codegen` 里的 **★交叉验证** 是本工具的防漂移机制：同一份示例工程分别走「编辑器镜像实现」与「真实框架类（`dist/core/ui`）」，断言两边产物**深度相等**；还会**转译并真的执行生成出来的代码**，再对一次产物。框架序列化语义一变，这里先红。

> ⚠️ 画布"看起来对" ≠ 真机对：原版模板内部、引擎侧集合实例、`uv`/`uv_size`、引擎字体度量都不模拟（缺口清单见设计文档 §5.3）。集合/门控类改动仍必须进游戏走一遍。

---

## 扩展点（改哪个文件）

| 想加什么 | 改哪 |
|---|---|
| 一个可编辑属性（含默认值与编辑器种类） | `src/catalog.js` 的 `PACK_PROPS` / `raw` —— 属性面板与代码生成**都只读这一份** |
| 一个新控件 | `src/catalog.js` 的 `WIDGETS` + `ELEMENT_SCHEMA`（组合件再加 `codegen.js` 的构建器分支与 `preview.js` 的镜像） |
| 一条诊断规则 | `src/diagnostics.js` 的 `RULES` + `diagnose()`（**why 必须写依据**，否则规则会被当噪音删掉） |
| 版面语义（锚点/流式/格位） | `src/layout.js`（纯函数，改完加 `tests/designer-layout.test.mjs` 用例） |
| **画布怎么画**（贴图/九宫格/裁切/文本） | `src/paint.js`（纯函数，两端共用）→ 浏览器端 `src/ui/canvas.js` 的 `opToDom`、离屏端 `tools/rasterize.py` |
| **代码/JSON 高亮** | `src/ui/highlight.js`（自己写的分词器；改完必须跑 `tests/designer-highlight.test.mjs` 的"不改变原文"不变量）+ `styles.css` 的 `.tok-*` |
| 纹理路径规则 / 索引 / 侧车定义 | `src/textures.js`（纯函数）+ `tools/packScan.mjs`（扫包、读 PNG 尺寸与 `*.json` 侧车） |
| 门控表达式识别 | `src/gate.js`（只认框架会生成的那几种，认不出就 `null`，**别猜**） |

`SLOT_CALIBRATION` 之于容器版面、`catalog.js` 之于本工具：**属性面只有一处事实来源**。
