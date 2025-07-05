import { system, world, Vector3, Entity, BlockVolume, BlockFilter, Dimension } from '@minecraft/server';

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
            });
        });

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

    switch (itemStack.typeId) {
        case 'minecraft:diamond':
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
                source.dimension.spawnParticle("minecraft:blue_flame_particle", pos);
            });
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
