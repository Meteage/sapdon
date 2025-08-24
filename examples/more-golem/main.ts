import { ItemCategory, ItemAPI, ItemComponent, registry, EntityAPI, EntityComponent, NearestAttackableTargetBehavor, PickupItemsBehavior, NeoGuidebook, StackPanel, Label, Text, Panel, UIElement, NeoGuidebookPage, BookImage, Image, Sprite, BookRecipeGrid, RecipeAPI } from '@sapdon/core'

const GolemMaxCount = 16; // 傀儡最大数量

ItemAPI.createItem('golem_craft:farm_golem_summon', ItemCategory.Items, 'armor_stand')
    .addComponent(ItemComponent.combineComponents(
        ItemComponent.setDisplayName('农业傀儡召唤物'),
        ItemComponent.setCustomComponentV2("golem_craft:golem_summon",
          {
            "golem_type":"more_golem:frame_golem"
          }
        )
    )).format_version = "1.21.90"

const target_dummy = EntityAPI.createDummyEntity("more_golem:golem_target","none",{});
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


const fram_golem = EntityAPI.createEntity("more_golem:frame_golem","textures/entity/fram_golem");
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
            inventorySize:2
          }),
          new Map<string, any>(Object.entries({
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
          new NearestAttackableTargetBehavor(3,golem_filter_arr).toObject(),
          new PickupItemsBehavior(2)
            .setCanPickupAnyItem(true)
            .setCanPickupToHandOrEquipment(true)
            .setSearchHeight(32)
            .setGoalRadius(2.2)
            .toObject()
        )
      )

const neoGuidebook = ItemAPI.createItem("sapdon:neo_guidebook", "items", "book_written");
      neoGuidebook.format_version = "1.21.90"
      neoGuidebook.addComponent(ItemComponent.setCustomComponentV2("sapdon:guibook",{}));
      neoGuidebook.addComponent(ItemComponent.setMaxStackSize(1));
      neoGuidebook.addComponent(ItemComponent.setDisplayName("稻田傀儡模组指南"));


const neo_guidebook = new NeoGuidebook("neo_guidebook:neo_guidebook","ui/",[320,207]);

const book_intro_text = "欢迎下载使用稻田傀儡模组 \n \n 本模组为MinecraftPE添加了一种\n新的实体:稻田傀儡 \n \n \n \n \n";
const book_title_bar_text = "稻田傀儡模组指南\n     by Meteage";


//1
//本书介绍页
const book_intro = new NeoGuidebookPage("book_intro_panel")
      .addEmptySpace(["100%","5%"])
      .addBookTitleBar(book_title_bar_text,["100%","15%"])
      .addCategoryTitle(book_intro_text,["100%","70%"])



//合成配方页
//配方为:干草块 木棍 木棍
//木棍 紫水晶 木棍
//干草块 木棍 干草块
const book_recipe = new NeoGuidebookPage("book_recipe")// 添加书籍分类
      .addEmptySpace(["100%","5%"])
      book_recipe.getPanel().addStack(
        ["50%","30%"],
        new BookRecipeGrid("recipe_grid",3,3,[
          "textures/blocks/hay_block_side","textures/items/stick","textures/items/stick",
          "textures/items/stick","textures/items/amethyst_shard","textures/items/stick",
          "textures/blocks/hay_block_side","textures/items/stick","textures/blocks/hay_block_side"
        ])
      )


const BOOK_CHAPTER_LIST = [
    {
        chapter_name:`农业傀儡功能介绍`,
        chapter_texture:"textures/items/apple"
    },
    {
        chapter_name:`农业傀儡行为介绍`,
        chapter_texture:"textures/items/apple"
    },
    {
        chapter_name:`农业傀儡制作方式`,
        chapter_texture:"textures/items/apple"
    }
];

//章节目录
const book_chapter = new NeoGuidebookPage("book_chapter_panel")
      .addChapters(BOOK_CHAPTER_LIST)
      .buildChapterList()

const golem_function_intro = "农业傀儡是一种可以帮助玩家\n进行农作物种植与收获的傀儡。\n\n农业傀儡可以自动种植和收获\n周围的农作物，极大地提高了\n玩家的农作物管理效率。\n"
const golem_craft_intro = "制作农业傀儡需要以下材料：\n\n - 2个干草块\n - 4根木棍\n - 1个紫水晶碎片\n\n将这些材料按照特定的配方\n放置在工作台上即可制作出\n农业傀儡。\n"
const golem_behavior_intro = "农业傀儡具有以下行为模式： \n\n 1.闲暇模式：在没有任务时，\n农业傀儡会在农田附近闲逛。\n\n 2.耕种模式 ：当检测到\n附近有未种植的农作物时，\n农业傀儡会自动前往并进行种植。\n\n 3.收获模式：当农作物成熟时，\n农业傀儡会自动前往并进行收获。\n"

const book_chapter_1 = new NeoGuidebookPage("book_chapter_1")
      .addEmptySpace(["100%","5%"])
      .addCategoryTitle("农业傀儡功能介绍",["100%","15%"])
      .addBookText(golem_function_intro,["100%","75%"])
      .addEmptySpace(["100%","5%"])

const book_chapter_2 = new NeoGuidebookPage("book_chapter_3")
      .addEmptySpace(["100%","5%"])
      .addCategoryTitle("农业傀儡行为介绍",["100%","15%"])
      .addBookText(golem_behavior_intro,["100%","75%"])
      .addEmptySpace(["100%","5%"])

const book_chapter_3 = new NeoGuidebookPage("book_chapter_2")
      .addEmptySpace(["100%","5%"])
      .addCategoryTitle("农业傀儡制作方式",["100%","15%"])
      .addBookText(golem_craft_intro,["100%","75%"])
      .addEmptySpace(["100%","5%"])



neo_guidebook.addDoublePageStack("page_index0",book_intro.getPanel(),book_chapter.getPanel())
neo_guidebook.addDoublePageStack("page_index1",book_chapter_1.getPanel(),book_chapter_2.getPanel())
neo_guidebook.addDoublePageStack("page_index2",book_chapter_3.getPanel(),book_recipe.getPanel())
/*
RecipeAPI.registerSimpleShaped('golem_craft:farm_golem_summon',['golem_craft:farm_golem_summon'],
  ['HSH','SAS','HSH'],{
    H:'minecraft:hay_block',
    S:'minecraft:stick',
    A:'minecraft:amethyst_shard'
  }
).tags("crafting_table")
*/

// 提交所有注册
registry.submit()