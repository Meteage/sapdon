import { ItemStack, world } from "@minecraft/server";

// 存储抛掷物ID和实体ID的映射
const entityReleseMap = new Map(); // 抛掷物ID -> 实体ID
const projectileIdStack = []; // 存储抛掷物ID的栈

// 监听物品使用事件
world.afterEvents.itemUse.subscribe((afterItemUseEvent) => {
    // 检查是否是大师球
    if (afterItemUseEvent.itemStack.typeId !== "sapdon:caught_masterball") return;

    // 获取实体ID（从物品的Lore中提取）
    const entityId = afterItemUseEvent.itemStack.getLore()[2].substring(3);
    //world.sendMessage("已添加实体ID:" + entityId);

    // 获取最近生成的抛掷物ID
    const projectileId = projectileIdStack[projectileIdStack.length - 1];
    if (!projectileId) {
        //world.sendMessage("未找到抛掷物ID");
        return;
    }

    // 将抛掷物ID和实体ID关联起来
    entityReleseMap.set(projectileId, entityId);
    //world.sendMessage(`已关联抛掷物ID: ${projectileId} -> 实体ID: ${entityId}`);
});

// 监听实体生成事件
world.afterEvents.entitySpawn.subscribe((afterEntitySpawnEvent) => {
    const entity = afterEntitySpawnEvent.entity;

    // 检查是否是大师球抛掷物
    if (entity.typeId !== "sapdon:projectile_masterball") return;

    // 记录抛掷物ID
    projectileIdStack.push(entity.id);
    //world.sendMessage("已添加抛掷物ID:" + entity.id);
});

// 监听抛掷物击中实体事件
world.afterEvents.projectileHitEntity.subscribe((event) => {
    const source = event.source;
    const projectile = event.projectile;
    const hitedEntity = event.getEntityHit().entity;

    // 检查抛掷物和来源是否有效
    if (!source || !projectile) return;
    if (source.typeId !== "minecraft:player" || projectile.typeId !== "sapdon:projectile_masterball") return;

    const dimension = source.dimension;
    const dropLocation = hitedEntity.location;

    // 检查抛掷物ID是否有对应的实体ID
    const entityId = entityReleseMap.get(projectile.id);

    if (!entityId) {
        // 捕捉逻辑
        //world.sendMessage("捕捉");
        const entityRemoveLocation = {
            x: dropLocation.x,
            y: dropLocation.y + 100,
            z: dropLocation.z
        };
        hitedEntity.teleport(entityRemoveLocation, {});

        // 保存实体信息
        const entityData = {
            Id: hitedEntity.id,
            typeID: hitedEntity.typeId,
            name: hitedEntity.nameTag,
            heath: hitedEntity.getComponent("health").currentValue
        };
        const structureName = replaceNumbersWithLetters(`${-hitedEntity.id}`);

        // 保存实体结构
        try {
            dimension.runCommand(`structure save masterball_space_${structureName} ${entityRemoveLocation.x} ${entityRemoveLocation.y} ${entityRemoveLocation.z} ${entityRemoveLocation.x + 1} ${entityRemoveLocation.y + 1} ${entityRemoveLocation.z + 1} true memory false`);
        } catch (error) {
            //world.sendMessage(`保存结构失败: ${error}`);
            return;
        }
        hitedEntity.remove();

        // 生成捕捉后的大师球
        const masterball = new ItemStack("sapdon:caught_masterball", 1);
        masterball.nameTag = "大师球(" + entityData.typeID + ")";
        masterball.setLore([
            `name:${entityData.name}`,
            `typeID:${entityData.typeID}`,
            `Id:${entityData.Id}`,
            `Heath:${entityData.heath}`,
            `stackable:${masterball.isStackable}`
        ]);
        dimension.spawnItem(masterball, dropLocation);
    } else {
        // 释放逻辑
        //world.sendMessage("释放");
        const structureName = replaceNumbersWithLetters(`${-entityId}`);

        // 加载实体结构
        try {
            dimension.runCommand(`structure load masterball_space_${structureName} ${dropLocation.x} ${dropLocation.y} ${dropLocation.z} 0_degrees none true false false`);
            dimension.runCommand(`structure delete masterball_space_${structureName}`);
        } catch (error) {
            //world.sendMessage(`加载或删除结构失败: ${error}`);
            return;
        }

        // 生成空的大师球
        const masterball = new ItemStack("sapdon:uncaught_masterball", 1);
        dimension.spawnItem(masterball, dropLocation);

        // 删除映射关系
        entityReleseMap.delete(projectile.id);
    }
});

// 监听抛掷物击中方块事件
world.afterEvents.projectileHitBlock.subscribe((afterprojectileHitBlockEvent) => {
    const source = afterprojectileHitBlockEvent.source;
    const dimension = afterprojectileHitBlockEvent.dimension;
    const projectile = afterprojectileHitBlockEvent.projectile;
    const dropLocation = afterprojectileHitBlockEvent.location;

    // 检查抛掷物和来源是否有效
    if (!source || !projectile) return;
    if (source.typeId !== "minecraft:player" || projectile.typeId !== "sapdon:projectile_masterball") return;

    // 检查抛掷物ID是否有对应的实体ID
    const entityId = entityReleseMap.get(projectile.id);
    if (entityId){
        // 释放逻辑
        const structureName = replaceNumbersWithLetters(`${-entityId}`);

        // 加载实体结构
        try {
            dimension.runCommand(`structure load masterball_space_${structureName} ${dropLocation.x} ${dropLocation.y} ${dropLocation.z} 0_degrees none true false false`);
            dimension.runCommand(`structure delete masterball_space_${structureName}`);
        } catch (error) {
            //world.sendMessage(`加载或删除结构失败: ${error}`);
            return;
        }
    }
    // 生成空的大师球
    const masterball = new ItemStack("sapdon:uncaught_masterball", 1);
    dimension.spawnItem(masterball, dropLocation);

    // 删除映射关系
    entityReleseMap.delete(projectile.id);
});

// 工具函数：将数字替换为字母
function replaceNumbersWithLetters(str) {
    const numberToLetter = {
        '0': 'a', '1': 'b', '2': 'c', '3': 'd', '4': 'e',
        '5': 'f', '6': 'g', '7': 'h', '8': 'i', '9': 'j'
    };
    return str.replace(/[0-9]/g, match => numberToLetter[match]);
}