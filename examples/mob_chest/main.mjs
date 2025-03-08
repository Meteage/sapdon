import { BlockComponent } from "../../src/core/block/blockComponent.js";
import { TileBlock } from "../../src/core/block/TileBlock.js";
import { BlockAPI } from "../../src/core/factory/BlockFactory.js";
import { Grid, Image, Label, Panel, StackPanel, UIElement, UISystem } from "../../src/core/index.js";
import { Modifications } from "../../src/core/ui/elements/UIElement.js";
import { Control } from "../../src/core/ui/Properties/Control.js";
import { GridProp } from "../../src/core/ui/Properties/gridProp.js";
import { Layout } from "../../src/core/ui/Properties/Layout.js";
import { Sprite } from "../../src/core/ui/Properties/Sprite.js";
import { Text } from "../../src/core/ui/Properties/Text.js";
import { UISystemRegistry } from "../../src/core/ui/registry/UISystemRegistry.js";
import { ChestUISystem } from "../../src/core/ui/systems/chest.js";
import { ContainerUISystem } from "../../src/core/ui/systems/ContainerUISystem.js";


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
      mob_chest.entity.client_entity
        .addMaterial("default","entity_alphatest")
        .addGeometry("default","geometry.mob_chest")
        .addAnimation("default","animation.mob_chest.default")
        .addAnimation("open","animation.mob_chest.open")
        .addAnimation("close","animation.mob_chest.close")
        .addAnimation("interact_controller","controller.animation.mob_chest.interact")
        .setScript("animate",["interact_controller"])
        .addRenderController("controller.render.cow")

        mob_chest.entity.entity.addProperty("mob_chest:chest_state",{
            "type": "enum",
            "values": ["default", "open", "close"],
            "default": "default",
            "client_sync": true
        })


const sapdon_furnace = new ContainerUISystem("sapdon_furnace:sapdon_furnace","ui/");
      sapdon_furnace.setTitle("自定义熔炉");
      sapdon_furnace.setSize([180, 180]) //设置界面大小
      /*
      sapdon_furnace.setGridDimension([1,5]); //设置槽的行列数 1列，3行
      sapdon_furnace.addGridItem([0,0],[-18,18]) // 定位槽[0,0] 1列1行槽 [0,0]不偏移
      sapdon_furnace.addGridItem([0,1],[-18,18]) // 定位槽[0,1] 1列2行槽 [0,0]不偏移
      sapdon_furnace.addGridItem([0,2],[-18,18]) // 定位槽[0,2] 1列3行槽 [0,0]不偏移
      sapdon_furnace.addGridItem([0,3],[18,-18]) // 定位槽[0,3] 1列4行槽 [20,20]偏移
      sapdon_furnace.addGridItem([0,4],[18*3,-18*2]) // 定位槽[0,3] 1列4行槽 [20,20]偏移*/
      sapdon_furnace.setItemMatrix(5,[
        [0,0,0,0,0],
        [1,0,0,0,0],
        [2,0,4,0,5],
        [3,0,0,0,0],
        [0,0,0,0,0]
      ])

