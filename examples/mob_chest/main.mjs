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


const sapdon_furnace = new ContainerUISystem("sapdon_furnace:sapdon_furnace","ui/");
      sapdon_furnace.setTitle("自定义熔炉");
      sapdon_furnace.setSize([180, 180]) //设置界面大小
      
      sapdon_furnace.setGridDimension([1,5]); //设置槽的行列数 1列，3行
      sapdon_furnace.addGridItem([0,0],[-18,18]) // 定位槽[0,0] 1列1行槽 [0,0]不偏移
      sapdon_furnace.addGridItem([0,1],[-18,18]) // 定位槽[0,1] 1列2行槽 [0,0]不偏移
      sapdon_furnace.addGridItem([0,2],[-18,18]) // 定位槽[0,2] 1列3行槽 [0,0]不偏移
      sapdon_furnace.addGridItem([0,3],[18,-18]) // 定位槽[0,3] 1列4行槽 [20,20]偏移
      // ★ A/B 验证用：下面 4 个是普通输入槽，**只有最后一个**标成输出槽。
      //   框架的 addOutputGrid() 会在这个格位的内层控件上写 enable:false
      //   （`containerUISystem.ts:78-84`）—— 真机上能不能挡住"往输出槽里放东西"，
      //   就看这一个槽和其它 4 个的行为是否不同：
      //     · 只有它放不进 ⇒ 这个标志位有效
      //     · 5 个槽都能放  ⇒ 标志位无效（`enable` 不是 Bedrock JSON UI 的属性）
      sapdon_furnace.addOutputGrid([0,4],[18*3,-18*2]) // 定位槽[0,4] —— 本界面的输出槽
      // sapdon_furnace.setItemMatrix(5,[
      //   [0,0,0,0,0],
      //   [1,0,0,0,0],
      //   [2,0,4,0,5],
      //   [3,0,0,0,0],
      //   [0,0,0,0,0]
      // ])

// ── 手写 UI 验证件（res/ui/slot_test.json）───────────────────────────────────
// 框架的 addOutputGrid 写的是 `enable`（containerUISystem.ts:65），而 JSON UI 的属性名是 `enabled`
// （原版 UI 树 enabled×26 / enable×0；示例里的 cooking_pot.json 也是 enabled×3 / enable×0）。
// 这份手写面板把三种写法摆在同一个界面上，进游戏一次就能判定：
//   槽 0-3 "enabled": true（对照） · 槽 4 "enabled": false（原版真名） · 槽 5 "enable": false（框架现在的写法）
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
