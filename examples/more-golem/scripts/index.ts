import { Entity, MolangVariableMap, system, world } from '@minecraft/server'



let target_dummy:Entity|undefined = undefined;

//使用木棍生成一个golem_target,并让它随着玩家视角移动
world.afterEvents.itemUse.subscribe((event) => {
    world.sendMessage(`Item used: ${event.itemStack.typeId}`);
   if(event.itemStack.typeId === 'test:stick') {
      if(target_dummy === undefined) {
         const player = event.source;
         const overworld = player.dimension
         target_dummy = overworld.spawnEntity("more_golem:golem_target", event.source.location);
         target_dummy.addTag("golem_target");
         system.runInterval(()=>{
            //world.sendMessage(`Target dummy position: ${target_dummy?.location.x}, ${target_dummy?.location.y}, ${target_dummy?.location.z}`);
            const molang = new MolangVariableMap();

            molang.setColorRGB("variable.color", { red: Math.random(), green: Math.random(), blue: Math.random() });
            const playerPos = player.location;
            const d = player.getViewDirection();
            const target_pos = {
               x: playerPos.x + d.x * 5,
               y: playerPos.y + d.y * 5,
               z: playerPos.z + d.z * 5,
            };
            overworld.spawnParticle("minecraft:colored_flame_particle", target_pos,molang);
            target_dummy?.teleport(target_pos,{})
         },2);
      }
   }
});
