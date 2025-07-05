import { Dimension, Entity, system, Vector3, world, BlockTypes } from '@minecraft/server';

// 存储傀儡实体和农田目标
let golem: Entity | undefined = undefined;
const farmlandTargets: Entity[] = [];

// 农田类型和作物类型
const FARMLAND_TYPES = ['minecraft:farmland'];
const CROP_BLOCK = 'minecraft:wheat'; // 小麦作物方块

// 在农田上生成目标生物
function spawnFarmlandTargets(dimension: Dimension, center: Vector3, radius: number = 5) {
    const minX = Math.floor(center.x - radius);
    const maxX = Math.floor(center.x + radius);
    const minZ = Math.floor(center.z - radius);
    const maxZ = Math.floor(center.z + radius);
    const yLevel = Math.floor(center.y) - 1; // 农田通常在傀儡下方一层

    // 先清除现有目标
    clearAllTargets();

    for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
            const blockLocation = { x, y: yLevel, z };
            const block = dimension.getBlock(blockLocation);
            
            // 检查是否是湿润的农田且上方是空气（可以种植作物）
            if (block && FARMLAND_TYPES.includes(block.typeId) && 
                dimension.getBlock({x, y: yLevel+1, z})?.typeId === 'minecraft:air') {
                
                const targetLocation = {
                    x: blockLocation.x + 0.5,
                    y: blockLocation.y + 1,
                    z: blockLocation.z + 0.5
                };
                
                const target = dimension.spawnEntity('more_golem:golem_target', targetLocation);
                farmlandTargets.push(target);
                
                // 为目标添加粒子效果
                const intervalId = system.runInterval(() => {
                    if (!target.isValid) {
                        system.clearRun(intervalId);
                        return;
                    }
                    dimension.spawnParticle('minecraft:heart_particle', target.location);
                }, 10);
            }
        }
    }
}

// 清除所有目标生物
function clearAllTargets() {
    farmlandTargets.forEach(target => {
        if (target.isValid) {
            target.remove();
        }
    });
    farmlandTargets.length = 0;
}

// 检查傀儡是否靠近目标
function checkGolemNearTargets() {
    if (!golem || !golem.isValid) return;

    const golemLoc = golem.location;
    const dimension = golem.dimension;

    for (let i = farmlandTargets.length - 1; i >= 0; i--) {
        const target = farmlandTargets[i];
        
        if (!target.isValid) {
            farmlandTargets.splice(i, 1);
            continue;
        }

        const distance = Math.sqrt(
            Math.pow(golemLoc.x - target.location.x, 2) +
            Math.pow(golemLoc.z - target.location.z, 2)
        );

        // 如果距离小于1.5格
        if (distance < 1.5) {
            // 获取目标下方的农田位置
            const farmlandPos = {
                x: Math.floor(target.location.x),
                y: Math.floor(target.location.y - 1),
                z: Math.floor(target.location.z)
            };
            
            // 在农田上方种植作物
            const cropPos = {
                x: farmlandPos.x,
                y: farmlandPos.y + 1,
                z: farmlandPos.z
            };
            
            dimension.getBlock(cropPos)?.setType(CROP_BLOCK);
            
            // 移除目标
            target.remove();
            farmlandTargets.splice(i, 1);
            
            // 显示效果
            dimension.spawnParticle('minecraft:happy_villager_particle', cropPos);
        }
    }
}

// 傀儡持续显示粒子效果
function startGolemParticles(golemEntity: Entity) {
    const intervalId = system.runInterval(() => {
        if (!golemEntity.isValid) {
            system.clearRun(intervalId);
            return;
        }
        golemEntity.dimension.spawnParticle(
            'minecraft:flame_particle', 
            golemEntity.location
        );
    }, 10);
}

let target_index = 0;

world.afterEvents.itemUse.subscribe((event) => {
    const { itemStack, source } = event;
    /*
    // 使用烈焰棒点击
    if (itemStack.typeId === 'minecraft:blaze_rod') {
        if (golem && golem.isValid) {
            // 在周围农田上生成目标生物
            spawnFarmlandTargets(source.dimension, golem.location);
            source.sendMessage('已在周围农田标记可种植区域');
        } else {
            // 如果没有傀儡，先召唤一个
            golem = source.dimension.spawnEntity(
                'more_golem:frame_golem', 
                source.location
            );
            startGolemParticles(golem);
            source.sendMessage('傀儡已召唤并开始显示粒子效果');
        }
    }
   */
     if (itemStack?.typeId === "minecraft:stick") {
        // 如果傀儡不存在或无效，则生成
        if (!golem || !golem.isValid) {
            golem = source.dimension.spawnEntity('more_golem:frame_golem', source.location);
            source.sendMessage("傀儡已召唤");
        }
        // 存在则切换状态 0-2
        else {
            // 确保target_index在0-2范围内循环
            target_index = target_index % 3;
            
            golem.setProperty("more_golem:target_index", target_index);
            world.sendMessage(`index|state: ${target_index}|${golem.getProperty("more_golem:target_index")}`);
            
            // 增加索引，准备下一次切换
            target_index++;
        }
    }
});

// 持续检查傀儡与目标的距离
system.runInterval(() => {
    checkGolemNearTargets();
    
    // 清理无效傀儡
    if (golem && !golem.isValid) {
        golem = undefined;
        clearAllTargets();
    }
}, 5);