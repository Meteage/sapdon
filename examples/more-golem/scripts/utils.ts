import { BlockComponentTypes, BlockFilter, BlockVolume, Container, Dimension, Entity, EntityComponentTypes, Vector3, world } from "@minecraft/server";


interface BlockVolumeSize {
    length: number;
    width: number;
    height: number;
}


export namespace Utils {

    export function getDistance(pos1: Vector3, pos2: Vector3): number {
        return Math.sqrt(
            Math.pow(pos1.x - pos2.x, 2) +
            Math.pow(pos1.y - pos2.y, 2) +
            Math.pow(pos1.z - pos2.z, 2)
        );
    }

    // Get specific blocks within a volume
    export function getBlockListFromBlockVolume(dimension: Dimension, blockVolume: BlockVolume, blockFilter: BlockFilter): Vector3[] {
        const blockListVolume = dimension.getBlocks(blockVolume, blockFilter, true);
        return [...blockListVolume.getBlockLocationIterator()];
    }
    
    // Get a rectangular block volume around a center point
    export function getNeighboringBlockVolume(center: Vector3, blockVolumeSize: BlockVolumeSize): BlockVolume {
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
    
    
    
    export function getNeighboringBlockListByType(dimension:Dimension,center:Vector3,typeId:string){
        world.sendMessage("获取周围"+typeId+"类型方块");
        const nbv = getNeighboringBlockVolume(center, {
            length: 16,
            width: 16,
            height: 3
        });
        const farmLandPosList = getBlockListFromBlockVolume(
            dimension, 
            nbv, 
            { includeTypes: [typeId] }
        );
        farmLandPosList.forEach(pos => {
            dimension.spawnParticle("minecraft:blue_flame_particle", {
                x:pos.x,
                y:pos.y+1,
                z:pos.z
            });
        });
        return farmLandPosList;
    }
    //含有容器的方块类型列表
    const BLOCK_C_LIST:string[] = [
        "minecraft:chest"
    ];

    //获取方块容器
    export function getBlockContainer(dimension:Dimension,location:Vector3):Container|undefined{
        const block = dimension.getBlock(location);
        if(!block || !block.isValid || !BLOCK_C_LIST.includes(block.typeId)) return undefined
        return block.getComponent(BlockComponentTypes.Inventory)?.container;
    }

    //获取方块容器
    export function getEntityContainer(entity:Entity):Container|undefined{
        return entity.getComponent(EntityComponentTypes.Inventory)?.container;
    }

    /**
     * 在容器中查找指定类型的物品所在的槽位
     * @param container 要搜索的容器
     * @param itemTypeId 要查找的物品类型ID
     * @returns 找到的槽位索引，未找到则返回undefined
     */
    export function findSlotByItemType(container: Container, itemTypeId: string): number | undefined {
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
    export function transferItemBetweenContainers(
        sourceSlot: number,
        sourceContainer: Container,
        targetContainer: Container
    ){
        const remainingItem = sourceContainer.transferItem(sourceSlot, targetContainer);
        // 如果返回undefined表示全部转移成功
        return remainingItem === undefined;
    }

    export function findEmptySlot(container:Container){
        if(container.emptySlotsCount === 0) return undefined
        for(let slot =0;slot<container.size;slot++){
            if(!container.getSlot(slot).hasItem())
            return slot
        }
    }
}