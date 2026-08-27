# UI 子系统架构（core/ui）

Sapdon 的 UI 子系统把 Minecraft Bedrock 原生的 **JSON UI 声明式 schema**，翻译成一套**类型安全、链式调用、可序列化**的 TypeScript 对象模型；构建期把一个界面序列化成 `RP/ui/*.json` 包体，并注册进 `ui/_ui_defs.json`。原生是手写 JSON，Sapdon 用 TS 对象组出来再吐回 JSON。

> 本文是框架开发者视角的设计梳理。使用层面的 API 参考 [`doc/user/api/sapdon-ui.md`](../user/api/sapdon-ui.md) 与 [`doc/user/tutorials/sapdon-ui.md`](../user/tutorials/sapdon-ui.md)。

---

## 1. 文件布局

```
src/core/ui/
├── index.ts                 # 聚合导出
├── types.ts                 # 共享类型：Size2 / Offset2 / Anchor / Binding* / ModificationOperation
├── buttonMapping.ts         # ButtonMapping 输入映射类
├── dataBindingObject.ts     # DataBindingObject 数据绑定配置类
├── elements/                # 元素层：UIElement + Panel/StackPanel/Grid/Label/Image/Button/...
├── properties/              # 属性包层：Control/Layout/Text/Sprite/Input/Sound/DataBinding/GridProp/ScrollView/Factory
├── registry/
│   └── uiSystemRegistry.ts  # UISystemRegistry：注册 .json 文件并维护 _ui_defs 列表
├── extra/
│   └── hudProgressBar.ts    # HudProgressBar（组合 HudStatePanel + Sprite 裁切）
└── systems/                 # 系统层：UISystem + 各类落地系统
    ├── system.ts            # UISystem = 一个 UI 文件（.json），序列化入口
    ├── chest.ts             # ChestUISystem（接管 vanilla 箱子 screen）
    ├── containerUISystem.ts # ContainerUISystem（自定义容器 UI）
    ├── hud/                 # HudUISystem + HudStatePanel
    ├── neoGuibook/          # NeoGuidebook（游戏内书）+ NeoGuidebookPage
    └── sapdon/              # SapdonServerUI（表单路由壳）+ SapdonPanel/FormButton/FormButtonGrid
```

另：工厂入口 `src/core/factory/uiFactory.js`（`UiAPI`）提供 `createUISystem / createPanel / createImage / createLabel` 等创建入口。

---

## 2. 四层对象模型

```
┌──────────────────────────────────────────────────────────┐
│ Layer 4: systems/  UISystem + 落地系统                     │
│  UISystem = 一个 UI 文件；ContainerUISystem / SapdonServerUI │
│  / NeoGuidebook / HudUISystem 等在其上叠业务能力            │
├──────────────────────────────────────────────────────────┤
│ Layer 3: elements/  元素层                                │
│  UIElement 基类 + Panel/StackPanel/Grid/Label/Image/Button │
│  serialize() → { id: json }；组合若干属性包                 │
├──────────────────────────────────────────────────────────┤
│ Layer 2: properties/ 属性包层                             │
│  Control/Layout/Text/Sprite/Input/Sound/DataBinding/...  │
│  每组 setXxx() 链式方法，对应 JSON UI 的一个字段命名空间      │
├──────────────────────────────────────────────────────────┤
│ Layer 1: types.ts 类型层                                  │
│  Size2/Offset2/Anchor/Binding*/Modification 等字面量类型    │
└──────────────────────────────────────────────────────────┘
```

**序列化链路**（构建期，`main.ts` 里的 `registry.submit()` 驱动）：

```
main.ts 组元素
  → UIElement.serialize()
      合并 serializableSources()（属性包逐份拷贝进 properties Map）
      → { [id]: json }（variables 受 $ 前缀并入）
  → UISystem.addElement() 存进 elements Map
  → UISystem.toObject()（@Serializer）按 id 铺开
  → UISystemRegistry.registerUISystem()
      注册 .json 文件 + 刷新 _ui_defs.json 的 ui_defs 列表
  → 构建管道落盘 dev/<proj>_RP/ui/<name>.json + _ui_defs.json
```

### 2.1 类型层 `types.ts`

JSON UI 规范的受控映射，避免魔法字符串：

| 类型 | 说明 |
|------|------|
| `Size2` / `Offset2` | 尺寸 / 偏移向量（像素数字或 `"50%"` 计算串） |
| `Anchor` | 9 个锚点字面量 |
| `BindingType` / `BindingCondition` | 数据绑定的 type / condition 枚举 |
| `ModificationOperation` | Modifications 的操作字面量 |
| `JsonUIBag` | 任意键属性包（基类索引签名基类型） |

### 2.2 属性包层 `properties/`

每种属性包 = JSON UI 一个字段命名空间的一组 `setXxx()` 链式方法：

| 类 | 对应字段 | 典型方法 |
|----|---------|---------|
| `Control` | 控件视觉行为 | `setVisible / setLayer / setAlpha / setClipsChildren / addControl` |
| `Layout` | 布局尺寸 | `setSize / setOffset / setAnchorFrom/To / setDraggable / setContained` |
| `Text` | label 文本 | `setText / setColor / setShadow / setTextAlignment` |
| `Sprite` | image 纹理 | `setTexture / setUV / setUVSize / setClipDirection / setTiled` |
| `Input` | 输入 | `setButtonMappings / setModal / setAlwaysListenToInput` |
| `Sound` | 音效 | 按钮点击音效等 |
| `DataBinding` | 数据绑定容器 | `addDataBinding` |
| `GridProp` | 网格布局 | `setGridDimensions / setGridItemTemplate / setGridFillDirection` |
| `ScrollView` | 滚动条 | 滚动属性 |
| `Factory` | 模板工厂 | `setName / setControlName / setControlIds` |

### 2.3 元素层 `elements/`

`UIElement` 基类持有属性包引用：`control`、`layout`、`dataBinding`、`factory`，外加按需的 `properties`/`variables`/`modifications` Map。核心方法：

- `serialize()`：把 `serializableSources()` 返回的属性包逐份合并进 `properties`，再并入 `$variables`，输出 `{ [id]: json }`。
- `addProp` / `addVariable` / `addControl(s)` / `addModification` / `enableDebug`（调试描边框）。

子类通过覆写 `serializableSources()` 把专属属性包追加到序列化源里（见"组合优于继承"）：

```
元素体系（type 字段在构造器里预置）
UIElement (基类)
├── Panel        type=panel
│   └── StackPanel  type=stack_panel（加 orientation）
├── CollectionPanel  type=collection_panel
│   └── Grid         type=grid（加 GridProp + addGridItem）
├── Label        type=label（+ Text）
├── Image        type=image（+ Sprite）
├── Button       type=button（+ Input/Sound/Factory）
└── ScrollingPanel  type=scroll_view（+ Input/ScrollView）
```

### 2.4 系统层 `systems/`

`UISystem` = 一个 UI 文件：

- 构造 `(identifier, path)`：Split 出 `namespace`/`name`，随即 `UISystemRegistry.registerUISystem(this)`。
- `addElement / getElement / addAnimation / toObject()`：`toObject()` 打上 `@Serializer`，遍历 elements 展开成 `{ [id]: json }`，并以 `namespace` 开头。

`UISystemRegistry` 维护全局 map + `_ui_defs` 列表：

```typescript
registerUISystem(ui_system) {
  const path = ui_system.path + ui_system.name + '.json'
  map[path] = ui_system; def_list.push(path)
  GRegistry.register(ui_system.name, 'resource', ui_system.path, ui_system)
  GRegistry.register('_ui_defs', 'resource', 'ui/', { ui_defs: def_list })
}
addOuterUIdefs(ui_defs)  // 追加外部原版 ui_def
```

> 任一 UI 文件（`ChestUISystem.chest_screen`、`HudUISystem`、`SapdonServerUI`、用户页面等）在模块加载/构造时注册进 `GRegistry`，故 `main.ts` 末行 `registry.submit()` 会统一把它们落到 `RP/ui/`。

---

## 3. 五个核心设计机制

### 3.1 组合优于继承

`UIElement` 不把全部字段堆在类里，而是**组合**若干属性包（`Control/Layout/DataBinding` 等）。子类只在自己那一层追加专属包：

```typescript
// Button.serializableSources()
[this.layout, this.input, this.sound, this.dataBinding, this.factory, this.control]
// Grid（在 CollectionPanel 之上）再前置 GridProp
[this.grid, ...super.serializableSources()]
```

好处：字段归属清晰、复用度高、子类只声明"我多了什么"。

### 3.2 模板继承 `id@template`

构造函数签名 `(id, template?)`。传 template 时 `id = name@template`，直接继承原版/内置模板，只做增量覆盖：

```typescript
const formButton = new Button('form_button', 'common_buttons.light_text_button')
new UIElement('content', undefined, '$user_content_panel')          // 模板/变量作模板
new UIElement('common_panel@common.common_panel', undefined)
```

### 3.3 Modifications 非侵入修改

`Modifications.OPERATION.*`（`insert_back/insert_front/insert_after/.../replace/remove`）+ `UIElement.addModification({array_name, operation, value})`。用于非侵入式改写 vanilla 或其他包的 JSON UI，保持兼容：

```typescript
// 往 vanilla 的 main_screen_content.controls 末尾追加自定义 factory
new UIElement('main_screen_content').addModification({
  array_name: 'controls', operation: Modifications.OPERATION.INSERT_BACK,
  value: [sapdonFormFactory.serialize()],
})
```

### 3.4 数据绑定 DSL

`DataBindingObject` 把 JSON UI 的 `bindings`（`global / view / collection / collection_details`）映射为 TS，配合 `addVariable` 的 `$xxx` 做运行时可见性门控。核心模式是 `view` 绑定 + 比较表达式写进 `source_property_name`：

```typescript
elem.addVariable('binding_text', pageId)
elem.dataBinding.addDataBinding(
  new DataBindingObject().setBindingType('view')
    .setSourcePropertyName('($binding_text = #form_text)')
    .setTargetPropertyName('#visible')
)
```

运行时由 Script API 的 `ActionFormData().body() / .button()` 把值 emit 进 `#form_text` / `#form_button_text`，UI 侧据此显隐 → **"UI 逻辑零 JS，全在绑定表达式里"**。

### 3.5 工厂统一入口

`src/core/factory/uiFactory.js` 暴露 `UiAPI`（`createUISystem / createPanel / createImage / createLabel` 等），与 ItemAPI/EntityAPI 等并列。多数场景直接 `new UISystem(...)` / `new Panel(...)` 更灵活，工厂是兜底入口。

---

## 4. 两条高层落地路线

| 形式 | 走法 | 代表 |
|------|------|------|
| **server_form（表单 / 容器 / 书）** | `SapdonServerUI` 用 modification 把自定义页注入 vanilla `main_screen_content`，用 `#title_text` / `#form_text` 前缀门控可见性；每页 = "内容面板 + 按键面板" | `NeoGuidebook`、`ContainerUISystem/ChestUISystem`、`SapdonPanel/FormButton/FormButtonGrid` |
| **HUD 常驻** | `HudUISystem` 改 vanilla `hud_title_text` 绑定，`mountRootElement` 往根面板 `insert_front` 挂元素；`HudStatePanel` 用 title 字符串做状态机驱动 `#visible` | `HudProgressBar` |

### 4.1 server_form 路由壳（`SapdonServerUI`）

采用 Bedrock Wiki Action Form 官方路由：

```
main_screen_content ─(modification: controls.insert_back)→ sapdon_form_factory
  └─ factory{ server_form_factory, long_form } → @server_form.sapdon_long_form_panel
       └─ 所有注册页 @server_form.custom_panel_content（$panel_id 前缀门控）
            ├─ content@$user_content_panel   (下)
            └─ buttons@$user_buttons_panel   (上)
long_form ─(modification: bindings)→ title 含 'sapdon_ui:' 时隐藏原生表单
```

关键收益：自定义页处于 `main_screen_content` 作用域，`#form_text` / `#title_text` 均可解析。

### 4.2 HUD 常驻（`HudUISystem` + `HudStatePanel`）

`HudStatePanel` 的核心是"状态字符串"驱动：根面板定义 `$update_string`，监听 `#hud_title_text_string` 变化；每个 `addStateControl(state, control)` 给子控件挂两条 view 绑定——一条回填文本、一条 `(#text = 'ui.hud.<name>.<state>') → #visible`。组件作者只需在 tick 里往 `#hud_title_text_string` 写 `<name>.<state>`，对应状态层即显隐。

---

## 5. 对称门控模型（`examples/ui_gated_demo`）

`ui_gated_demo` 演示最通用的"页面切换"落地：**内容面板与按钮面板"对称"，都按当前页门控，组内按钮再按运行时 emit 的按钮文字门控**。双向、两级，UI 数据流完全由 view 绑定表达式驱动，无 JS 逻辑。

### 5.1 模型

```
页面级门控（#form_text）   .body(page)   → 该页「内容元素 + 按钮组」一起显隐
按钮级门控（#form_button_text） .button(text) → 组内 setBinding(text) 的按钮可见
```

`SymGatedBook`（`src/gated_book.ts`）：

- 构造时 `SapdonServerUI.registerPage({ panelId: 'sapdon_ui:book', ... })` → 页面注册进 server_form 路由壳。
- `addPage(id, content, buttons)`：一页 = 一个内容元素 + 一组 `FormButton`（`{btn, pos?}`）。
- `build()`：
  - 内容面板：多页内容叠在 `gated_book_pages_panel`，每页 `gate(content, id)`。
  - 按钮面板：每页一个独立 `FormButtonGrid`（grid，`collection=form_buttons`）——**按钮必须 `addButton` 进格盘绑定才有效，游离按钮无效**——逐按钮 `addButton(index, btn, pos?)` 注入集合/门控绑定，再对整个 grid `gate(built, pageId)`。

```typescript
private gate(elem, pageId) {           // 内容/按钮组共用门控
  elem.addVariable('binding_text', pageId)
  elem.dataBinding.addDataBinding(
    new DataBindingObject().setBindingType('view')
      .setSourcePropertyName('($binding_text = #form_text)')
      .setTargetPropertyName('#visible'))
}
```

`main.ts` 组装三页（page1 只有 next，page2 prev+next，page3 prev+home）后 `book.build()` + `registry.submit()`。`scripts/index.ts` 用 `ActionFormData().title('sapdon_ui:book').body(page).button(text...)` 把数据 emit 进 `#title_text/#form_text/#form_button_text`，再按 `PAGE_BUTTONS` 表做翻页跳转。

### 5.2 产物对照

- **`dev/<proj>_RP/ui/server_form.json`**：`main_screen_content` 注入 `sapdon_form_factory`；`long_form` 按 `sapdon_ui:` 前缀隐藏原生；`sapdon_long_form_panel` 挂注册页 `book`，`$panel_id=sapdon_ui:book`，`$user_content_panel=gateddemo.book_content_panel` / `$user_buttons_panel=gateddemo.book_buttons_panel`。
- **`book.json`（ns=gateddemo）**：`book_content_panel` + `book_buttons_panel`。每页 grid 内按钮带三组 bindings：
  - `collection_details`（form_buttons）+ `collection`（`#form_button_text`）→ 接 collection
  - `view`：`($binding_button_text = #form_button_text) → #visible` → 按钮门控
- **`_ui_defs.json`**：汇集 `hud_screen / chest_screen / book / server_form` 四个文件。

### 5.3 已知待清理点（demo 现状）

- **调试残留**：`FormButtonGrid(...).enableDebug()` 与 `buttons_panel.enableDebug()` 开着，产物里每个按钮/网格都带红 `debug_board` 覆盖层。发布前应关。
- **page3 按钮数不一致**：`main.ts` 给 page3 配了 `[prev, home, next]` 三个按钮，但 `scripts/index.ts` 的 `PAGE_BUTTONS.page3` 只 emit `["prev_button", "home_button"]`，故 page3 的 next 永远隐藏（符合门控语义，非 bug，但多余/易误导）。
- **`gated_form_text`**（居中 Label 直接显示 `#form_text` 原始 id）疑似调试性质。