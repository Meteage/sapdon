import {
    Button, ButtonMapping, DataBindingObject, FormButton, Grid, GridProp, Image, Input, Label, Layout,
    Panel, SapdonPanel, SapdonServerUI, Sprite, Text, UIElement, registry
} from '@sapdon/core'

const N = 16

// ---------- 格子模板：按 #form_button_text 显示 空/黑/白 ----------
const cellTemplate = new Button("cell_template", undefined)
    .setLayout(new Layout().setOffset([0,10]))
    .addProp("anchor_from", "center")
    .addProp("anchor_to", "center")
    .setInput(
        new Input().setButtonMappings([
            new ButtonMapping()
                .setMappingType("pressed")
                .setFromButtonId("button.menu_select")
                .setToButtonId("button.form_button_click"),
        ])
    )
    .addVariable("pressed_button_name", "button.form_button_click");
cellTemplate.dataBinding.addDataBinding(
    new DataBindingObject().setBindingType("collection_details").setBindingCollectionName("form_buttons")
);
cellTemplate.dataBinding.addDataBinding(
    new DataBindingObject()
        .setBindingType("collection")
        .setBindingCollectionName("form_buttons")
        .setBindingName("#form_button_text")
);

const blackImg = new Image("black", undefined)
    .setSprite(new Sprite().setTexture("textures/gui/gomoku_black"))
    .setLayout(new Layout().setSize(["100%", "100%"]));
blackImg.dataBinding.addDataBinding(
    new DataBindingObject().setBindingType("collection")
        .setBindingCollectionName("form_buttons")
        .setBindingName("#form_button_text")
);
blackImg.dataBinding.addDataBinding(
    new DataBindingObject().setBindingType("view")
        .setSourcePropertyName("(#form_button_text = '1')")
        .setTargetPropertyName("#visible")
        .setBindingCondition("always")
);

const whiteImg = new Image("white", undefined)
    .setSprite(new Sprite().setTexture("textures/gui/gomoku_white"))
    .setLayout(new Layout().setSize(["100%", "100%"]));
whiteImg.dataBinding.addDataBinding(
    new DataBindingObject().setBindingType("collection")
        .setBindingCollectionName("form_buttons")
        .setBindingName("#form_button_text")
);
whiteImg.dataBinding.addDataBinding(
    new DataBindingObject().setBindingType("view")
        .setSourcePropertyName("(#form_button_text = '2')")
        .setTargetPropertyName("#visible")
        .setBindingCondition("always")
);

cellTemplate.addControls([blackImg, whiteImg]);

// ---------- 棋盘网格：16×16 格 + 底部 1 行放 restart ----------
const boardGrid = new Grid("board_buttons_grid")
    .setGridProp(new GridProp().setGridDimensions([N, N + 1]))       // [16,17]
    .setCollectionName("form_buttons")
    .setLayout(new Layout().setSize(["100%", "100%"]));

// 256 个棋盘格：双层循环 addGridItem，唯一 id（零填充），引用 cell_template（黑/白子图）
for (let h = 0; h < N; h++)
    for (let w = 0; w < N; w++)
        boardGrid.addGridItem([w, h], new UIElement(`bt_${String(h * N + w).padStart(3, "0")}`, "button", "gomoku.cell_template"));

// 第 257 项：restart，置于 [16,15]（棋盘正下方角落），FormButton（setBinding 门控 + 三态纹理）
const restart = new FormButton("restart_button")
    .setBinding("restart")
    .setTexture("textures/ui/book_shiftleft_default", "textures/ui/book_shiftleft_hover", "textures/ui/book_shiftleft_pressed")
    .setSize(32, 32);
restart.addProp("layer", 5);
restart.layout.setAnchorFrom("bottom_middle").setAnchorTo("bottom_middle");
restart.dataBinding.addDataBinding(
    new DataBindingObject().setBindingType("collection_details").setBindingCollectionName("form_buttons")
);
restart.dataBinding.addDataBinding(
    new DataBindingObject().setBindingType("collection")
        .setBindingCollectionName("form_buttons")
        .setBindingName("#form_button_text")
);
restart.dataBinding.addDataBinding(
    new DataBindingObject().setBindingType("view")
        .setSourcePropertyName("($binding_button_text = #form_button_text)")
        .setTargetPropertyName("#visible")
);
boardGrid.addGridItem([16, 15], restart, "restart_item");

const boardGridBuilt = boardGrid;

// ---------- 内容面板：棋盘背景 + 棋盘 ----------
const contentPanel = new Panel("gomoku_content_panel", undefined).enableDebug()
    .setLayout(new Layout().setSize([280, 280]))
    .addControl(
        new Image("board_bg", undefined)
            .setSprite(new Sprite().setTexture("textures/gui/gomoku_board"))
            .setLayout(new Layout().setSize(["100%", "100%"]))
    );

// ---------- 按键面板：状态文字 + 退出 + 重开 ----------
const statusLabel = new Label("status", undefined).enableDebug()
    .setText(new Text().setText("#form_text").setColor([0, 0, 0]))
    .setLayout(new Layout().setSize(["70%", "6%"]).setAnchorFrom("top_middle").setAnchorTo("top_middle").setOffset([0, 6]));
statusLabel.dataBinding.addDataBinding(new DataBindingObject().setBindingName("#form_text"));



const buttonsPanel = new Panel("gomoku_buttons_panel", undefined)
    .setLayout(new Layout().setSize([280, 290]))
    .addControl(statusLabel)
    .addControl(
        new Button("exit", "common.button")
            .addVariable("pressed_button_name", "button.menu_exit")
            .setLayout(new Layout().setSize([48, 24]).setAnchorFrom("top_right").setAnchorTo("top_right"))
            .addControl(new Label("exit_text", undefined).setText(new Text().setText("退出")))
    )
    .addControl(boardGridBuilt);

// ---------- 组装页面 + 注册 ----------
new SapdonPanel("gomoku")
    .setContent(contentPanel)
    .setButtons(buttonsPanel)
    .build()
    .addElement(cellTemplate);

SapdonServerUI.registerPage({
    panelId: "sapdon_ui:gomoku",
    name: "gomoku",
    contentPanel: "gomoku.gomoku_content_panel",
    buttonsPanel: "gomoku.gomoku_buttons_panel",
});

registry.submit()