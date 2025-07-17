import { ItemCategory, ItemAPI, ItemComponent, registry, EntityAPI, EntityComponent, NearestAttackableTargetBehavor, PickupItemsBehavior, NeoGuidebook, StackPanel, Label, Text, Panel, UIElement } from '@sapdon/core'

const GolemMaxCount = 16; // 傀儡最大数量

ItemAPI.createItem('golem_craft:farm_golem_summon', ItemCategory.Items, 'apple')
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

const neoGuidebook = ItemAPI.createItem("sapdon:neo_guidebook", "items", "apple");
      neoGuidebook.format_version = "1.21.90"
neoGuidebook.addComponent(ItemComponent.setCustomComponentV2("sapdon:guibook",{}));

const neo_guidebook = new NeoGuidebook("neo_guidebook:neo_guidebook","ui/",[320,207],"",16);

//1
//本书介绍页
const book_intro = new StackPanel("book_intro_panel",undefined);
const book_intro_text = "自定义的模组介绍";
// 添加书名标题
book_intro.addStack(["100%", "10%"],new Label("book_name",undefined).setText(new Text().setText("NeoGuidebook").setColor([0,0,0])));
book_intro.addStack(["100%", "90%"],new Label("book_intro",undefined).setText(new Text().setText(book_intro_text).setColor([0,0,0])))

//章节目录
const book_chapter = new StackPanel("book_chapter_panel",undefined);
//添加标题
book_chapter.addStack(["100%","10%"],new Label("book_chapter",undefined).setText(new Text().setText("Chaper").setColor([0,0,0])))
//添加具体目录
book_chapter.addStack(["100%","90%"],
    //
    new StackPanel("book_directory",undefined)
    //分割
    .addStack(["100%","20%"],new Panel("none",undefined))

    .addStack(["100%","20%"],
        new StackPanel("chaper1",undefined).setOrientation("horizontal")
        //添加章节跳转按键
        .addStack(["20%","100%"],
            //按键实现 继承自"sapdon_form_button_factory"
            new UIElement("b1",undefined,"server_form.sapdon_form_button_factory")
            //绑定脚本按钮
            .addVariable("binding_button_text","test3") //绑定表单按钮test1
            .addVariable("default_texture","textures/items/apple")
            .addVariable("hover_texture","textures/items/diamond")
            .addVariable("pressed_texture","textures/ui/book_pageleft_pressed")
        )
        //添加章节名字
        .addStack(["80%","100%"],new Label("chaper_name",undefined).setText(new Text().setText("chapter 1").setColor([0,0,0])))
    )
    //
    .addStack(["100%","20%"],
        new StackPanel("chaper2",undefined).setOrientation("horizontal")
        //添加图标
        .addStack(["20%","100%"],
            //按键实现 继承自"sapdon_form_button_factory"
            new UIElement("b1",undefined,"server_form.sapdon_form_button_factory")
            //绑定脚本按钮
            .addVariable("binding_button_text","test4") //绑定表单按钮test1
            .addVariable("default_texture","textures/items/diamond")
            .addVariable("hover_texture","textures/items/apple")
        )
        //添加章节名字
        .addStack(["80%","100%"],new Label("chaper_name",undefined).setText(new Text().setText("chapter 2").setColor([0,0,0])))

    )
)

neo_guidebook.addPage("page_index0",book_intro,book_chapter);
neo_guidebook.addPage("page_index1",new Panel("conten1").addControls([new Label("t1",undefined).setText(new Text().setText("第一章节内容\n介绍\n1\n2").setColor([0,0,0]))]),new Panel("none"));
neo_guidebook.addPage("page_index2",new Panel("conten2").addControls([new Label("t1",undefined).setText(new Text().setText("第二章节内容\n介绍\n1\n2").setColor([0,0,0]))]),new Panel("none"));



// 提交所有注册
registry.submit()