import { Entity } from "../entity/Entity.js";
import { BasicBlock } from "./BasicBlock.js";
import { BlockComponent } from "./blockComponent.js";


const TileBehData = {
    components:{
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
        "minecraft:persistent": {}
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
        this.entity = new Entity(`${identifier}_entity`,textures_arr[0], TileBehData,{});

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
        this.entity.client_entity.addMaterial("default","entity_alphatest")
        .addGeometry("default","geometry.cube")
        .addRenderController("controller.render.cow")
    }
    setGeometry(geometry){
        //设置方块模型
        this.block.addComponent(BlockComponent.setGeometry(geometry));
        //设置实体模型
        this.entity.client_entity.addGeometry("default",geometry);
    }
    addAnimation(name,animation){
        this.entity.client_entity.addAnimation(name,animation);
    }
    setScript(key,value){
        this.entity.client_entity.setScript(key,value);
    }
}