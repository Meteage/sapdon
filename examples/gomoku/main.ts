import {
    BlockAPI, BlockComponent, EntityAPI, EntityComponent, GRegistry, ItemAPI, ItemCategory, ItemComponent, registry
} from '@sapdon/core'
import {
    Button, ButtonMapping, DataBindingObject, Grid, GridProp, Image, Input, Label, Layout,
    Panel, SapdonFormUI, Sprite, Text, UIElement
} from '@sapdon/ui'

// 落子点是**交叉点**（围棋/连珠）：16 格 → 17 条格线 → 17×17 个点。
// 棋盘贴图也是 16 格，格线正好落在 12.5px 的整数倍上，棋子压在线上才是对的。
const CELLS = 16
const POINTS = CELLS + 1        // 17

// 表单 UI 布局：标题条 → 棋盘 → 重开行，纵向排列。
// 原版对话框式：标题条里放状态文字 + 右上角「X」关闭钮，棋盘完整露在下面，两者不再叠在一起。
// 想整体缩放只改 UI_W / UI_BOARD 即可（UI_H 会跟着算）。
// ⚠️ 面板总高 × GUI 缩放必须小于窗口高度，否则底部整行会被裁掉（重开键就掉出屏幕）。
// 实测 GUI Scale 4 时表单顶端距窗口顶约 11 UI px，窗口高 864px ⇒ 可用约 205 UI px。
// 这里总高 203 留了余量；换更大 GUI 缩放时需要把这个数再压小。
const UI_W = 168          // 整块宽度
const UI_HEADER = 18      // 标题条高度
const UI_BOARD = 168      // 棋盘边长（16 格 → 每格 10.5px）
const UI_CELL = UI_BOARD / CELLS   // 10.5
// 重开按钮已经偏移到标题条里，底部不再留行；网格第 18 行仍存在（承载第 290 个按钮的索引），
// 但它的内容被移到标题条，所以溢出面板也看不见
const UI_H = UI_HEADER + UI_BOARD

// ---------- 点模板：按 #form_button_text 显示 空/黑/白 ----------
// 注意不要给 offset 加偏移：按钮中心必须正好落在格线交点上
const cellTemplate = new Button("cell_template", undefined)
    .setLayout(new Layout().setOffset([0, 0]))
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

// 棋子图 92%（≈11.5px），比一个格距（12.5px）略小，相邻棋子不粘连
const blackImg = new Image("black", undefined)
    .setSprite(new Sprite().setTexture("textures/gui/gomoku_black"))
    .setLayout(new Layout().setSize(["92%", "92%"]));
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
    .setLayout(new Layout().setSize(["92%", "92%"]));
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

// ---------- 重开格模板：图标常显，不依赖文本门控 ----------
// 它是第 290 个 form 按钮（文本 'restart'），点它返回 selection = 289。
// 格位在网格最后一行左侧（索引 289 = 第 290 个按钮），但**内容被偏移到标题条**里：
// 偏移量按「格位中心 → 标题条右上（X 左侧）」算，点击热区随控件走，等于一个标题条按钮。
//   格位中心：x = 0，y = UI_HEADER - UI_CELL/2 + 17.5*UI_CELL = 196.5
//   目标中心：x = UI_W - 2 - 14 - 4 - 7 = 141，y = 9
const RESTART_OFFSET: [number, number] = [141, 9 - (UI_HEADER - UI_CELL / 2 + 17.5 * UI_CELL)]

const restartTemplate = new Button("restart_template", undefined)
    .setLayout(new Layout().setSize([14, 14]).setOffset(RESTART_OFFSET))
    .addProp("anchor_from", "center")
    .addProp("anchor_to", "center")
    .setInput(
        new Input().setButtonMappings([
            new ButtonMapping().setMappingType("pressed")
                .setFromButtonId("button.menu_select")
                .setToButtonId("button.form_button_click"),
        ])
    )
    .addVariable("pressed_button_name", "button.form_button_click")
    .addControl(
        // 浅灰方钮 + 深色循环箭头（与右上角 X 同款），100% 填满格子才够醒目
        new Image("restart_icon", undefined)
            .setSprite(new Sprite().setTexture("textures/ui/gomoku_restart"))
            .addProp("keep_ratio", false)
            .setLayout(new Layout().setSize(["100%", "100%"]))
    );
restartTemplate.dataBinding.addDataBinding(
    new DataBindingObject().setBindingType("collection_details").setBindingCollectionName("form_buttons")
);
restartTemplate.dataBinding.addDataBinding(
    new DataBindingObject()
        .setBindingType("collection")
        .setBindingCollectionName("form_buttons")
        .setBindingName("#form_button_text")
);

// ---------- 棋盘网格：17×17 个**交叉点** + 底部 1 行放 restart ----------
// 网格单元按 12.5px（= 一个格距）排，整体向左上各偏移半格（-6.25），
// 这样每个格子的中心正好落在格线交点上（第 c 列中心 = c × 12.5）。
const boardGrid = new Grid("board_buttons_grid")
    .setGridProp(new GridProp().setGridDimensions([POINTS, POINTS + 1]))
    .setCollectionName("form_buttons")
    .setLayout(new Layout().setSize([POINTS * UI_CELL, (POINTS + 1) * UI_CELL])
        .setAnchorFrom("top_middle").setAnchorTo("top_middle")
        .setOffset([0, UI_HEADER - UI_CELL / 2]));

// 289 个交叉点：双层循环 addGridItem，唯一 id（零填充），引用 cell_template（黑/白子图）
// ⚠️ 模板必须写**完整命名空间**：本 UI 文件的 namespace 是 `ns_nm`（sapdon_ui + gomoku → gomoku_gomoku），
//    写成 `gomoku.cell_template` 会指向不存在的命名空间 ⇒ 继承失败 ⇒ 格子没有按钮绑定，点了没反应。
for (let r = 0; r < POINTS; r++)
    for (let c = 0; c < POINTS; c++)
        boardGrid.addGridItem([c, r], new UIElement(`bt_${String(r * POINTS + c).padStart(3, "0")}`, "button", "gomoku_gomoku.cell_template"));

// restart 也走格子模板：它是「第 290 个 form 按钮」，文本为 'restart'，
// 模板里的 restart_icon 只在 #form_button_text = 'restart' 时显示。
// ⚠️ 位置必须是**行优先的第 290 个格位** = 第 17 行第 0 列：
//    引擎按格子顺序分配 form 按钮索引，放在第 17 行第 8 列会取到索引 297（不存在）⇒ 门控失败、图标不显示。
boardGrid.addGridItem([0, POINTS],
    new UIElement("restart_cell", "button", "gomoku_gomoku.restart_template"), "restart_item");

const boardGridBuilt = boardGrid;

// ---------- 内容面板：标题条 + 棋盘 ----------
const contentPanel = new Panel("gomoku_content_panel", undefined)
    .setLayout(new Layout().setSize([UI_W, UI_H]))
    .addControl(
        // 棋盘图固定 200×200，从标题条下方开始
        new Image("board_bg", undefined)
            .setSprite(new Sprite().setTexture("textures/gui/gomoku_board"))
            .setLayout(new Layout().setSize([UI_BOARD, UI_BOARD])
                .setAnchorFrom("top_middle").setAnchorTo("top_middle").setOffset([0, UI_HEADER]))
    );

// ---------- 按键面板：标题条 + 状态文字 + 关闭钮 + 棋盘网格 ----------
const headerBar = new Image("header_bg", undefined)
    .setSprite(new Sprite().setTexture("textures/ui/gomoku_header"))
    // keep_ratio 必须关掉：贴图是 16×16 的方块纹理，开着会按高度缩成正方形，铺不成横条
    .addProp("keep_ratio", false)
    .addProp("nineslice_size", 0)
    .setLayout(new Layout().setSize([UI_W, UI_HEADER]).setAnchorFrom("top_middle").setAnchorTo("top_middle"));

const statusLabel = new Label("status", undefined)
    .setText(new Text().setText("#form_text").setColor([255, 255, 255]))
    .setLayout(new Layout().setSize(["68%", UI_HEADER - 4])
        .setAnchorFrom("top_middle").setAnchorTo("top_middle").setOffset([0, 2]));
statusLabel.dataBinding.addDataBinding(new DataBindingObject().setBindingName("#form_text"));



// 退出按钮：**不继承 `common.button`**。
// 引擎的 button 类型默认按子控件名 default / hover / pressed 切换三态外观；
// 继承 common.button 后再覆写 controls，会把基类的三态子控件顶掉，启动即报
//   `JSON UI control name could not be resolved: 'default' (referenced by control 'exit')`
// 这里的写法与 examples/guidebook_demo 的关闭按钮一致：自己建三个状态图 + 文字。
const exitButton = new Button("exit")
    // 原版对话框那种右上角小方钮：14×14，X 已画进贴图，不再用文字
    .setLayout(new Layout().setSize([14, 14])
        .setAnchorFrom("top_right").setAnchorTo("top_right").setOffset([-2, 2]))
    .setInput(new Input().setButtonMappings([
        new ButtonMapping()
            .setMappingType("pressed")
            .setFromButtonId("button.menu_select")
            .setToButtonId("button.menu_exit"),
    ]))
    .addVariable("pressed_button_name", "button.menu_exit")
    .addControls([
        // 贴图用工程自带的 res/textures/ui/gomoku_close_*.png：
        // 原版 textures/ui/button_borderless_light 在部分版本里解析不到，会渲染成绿色占位块。
        new Image("default", undefined)
            .setSprite(new Sprite().setTexture("textures/ui/gomoku_close_default"))
            .setLayout(new Layout().setSize(["100%", "100%"])),
        new Image("hover", undefined)
            .setSprite(new Sprite().setTexture("textures/ui/gomoku_close_hover"))
            .setLayout(new Layout().setSize(["100%", "100%"])),
        new Image("pressed", undefined)
            .setSprite(new Sprite().setTexture("textures/ui/gomoku_close_pressed"))
            .setLayout(new Layout().setSize(["100%", "100%"])),
    ]);

const buttonsPanel = new Panel("gomoku_buttons_panel", undefined)
    .setLayout(new Layout().setSize([UI_W, UI_H]))
    .addControl(headerBar)
    .addControl(statusLabel)
    .addControl(exitButton)
    .addControl(boardGridBuilt);

// ---------- 组装页面 + 注册 ----------
// 一个 SapdonFormUI = 一个 UI 文件（ui/gomoku_gomoku.json = ns_nm）= 一条路由（sapdon_ui:gomoku）
const gomoku = new SapdonFormUI("gomoku:gomoku", contentPanel, buttonsPanel);
gomoku.getSystem().addElement(cellTemplate);
gomoku.getSystem().addElement(restartTemplate);

// ---------- 2×2 多方块棋盘（世界中的实体模型） ----------
// 四个象限方块共享一份几何文件（每块 16×1×16 单位 ≈ 1m×1/16m×1m 的薄板），
// 顶面贴图 = 棋盘图对应象限（128×128，即 UI 16×16 棋盘中 8×8 格）。
// 象限与世界的对应：row(UI 纵) → +Z，col(UI 横) → +X；顶点西北角 = (origin.x, origin.z)。
const BOARD_QUADRANTS = ["nw", "ne", "sw", "se"] as const;
/** 棋盘方块的自定义组件 id（运行期在 scripts/index.ts 里注册 onPlayerInteract） */
const BOARD_COMPONENT_ID = "gomoku:board_interact";

const boardGeo = {
    format_version: "1.12.0",
    "minecraft:geometry": BOARD_QUADRANTS.map((q) => ({
        description: { identifier: `geometry.gomoku_board_${q}`, texture_width: 128, texture_height: 128 },
        bones: [{
            name: "root",
            pivot: [0, 0, 0],
            cubes: [{
                origin: [-8, 0, -8],
                size: [16, 1, 16],
                // 逐面 UV：顶/底面铺满整张象限贴图，四个薄侧面只采样贴图边缘一条
                uv: {
                    up: { uv: [0, 0], uv_size: [128, 128] },
                    down: { uv: [0, 0], uv_size: [128, 128] },
                    north: { uv: [0, 127], uv_size: [128, 1] },
                    south: { uv: [0, 127], uv_size: [128, 1] },
                    east: { uv: [127, 0], uv_size: [1, 128] },
                    west: { uv: [127, 0], uv_size: [1, 128] },
                },
            }],
        }],
    })),
};
GRegistry.register("gomoku_board_geo", "resource", "models/blocks", boardGeo);

for (const q of BOARD_QUADRANTS) {
    const block = BlockAPI.createGeometryBlock(`gomoku:board_${q}`, "construction", `geometry.gomoku_board_${q}`, {
        "*": { texture: `board_${q}`, render_method: "opaque" },
    });
    // 碰撞/选择框贴合模型（底部 1 单位薄板），不再挡满整格
    block.addComponent(BlockComponent.combineComponents(
        BlockComponent.setCollisionBoxCustom([-8, 0, -8], [16, 1, 16]),
        BlockComponent.setSelectionBoxCustom([-8, 0, -8], [16, 1, 16]),
    ));
    // 空手右键要能打开对局 UI：普通方块不会触发 playerInteractWithBlock，
    // 必须挂自定义组件（scripts/index.ts 里在 system.beforeEvents.startup 注册）。
    // ⚠️ 用**扁平写法**（组件 id 直接当键）：`minecraft:custom_components` 在 Scripting V2 已废弃，
    //    写了会报 `not present in the Schema`（见 doc/dev/known-pitfalls.md §2.6）。
    block.addComponent(BlockComponent.setCustomComponents([BOARD_COMPONENT_ID]));
}

// ---------- 棋子实体：落在棋盘模型上的展示棋子（无 AI / 无重力 / 持久化） ----------
const stoneGeo = {
    format_version: "1.12.0",
    "minecraft:geometry": [{
        description: { identifier: "geometry.gomoku_stone", texture_width: 16, texture_height: 16 },
        bones: [{
            name: "body",
            pivot: [0, 0, 0],
            cubes: [{
                // 立方体棋子（方块模型）：1.6³ 单位 = 0.1 m，略小于 0.125 m 的格位，四周留缝不粘边
                origin: [-0.8, 0, -0.8],
                size: [1.6, 1.6, 1.6],
                uv: {
                    up: { uv: [0, 0], uv_size: [16, 16] },
                    down: { uv: [0, 0], uv_size: [16, 16] },
                    north: { uv: [0, 0], uv_size: [16, 16] },
                    south: { uv: [0, 0], uv_size: [16, 16] },
                    east: { uv: [0, 0], uv_size: [16, 16] },
                    west: { uv: [0, 0], uv_size: [16, 16] },
                },
            }],
        }],
    }],
};
GRegistry.register("gomoku_stone_geo", "resource", "models/entity", stoneGeo);

function makeStone(identifier: string, texture: string) {
    const e = EntityAPI.createEntity(identifier, texture, {
        is_spawnable: false,
        is_summonable: true,
        format_version: "1.21.0",
    });
    e.behavior.addComponent(EntityComponent.combineComponents(
        EntityComponent.setPhysics(false, false),
        EntityComponent.setPushable(false, false),
        EntityComponent.setCollisionBox(0.01, 0.01),
        EntityComponent.setDamageSensor(false),
    ));
    e.behavior.addComponent(new Map([["minecraft:persistent", {}]]));
    e.resource.addMaterial("default", "entity_alphatest");
    e.resource.addGeometry("default", "geometry.gomoku_stone");
    e.resource.addRenderController("controller.render.default");
    return e;
}
makeStone("gomoku:stone_black", "textures/entity/gomoku_stone_black");
makeStone("gomoku:stone_white", "textures/entity/gomoku_stone_white");

// ---------- 「五子棋棋盘」道具：手持右键指向的方块面，摆放一整块 2×2 棋盘 ----------
const boardItem = ItemAPI.createItem("gomoku:board", ItemCategory.Items, "gomoku_board");
boardItem.addComponent(ItemComponent.setDisplayName("五子棋棋盘"));

registry.submit()