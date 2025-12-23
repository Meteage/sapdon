import { BlockComponentTickEvent, system, world } from "@minecraft/server";

/** @type {import("@minecraft/server").BlockCustomComponent} */
export const FallingBlockComponet = {
    onTick(event:BlockComponentTickEvent){
        const {block,dimension} = event;
        if(!block.below() || !block.below()?.isAir) return;
        world.sendMessage("是空气");
        const spawn_loc = {
            x:block.location.x + 0.5,
            y:block.location.y,
            z:block.location.z + 0.5
        };
        block.setType("minecraft:air");
        system.runTimeout(()=>{
            const fallingblock_entity = dimension.spawnEntity("sapdon:fallingblock_entity",spawn_loc);
            fallingblock_entity.applyImpulse({x:0,y:-0.5,z:0})
            const task_id = system.runInterval(()=>{
                if(!fallingblock_entity?.isValid){
                    world.sendMessage("实体无效移除")
                    system.clearRun(task_id);
                    return 
                }
                else{
                    const vec = fallingblock_entity.getVelocity();
                    const loc = fallingblock_entity.location;
                    if(vec.y === 0){
                        world.sendMessage("在地面上,速度为零");
                        dimension.setBlockType(loc,"sapdon:fallingblock")
                        fallingblock_entity.remove()
                        system.clearRun(task_id);
                    }
                }
            },10);
        },1)
    }
}