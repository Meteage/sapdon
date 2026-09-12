import { BlockComponent, TileBlock, BlockAPI, EntityAPI, Grid, Image, Label, Panel, StackPanel, UIElement, UISystem, Modifications, Control, GridProp, Layout, Sprite, Text, UISystemRegistry, ChestUISystem, ContainerUISystem, registry } from '@sapdon/core'


const mob_chest = BlockAPI.createTileBlock("mob_chest:chest","construction",["textures/blocks/entity/normal"],{});
      mob_chest.setGeometry("geometry.mob_chest");
      mob_chest.block.addComponent(
        BlockComponent.setMaterialInstances({
          "*":{
            "texture":"normal",
            "render_method": "alpha_test"
          }
        })
      )
      mob_chest.entity.resource
        .addMaterial("default","entity_alphatest")
        .addGeometry("default","geometry.mob_chest")
        .addAnimation("default","animation.mob_chest.default")
        .addAnimation("open","animation.mob_chest.open")
        .addAnimation("close","animation.mob_chest.close")
        .addAnimation("interact_controller","controller.animation.mob_chest.interact")
        .setScript("animate",["interact_controller"])
        .addRenderController("controller.render.cow")

        mob_chest.entity.behavior.addProperty("mob_chest:chest_state",{
            "type": "enum",
            "values": ["default", "open", "close"],
            "default": "default",
            "client_sync": true
        })


// ── 系统 A：自定义熔炉 ───────────────────────────────────────────────────────
// 槽位声明 = 面板内像素绝对坐标（左上角原点），框架换算 grid_position / offset。
// 版面照原版熔炉的排布，宽度/间距取自真机对照截图的像素量取：
//   左侧两格输入上下叠放（间距 38）；右侧一格产物、视觉 26×26（比输入大）、垂直居中于两输入之间；
//   两输入之间是原版的火焰图形（静态贴图）；输入与产物之间是进度槽 —— 脚本每 tick 换物品做伪进度条。
// 网格几何只认 setSlotDefaults 的统一格位尺寸；逐槽 cellSize 只是视觉尺寸（可溢出格位，
// 不会移动自己的格位基座）—— 已由真机实测确认，见 doc/dev/known-pitfalls.md §4.9。
const sapdon_furnace = new ContainerUISystem("sapdon_furnace:sapdon_furnace","ui/");
      sapdon_furnace.setTitle("自定义熔炉");
      sapdon_furnace.setPanel({ size: [180, 166] })           //与原版熔炉同高
      sapdon_furnace.setGridOrigin([8, 22])                   //让开顶部标题
      sapdon_furnace.setSlotDefaults({ cellSize: [18, 18] })  //= 原版 container_item 尺寸
      sapdon_furnace.addSlot({ slot: 0, pos: [50, 22], kind: 'input' })
      sapdon_furnace.addSlot({ slot: 1, pos: [50, 60], kind: 'input' })
      sapdon_furnace.addSlot({ slot: 2, pos: [108, 37], kind: 'output', cellSize: [26, 26] })
      // 进度槽：占原版箭头的位置，由脚本每 tick 换物品做伪进度条（display = 不进不出）。
      // 视觉 36×10 靠逐槽 cellSize 横向溢出格位；网格统一格位仍是 18×18。
      sapdon_furnace.addSlot({ slot: 3, pos: [70, 45], kind: 'display', cellSize: [36, 10] })
      // 原版火焰图形：贴图名与尺寸直接取自原版 furnace_screen.json
      //   flame_empty_image = textures/ui/flame_empty_image  13×13
      // 位置 = 真机截图量到的原版位置 + [0,6]（本面板槽位整体比原版低 6px）。
      // ⚠️ 原版箭头（textures/ui/arrow_inactive / arrow_active，22×15 @ 原版 (77,36)）**没有放**：
      //    · 它的位置就是上面这个进度槽（两者是同一个「进度」位的两种做法，不能共存）；
      //    · 且 arrow_active 的进度靠 `#clip_ratio` ← `#furnace_arrow_ratio` 绑定裁剪，
      //      该绑定由**熔炉界面**提供，本面板挂在 chest_screen 上取不到（见 known-pitfalls §4.9）。
      const ui_image = (id, texture, size) => new Image(id)
        .setSprite(new Sprite().setTexture(texture))
        .setLayout(new Layout().setSize(size))
        .setControl(new Control().setLayer(6))
      sapdon_furnace.addControl(ui_image("flame_image", "textures/ui/flame_empty_image", [13, 13]), [52, 43])

// ── 系统 B：坐标校准面板（新增）──────────────────────────────────────────────
// 只测两件真机仍未确认的事（原版格位 18 的换算已实测确认，见 doc/dev/known-pitfalls.md §4.9）：
//   (a) 非原版统一格位 20×20 是否真被引擎采纳 —— 三行全部 offset.y = 0，
//       于是「相邻两行的 y 差」直接就是引擎真实格高（声明应为 20；若引擎仍按原版 18，会落在 24/42/60）。
//   (b) 逐槽 cellSize 是否真的只是视觉尺寸 —— 第 3 行声明 36×10。若它没落在声明的 y=64，
//       就说明逐槽 size 参与了格位排版（§4.11 的反例）。
//   x 位移 40（第 2 行）用于检验 pos→offset 的水平换算（水平方向不参与格位推导）。
// 版面刻意压在 y < 86：面板下半区是原版背包（bottom_left + 100%×50%，其内容顶实测约 y≈86），
// 上一版把第 2 行放在 y=76，与背包首行纵向重叠 7.7 UI px、横向仅差 1 UI px。
const calib_test = new ContainerUISystem("calib_test:calib_test","ui/");
      calib_test.setTitle("坐标校准");
      calib_test.setPanel({ size: [180, 166] })           //与原版同高：下半区留给玩家背包
      calib_test.setGridOrigin([8, 24])                   //y=24 = 框架默认原点，正好让开标题
      calib_test.setSlotDefaults({ cellSize: [20, 20] })  //★ 非原版格位：验证引擎是否真听 setSlotDefaults
      calib_test.addSlot({ slot: 0, pos: [8,  24], kind: 'input' })
      calib_test.addSlot({ slot: 1, pos: [48, 44], kind: 'input' })
      calib_test.addSlot({ slot: 2, pos: [8,  64], kind: 'input', cellSize: [36, 10] })
      // 标出面板原点（main_panel 的 [0,0]）：addControl(el, pos) 直接落进主面板
      calib_test.addControl(
        new Label("origin_label")
          .setControl(new Control().setLayer(12))
          .setText(new Text().setText("原点 [8,8]").setColor([1, 1, 0]).setTextAlignment("left"))
          .setLayout(new Layout().setSize(["100%", "default"]).setAnchorFrom("top_left").setAnchorTo("top_left")),
        [8, 8]
      )

// ── 手写 UI 对照件（res/ui/slot_test.json）───────────────────────────────────
// JSON UI 里「控件不可交互」的属性名是 `enabled`（原版 UI 树 enabled×26 / enable×0；
// 示例里的 cooking_pot.json 也是 enabled×3 / enable×0）。框架侧现由 addSlot({ kind }) 统一出口：
// input 不写该键、output / display 写 "enabled": false。
// 这份手写面板把两种取值摆在同一个界面上，进游戏一次就能判定：
//   槽 0/1/2 "enabled": true（对照） · 槽 4 "enabled": false（原版真名）
//   （该文件当前只剩这 4 个格位；文件头注释里提到的槽 5 / "enable" 写法已不在文件里）
// ⚠️ `enabled: false` 能否真拦住「往这个槽里放东西」尚未真机确认。
// 登记与门控都走公开 API：UISystemRegistry.addOuterUIdefs（uiSystemRegistry.ts:20）
// + ChestUISystem.registerContainerUI（chest.ts:10，与框架自己注册的 gate 会累加进同一个 chest_screen.json）。
UISystemRegistry.addOuterUIdefs(["ui/slot_test.json"])
ChestUISystem.registerContainerUI("slot_test", "slot_test.container_root_panel")
      



BlockAPI.createBlock("sapdon:falling_block","construction",[
  {stateTag:0,textures:["normal"]},
  {stateTag:1,textures:["normal"]}
])
//正常变体
.addVariantComponent(0,
  BlockComponent.combineComponents(
      BlockComponent.setGeometry("geometry.mob_chest"),
      BlockComponent.setCustomComponents(["sapdon:heavy_block"]),
      BlockComponent.setTick([0,0],true),
      BlockComponent.setMaterialInstances({
          "*": {
                      "texture":"normal",
                      "render_method": "alpha_test"
          }
      })
  )
)

const falling_block_entity = EntityAPI.createProjectile("sapdon:falling_block_entity","textures/blocks/entity/normal");
      falling_block_entity.resource.addGeometry("default","geometry.mob_chest")

registry.submit()
