import { GameMode, system, world } from "@minecraft/server";
import { sapdon_system } from "./sapdon_lib/sapdon_system.js";
import { FarmerGolem } from "./gelom.js";

sapdon_system


//常量区
const GOLEM_PROPERTY = "more_golem:golem_index";
const TARGET_PROPERTY = "more_golem:target_index";

const GOLEM_FARMER_TYPE = "more_golem:frame_golem";
const GOLEM_TARGET_TYPE = "more_golem:golem_target";

//傀儡加载与重新分配id
world.afterEvents.entityLoad.subscribe(({entity})=>{
    const typeId = entity.typeId;
    if(typeId != GOLEM_FARMER_TYPE) return;
    const id = entity.getProperty(GOLEM_PROPERTY);
    world.sendMessage(`entityId: ${entity.id}  |  ${id}`);

})

let numberId = 0;

//只实现一个傀儡的导航
world.afterEvents.itemUse.subscribe((event) => {
    const { itemStack, source } = event;
    const itemTypeId = itemStack.typeId;
    const dimension = source.dimension;

    switch (itemTypeId) {
        case 'golem_craft:farm_golem_summon':
            //if(numberId < 16){
                //傀儡的生成
                world.sendMessage("已生成傀儡");
                const golem = new FarmerGolem(dimension,numberId,source.location);
                const runid = system.runInterval(()=>{
                    if(golem.isVaild()) golem.updateTask();
                    else system.clearRun(runid);
                },2*20);
                numberId++;
                if(source.getGameMode() == GameMode.Survival){
                    itemStack.amount--;
                }
            //}
            
        break;
    }
});

//循环任务
system.runInterval(()=>{
    world.sendMessage("tick")
},20*1)

world.afterEvents.playerSpawn.subscribe((event)=>{
    system.runTimeout(()=>{
        const player = event.player;
        player.sendMessage("欢迎来到稻田傀儡模组示例！作者：Meteage");
        if(player?.hasTag("gaven_guidebook")) return;
        player.sendMessage("本模组仅供学习交流使用，请勿用于商业用途！");
        player.sendMessage("作者B站：俊俊君啊");
        player?.addTag("gaven_guidebook");
        player?.runCommand(`give @s sapdon:neo_guidebook 1`);
    },5*20);
});