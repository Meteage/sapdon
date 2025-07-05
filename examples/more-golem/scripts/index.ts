import {system, world, Vector3, Entity, BlockVolume, BlockFilter, Dimension } from '@minecraft/server';

interface BlockVolumeSize {
    length:number,
    width:number,
    height:number
}

let golem: Entity | undefined = undefined;
let target: Entity|undefined = undefined;

let golem_index = 0;
let target_index = 0;


function getDistance(pos1:Vector3,pos2:Vector3){
    const distance = Math.sqrt(
            Math.pow(pos1.x - pos2.x, 2) +
            Math.pow(pos1.y - pos2.y, 2) +
            Math.pow(pos1.z - pos2.z, 2)
        );
   return distance;
}

//方块区域里获取特定方块
function getBlockListFromBlockVolume(dimension:Dimension ,blockVolume:BlockVolume,blockFilter:BlockFilter){
    const blockListVolume = dimension.getBlocks(blockVolume,blockFilter,true);
    return [...blockListVolume.getBlockLocationIterator()]
}

//以一个中心点获取周围矩形方块区域
function getNeighboringBlockVolume(center:Vector3,blockVolumeSize:BlockVolumeSize){
    const fromLoc:Vector3 = {
        x:center.x - blockVolumeSize.length/2,
        y:center.y - blockVolumeSize.height/2,
        z:center.z - blockVolumeSize.width/2
    };
    const toLoc:Vector3 = {
        x:center.x + blockVolumeSize.length/2,
        y:center.y + blockVolumeSize.height/2,
        z:center.z + blockVolumeSize.width/2
    };
    return new BlockVolume(fromLoc,toLoc);
}


//system
type GolemSummonComponentParams = {
    golem_type:string
}

//
let golem_target_index = 0;

//注册傀儡召唤物组件
system.beforeEvents.startup.subscribe((init)=>{
    init.itemComponentRegistry.registerCustomComponent("golem_craft:golem_summon",{
        onUseOn(event,parameter){
            world.sendMessage("召唤傀儡")
            const {block} = event;
            const {golem_type} = parameter.params as GolemSummonComponentParams;
            const dimension = block.dimension;
            const summon_loc = {
                x:block.location.x,
                y:block.location.y+1,
                z:block.location.z,
            }
            //召唤傀儡
            const golem = dimension.spawnEntity(golem_type,summon_loc);
            //设置属性
            if(golem_target_index<15){
                golem.setProperty("more_golem:golem_index",golem_target_index);
                golem_target_index++;
            }
        }
    })
})


world.afterEvents.itemUse.subscribe((event) => {
    const { itemStack, source } = event;
     if (itemStack?.typeId === "minecraft:stick") {
        // 如果傀儡不存在或无效，则生成
        if (!golem || !golem.isValid) {
            golem = source.dimension.spawnEntity('more_golem:frame_golem', source.location);
            source.sendMessage("傀儡已召唤");
        }
        // 存在则切换状态 0-2
        else {
            // 确保target_index在0-2范围内循环
            golem_index = golem_index % 3;
            
            golem.setProperty(`more_golem:golem_index`,golem_index);
            world.sendMessage(`index|state: ${golem_index}|${golem.getProperty(`more_golem:golem_index`)}`);
            
            // 增加索引，准备下一次切换
            golem_index++;
        }
    }
    else if (itemStack?.typeId === 'minecraft:blaze_rod') {
   // 如果傀儡不存在或无效，则生成
        if (! target|| !target.isValid) {
            target = source.dimension.spawnEntity('more_golem:golem_target', source.location);
            source.sendMessage("目标已召唤");
            const intervalId = system.runInterval(() => {
               if (!target?.isValid) {
                     system.clearRun(intervalId);
                     return;
               }
               target.dimension.spawnParticle(
                     "minecraft:blue_flame_particle", 
                     target.location
               );
               if(golem?.isValid && target.isValid){
                  if(getDistance(golem.location,target.location) < 1.5) {
                     target.remove() 
                     world.sendMessage("已经到达")
                  } 
               }
            }, 10);
           
        }
        // 存在则切换状态 0-2
        else {
            // 确保target_index在0-2范围内循环
            target_index = target_index % 3;
            
            target.setProperty(`more_golem:target_index`,target_index);
            world.sendMessage(`index|state: ${target_index}|${target.getProperty(`more_golem:target_index`)}`);
            
            // 增加索引，准备下一次切换
            target_index++;
        }
      }
      //
      else if(itemStack?.typeId === 'minecraft:diamond'){
        world.sendMessage("获取周围农田");
        const nbv = getNeighboringBlockVolume(source.location,{
            length:16,
            width:16,
            height:16
        });
        const farm_land_pos_list = getBlockListFromBlockVolume(source.dimension,nbv,{
            includeTypes:["minecraft:farmland"]
        });
        farm_land_pos_list.forEach((pos,i)=>{
            source.dimension.spawnParticle("minecraft:blue_flame_particle", pos);
        })
      }
});


world.afterEvents.itemStartUseOn.subscribe((event)=>{
    world.sendMessage("blockTypeId:"+event.block.typeId)
})