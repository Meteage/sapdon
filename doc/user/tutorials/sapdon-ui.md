# Sapdon UI 页面壳系统教程

本教程将带你创建一个使用 `sapdon_ui:` 前缀路由的自定义 Server Form UI：一个页面含「内容面板 + 按键面板」（按键盖在内容上层），左下/右下摆表单按钮，右上放退出键。完整可运行示例见 `examples/test_ui`。

---

## 目录

1. [准备工作](#1-准备工作)
2. [创建构建入口](#2-创建构建入口)
3. [定义内容面板](#3-定义内容面板)
4. [定义按键面板](#4-定义按键面板)
5. [组装页面并注册](#5-组装页面并注册)
6. [编写运行时脚本](#6-编写运行时脚本)
7. [构建与部署](#7-构建与部署)
8. [完整示例](#8-完整示例)

---

## 1. 准备工作

初始化一个 TS 项目并安装依赖：

```bash
npm init -y
npm install @minecraft/server@2.8.0 @minecraft/server-ui@2.1.0
# @sapdon/core 由 postinstall 的 `sapdon lib` 自动同步
```

项目结构：

```
test_ui/
├── main.ts               # 构建入口（声明式定义 UI）
├── scripts/
│   └── index.ts          # 运行时入口（触发表单）
├── build.config          # 构建配置
├── mod.info              # 模块信息（含 min_engine_version）
├── tsconfig.json
├── package.json
├── pack_icon.png
└── res/                  # 资源目录
```

`build.config` 关键项（参考 `examples/test_ui/build.config`）：

```json
{
  "formatVersion": 2,
  "buildOptions": {
    "buildMode": "dev",
    "buildEntry": "main.ts",
    "scriptEntry": "scripts/index.ts",
    "scriptOutput": "scripts/index.js",
    "useJs": false,
    "buildDir": "dev/",
    "dependencies": [
      { "module_name": "@minecraft/server-ui", "version": "2.1.0" },
      { "module_name": "@minecraft/server", "version": "2.8.0" }
    ]
  }
}
```

---

## 2. 创建构建入口

`main.ts` 是构建时脚本：声明 UI → 注册页面 → `registry.submit()` 生成所有 UI JSON。

```typescript
import {
    Button, FormButton, FormButtonGrid, Label, Layout, Panel, SapdonPanel,
    SapdonServerUI, StackPanel, Text, registry
} from '@sapdon/core'
```

---

## 3. 定义内容面板

内容面板是页面的主体（背景 + 标题/正文），最后会被画在按键面板**下面**。

```typescript
const apple_content_panel = new Panel("apple_content_panel")
    .setLayout(new Layout().setSize(["40%", "40%"]))
    .enableDebug();
apple_content_panel.addControl(
    new StackPanel("main", undefined)
        .addStack(["100%", "30%"],
            new Label("title", undefined).enableDebug().setText(new Text().setText("苹果界面")))
        .addStack(["100%", "70%"],
            new Label("body", undefined).enableDebug().setText(new Text().setText("内容面板")))
);
```

> 面板 id（`apple_content_panel`）稍后会作为注册引用 `sapdon_ui_apple.apple_content_panel`。

---

## 4. 定义按键面板

按键面板画在内容面板**上层**。两个表单按钮用 `FormButtonGrid`(grid 2×1) 摆到左右下角；右上角放一个普通退出键（不占表单集合）。

```typescript
import { Button, FormButton, FormButtonGrid } from '@sapdon/core'

const apple_buttons_panel = new Panel("apple_buttons_panel")
    .setLayout(new Layout().setSize(["40%", "40%"]))
    .addControl(
        new FormButtonGrid("apple_buttons_grid", { dimensions: [2, 1], size: ["100%", "100%"] })
            .addButton(0, new FormButton("bt0").setAnchor("bottom_left"))   // 左边一枚
            .addButton(1, new FormButton("bt1").setAnchor("bottom_right"))  // 右边一枚
            .build()
    )
    .addControl(
        new Button("exit", "common.button")               // 右上：普通退出键
            .addVariable("pressed_button_name", "button.menu_exit")
            .setLayout(new Layout().setSize([48, 24]).setAnchorFrom("top_right").setAnchorTo("top_right"))
            .addControl(new Label("exit_text", undefined).setText(new Text().setText("退出")))
    );
```

要点：
- `FormButtonGrid` 的 `dimensions [2,1]` 把按键面板切成左右两半；`addButton(index, btn)` 逐枚注入集合/门控绑定并定位，按钮自身用 `setAnchor("bottom_left")` / `("bottom_right")` 落到两个下角。
- 表单按钮走 `FormButton`（基底 `@common.button` 无文字，纹理用 `setTexture`，门控用 `setBinding`；绑定由格盘注入）。
- 退出键用 `common.button` + `button.menu_exit`，点击关闭表单。

---

## 5. 组装页面并注册

`SapdonPanel` 把内容/按键两块组装进该页面自己的 UI 文件；`SapdonServerUI.registerPage` 注册到路由。

```typescript
new SapdonPanel("sapdon_ui_apple")           // 生成 ui/sapdon_ui_apple.json
    .setContent(apple_content_panel)
    .setButtons(apple_buttons_panel)
    .build();

SapdonServerUI.registerPage({
    panelId: "sapdon_ui:apple",              // title 精确匹配
    name: "apple",
    contentPanel: "sapdon_ui_apple.apple_content_panel",
    buttonsPanel: "sapdon_ui_apple.apple_buttons_panel",
});

registry.submit()                            // 输出 server_form.json + 各页面 ui 文件 + _ui_defs.json
```

> 纯内容页（无按键）：也需提供一个空的按键面板并注册，否则壳的 `$user_buttons_panel` 引用会报缺失。

---

## 6. 编写运行时脚本

`scripts/index.ts`：使用物品触发带 `sapdon_ui:` 前缀 title 的 ActionForm。

```typescript
import { world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

world.afterEvents.itemUse.subscribe((event) => {
    if (event.itemStack.typeId != "minecraft:apple") return;
    new ActionFormData()
        .title("sapdon_ui:apple")            // 前缀路由 → 自定义页
        .body("触发苹果页")
        .button("test1")                     // 喂给集合 form_buttons
        .button("test2")
        .show(event.source)
        .then((r) => world.sendMessage("selection: " + r.selection));
});
```

- title 含 `sapdon_ui:` → 显示自定义全屏 UI；否则走原版原生表单。
- 按钮点击返回 `response.selection`（对应集合下标）。

---

## 7. 构建与部署

```bash
npm i          # postinstall 自动执行 sapdon lib，同步 @sapdon/core
npm run build  # 构建并复制到开发包目录
```

构建产物（`dev/test_ui_RP/ui/`）：

```
server_form.json        # 路由壳（third_party_server_screen / main_screen_content / custom_panel_content）
sapdon_ui_apple.json    # 页面：内容面板 + 按键面板（含 FormButtonGrid）
_ui_defs.json           # 自动登记
```

进入游戏用苹果触发，验证：
1. 内容面板在底层、按键面板覆盖在上层。
2. 左下/右下各一个表单按钮（数据对应 test1/test2）。
3. 右上「退出」点击关闭表单。

---

## 8. 完整示例

完整可运行代码见仓库 `examples/test_ui`（含页面 A 内容+按键、页面 B 纯内容两个页面）。API 细节见《Sapdon UI 页面壳系统 API 参考》（`doc/user/api/sapdon-ui.md`）。
