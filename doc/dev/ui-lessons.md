# Sapdon UI 实战经验 / 排障与模式

本文沉淀在 `ui_gated_demo` 开发中踩过的坑与提炼出的可用模式。面向框架/UI 开发者：讲运行时机制、打破直觉的坑、以及经过验证的「`FormButton` + `FormButtonGrid`」纹理按钮方案。

> 架构总览见 `doc/dev/ui-architecture.md`；用户教程见 `doc/user/tutorials/sapdon-ui.md`；旧文本按钮 API 见 `doc/user/api/sapdon-ui.md`。

---

## 1. 硬约束：Server Form 的"通道预算"

Bedrock 的 Server Form 给 JSON UI 注入的东西只有这么几个：

| 通道 | 来源 | 对应绑定 |
|------|------|---------|
| 标题 | `.title(...)` | `#title_text` |
| 正文 | `.body(...)` | `#form_text` |
| 按钮 | `.button(...)` × N | `#form_button_text`（collection `form_buttons`） |

推论：
- **JSON UI 无法解析字符串**。它只能做算术、`=` 相等、字符串 `-` 减号（可用来测前缀/包含）。
- 想"按布局类型切换"→ 用 `#form_text` 的**前缀匹配**（`((#form_text - $tag) != #form_text)` → 可见），不要试图塞 JSON。
- 想显示**第二段动态文本** → Server Form 给不了第二通道（只有 title/body），只能把内容塞进 body 或利用按钮集合。

---

## 2. 三个致命坑（按血泪排序）

### 2.1 `light_text_button` 的"空 binding_name"陷阱 —— 按钮整个不渲染

症状（运行时 ContentLog 一屏屏刷）：

```
UI Control: .../next/default/button_content/common_buttons.new_ui_binding_button_label
JSON UI parse failure: Must define a binding name!
Data bindings must have at least one property to bind!
```

机制：`common_buttons.light_text_button` 的文字由 `new_ui_binding_button_label` 渲染，它其中一个 binding 是：

```json
{ "binding_type": "collection", "binding_name": "$button_text", ... }
```

`binding_name` 直接取值 **`$button_text`**。若你想"隐藏按钮文字"而设 `$button_text = ""`，`binding_name` 就变成**空串** → 解析失败 → **该按钮随整条控制链不渲染**。

> 这解释了"按钮一直不显示 / 位置不对"——它压根没渲染出来，调位置是徒劳。

结论：**不要用 `light_text_button` 做纯图标按钮**；图标按钮用「无文字的贴图按钮」（见第 4 节 `@common.button` 方案）。

### 2.2 `pressed_button_name` 必须是变量，不是属性

在 `@common.button`/`common.button` 基底里，点击映射名要写成**变量**：

```json
"$pressed_button_name": "button.form_button_click"   // ✅
```

写成直接属性会报：

```
Unknown property [pressed_button_name]
```

> `.addVariable('pressed_button_name', ...)`，不是 `.addProp(...)`。

### 2.3 `buildMode: "debug"` 不重生成 UI 产物

`build.config` 里 `buildOptions.buildMode` 填 `debug` 时，**UI JSON 不会重新生成**——`dev/.../ui/*.json` 停留在旧/残缺状态，部署后改代码看不到效果，还会把"旧 bug"误当成"我的改动导致"。

调试 UI 请用：

```json
"buildOptions": { "buildMode": "dev", ... }
```

---

## 3. 按钮"激活三件套"绑定

一个可通过表单点击并受门控的按钮，必须带这三组绑定（都挂在 `form_buttons` 集合上）：

```json
[
  { "binding_type": "collection_details", "binding_collection_name": "form_buttons" },
  { "binding_type": "collection", "binding_collection_name": "form_buttons", "binding_name": "#form_button_text" },
  { "binding_type": "view", "source_property_name": "($binding_button_text = #form_button_text)", "target_property_name": "#visible" }
]
```

- `collection_details` + `collection` → 让按钮参与集合、可被点击并产生 `selection`；
- `view` → 仅当运行时 `.button(x)` 发射的 `#form_button_text` 等于该按钮的 `$binding_button_text` 时可见（门控）。

> 这些绑定必须在 **grid / 集合上下文**里有效；游离（不放进网格）的按钮绑定无效。这也是"按钮要加进 `FormButtonGrid` 才有用"的设计原因。

---

## 4. 推荐模式：`FormButton` + `FormButtonGrid`（`ui_gated_demo`）

经上述坑之后，采用"纯样式按钮 + 负责几何/绑定的格盘"。

### 4.1 `FormButton extends Button`（纯样式）

- 基底固定 `common.button`（**无文字 label**，避开 2.1 的坑）；
- 三态纹理 = 三个子控件 `default` / `hover` / `pressed`（`Image` + 实际纹理路径）；
- `setTexture(d, h, p)` / `setBinding(key)` / `setAnchor(a)` / `setSize(w, h)`；
- 定位与集合绑定**不**在按钮内——交给 `FormButtonGrid`。

要点：`FormButton.setSize` / `setAnchor` 应**原地改 layout**（`this.layout.setSize(...)`），而不是 `new Layout()` 整体替换，否则后调用会互刷。

### 4.2 `FormButtonGrid`（几何 + 激活）

```ts
grid = new FormButtonGrid(id, { dimensions: [c, r], size: [w, h] })
grid.addButton(index, btn, pos?)   // pos 叠加式：col = index%c + pos[0], row = index/c + pos[1]
```

- 内部一个 `Grid`，`collection_name: form_buttons`；
- `grid_position` 用基准格 `[index%c, index/c]` 锚定；
- 用**负百分 offset** `[-col*100%, -row*100%]` 把按钮修正回基坐标系（抵消 Grid 默认排布），再叠加 `pos` 移到目标格；
- `addButton` 顺手注入第 3 节的"激活三件套"；`enableDebug()` 通过 `addGridItem(..., RED)` 给每个格子描红框。

`main.ts` 侧按页声明：

```ts
book.addPage('page1', content, [
    { btn: navBtn('next', 'next_button', 'bottom_right'), pos: [2, 0] },
])
```

---

## 5. 常用语义 / 属性注意事项

| 项 | 结论 |
|----|------|
| `grid_position` 顺序 | 本仓库约定 `[列, 行]`（与 `grid_dimensions [列, 行]` 一致） |
| `grid` 内子控件定位 | grid 接管子控件；要偏移包一层 pos_wrap，offset 放内层 |
| `collection_index` | **不是合法 UI 属性**（引擎报 Unknown property）；集合顺序靠放置顺序 |
| 退出/非集合按钮 | 用普通 `Button("exit","common.button")` + `$pressed_button_name:"button.menu_exit"`，不入集合 |
| 调试描框 | `UIElement.enableDebug(color?)` / `Grid.addGridItem(..., [1,0,0,1])`（红） |
| 小数/百分 offset | JSON UI 接受百分数字符串；TS `setOffset([number,number])` 需 `as unknown as [number, number]` |

---

## 6. 一句话总结

> **按钮能不能显示，别先怪位置——先确认它到底渲染没有。** 用 `common.button` 无文字贴图按钮 + 网格注入"激活三件套"绑定，就绕开了 `light_text_button` 的空 binding_name 炸弹；`buildMode` 一定要 `dev` 否则产物不更新；`$pressed_button_name` 记得用变量。