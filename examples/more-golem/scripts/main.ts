import { BlockComponent, BlockComponentTypes, BlockFilter, BlockPermutation, BlockVolume, Container, Dimension, Entity, EntityComponentTypes, ItemStack, system, Vector3, world } from "@minecraft/server";
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

//判定是否接近 高性能
function isWithinRadius(p1:Vector3,p2:Vector3,threshold:number): boolean {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    const dx2 = Math.pow(dx,2);
    const dy2 = Math.pow(dy,2);
    const dz2 = Math.pow(dz,2);
    return (dx2+dy2+dz2) <= Math.pow(threshold,2);
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

enum TaskStage {
    PlaceTarget = 0, //寻找目标阶段
    NavigateToTarget,      //导航到目标阶段
    TaskFinish
} 

//作物列表
const CROP_TYPE_LIST = ["minecraft:wheat"];
const SEED_TYPE_LIST = ["minecraft:wheat_seeds"];
const CHEST_TYPE_LIST = ["minecraft:chest"];

class FarmerGolem {

    private self:Entity;
    private numberId:number;
    private inventory:Container;

    private currentTask = 0;
    private searchRange = 8;
    private currentStage = 0;

    private tareget_list = [];
    private isMovingTo = false;
    private target_location:Vector3 | undefined;

    constructor(dimension:Dimension,numberId:number,location:Vector3) {
        //记录数字编号
        this.numberId = numberId;
        //创建一个农业傀儡
        this.self = spawnGolem(dimension,GOLEM_FARMER_TYPE,numberId,location);
        //设置编号numberId
        this.self.setProperty(GOLEM_PROPERTY,numberId);
        //获取傀儡的容器
        this.inventory = this.self.getComponent(EntityComponentTypes.Inventory)!.container;
    }

    public updateTask() {

        world.sendMessage(`[调试]: 当前任务为 [${this.currentTask}]`);

        switch (this.currentTask) {
            case FarmTask.Idle:
                world.sendMessage("[任务] 空闲状态");

                if(this.hasEnoughItems("minecraft:wheat",0)){
                    world.sendMessage("[任务] 任务切换至 [StoreItemsToChest]");
                    this.currentTask = FarmTask.StoreItemsToChest;
                }
                else if (this.hasRipeCropsNearby()) {
                        world.sendMessage("[任务] 任务切换至 [HarvestCrops]");
                        this.currentTask = FarmTask.HarvestCrops;
                } 
                else if (this.hasEmptyFarmlandNearby()) {
                    world.sendMessage("[调试] 有空田地");

                    if (!this.hasSeedsInInventory()) {
                        world.sendMessage("[调试] 没有种子");
                        if(this.hasChestNearby()){
                            world.sendMessage("[任务] 任务切换至 [GetSeedsFromChest]");
                            this.currentTask = FarmTask.GetSeedsFromChest 
                        }
                    } 
                    else {
                        world.sendMessage("[任务] 任务切换至 [PlantCrops]");
                        this.currentTask = FarmTask.PlantCrops;
                    }
                }
                break;

            case FarmTask.GetSeedsFromChest:
                this.takeSeedsFromChest()
                break;

            case FarmTask.PlantCrops:
                this.plantSeeds()
                break;

            case FarmTask.HarvestCrops:
                this.harvestCrops()
                break;

            case FarmTask.StoreItemsToChest:
                this.clearInventory()
                break;
        }
    }

    //放置卤鸡蛋 返回是否成功 单步模式
    public setWaypoint(location:Vector3):boolean{
        this.target_location = location;
        const target = spawnTarget(this.self.dimension,this.numberId,location);
        if(target) return true;
        return false;
    }

    //
    public hasSeedsInInventory(): boolean {
        if (this.inventory.size == this.inventory.emptySlotsCount) return false;

        for (let slot = 0; slot < this.inventory.size; slot++) {
            const item = this.inventory.getItem(slot);
            if (item && SEED_TYPE_LIST.includes(item.typeId)) {
                return true;
            }
        }
        return false;
    }

    //找到附近8格空农田
    private findEmptyFarmlandNearby():Vector3[]{
        const farmlandNearbyList = scanNearbyBlocks(
            this.self.dimension,
            this.self.location,
            {x:this.searchRange,y:2,z:this.searchRange},
            {
                includeTypes:["minecraft:farmland"]
            }
        );
        world.sendMessage("[调试] farmlandNearbyList:"+ farmlandNearbyList.length);
        const emptyFarmlandList = farmlandNearbyList.filter((pos)=>{
            return this.self.dimension.getBlock(pos)?.above()?.isAir;
        });

        return emptyFarmlandList;
    }

    // 检测附近8格内是否有成熟作物
    private findRipeCropsNearby():Vector3[]{
        const ripeCropsNearbyList = scanNearbyBlocks(
            this.self.dimension,
            this.self.location,
            {x:this.searchRange,y:2,z:this.searchRange},
            {
                //includeTypes:CROP_TYPE_LIST,
                includePermutations:[BlockPermutation.resolve("minecraft:wheat",{growth:7})]
            }
        );
        return ripeCropsNearbyList;
    }

    // 检测附近8格内是否有成熟作物
    private findChestsNearby():Vector3[]{
        const chestsNearbyList = scanNearbyBlocks(
            this.self.dimension,
            this.self.location,
            {x:this.searchRange,y:2,z:this.searchRange},
            {
                includeTypes:CHEST_TYPE_LIST
            }
        );
        return chestsNearbyList;
    }

    // 检测附近8格内是否有空农田
    private hasEmptyFarmlandNearby(): boolean {
        return this.findEmptyFarmlandNearby().length > 0;
    }

    // 检测附近8格内是否有成熟作物
    private hasRipeCropsNearby(): boolean {
        return this.findRipeCropsNearby().length > 0;
    }

    // 检测附近8格内是否有箱子
    private hasChestNearby(): boolean {
        return this.findChestsNearby().length > 0;
    }

    private mainHandIsFull(itemType:string,amount:number): boolean{
        const mainHandItem = this.inventory.getItem(0);
        if(!mainHandItem || mainHandItem.typeId !== itemType ) return false;
        world.sendMessage("amount:"+mainHandItem.amount);
        return mainHandItem.amount >= amount;
    }

    private hasEmptySlot():boolean {
        world.sendMessage("[调试] emptySlotsCount:"+this.inventory.emptySlotsCount);
        world.sendMessage("[调试] hasEmptySlot:"+(this.inventory.emptySlotsCount > 0));
        return this.inventory.emptySlotsCount > 0;
    }

    private hasEnoughItems(item_type:string,amount:number):boolean {
        for(let slot = 0;slot<this.inventory.size;slot++){
            const item = this.inventory.getItem(slot);
            if(item && item.typeId === item_type){
                return item.amount >= amount;
            }
        }
        return false;
    }


    private findNearestTarget(): Entity | undefined {
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
            const distance = Utils.getDistance(this.self.location, target.location);
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

    //任务
    
    //storeItemsToChest
    private registerTask(targetList:Vector3[],onArriveTask:(target:Entity)=>boolean) {
        //退出条件 
        if (targetList.length === 0) {
            world.sendMessage("[系统] 目标列表无效");
            this.currentTask = FarmTask.Idle;
            return;
        }
        //拿取物品
        switch(this.currentStage){
            case TaskStage.PlaceTarget:
                world.sendMessage("[任务] 阶段1 发布路径点");
                //发布路径点
                placeWaypoints(
                    this.self.dimension,
                    this.numberId,
                    targetList
                );
                world.sendMessage(`[系统] 已标记 ${targetList.length} 个目标`);
                this.currentStage++;
            break;

            case TaskStage.NavigateToTarget:
                world.sendMessage("[任务] 阶段2 导航至目标");
                const target = this.findNearestTarget();
                if(target){
                    world.sendMessage("[系统] 已到达目标点:"+ JSON.stringify(target.location));
                    //执行任务
                    if(onArriveTask(target)) this.currentStage++;
                }
            break;

            case TaskStage.TaskFinish:
                world.sendMessage("[任务] 阶段3 清除全部目标");
                clearAllTarget();
                this.currentTask = FarmTask.Idle;
                this.currentStage = TaskStage.PlaceTarget;
            break;
        }
    }

    // 从最近的箱子拿取种子 
    private takeSeedsFromChest() {
        this.registerTask(this.findChestsNearby(),
        (target:Entity)=>{
            const isLastTarget = (target_map.size === 1);
            const chestPos = {
                x: target.location.x,
                y: target.location.y -1,
                z: target.location.z
            };
            const container = Utils.getBlockContainer(this.self.dimension, chestPos);
            if (!container?.isValid) {
                world.sendMessage("[警告] 箱子容器无效");
                clearTarget(target);
                if(isLastTarget){
                    return true;
                }
                return false;
            }
            const seedSlot = Utils.findSlotByItemType(container, "minecraft:wheat_seeds");
            if (seedSlot === undefined) {
                world.sendMessage("[提示] 箱子没有种子");
                clearTarget(target);
                if(isLastTarget){
                    return true;
                }
                return false;
            }

            const transferResult = Utils.transferItemBetweenContainers(
                seedSlot,
                container,
                this.inventory    
            );

            if (transferResult) {
                const newAmount = this.inventory.getSlot(0)?.getItem()?.amount || 0;
                world.sendMessage(`[系统] 获取种子成功 (当前: ${newAmount}/64)`);
                //退出条件 1.拿取足够物品  2.没有更多目标了
                if(this.hasEnoughItems("minecraft:wheat_seeds",64)){
                    world.sendMessage("[系统] 种子已拿满");
                    return true;
                }
                else if(isLastTarget){
                    return true;
                }
            }
            if(isLastTarget){
                return true;
            }
            return false;
        });
    }

    // 将多余物品存入箱子
    private clearInventory(){
        this.registerTask(this.findChestsNearby(),(target:Entity)=>{
            // 5. 存放操作
            const chestPos = {
                x: target.location.x,
                y: target.location.y-1,
                z: target.location.z
            };

            const container = Utils.getBlockContainer(this.self.dimension, chestPos);
            if (!container?.isValid) {
                world.sendMessage("[警告] 箱子容器无效");
                clearTarget(target);
                return false;
            }

            // 6. 转移所有非种子物品
            let storedAny = false;
            for (let i = 0; i < this.inventory.size; i++) {
                const item = this.inventory.getItem(i);
                if (!item || item.typeId === "minecraft:wheat_seeds") continue;

                if (Utils.transferItemBetweenContainers(i, this.inventory, container)) {
                    world.sendMessage(`[系统] 已存储 ${item.typeId}`);
                    storedAny = true;
                }
            }

            // 7. 状态更新
            if (storedAny) {
                world.sendMessage("[系统] 背包清理完成");
                return true;
            } else {
                world.sendMessage("[警告] 未能存储任何物品");
            }

            return false;
        });
    }

     // 种植种子到最近的农田
    private plantSeeds(){
        this.registerTask(this.findEmptyFarmlandNearby(),(target:Entity)=>{
            //退出条件 1.手上没有物品 2.没有目标
            if (!this.mainHandIsFull("minecraft:wheat_seeds",0)) {
                world.sendMessage("[系统] 手上没有种子");
                return true;
            }

            // 5. 种植操作
            const plantPos = target.location;

            // 检查是否仍为空
            if (!this.self.dimension.getBlock(plantPos)?.isAir) {
                world.sendMessage("[警告] 目标位置已被占用");
                clearTarget(target);
                return false;
            }

            // 消耗种子
            const seedSlot = Utils.findSlotByItemType(this.inventory, "minecraft:wheat_seeds");
            if (seedSlot === undefined) {
                world.sendMessage("[错误] 种子槽位丢失");
                return false;
            }

            const seedStack = this.inventory.getItem(seedSlot);
            if (!seedStack || seedStack.amount <= 0) {
                world.sendMessage("[错误] 种子数量不足");
                return false;
            }

            // 执行种植
            if (seedStack.amount == 1) {
                this.inventory.setItem(seedSlot, undefined);
            } else {
                seedStack.amount--;
                this.inventory.setItem(seedSlot, seedStack);
            }

            this.self.dimension.getBlock(plantPos)?.setType("minecraft:wheat");
            world.sendMessage("[系统] 种植成功");

            // 6. 状态更新
            const isLastFarmland = target_map.size === 1;
            clearTarget(target);
            world.sendMessage(`[系统] 已种植 ${isLastFarmland ? "最后" : ""}块农田`);

            if (isLastFarmland) {
                world.sendMessage("[系统] 所有农田已种植完成");
                return true;
            }

            return false;
        });
    }

    private harvestCrops(){
        this.registerTask(this.findRipeCropsNearby(),(target:Entity)=>{
            //退出条件 1.背包已满 2.没有目标
            if (this.hasEnoughItems("minecraft:wheat",64)) {
                world.sendMessage("[系统] 背包已满，需要存储物品");
                return true;
            }

              // 5. 收割操作
            const cropLocation = {
                x: target.location.x,
                y: target.location.y - 1,
                z: target.location.z
            };

            const block = this.self.dimension.getBlock(cropLocation);
            
            // 执行收割
            block?.setType("minecraft:air");
            this.self.dimension.spawnItem(new ItemStack("minecraft:wheat_seeds", 1), cropLocation);
            this.self.dimension.spawnItem(new ItemStack("minecraft:wheat", 1), cropLocation);

            // 6. 状态更新
            const isLastCrop = target_map.size === 1;
            clearTarget(target);
            world.sendMessage(`[系统] 已收获 ${isLastCrop ? "最后" : ""}作物`);

            if (isLastCrop) {
                world.sendMessage("[系统] 所有作物已收获完成");
                return true;
            }

            return false;
        });
    }
}

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

function scanNearbyBlocks(
    dimension:Dimension,
    center:Vector3,
    size:Vector3,
    blockFilter:BlockFilter
):Vector3[]{
    const fromPos = {x:center.x - size.x,y:center.y-size.y,z:center.z-size.z};
    const toPos = {x:center.x + size.x,y:center.y+size.y,z:center.z+size.z};
    const scan_block_volume = new BlockVolume(fromPos,toPos);
    const list_block_volume =  dimension.getBlocks(scan_block_volume,blockFilter,true);
    return [...list_block_volume.getBlockLocationIterator()];
}


let golem: FarmerGolem | undefined;
let numberId = 0;

//只实现一个傀儡的导航
world.afterEvents.itemUse.subscribe((event) => {
    const { itemStack, source } = event;
    const itemTypeId = itemStack.typeId;
    const dimension = source.dimension;

    switch (itemTypeId) {
        case 'minecraft:apple':
            if(numberId < 16){
                //傀儡的生成
                world.sendMessage("已生成傀儡");
                const golem = new FarmerGolem(dimension,numberId,source.location);
                system.runInterval(()=>{
                    golem.updateTask()
                },1*20);
                numberId++;
            }
            
        break;
    }
});