import {ItemStack, world} from "@minecraft/server"

//思路 物品使用前把数据记录到堆栈里 当抛掷物生成时记录抛掷物的id 抛掷物落地生成相应生物
const entityReleseStack = [];
const projectileIdStack = [];


world.afterEvents.itemUse.subscribe((afterItemUseEvent) => {
    //world.sendMessage("afterItemUseEvent:"+afterItemUseEvent.itemStack.typeId);
    if(afterItemUseEvent.itemStack.typeId != "poke:caught_masterball") return 
    const entityId = afterItemUseEvent.itemStack.getLore()[2].substring(3);
    entityReleseStack.push(entityId);
    //world.sendMessage("已添加实体ID入栈:"+entityId);
});

world.afterEvents.entitySpawn.subscribe((afterEntitySpawnEvent)=>{
    //world.sendMessage(`entityType:${afterEntitySpawnEvent.entity.typeId} cause:${afterEntitySpawnEvent.cause}`)
    const entity = afterEntitySpawnEvent.entity;
    if(entity.typeId != "poke:projectile_masterball") return
    if(entityReleseStack.length <= projectileIdStack.length) return
    projectileIdStack.push(entity.id);
    //world.sendMessage("已添加抛掷物ID:"+ entity.id);
});



world.afterEvents.projectileHitEntity.subscribe((event)=>{
    const source = event.source;
    const projectile = event.projectile;
    const hitedEntity = event.getEntityHit().entity;

    if(!source||!projectile) return
    //world.sendMessage(`source:${source.typeId} projectile:${projectile.typeId} hitedEntity:${hitedEntity.typeId}`);
    if(source.typeId != "minecraft:player"||projectile.typeId!= "poke:projectile_masterball") return

    //world.sendMessage("成功");
    //world.sendMessage("eee:"+projectile.isValid());
    //world.sendMessage("eeeID:"+projectile.id);

    const dimension = source.dimension;
    const dropLocation = hitedEntity.location;

    //检查抛掷物ID是否为栈中元素 是就释放 否就捕捉
    const state = projectileIdStack.includes(projectile.id);

    if(!state){
        //world.sendMessage("捕捉");
        const entityRemoveLocation = {
            x:dropLocation.x,
            y:dropLocation.y+100,
            z:dropLocation.z
        }
        hitedEntity.teleport(entityRemoveLocation,{});

        const entityData = {
            Id:hitedEntity.id,
            typeID:hitedEntity.typeId,
            name:hitedEntity.nameTag,
            heath:hitedEntity.getComponent("health").currentValue
        };
        const structureName = replaceNumbersWithLetters(`${-hitedEntity.id}`);
        //world.sendMessage("structureName:"+structureName);
        dimension.runCommand(`structure save masterball_space_${structureName} ${entityRemoveLocation.x} ${entityRemoveLocation.y} ${entityRemoveLocation.z} ${entityRemoveLocation.x+1} ${entityRemoveLocation.y+1} ${entityRemoveLocation.z+1} true memory false`);
        hitedEntity.remove();
        const masterball = new ItemStack("poke:caught_masterball",1);

            masterball.nameTag = "大师球("+entityData.typeID+")";
            masterball.setLore([
                `name:${entityData.name}`,
                `typeID:${entityData.typeID}`,
                `Id:${entityData.Id}`,
                `Heath:${entityData.heath}`,
                `stackable:${masterball.isStackable}`
            ]);
            //masterball.setDynamicProperty("poke:entity_id",entityData.Id);
        dimension.spawnItem(masterball,dropLocation);
    }
    else{
        //world.sendMessage("释放");
        const index = projectileIdStack.indexOf(projectile.id);
        const entityId = entityReleseStack[index];
        //删除stack里的
        entityReleseStack.slice(index,1);
        projectileIdStack.slice(index,1);
        const structureName = replaceNumbersWithLetters(`${-entityId}`);
        //world.sendMessage("structureName1:"+structureName);
        dimension.runCommand(`structure load masterball_space_${structureName} ${dropLocation.x} ${dropLocation.y} ${dropLocation.z} 0_degrees none true false false`);
        dimension.runCommand(`structure delete masterball_space_${structureName}`);

        const masterball = new ItemStack("poke:uncaught_masterball",1);
        dimension.spawnItem(masterball,dropLocation);
    }
});

world.afterEvents.projectileHitBlock.subscribe((afterprojectileHitBlockEvent)=>{
    const source = afterprojectileHitBlockEvent.source;
    const dimension = afterprojectileHitBlockEvent.dimension;
    const projectile = afterprojectileHitBlockEvent.projectile;
    const  dropLocation = afterprojectileHitBlockEvent.location;

    if(!source||!projectile) return
    if(source.typeId != "minecraft:player"||projectile.typeId!= "poke:projectile_masterball") return

    //检查抛掷物ID是否为栈中元素 是就释放 否就捕捉
    const state = projectileIdStack.includes(projectile.id);

    if(!state) return

    const index = projectileIdStack.indexOf(projectile.id);
    const entityId = entityReleseStack[index];
    //删除stack里的
    entityReleseStack.slice(index,1);
    projectileIdStack.slice(index,1);
    const structureName = replaceNumbersWithLetters(`${-entityId}`);
    //world.sendMessage("structureName1:"+structureName);
    dimension.runCommand(`structure load masterball_space_${structureName} ${dropLocation.x} ${dropLocation.y} ${dropLocation.z} 0_degrees none true false false`);
    dimension.runCommand(`structure delete masterball_space_${structureName}`);

    const masterball = new ItemStack("poke:uncaught_masterball",1);
    dimension.spawnItem(masterball,dropLocation);

})

function replaceNumbersWithLetters(str) {
    // 创建一个映射表，将数字对应的小写字母存储起来
    const numberToLetter = {
      '0': 'a',
      '1': 'b',
      '2': 'c',
      '3': 'd',
      '4': 'e',
      '5': 'f',
      '6': 'g',
      '7': 'h',
      '8': 'i',
      '9': 'j'
    };
  
    // 使用正则表达式匹配字符串中的数字，并替换为小写字母
    return str.replace(/[0-9]/g, match => numberToLetter[match]);
  }