import {
    Button, FormButton, FormButtonGrid, Label, Layout, Panel, SapdonPanel,
    SapdonServerUI, StackPanel, Text, UIElement, registry
} from '@sapdon/core'

// ---------- 页 A：sapdon_ui:apple（内容面板 + 按键网格面板） ----------
const apple_content_panel = new Panel("apple_content_panel")
    .setLayout(new Layout().setSize(["40%", "40%"]))
    .enableDebug();
apple_content_panel.addControl(
    new StackPanel("main", undefined)
        .addStack(["100%", "30%"],
            new Label("title", undefined).enableDebug().setText(new Text().setText("苹果界面(sapdon_ui:apple)")))
        .addStack(["100%", "70%"],
            new Label("body", undefined).enableDebug().setText(new Text().setText("内容面板")))
);

// 按键面板：grid(2×1, 左下/右下表单按钮) + 右上普通退出键
const apple_buttons_panel = new Panel("apple_buttons_panel")
    .setLayout(new Layout().setSize(["40%", "40%"]))
    .addControl(
        new FormButtonGrid("apple_buttons_grid", { dimensions: [2, 1], size: ["100%", "100%"] })
            .addButton(0, new FormButton("bt0").setAnchor("bottom_left"))
            .addButton(1, new FormButton("bt1").setAnchor("bottom_right"))
            .build()
    )
    .addControl(
        new Button("exit", "common.button")               // 右上：普通退出键
            .addVariable("pressed_button_name", "button.menu_exit")
            .setLayout(new Layout().setSize([48, 24]).setAnchorFrom("top_right").setAnchorTo("top_right"))
            .addControl(new Label("exit_text", undefined).setText(new Text().setText("退出")))
    );

new SapdonPanel("sapdon_ui_apple")
    .setContent(apple_content_panel)
    .setButtons(apple_buttons_panel)
    .build();

// ---------- 页 B：sapdon_ui:test（纯内容面板 + 空按键面板） ----------
const test_content_panel = new Panel("test_content_panel")
    .setLayout(new Layout().setSize(["40%", "40%"]))
    .enableDebug();
test_content_panel.addControl(
    new Label("hi", undefined).enableDebug().setText(new Text().setText("纯内容页(sapdon_ui:test)"))
);

const test_buttons_panel = new Panel("test_buttons_panel")
    .setLayout(new Layout().setSize(["40%", "40%"]));
new SapdonPanel("sapdon_ui_test")
    .setContent(test_content_panel)
    .setButtons(test_buttons_panel)
    .build();

// ---------- 注册到 sapdon_screen_content ----------
SapdonServerUI.registerPage({
    panelId: "sapdon_ui:apple",
    name: "apple",
    contentPanel: "sapdon_ui_apple.apple_content_panel",
    buttonsPanel: "sapdon_ui_apple.apple_buttons_panel",
});
SapdonServerUI.registerPage({
    panelId: "sapdon_ui:test",
    name: "test",
    contentPanel: "sapdon_ui_test.test_content_panel",
    buttonsPanel: "sapdon_ui_test.test_buttons_panel",
});

// 生成 server_form.json / sapdon_ui_apple.json / sapdon_ui_test.json / _ui_defs.json
registry.submit()