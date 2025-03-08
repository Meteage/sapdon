import { BlockComponent } from "../../src/core/block/blockComponent.js";
import { TileBlock } from "../../src/core/block/TileBlock.js";
import { BlockAPI } from "../../src/core/factory/BlockFactory.js";
import { UIElement, UISystem } from "../../src/core/index.js";
import { Modifications } from "../../src/core/ui/elements/UIElement.js";
import { UISystemRegistry } from "../../src/core/ui/registry/UISystemRegistry.js";


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

//熔炉界面及实现
const small_chest_screen = new UIElement("small_chest_screen",undefined,"common.inventory_screen_common");
      small_chest_screen.addVariable("new_container_title|default","$container_title")
      small_chest_screen.addModification({
        array_name: "variables",
        operation:Modifications.OPERATION.INSERT_BACK,
        value:[
          {
            requires: `($new_container_title = 'sapdon_furnace')`,
            $root_panel: "cooking_pot.cooking_pot_panel",
            $screen_content: "cooking_pot.cooking_pot_panel"
          }
        ]
    })

UISystemRegistry.addOuterUIdefs(["ui/cooking_pot.json"])

const furnaceUISystem = new UISystem("chest:chest_screen","ui/");
      furnaceUISystem.addElement(small_chest_screen)