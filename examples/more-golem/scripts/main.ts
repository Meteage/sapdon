import { BlockComponent, BlockComponentTypes, Dimension, Entity, EntityComponentTypes, ItemStack, system, Vector3, world } from "@minecraft/server";
import { Utils } from "./utils.js";

//常量区
const GOLEM_PROPERTY = "more_golem:golem_index";
const TARGET_PROPERTY = "more_golem:target_index";

const GOLEM_FARMER_TYPE = "more_golem:frame_golem";
const GOLEM_TARGET_TYPE = "more_golem:golem_target";


let golem: Entity | undefined = undefined;
let target: Entity | undefined = undefined;

let task = 0;


type position = `${number},${number},${number}`;

const golem_map   = new Map<number  ,Entity>();
const target_map  = new Map<position,Entity>();

//0.5秒 粒子生成
system.runInterval(() => {
    target_map.forEach((target,index)=>{
        if(!target.isValid) {return;}
        const dimension = target.dimension;
        dimension.spawnParticle("minecraft:blue_flame_particle", target.location);
    })
},10);

//30秒定时器 定时清除无效傀儡
system.runInterval(()=>{
    for(const [pos,target] of target_map){
        if(target?.isValid) continue;
        target_map.delete(pos);
    }
    for(const [id,golem] of golem_map){
        if(golem?.isValid) continue;
        golem_map.delete(id);
    }

},20*30);

function spawnGolem(dimension:Dimension,golem_type:string,number:number,location:Vector3){
    const golem = dimension.spawnEntity(golem_type,location);
    golem.setProperty(GOLEM_PROPERTY,number);
    golem_map.set(golem_map.size,golem);
    return golem;
}

function spawnTarget(dimension:Dimension,number:number,location:Vector3){
    const position_key = locationToPosition(location);
    if(target_map.has(position_key)) return
    const target = dimension.spawnEntity(GOLEM_TARGET_TYPE,location);
    target.setProperty(TARGET_PROPERTY, number);
    target_map.set(position_key,target);
    return target;
}

function placeWaypoints(dimension:Dimension,number:number,waypoints:Vector3[]){
    waypoints.forEach((pos)=>{
        spawnTarget(dimension,number,pos);
    });
}

//判定是否接近
function isWithinRadius(p1:Vector3,p2:Vector3,threshold:number): boolean {
    return Utils.getDistance(p1,p2) <= threshold;
}

//Vector3 转 Position 
function locationToPosition(location:Vector3){
    const x = Math.round(location.x);
    const y = Math.round(location.y);
    const z = Math.round(location.z);
    return `${x},${y},${z}` as position;
}

function positionToLocation(position: string):Vector3 {
    const pos_arr = position.split(',').map(coord => parseFloat(coord.trim()));
    return {
        x: pos_arr[0],
        y: pos_arr[1],
        z: pos_arr[2]
    };
}

function grabItemsFormChest(dimension:Dimension,golem:Entity,chest_location:Vector3,itemTypeId:string){
    const chest_container = Utils.getBlockContainer(dimension,chest_location);
    const golem_container = Utils.getEntityContainer(golem);
    if(!golem_container?.isValid || !chest_container?.isValid) return false;
    const item_slot = Utils.findSlotByItemType(chest_container,itemTypeId);
    if(item_slot === undefined ) return false;
    return Utils.transferItemBetweenContainers(item_slot,chest_container,golem_container);
}

//
function takeSeedsForGoem(){
    world.sendMessage("任务：取箱子里的种子");
    //达成条件

}

let chest_pos:Vector3|undefined = undefined;

//只实现一个傀儡的导航
world.afterEvents.itemUse.subscribe((event) => {
    const { itemStack, source } = event;
    const itemTypeId = itemStack.typeId;
    const dimension = source.dimension;

    switch (itemTypeId) {
        case 'minecraft:stick':
            world.sendMessage("target_map_size:"+target_map.size);

            switch (task) {
                case 0:
                    //傀儡的生成
                    if (golem?.isValid) return;
                    world.sendMessage("已生成傀儡");
                    golem = spawnGolem(source.dimension,GOLEM_FARMER_TYPE,15,source.location);
                    task++;
                    break;
                
                //导航为两步 step1 寻找并发布标记点 step2 判断到达 step3 执行任务，清除标记
                case 1:
                    world.sendMessage("寻找箱子");

                    //step1 获取所有有效箱子
                    const chest_list = Utils.getNeighboringBlockListByType(source.dimension, source.location, "minecraft:chest");
                    //step2 标记所有有效箱子
                    const target_list = chest_list.map((pos)=>({x:pos.x,y:pos.y+1,z:pos.z}));
                    placeWaypoints(dimension,15,target_list);
                    //任务结束跳转
                    task++;

                    break;
                case 2:
                    world.sendMessage("判断是否到达");//3秒
                    //step1 判断是否到达
                    if(!golem?.isValid) return 

                    //获得最近的箱子
                    let target_entity = undefined;
                    let most_close_chest_pos = undefined;
                    for(const [pos,target] of target_map){
                        if(!target?.isValid) continue;
                        const location = positionToLocation(pos);
                        world.sendMessage(`index:${pos}   距离:${Utils.getDistance(golem.location,location)}`);//3秒

                        if(!isWithinRadius(golem.location,location,2)) continue;
                        world.sendMessage(`距离接近，距离为${Utils.getDistance(golem.location,location)}`)
                        target_entity = target;
                        most_close_chest_pos = {
                            x:location.x,
                            y:location.y -1,
                            z:location.z,
                        };
                    }

                    if(most_close_chest_pos !== undefined){
                        //执行任务
                        const golem_container = Utils.getEntityContainer(golem);
                        const mainHandItem = golem_container!.getItem(0);
                        world.sendMessage("mianHand:"+mainHandItem?.typeId)
                        if(mainHandItem && mainHandItem?.amount >= 16){
                            world.sendMessage("获取种子任务完成！")
                            //清除
                            task++;
                        }else{
                            world.sendMessage("获取种子")
                            const chest_container = Utils.getBlockContainer(dimension,most_close_chest_pos);
                            //检查箱子是否有种子，没有了就删除对于目标实体
                                
                            const result = grabItemsFormChest(dimension,golem,most_close_chest_pos,"minecraft:wheat_seeds");
                            if(result === false){
                                //删除对于目标
                                world.sendMessage("删除箱子标记")
                                target_entity?.remove();
                            }
                        }
                    }

                break;
                case 3:
                     world.sendMessage("清除所有箱子目标");
                     for(const [pos,target] of target_map){
                        target.remove();
                     }
                     task++;
                break
                case 4:
                    world.sendMessage("寻找农田");
                    if(!golem?.isValid) return
                    const framLands = Utils.getNeighboringBlockListByType(dimension, golem.location, "minecraft:farmland");
                    const filter_farmlads = framLands.filter((pos)=>{
                        return dimension.getBlock({x:pos.x,y:pos.y+1,z:pos.z})?.isAir === true
                    });
                    placeWaypoints(dimension,15,filter_farmlads.map((pos)=>({x:pos.x+0.5,y:pos.y+1,z:pos.z+0.5})));
                    task++;
                    break;
                case 5:
                    {
                    world.sendMessage("种植小麦");
                    if(!golem?.isValid) return
                    //获得最近的箱子

                    let target_entity = undefined;
                    let most_close_chest_pos = undefined;
                    for(const [pos,target] of target_map){
                        if(!target?.isValid) continue;
                        const location = positionToLocation(pos);
                        world.sendMessage(`index:${pos}   距离:${Utils.getDistance(golem.location,location)}`);//3秒

                        if(!isWithinRadius(golem.location,location,2)) continue;
                        world.sendMessage(`距离接近，距离为${Utils.getDistance(golem.location,location)}`)
                        target_entity = target;
                        most_close_chest_pos = {
                            x:location.x,
                            y:location.y,
                            z:location.z,
                        };
                    }

                    if(most_close_chest_pos){
                         //执行任务
                        const golem_container = Utils.getEntityContainer(golem);
                        const mainHandItem = golem_container!.getItem(0);
                        world.sendMessage("mianHand:"+mainHandItem?.typeId);
                        const farmland_above = dimension.getBlock(most_close_chest_pos)?.above();
                        if(farmland_above?.isAir){
                            world.sendMessage("种植小麦");
                            farmland_above.setType("minecraft:wheat");
                            target_entity?.remove()
                        }
                        else{
                            world.sendMessage("农地上方不是方块");
                        }
                    }

                    if(target_map.size === 0){
                        task++;
                    }
                    break;
                }
                case 6:
                     world.sendMessage("清除所有农田目标");
                     for(const [pos,target] of target_map){
                        target.remove();
                     }
                     task = 4;
                break;
                case 7:
                    world.sendMessage("寻找成熟小麦");
                break;
                }
        break;
        case 'minecraft:gold_ingot':
            if (task <= 15) {
                task++;
            }
            else task = 0;
            world.sendMessage("task:" + task);
            break;
        case 'minecraft:iron_ignot':
            if (task > 0) {
                task--;
            }
            else task = 0;
            
            world.sendMessage("task:" + task);
            break;
    }
});