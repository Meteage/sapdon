import { ItemCategory, ItemAPI, ItemComponent, registry, EntityAPI, EntityComponent } from '@sapdon/core'

ItemAPI.createItem('test:stick', ItemCategory.Items, 'stick')
    .addComponent(ItemComponent.combineComponents(
        ItemComponent.setDisplayName('Stick'),
        ItemComponent.setThrowable(true),
        ItemComponent.setIcon('stick'),
    ))

const target_dummy = EntityAPI.createDummyEntity("more_golem:golem_target","none",{});
      target_dummy.behavior.addComponent(
        EntityComponent.setTypeFamily(["golem_target"])
      );

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

      fram_golem.behavior.addComponent(
        EntityComponent.combineComponents(
            EntityComponent.setScale(0.5),
            EntityComponent.setTypeFamily(["golem"]),
            new Map().set("minecraft:behavior.nearest_attackable_target", {
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
                         "operator":"==",
                        "value": "golem_target"
                        }
                    ]
                    },
                    "max_dist":24
                }
                ]
            })
        )
      );

// 提交所有注册
registry.submit()