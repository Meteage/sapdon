import { ItemCategory, ItemAPI, ItemComponent, registry, EntityAPI, EntityComponent, NearestAttackableTargetBehavor, PickupItemsBehavior, SapdonGuideBook, StackPanel, Label, Text, Panel, UIElement, Image, Sprite, RecipeAPI, UISystemRegistry, HudUISystem, HudStatePanel, Control, Layout, Grid, GridProp, HudProgressBar } from '@sapdon/core'

const GolemMaxCount = 16; // 傀儡最大数量

ItemAPI.createItem('golem_craft:farm_golem_summon', ItemCategory.Items, 'farm_golem_summon')
    .addComponent(ItemComponent.combineComponents(
        ItemComponent.setDisplayName('农业傀儡召唤物'),
        ItemComponent.setCustomComponentV2("golem_craft:golem_summon",
          {
            "golem_type":"more_golem:frame_golem"
          }
        ),
        ItemComponent.setInteractButton("召唤傀儡")
    )).format_version = "1.21.90"

ItemAPI.createItem('golem_craft:golem_capture', ItemCategory.Items, 'stick')
    .addComponent(ItemComponent.combineComponents(
        ItemComponent.setDisplayName('傀儡收纳器'),
        ItemComponent.setCustomComponentV2("golem_craft:golem_capture", {}),
        ItemComponent.setInteractButton("收纳傀儡")
    )).format_version = "1.21.90"

const target_dummy = EntityAPI.createDummyEntity("more_golem:golem_target","none",{
  is_spawnable:false
});
      target_dummy.behavior.addComponent(
        EntityComponent.setTypeFamily(["golem_target"])
      );
     
      target_dummy.behavior.addProperty(
        "more_golem:target_index",
        {
          "type": "int",
          "range": [0, GolemMaxCount], //0-16 0-15 可以使用 16为保留位
          "default": 16  //默认为16，保留位即无目标
      })


const fram_golem = EntityAPI.createEntity("more_golem:frame_golem","textures/entity/fram_golem",{
  is_spawnable:false
});
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
      
      
      fram_golem.behavior.addComponent(
        EntityComponent.combineComponents(
          EntityComponent.setInventoryProperties({
            containerType:"minecart_chest",
            inventorySize:16
          }),
          new Map<string, any>(Object.entries({
            "minecraft:nameable": {},
            "minecraft:collision_box": {
              "width": 1,
              "height": 1.5
            },
            "minecraft:health": {
              "value": 50,
              "max": 50
            },
            "minecraft:movement": {
              "value": 0.25
            },
            "minecraft:navigation.walk": {
              "can_path_over_water": true,
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
           
            "minecraft:home": {
              "restriction_radius": 16,
              "home_block_list": ["minecraft:chest"]
            },
            "minecraft:behavior.move_towards_home_restriction": {
              "priority": 4,
              "speed_multiplier": 1.0
            },
            "minecraft:behavior.go_home": {
              "priority": 5,
              "speed_multiplier": 1.0,
              "goal_radius": 1.0,
              "interval": 120
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
              "priority": 3,
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
            
            "minecraft:shareables": {
              "items": [
                { "item": "minecraft:wheat", "want_amount": 8, "stored_in_inventory": true, "priority": 0 },
                { "item": "minecraft:wheat_seeds", "want_amount": 16, "stored_in_inventory": true, "priority": 1 },
                { "item": "minecraft:carrot", "want_amount": 8, "stored_in_inventory": true, "priority": 0 },
                { "item": "minecraft:potato", "want_amount": 8, "stored_in_inventory": true, "priority": 0 },
                { "item": "minecraft:beetroot", "want_amount": 8, "stored_in_inventory": true, "priority": 0 },
                { "item": "minecraft:beetroot_seeds", "want_amount": 16, "stored_in_inventory": true, "priority": 1 }
              ]
            },
            "minecraft:behavior.pickup_items": {
              "priority": 2,
              "can_pickup_any_item": false,
              "can_pickup_to_hand_or_equipment": false,
              "max_dist": 16,
              "speed_multiplier": 1.2
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
            "minecraft:scale": {
              "value": 0.5
            }
          }))
        )
      )

      fram_golem.behavior.addProperty(
        "more_golem:golem_index",
      {
          "type": "int",
          "range": [0, GolemMaxCount-1],
          "default": 0
      })


      type golem_filter = 
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
                  "domain": "more_golem:golem_index",
                  "operator": "==",
                  "value": number
              },
                {
                  "test": "int_property",
                  "subject": "other",
                  "domain": "more_golem:target_index",
                  "operator": "==",
                  "value": number
              }
          ]
          },
          "max_dist": 24
      }
                            
                        
      const golem_filter_arr:golem_filter[] = [];

      for(let i = 0;i<GolemMaxCount;i++){
        golem_filter_arr.push({
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
                "domain": "more_golem:golem_index",
                "operator": "==",
                "value": i
            },
              {
                "test": "int_property",
                "subject": "other",
                "domain": "more_golem:target_index",
                "operator": "==",
                "value": i
            }
        ]
        },
            "max_dist": 24
      })
      }
      fram_golem.behavior.addComponent(
        EntityComponent.combineComponents(
          new NearestAttackableTargetBehavor(3,golem_filter_arr)
          .setMustSee(false)
          .toObject()
        )
      )

const neoGuidebook = ItemAPI.createItem("sapdon:neo_guidebook", ItemCategory.Items, "neoguidebook");
      neoGuidebook.format_version = "1.21.90"
      neoGuidebook.addComponent(ItemComponent.setCustomComponentV2("sapdon:guibook",{}));
      neoGuidebook.addComponent(ItemComponent.setMaxStackSize(1));
      neoGuidebook.addComponent(ItemComponent.setDisplayName("稻田傀儡模组指南"));
      neoGuidebook.addComponent(ItemComponent.setInteractButton("打开指南"))


// 稻田傀儡模组指南 —— 用 SapdonGuideBook 数据驱动构建
const neo_guidebook = new SapdonGuideBook("neo_guidebook:neo_guidebook", [320, 207])
  .setCover('  稻田傀儡模组指南 \n            by Meteage', [
      '欢迎下载使用稻田傀儡模组',
      '本模组为 Minecraft PE 添加了一种',
      '新实体：稻田傀儡。',
  ])
  .build([
    {
        id: 'intro', title: '简介', icon: 'textures/items/book_writable',
        introLines: ['欢迎下载使用稻田傀儡模组。', '本模组添加了一种新实体：稻田傀儡。'],
        chapters: [
            { name: '模组内容', icon: 'textures/items/apple', lines: ['稻田傀儡是一种自动农田傀儡，', '能自动种植、收割、拾取掉落物。'] },
            { name: '使用说明', icon: 'textures/items/book_writable', lines: ['手持「稻田傀儡模组指南」右键，', '即可打开本手册浏览。'] },
        ],
    },
    {
        id: 'features', title: '功能', icon: 'textures/items/apple',
        introLines: ['农业傀儡的主要功能与行为。'],
        chapters: [
            { name: '功能介绍', icon: 'textures/items/apple', lines: [
                '自动种植与收割小麦、胡萝卜、土豆、甜菜根',
                '自动拾取掉落作物，存入 16 格背包',
                '绑定箱子为家，16 格范围内自动工作',
                '召唤：潜行右键箱子',
                '收纳：使用傀儡收纳器捕获',
            ]},
            { name: '行为介绍', icon: 'textures/items/apple', lines: [
                '闲暇模式：没有任务时在农田附近闲逛',
                '耕种模式：发现未种植作物时前往种植',
                '收获模式：作物成熟时自动前往收获',
                '任务执行：执行间隔 2 秒一次',
            ]},
            { name: '制作方式', icon: 'textures/items/apple', lines: [
                '制作农业傀儡需要以下材料：',
                '- 2 个干草块',
                '- 4 根木棍',
                '- 1 个紫水晶碎片',
                '按特定配方在工作台制作即可。',
            ]},
        ],
    },
    {
        id: 'recipe', title: '配方', icon: 'textures/items/recipe_golem',
        introLines: ['农业傀儡的合成配方。'],
        chapters: [
            { name: '合成配方', icon: 'textures/items/recipe_golem', pageType: 'image', lines: [],
              image: { texture: 'textures/items/recipe_golem', caption: '干草块 木棍 木棍 / 木棍 紫水晶 木棍 / 干草块 木棍 干草块' } },
        ],
    },
  ])
/*
RecipeAPI.registerSimpleShaped('golem_craft:farm_golem_summon',['golem_craft:farm_golem_summon'],
  ['HSH','SAS','HSH'],{
    H:'minecraft:hay_block',
    S:'minecraft:stick',
    A:'minecraft:amethyst_shard'
  }
).tags("crafting_table")
*/

new HudProgressBar({
    id: "red_progress",
    texture: "textures/gui/statebar",
    uv: [0, 0],
    uvSize: [182, 5],
    barSize: [182, 5],
    layers: [{ color: [0.5, 0, 0], clipRatio: 0 }],
    fillColor: [1, 0, 0],
    states: 10,
    hudSize: ["30%", "6%"],
    anchorFrom: "bottom_middle",
    anchorTo: "bottom_middle",
    offset: [0, -20]
}).mountToHud()

// 提交所有注册
registry.submit()