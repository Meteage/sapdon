import { Entity } from "../entity/entity.js";
import { BasicBlock } from "./basicBlock.js";
import { BlockComponent } from "./blockComponent.js";


const TileBehData = {
    component_groups:{
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
        "minecraft:inventory": {
                "inventory_size": 27,
                "can_be_siphoned_from": true,
                "container_type": "minecart_chest"
        },
        "minecraft:nameable": {
                "allow_name_tag_renaming": false
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
        "minecraft:custom_hit_test": {
            "hitboxes": [
                {
                "width": 0.81,
                "height": 0.92,
                "pivot": [
                    0,
                    0.5,
                    0
                ]
                }
            ]
        },
        
        //可以被活塞推动，但是不会被实体推动
        "minecraft:pushable": {
            "is_pushable": false,
            "is_pushable_by_piston": true
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
        "minecraft:persistent": {}
    },
    events:{
        "despawn_event":{
            "add": {
                    "component_groups": [
                        "item_despawn"
                    ]
                }
        }
    }
};


export class TileBlock {
    /**
     * 带实体的方块类
     * @param {*} identifier 
     * @param {*} category 
     * @param {*} textures_arr 
     * @param {*} options 
     */
    constructor(identifier, category, textures_arr, options = {}){

        this.block =  new BasicBlock(identifier, category, textures_arr, options);
        // ⚠️ Entity 的签名是 (identifier, texture, options, behData, resData) ——
        //    `options` 只被读 is_spawnable / is_summonable / runtime_identifier；
        //    而 TileBehData 装的是 components / component_groups / events，属于 **behData（第 4 参）**。
        //    历史版本 Entity 的签名是 (identifier, texture, behData, resData, options)，那时写在第 3 参是对的；
        //    签名改成 options 在前之后这里没跟着改 → TileBehData 被整份丢弃（实体产物只剩 block_sensor、
        //    component_groups/events 全空，容器方块实体没有 inventory，游戏里打不开且是静默的）。
        //    判据见 AGENTS.md：与 examples/mob_chest 的历史产物（含 minecraft:inventory 27）逐字段对齐。
        this.entity = new Entity(`${identifier}_entity`, textures_arr[0], {}, TileBehData);

        // 注册方块状态 0:方块 1:实体
        this.block.registerState("sapdon:block_or_entity",[0,1]);
        this.block.addComponent(BlockComponent.setCustomComponents(["sapdon:block_with_entity"]))

        this.block.addPermutation(
            "q.block_state('sapdon:block_or_entity') == 1",
            BlockComponent.combineComponents(
                BlockComponent.setTick([0,0],true),//提供tick
                BlockComponent.setGeometry("geometry.cube"),
                BlockComponent.setMaterialInstances({"*":{
                    "texture":"none",
                    "render_method": "alpha_test"
                  }})
            )
        );

        //设置生物
        // ⚠️ 是 `this.entity.behavior`：064a292 把 `Entity.entity` 改名为 `Entity.behavior`
        //    （同时 `client_entity` → `resource`），本文件只改了 `client_entity` 那几处、
        //    漏了这一行 —— 于是 TileBlock 一构造就 `Cannot read properties of undefined (reading 'addComponent')`。
        this.entity.behavior.addComponent(new Map().set("minecraft:block_sensor",{
            "sensor_radius": 1,
            "on_break": [
                {
                    "block_list": [
                        identifier
                    ],
                    "on_block_broken": "despawn_event"
                }
            ]
        }))
        this.entity.resource.addMaterial("default","entity_alphatest")
        .addGeometry("default","geometry.cube")
        .addRenderController("controller.render.cow")
    }
    setGeometry(geometry){
        //设置方块模型
        this.block.addComponent(BlockComponent.setGeometry(geometry));
        //设置实体模型
        this.entity.resource.addGeometry("default",geometry);
    }
    addAnimation(name,animation){
        this.entity.resource.addAnimation(name,animation);
    }
    setScript(key,value){
        this.entity.resource.setScript(key,value);
    }
}