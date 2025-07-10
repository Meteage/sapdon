import { BlockComponent, BlockComponentTypes, BlockFilter, BlockVolume, Container, Dimension, Entity, EntityComponentTypes, ItemStack, system, Vector3, world } from "@minecraft/server";
import { Utils } from "./utils.js";

//常量区
const GOLEM_PROPERTY = "more_golem:golem_index";
const TARGET_PROPERTY = "more_golem:target_index";

const GOLEM_FARMER_TYPE = "more_golem:frame_golem";
const GOLEM_TARGET_TYPE = "more_golem:golem_target";




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
    const gird_location = getGirdLocation(location);
    if(target_map.has(position_key)) return
    const target = dimension.spawnEntity(GOLEM_TARGET_TYPE,gird_location);
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

//坐标修正
function getGirdLocation(location:Vector3){
    //向下取整 0.5修正
    const x = Math.ceil(location.x) + 0.5;
    const y = Math.ceil(location.y) + 1;
    const z = Math.ceil(location.z) + 0.5;
    return {x:x,y:y,z:z} as Vector3;
}

//Vector3 转 Position 
function locationToPosition(location:Vector3){
    const gird_loc = getGirdLocation(location);
    return `${gird_loc.x},${gird_loc.y},${gird_loc.z}` as position;
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

let golem: Entity | undefined = undefined;
let inventory: Container | undefined = undefined;
let currentTask = 0;
let isMovingToTarget = false;
let golem_id = 15;


enum FarmTask {
    /** 空闲状态，没有任务需要执行 */
    Idle = 0,
    
    /** 需要寻找箱子获取种子 */
    GetSeedsFromChest,
    
    /** 需要寻找合适的农田种植作物 */
    PlantCrops,
    
    /** 需要寻找成熟的作物进行收获 */
    HarvestCrops,
    
    /** 需要寻找箱子存放收获的物品 */
    StoreItemsToChest
}

//作物列表
const CROP_TYPE_LIST = ["minecraft:wheat"];
const CHEST_TYPE_LIST = ["minecraft:chest"];
let overworld:Dimension|undefined = undefined;

function clearTarget(target:Entity){
    const pos_key = locationToPosition(target.location);
    target.remove();
    target_map.delete(pos_key);
    world.sendMessage(`[调试] 清除目标后剩余: ${target_map.size}`);
}

function clearAllTarget(){
    for(const [pos_key,target] of target_map){
        if(target.isValid) {target.remove()}
    }
    target_map.clear();
}

function findNearestTarget(): Entity | undefined {
    // 1. 有效性检查
    if (!golem?.isValid) {
        world.sendMessage("[错误] 傀儡实体无效");
        return undefined;
    }

    let nearestTarget: Entity | undefined;
    let minDistance = Infinity;

    // 2. 遍历目标地图
    for (const [entityId, target] of target_map) {
        // 2.1 检查目标有效性
        if (!target.isValid) {
            target_map.delete(entityId);
            world.sendMessage(`[清理] 移除无效目标 ${entityId}`);
            continue;
        }

        // 2.2 计算距离
        const distance = Utils.getDistance(golem.location, target.location);
        world.sendMessage(`[调试] 目标 ${entityId} 距离: ${distance.toFixed(2)}`);

        // 2.3 检查是否在交互范围内
        if (distance > 2) {
            continue;
        }

        // 2.4 寻找最近目标
        if (distance < minDistance) {
            minDistance = distance;
            nearestTarget = target;
        }
    }

    // 3. 结果处理
    if (nearestTarget) {
        world.sendMessage(`[系统] 找到最近目标 (距离: ${minDistance.toFixed(2)})`);
    } else if (target_map.size > 0) {
        world.sendMessage("[提示] 有目标但未进入交互范围");
    }

    return nearestTarget;
}

function scanNearbyBlocks(dimension:Dimension,center:Vector3,size:Vector3,blockFilter:BlockFilter):Vector3[]{
    const fromPos = {x:center.x - size.x,y:center.y-size.y,z:center.z-size.z};
    const toPos = {x:center.x + size.x,y:center.y+size.y,z:center.z+size.z};
    const scan_block_volume = new BlockVolume(fromPos,toPos);
    const list_block_volume =  dimension.getBlocks(scan_block_volume,blockFilter,true);
    const block_location_list = [...list_block_volume.getBlockLocationIterator()];
    return block_location_list;
}

// 检测附近8格内是否有空农田
function hasEmptyFarmlandNearby(): boolean {
    if(!overworld) return false;
    const farmlandNearbyList = scanNearbyBlocks(overworld,golem!.location,{x:8,y:2,z:8},{
        includeTypes:["minecraft:farmland"]
    });
    const emptyFarmlandList = farmlandNearbyList.filter((pos)=>{
        if(!overworld) return false;
        return overworld.getBlock({x:pos.x,y:pos.y+1,z:pos.z})?.isAir
    })
    //world.sendMessage("[系统] 附近有空田地:"+JSON.stringify(farmlandNearbyList,null,2));
    return emptyFarmlandList.length > 0;
}

// 检测附近8格内是否有成熟作物
function hasRipeCropsNearby(): boolean {
    if(!overworld) return false;

    const cropsNearbyList = scanNearbyBlocks(overworld,golem!.location,{x:8,y:2,z:8},{
        includeTypes:CROP_TYPE_LIST
    });
    return cropsNearbyList.length > 0;
}

// 检测附近8格内是否有箱子
function hasChestNearby(): boolean {
    if(!overworld) return false;

    const chestNearbyList = scanNearbyBlocks(overworld,golem!.location,{x:8,y:2,z:8},{
        includeTypes:CHEST_TYPE_LIST
    });
    return chestNearbyList.length > 0;
}

//检查傀儡手里是否有物品
function hasSeedsInHand():boolean {
    if(!inventory?.isValid) return false;
    const mainHanditem = inventory.getItem(0);
    if(!mainHanditem) return false;
    return mainHanditem.typeId === "minecraft:wheat_seeds";
}

function slotIsFull(slotIndex: number = 0, threshold: number = 64): boolean {
    if(!inventory?.isValid) return false;
    const slot = inventory.getSlot(slotIndex);
    if(!slot.hasItem()) return false;
    return slot.getItem()!.amount >= threshold;
}

// 检查背包是否已满
function isInventoryFull(): boolean {
    if(!inventory?.isValid) return false
    for (let i = 0; i < inventory.size; i++) {
        const item = inventory.getItem(i);
        if (!item) return false;
        if (item.amount < item.maxAmount) return false;
    }
    return true;
}

function isItemFull(itemType: string, threshold: number): boolean {
    if(!inventory?.isValid) return false;
    const itemSlot = Utils.findSlotByItemType(inventory,itemType);
    if(itemSlot === undefined) return false;
    return slotIsFull(itemSlot,threshold);
}

// 从最近的箱子拿取种子
function takeSeedsFromChest(): boolean {
    // 1. 前置检查
    if (!overworld || !inventory) {
        world.sendMessage("[错误] 世界或物品栏未加载");
        return false;
    }

    // 2. 背包检查
    if (isItemFull("minecraft:wheat_seeds", 64)) {
        world.sendMessage("[系统] 种子已满");
        return true;
    }

    // 3. 目标扫描阶段
    if (!isMovingToTarget) {
        const chestList = scanNearbyBlocks(
            overworld,
            golem!.location,
            {x:8, y:2, z:8},
            {
                includeTypes: ["minecraft:chest"],
                excludeTags: ["locked"] // 忽略上锁的箱子
            }
        );

        if (chestList.length === 0) {
            world.sendMessage("[系统] 附近没有可用箱子");
            currentTask = FarmTask.Idle;
            return false;
        }

        placeWaypoints(overworld, golem_id, chestList);
        isMovingToTarget = true;
        world.sendMessage(`[系统] 已标记 ${chestList.length} 个箱子`);
        return false;
    }

    // 4. 交互执行阶段
    const target = findNearestTarget();
    if (!target?.isValid) {
        world.sendMessage("[警告] 目标箱子无效");
        return false;
    }

    // 5. 拿取操作
    const chestPos = {
        x: target.location.x,
        y: target.location.y -1,
        z: target.location.z
    };

    const container = Utils.getBlockContainer(overworld, chestPos);
    if (!container?.isValid) {
        world.sendMessage("[警告] 箱子容器无效");
        clearTarget(target);
        return false;
    }

    // 6. 种子转移
    const seedSlot = Utils.findSlotByItemType(container, "minecraft:wheat_seeds");
    if (seedSlot === undefined) {
        world.sendMessage("[提示] 箱子没有种子");
        clearTarget(target);
        return false;
    }

    const transferResult = Utils.transferItemBetweenContainers(
        seedSlot,
        container,
        inventory    );

    if (transferResult) {
        const newAmount = inventory.getSlot(0)?.getItem()?.amount || 0;
        world.sendMessage(`[系统] 获取种子成功 (当前: ${newAmount}/64)`);

        if (isItemFull("minecraft:wheat_seeds", 64)) {
            world.sendMessage("[系统] 种子已拿满");
            clearAllTarget();
            isMovingToTarget = false;
            return true;
        }
    }

    return false;
}

// 种植种子到最近的农田
function plantSeeds(): boolean {
    // 1. 前置检查
    if (!overworld || !inventory) {
        world.sendMessage("[错误] 世界或物品栏未加载");
        return false;
    }

    // 2. 种子检查
    if (!hasSeedsInHand()) {
        world.sendMessage("[系统] 手上没有种子");
        currentTask = FarmTask.GetSeedsFromChest;
        return false;
    }

    // 3. 目标扫描阶段
    if (!isMovingToTarget) {
        const farmlandList = scanNearbyBlocks(
            overworld,
            golem!.location,
            {x:8, y:2, z:8},
            {
                includeTypes: ["minecraft:farmland"] // 湿润农田
            }
        );

        // 过滤上方为空的农田
        const emptyFarmlandList = farmlandList.filter(pos => {
            if(overworld)
            return overworld.getBlock({x:pos.x, y:pos.y+1, z:pos.z})?.isAir;
        });

        if (emptyFarmlandList.length === 0) {
            world.sendMessage("[系统] 附近没有可种植的农田");
            currentTask = FarmTask.Idle;
            return true;
        }

        placeWaypoints(overworld, golem_id, emptyFarmlandList);
        isMovingToTarget = true;
        world.sendMessage(`[系统] 已标记 ${emptyFarmlandList.length} 块农田`);
        return false;
    }

    // 4. 种植执行阶段
    const target = findNearestTarget();
    if (!target?.isValid) {
        world.sendMessage("[警告] 未到达目标农田");
        return false;
    }

    // 5. 种植操作
    const plantPos = target.location;

    // 检查是否仍为空
    if (!overworld.getBlock(plantPos)?.isAir) {
        world.sendMessage("[警告] 目标位置已被占用");
        clearTarget(target);
        return false;
    }

    // 消耗种子
    const seedSlot = Utils.findSlotByItemType(inventory, "minecraft:wheat_seeds");
    if (seedSlot === undefined) {
        world.sendMessage("[错误] 种子槽位丢失");
        return false;
    }

    const seedStack = inventory.getItem(seedSlot);
    if (!seedStack || seedStack.amount <= 0) {
        world.sendMessage("[错误] 种子数量不足");
        return false;
    }

    // 执行种植
    if (seedStack.amount == 1) {
        inventory.setItem(seedSlot, undefined);
    } else {
        seedStack.amount--;
        inventory.setItem(seedSlot, seedStack);
    }

    overworld.getBlock(plantPos)?.setType("minecraft:wheat");
    world.sendMessage("[系统] 种植成功");

    // 6. 状态更新
    const isLastFarmland = target_map.size === 1;
    clearTarget(target);
    world.sendMessage(`[系统] 已种植 ${isLastFarmland ? "最后" : ""}块农田`);

    if (isLastFarmland) {
        world.sendMessage("[系统] 所有农田已种植完成");
        isMovingToTarget = false;
        currentTask = FarmTask.Idle;
        return true;
    }

    return false;
}


function harvestCrops(): boolean {
    // 1. 前置检查
    if (!overworld) {
        world.sendMessage("[错误] 世界未加载");
        return false;
    }

    // 2. 背包检查
    if (isItemFull("minecraft:wheat",64)) {
        currentTask = FarmTask.StoreItemsToChest;
        world.sendMessage("[系统] 背包已满，需要存储物品");
        return false;
    }

    // 3. 目标扫描阶段
    if (!isMovingToTarget) {
        const cropList = scanNearbyBlocks(
            overworld,
            golem!.location,
            {x:8, y:2, z:8},
            {
                includeTypes: ["minecraft:wheat"] // 精确匹配成熟小麦
            }
        );

        if (cropList.length === 0) {
            world.sendMessage("[系统] 附近没有可收获的成熟作物");
            currentTask = FarmTask.Idle;
            return true;
        }

        placeWaypoints(overworld, golem_id, cropList);
        isMovingToTarget = true;
        world.sendMessage(`[系统] 已标记 ${cropList.length} 个作物`);
        return false;
    }

    // 4. 收割执行阶段
    const target = findNearestTarget();
    if (!target?.isValid) {
        world.sendMessage("[警告] 未到达最近目标");
        return false;
    }

    // 5. 收割操作
    const cropLocation = {
        x: target.location.x,
        y: target.location.y - 1,
        z: target.location.z
    };

    const block = overworld.getBlock(cropLocation);
    
    // 执行收割
    block?.setType("minecraft:air");
    overworld.spawnItem(new ItemStack("minecraft:wheat_seeds", 1), cropLocation);
    overworld.spawnItem(new ItemStack("minecraft:wheat", 1), cropLocation);

    // 6. 状态更新
    const isLastCrop = target_map.size === 1;
    clearTarget(target);
    world.sendMessage(`[系统] 已收获 ${isLastCrop ? "最后" : ""}作物`);

    if (isLastCrop) {
        world.sendMessage("[系统] 所有作物已收获完成");
        isMovingToTarget = false;
        currentTask = FarmTask.Idle;
        return true;
    }

    return false;
}

// 将多余物品存入箱子
function clearInventory(): boolean {
    // 1. 前置检查
    if (!overworld || !inventory) {
        world.sendMessage("[错误] 世界或物品栏未加载");
        return false;
    }

    // 2. 背包检查
    if (!isInventoryFull()) {
        world.sendMessage("[系统] 背包未满，无需清理");
        currentTask = FarmTask.Idle;
        return true;
    }

    // 3. 目标扫描阶段
    if (!isMovingToTarget) {
        const chestList = scanNearbyBlocks(
            overworld,
            golem!.location,
            {x:8, y:2, z:8},
            {
                includeTypes: ["minecraft:chest"],
                excludeTags: ["locked"] // 忽略上锁的箱子
            }
        );

        if (chestList.length === 0) {
            world.sendMessage("[系统] 附近没有可用箱子");
            currentTask = FarmTask.Idle;
            return false;
        }

        placeWaypoints(overworld, golem_id, chestList);
        isMovingToTarget = true;
        world.sendMessage(`[系统] 已标记 ${chestList.length} 个箱子`);
        return false;
    }

    // 4. 交互执行阶段
    const target = findNearestTarget();
    if (!target?.isValid) {
        world.sendMessage("[警告] 目标箱子无效");
        isMovingToTarget = false;
        return false;
    }

    // 5. 存放操作
    const chestPos = {
        x: target.location.x,
        y: target.location.y,
        z: target.location.z
    };

    const container = Utils.getBlockContainer(overworld, chestPos);
    if (!container?.isValid) {
        world.sendMessage("[警告] 箱子容器无效");
        clearTarget(target);
        return false;
    }

    // 6. 转移所有非种子物品
    let storedAny = false;
    for (let i = 0; i < inventory.size; i++) {
        const item = inventory.getItem(i);
        if (!item || item.typeId === "minecraft:wheat_seeds") continue;

        if (Utils.transferItemBetweenContainers(i, inventory, container)) {
            world.sendMessage(`[系统] 已存储 ${item.typeId}`);
            storedAny = true;
            
            // 如果当前槽位清空则继续检查
            if (!inventory.getItem(i)) continue;
        }
    }

    // 7. 状态更新
    if (storedAny) {
        if (!isInventoryFull()) {
            world.sendMessage("[系统] 背包清理完成");
            clearAllTarget();
            isMovingToTarget = false;
            currentTask = FarmTask.Idle;
            return true;
        }
        world.sendMessage("[系统] 部分物品已存储，背包仍满");
    } else {
        world.sendMessage("[警告] 未能存储任何物品");
    }

    return false;
}

function updateTask() {
    world.sendMessage("currentTask:"+currentTask);
    switch (currentTask) {
        case FarmTask.Idle:
            if (hasRipeCropsNearby()) {
                world.sendMessage("[系统] 附近有成熟作物");
                currentTask = FarmTask.HarvestCrops;
            } 
            else if (hasEmptyFarmlandNearby()) {
                world.sendMessage("[系统] 附近有空闲农地");
                if (!hasSeedsInHand()) {
                    currentTask = hasChestNearby() 
                        ? FarmTask.GetSeedsFromChest 
                        : FarmTask.Idle; // 无箱子则等待
                } 
                else {
                    currentTask = FarmTask.PlantCrops;
                }
            }
            break;

        case FarmTask.GetSeedsFromChest:
            if (takeSeedsFromChest()) {
                currentTask = FarmTask.PlantCrops;
            } 
            break;

        case FarmTask.PlantCrops:
            if (plantSeeds()) {
                currentTask = FarmTask.Idle; // 种植后等待
            }
            break;

        case FarmTask.HarvestCrops:
            if (harvestCrops()) {
                currentTask = FarmTask.Idle;
            }
            break;

        case FarmTask.StoreItemsToChest:
            if (clearInventory()) {
                currentTask = FarmTask.HarvestCrops; // 清理后继续收割
            }
            break;
    }
}


//只实现一个傀儡的导航
world.afterEvents.itemUse.subscribe((event) => {
    const { itemStack, source } = event;
    const itemTypeId = itemStack.typeId;
   overworld = source.dimension;

    switch (itemTypeId) {
        case 'minecraft:apple':
            //傀儡的生成
            if (golem?.isValid) return;
            world.sendMessage("已生成傀儡");
            golem = spawnGolem(source.dimension,GOLEM_FARMER_TYPE,15,source.location);
            inventory = golem.getComponent(EntityComponentTypes.Inventory)?.container;

        break;
        case 'minecraft:stick':
            world.sendMessage("target_map_size:"+target_map.size);
            updateTask()
            
        break;
    }
});