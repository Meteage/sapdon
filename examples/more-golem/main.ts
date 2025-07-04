import { ItemCategory, ItemAPI, ItemComponent, registry, EntityAPI, EntityComponent } from '@sapdon/core'

const targetMaxCount = 16; // 傀儡目标最大数量

ItemAPI.createItem('test:stick', ItemCategory.Items, 'stick')
    .addComponent(ItemComponent.combineComponents(
        ItemComponent.setDisplayName('Stick'),
        ItemComponent.setThrowable(true),
        ItemComponent.setIcon('stick')
    ))

const target_dummy = EntityAPI.createDummyEntity("more_golem:golem_target","none",{});
      target_dummy.behavior.addComponent(
        EntityComponent.setTypeFamily(["golem_target"])
      );


const jsonData = {
  "minecraft:nameable": {},
  "minecraft:collision_box": {
    "width": 1,
    "height": 1.5
  },
  "minecraft:health": {
    "value": 100,
    "max": 100
  },
  "minecraft:movement": {
    "value": 0.25
  },
  "minecraft:navigation.walk": {
    "can_path_over_water": false,
    "avoid_water": true,
    "avoid_damage_blocks": true
  },
  "minecraft:movement.basic": {},
  "minecraft:jump.static": {},
  "minecraft:can_climb": {},
  "minecraft:attack": {
    "damage": {
      "range_min": 1,
      "range_max": 1
    }
  },
  "minecraft:damage_sensor": {
    "triggers": {
      "cause": "fall",
      "deals_damage": false
    }
  },
  "minecraft:knockback_resistance": {
    "value": 1
  },
  "minecraft:leashable": {
    "soft_distance": 4,
    "hard_distance": 6,
    "max_distance": 10
  },
  "minecraft:behavior.melee_attack": {
    "priority": 0,
    "reach_multiplier":2,
    "track_target": true
  },
  "minecraft:behavior.move_towards_target": {
    "priority": 2,
    "speed_multiplier": 0.9,
    "within_radius": 32
  },
  "minecraft:behavior.random_stroll": {
    "priority": 6,
    "speed_multiplier": 0.6,
    "xz_dist": 16
  },
  "minecraft:behavior.look_at_player": {
    "priority": 7,
    "look_distance": 6,
    "probability": 0.02
  },
  "minecraft:behavior.random_look_around": {
    "priority": 8
  },
  "minecraft:behavior.hurt_by_target": {
    "priority": 2,
    "entity_types": {
      "filters": {
        "test": "is_family",
        "subject": "other",
        "operator": "!=",
        "value": "creeper"
      }
    }
  },
  "minecraft:behavior.nearest_attackable_target":{
                "priority": 3,
                "must_reach": true,
                "must_see": true,
                "entity_types": [
                {
                    "filters": {
                    "all_of": [
                        {
                        "test": "is_family",
                        "subject": "other",
                        "operator": "==",
                        "value": "chicken"
                        },
                        {
                            "test": "int_property",
                            "domain": "more_golem:target_index",
                            "operator": "==",
                            "value": 0
                        }
                    ]
                    },
                    "max_dist": 24
                },
                {
                    "filters": {
                    "all_of": [
                        {
                        "test": "is_family",
                        "subject": "other",
                        "operator": "==",
                        "value": "cow"
                        },
                        {
                            "test": "int_property",
                            "domain": "more_golem:target_index",
                            "operator": "==",
                            "value": 1
                        }
                    ]
                    },
                    "max_dist": 24
                },
                {
                    "filters": {
                    "all_of": [
                        {
                        "test": "is_family",
                        "subject": "other",
                        "operator": "==",
                        "value": "creeper"
                        },
                        {
                            "test": "int_property",
                            "domain": "more_golem:target_index",
                            "operator": "==",
                            "value": 2
                        }
                    ]
                    },
                    "max_dist": 24
                }
                ]
            },
  "minecraft:persistent": {},
  "minecraft:physics": {},
  "minecraft:pushable": {
    "is_pushable": true,
    "is_pushable_by_piston": true
  },
  "minecraft:follow_range": {
    "value": 64
  },
  "minecraft:conditional_bandwidth_optimization": {},
  "minecraft:scale": {
    "value": 0.5
  }
};

// 转换为 Map<string, any>
const map = new Map<string, any>(Object.entries(jsonData));

const fram_golem = EntityAPI.createNativeEntity("more_golem:frame_golem","minecraft:iron_golem",{});
      fram_golem.resource.addGeometry("default","geometry.fram_golem");
      fram_golem.resource.textures = {};
      fram_golem.resource.addTexture("default","textures/entity/fram_golem");
      fram_golem.resource.addMaterial("default","entity_alphatest");
      fram_golem.resource.render_controllers=[];
      fram_golem.resource.addRenderController(`controller.render.${"cow"}`)

      fram_golem.resource.addAnimation("attack","animation.fram_golemo.attack");
      fram_golem.resource.addAnimation("walk","animation.fram_golemo.walk");
      fram_golem.resource.addAnimation("move","animation.fram_golemo.move");
      fram_golem.resource.addAnimation("move_to_target","animation.fram_golemo.move_to_target");
      fram_golem.resource.addAnimation("walk_to_target","animation.fram_golemo.walk_to_target");
      fram_golem.resource.setScript("animate",["attack","walk","move","move_to_target","walk_to_target"]);
      
      
      fram_golem.behavior.addProperty("more_golem:target_index",{
                    "type": "int",
                    "range": [0, targetMaxCount-1],
                    "default": 0
      });// 傀儡目标索引

      fram_golem.behavior.addComponent(
       map
      );
/*
      //最多控制16个
      for(let i=0;i<(targetMaxCount-1);i++){
        fram_golem.behavior.addComponentGroup(`more_golem:golem_${i}`,
            new Map().set( "minecraft:behavior.nearest_attackable_target",{
                "priority": 3,
                "must_reach": true,
                "must_see": true,
                "entity_types": [
                {
                    "filters": {
                    "all_of": [
                        {
                        "test": "is_family",
                        "subject": "other",
                        "operator": "==",
                        "value": "golem_target"
                        },
                        {
                            "test": "int_property",
                            "domain": "more_golem:target_index",
                            "operator": "==",
                            "value": 0
                        }
                    ]
                    },
                    "max_dist": 24
                },
                {
                    "filters": {
                    "all_of": [
                        {
                        "test": "is_family",
                        "subject": "other",
                        "operator": "==",
                        "value": "more_golem:frame_golem"
                        },
                        {
                            "test": "int_property",
                            "domain": "more_golem:target_index",
                            "operator": "==",
                            "value": 1
                        }
                    ]
                    },
                    "max_dist": 24
                },
                {
                    "filters": {
                    "all_of": [
                        {
                        "test": "is_family",
                        "subject": "other",
                        "operator": "==",
                        "value": "creeper"
                        },
                        {
                            "test": "int_property",
                            "domain": "more_golem:target_index",
                            "operator": "==",
                            "value": 2
                        }
                    ]
                    },
                    "max_dist": 24
                }
                ]
            })
        )
      }
*/
// 提交所有注册
registry.submit()