import { BlockAPI, BlockComponent, EntityAPI } from "../../src/core/index.js";

//添加箱子方块
BlockAPI.createBlock("mob_chest:chest","construction",[
    {stateTag:0,textures:["normal"]},
    {stateTag:1,textures:["none"]}
])
.addComponent(BlockComponent.setGeometry("geometry.mob_chest"))
.addComponent(BlockComponent.setMaterialInstances({
    "*":{
        "texture":"nomal",
    }
}))
//.addComponent(BlockComponent.setSelectionBoxCustom([-7,0,-7],[15,15,15]))
.addComponent(BlockComponent.setCustomComponents(["sapdon:block_with_entity"]))
.addVariantComponent(1,BlockComponent.setGeometry("geometry.empty"))

//添加箱子实体
const mob_chest = EntityAPI.createEntity("mob_chest:chest_entity", "textures/blocks/entity/normal",{
    component_groups:{
        "close_check":{
            "minecraft:entity_sensor": {
  "relative_range": false,
  "subsensors": [
    {
      "range": [
        2,
        2
      ],
      "event_filters": {
        "all_of": [
          {
            "test": "is_riding",
            "subject": "self",
            "operator": "equals",
            "value": false
          },
          {
            "test": "has_component",
            "subject": "self",
            "operator": "not",
            "value": "minecraft:behavior.look_at_player"
          }
        ]
      },
      "event": "minecraft:on_not_riding_player"
    }
  ]
}
        },
        "item_despawn":{
            "minecraft:despawn": {},
                "minecraft:instant_despawn": {
                    "remove_child_entities": false
                },
                "minecraft:transformation": {
                    "drop_inventory": true,
                    "into": "minecraft:air"
                }
        }
    },
    components:{
        "minecraft:interact": {
        "interactions": [
            {
            "on_interact": {
                "filters": {
                "all_of": [
                    {
                        "test": "enum_property",
                        "subject": "self",
                        "operator": "not",
                        "domain": "mob_chest:chest_state",
                        "value": "open"
                    }
                ]
                },
                "event": "mob_chest:chest_open"
            },
            "particle_on_start": {
                "particle_type": "food"
            },
            "interact_text": "action.interact.feed"
            }]
        },
        "minecraft:is_chested": {},
        "minecraft:inventory": {
				"inventory_size": 27,
				"container_type": "minecart_chest"
		},
        // Knockback resistance is needed to make it not be Knocked off by an entity.
        "minecraft:knockback_resistance": {
            "value": 1
        },
        // Tells if the entity can be pushed or not.
        "minecraft:pushable": {
            "is_pushable": false,
            "is_pushable_by_piston": true
        },
        // Sets the distance through which the entity can push through.
        "minecraft:push_through": {
            "value": 1
        },
        // Makes it invincible.
        "minecraft:damage_sensor": {
            "triggers": [
                {
                    "deals_damage": false,
                    "cause": "all"
                }
            ]
        },
        "minecraft:persistent": {},
        "minecraft:block_sensor": {
            "sensor_radius": 1,
            "on_break": [
                {
                    "block_list": [
                        "mob_chest:chest"
                    ],
                    "on_block_broken": "despawn_event"
                }
            ]
        }
    },
    events:{
        "mob_chest:chest_open":{
            "add": {
                "component_groups": [
                    "close_check"
                ]
            },
            "set_property": {
                "mob_chest:chest_state": "open"
            }
        },
        "mob_chest:chest_close":{
            "remove": {
                "component_groups": [
                    "close_check"
                ]
            },
            "set_property": {
                "mob_chest:chest_state": "close"
            }
        },
        "despawn_event":{
            "add": {
                    "component_groups": [
                        "item_despawn"
                    ]
                }
        }
    }
},{})

mob_chest.resource
.addMaterial("default","entity_alphatest")
.addGeometry("default","geometry.mob_chest")
.addAnimation("default","animation.mob_chest.default")
.addAnimation("open","animation.mob_chest.open")
.addAnimation("close","animation.mob_chest.close")
.addAnimation("interact_controller","controller.animation.mob_chest.interact")
.setScript("animate",["interact_controller"])
.addRenderController("controller.render.cow")

mob_chest.behavior.addProperty("mob_chest:chest_state",{
    "type": "enum",
    "values": ["default", "open", "close"],
    "default": "default",
    "client_sync": true
})