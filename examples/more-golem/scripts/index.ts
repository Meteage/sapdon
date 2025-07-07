import { system, world, Vector3, Entity, BlockVolume, BlockFilter, Dimension, EntityComponentTypes } from '@minecraft/server';
import { get } from 'http';

interface BlockVolumeSize {
    length: number;
    width: number;
    height: number;
}

function getDistance(pos1: Vector3, pos2: Vector3): number {
    return Math.sqrt(
        Math.pow(pos1.x - pos2.x, 2) +
        Math.pow(pos1.y - pos2.y, 2) +
        Math.pow(pos1.z - pos2.z, 2)
    );
}

// Get specific blocks within a volume
function getBlockListFromBlockVolume(dimension: Dimension, blockVolume: BlockVolume, blockFilter: BlockFilter): Vector3[] {
    const blockListVolume = dimension.getBlocks(blockVolume, blockFilter, true);
    return [...blockListVolume.getBlockLocationIterator()];
}

// Get a rectangular block volume around a center point
function getNeighboringBlockVolume(center: Vector3, blockVolumeSize: BlockVolumeSize): BlockVolume {
    const halfLength = blockVolumeSize.length / 2;
    const halfHeight = blockVolumeSize.height / 2;
    const halfWidth = blockVolumeSize.width / 2;
    
    const fromLoc: Vector3 = {
        x: center.x - halfLength,
        y: center.y - halfHeight,
        z: center.z - halfWidth
    };
    
    const toLoc: Vector3 = {
        x: center.x + halfLength,
        y: center.y + halfHeight,
        z: center.z + halfWidth
    };
    
    return new BlockVolume(fromLoc, toLoc);
}



function getNeighboringFarmLand(source:Entity){
    world.sendMessage("获取周围农田");
    const nbv = getNeighboringBlockVolume(source.location, {
        length: 16,
        width: 16,
        height: 16
    });
    const farmLandPosList = getBlockListFromBlockVolume(
        source.dimension, 
        nbv, 
        { includeTypes: ["minecraft:farmland"] }
    );
    farmLandPosList.forEach(pos => {
        source.dimension.spawnParticle("minecraft:blue_flame_particle", {
            x:pos.x,
            y:pos.y+1,
            z:pos.z
        });
    });
    return farmLandPosList;
}

type GolemAndTargets = {
    golem: Entity;
    targets: Entity[];
}

// Maximum 16 golems in the world
const GOLEM_MAX_COUNT = 16;

class GolemManagerSystem {
    private golemRecord: Map<number, GolemAndTargets> = new Map();
    private golemCount = 0;

    // Spawn a golem
    spawnGolem(dimension: Dimension, golemType: string, location: Vector3): Entity | undefined {
        if (this.golemCount >= GOLEM_MAX_COUNT) {
            return undefined;
        }

        world.sendMessage(`golem_count: ${this.golemCount}`);
        const golem = dimension.spawnEntity(golemType, location);
        golem.setProperty("more_golem:golem_index", this.golemCount);
        
        this.golemRecord.set(this.golemCount, {
            golem: golem,
            targets: []
        });

        const index = this.golemCount;
        const intervalId = system.runInterval(() => {
            if (!golem?.isValid) {
                this.golemRecord.delete(index);
                system.clearRun(intervalId);
                return;
            }

            this.golemRecord.get(index)?.targets.forEach((target, i) => {
                if (target?.isValid) {
                    target.dimension.spawnParticle(
                        "minecraft:blue_flame_particle", 
                        target.location
                    );
                    if (getDistance(golem.location, target.location) < 1.5) {
                        target.remove();
                    }
                }
                else{
                    //
                }
            });
        },10);

        this.golemCount++;
        return golem;
    }

    // Spawn a target for a golem
    spawnTarget(dimension: Dimension, targetIndex: number, location: Vector3): Entity | undefined {
        if (targetIndex >= GOLEM_MAX_COUNT || !this.golemRecord.has(targetIndex)) {
            return undefined;
        }

        const target = dimension.spawnEntity("more_golem:golem_target", location);
        target.setProperty("more_golem:target_index", targetIndex);
        this.golemRecord.get(targetIndex)?.targets.push(target);
        return target;
    }
    //通过编号获取傀儡
    getGolemByNumber(num:number){
        return this.golemRecord.get(num)?.golem;
    }
    //获取傀儡某个库存槽的物品
    getGolemSlotItem(golem_num:number,slot:number){
        const golem = this.getGolemByNumber(golem_num);
        //world.sendMessage("golem_isVaid?:"+golem?.isValid)
        const container = golem?.getComponent(EntityComponentTypes.Inventory)?.container;
        //world.sendMessage("container ?:"+container?.isValid )
        return container?.getItem(slot);
    }
    getGolemMainHandItem(golem_num:number){
        return this.getGolemSlotItem(golem_num,0);
    }
}

const golemManager = new GolemManagerSystem();

// System
type GolemSummonComponentParams = {
    golem_type: string;
}

// Register golem summon component
system.beforeEvents.startup.subscribe((init) => {
    init.itemComponentRegistry.registerCustomComponent("golem_craft:golem_summon", {
        onUseOn(event, parameter) {
            world.sendMessage("召唤傀儡");
            const { block } = event;
            const { golem_type } = parameter.params as GolemSummonComponentParams;
            const dimension = block.dimension;
            const summonLoc = {
                x: block.location.x + 0.5,
                y: block.location.y + 1,
                z: block.location.z + 0.5,
            };
            golemManager.spawnGolem(dimension, golem_type, summonLoc);
        }
    });
});

let testIndex = 0;

world.afterEvents.itemUse.subscribe((event) => {
    const { itemStack, source } = event;
    
    if (!itemStack) return;
    world.sendMessage("itemTypeId:"+ itemStack.typeId)
    switch (itemStack.typeId) {
        case 'minecraft:stick':
            //获取0号傀儡
            const golem = golemManager.getGolemByNumber(0);
            if(golem&&golem.isValid){
                //获取傀儡库存的0号槽物品
                const mainHandItem = golemManager.getGolemMainHandItem(0);
                world.sendMessage("mainHandTypeId:"+mainHandItem?.typeId)

                const seed_list = ["minecraft:wheat_seeds"]//小麦，土豆，等等
                if(mainHandItem && seed_list.includes(mainHandItem.typeId)){
                    //搜索附近农田
                    const nfd_pos_list  = getNeighboringFarmLand(golem);
                    nfd_pos_list.forEach((pos)=>{
                        golemManager.spawnTarget(golem.dimension,0,{
                            x:pos.x+0.5,
                            y:pos.y+1,
                            z:pos.z+0.5
                        })
                    })
                }
            }
            
            break;
        case 'minecraft:diamond':
            getNeighboringFarmLand(source);
            break;
            
        case "minecraft:iron_ingot":
            world.sendMessage(`已放置目标index: ${testIndex}`);
            golemManager.spawnTarget(source.dimension, testIndex, source.location);
            break;
            
        case "minecraft:gold_ingot":
            testIndex = (testIndex + 1) % GOLEM_MAX_COUNT;
            world.sendMessage(`已更新index: ${testIndex}`);
            break;
    }
});


import { BlockComponent, BlockComponentTypes, Container, } from "@minecraft/server";

//含有容器的方块类型列表
const BLOCK_C_LIST:string[] = [
    "minecraft:chest"
];

//获取方块容器
function getBlockContainer(dimension:Dimension,location:Vector3):Container|undefined{
    const block = dimension.getBlock(location);
    if(!block || !block.isValid || !BLOCK_C_LIST.includes(block.typeId)) return undefined
    return block.getComponent(BlockComponentTypes.Inventory)?.container;
}
/**
 * 在容器中查找指定类型的物品所在的槽位
 * @param container 要搜索的容器
 * @param itemTypeId 要查找的物品类型ID
 * @returns 找到的槽位索引，未找到则返回undefined
 */
function findSlotByItemType(container: Container, itemTypeId: string): number | undefined {
    for (let slot = 0; slot < container.size; slot++) {
        const itemStack = container.getItem(slot);
        if (itemStack?.typeId === itemTypeId) {
            return slot;
        }
    }
    return undefined;
}

/**
 * 将物品从源容器的指定槽位转移到目标容器
 * @param sourceSlot 源容器中的槽位索引
 * @param sourceContainer 源容器
 * @param targetContainer 目标容器
 * @returns 是否成功转移了物品
 */
function transferItemBetweenContainers(
    sourceSlot: number,
    sourceContainer: Container,
    targetContainer: Container
){
    const remainingItem = sourceContainer.transferItem(sourceSlot, targetContainer);
    // 如果返回undefined表示全部转移成功
    return remainingItem === undefined;
}

//测试
world.afterEvents.playerInteractWithBlock.subscribe((event)=>{
    const {itemStack,block} = event;
    const itemTypeId = itemStack?.typeId;
    world.sendMessage("itemTypeId:"+itemTypeId)

    switch(itemTypeId){
        case 'minecraft:stick':
            //测试
            const container = getBlockContainer(block.dimension,block.center());
            if(container){
                const slot = findSlotByItemType(container,"minecraft:wheat_seeds");
                if(slot){
                    world.sendMessage("num:"+container.getItem(slot)?.amount)
                }
            }
        break
    }
})