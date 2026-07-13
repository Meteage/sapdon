import { BlockVolume, Dimension, ItemStack, Vector3 } from "@minecraft/server"
import { ITask } from "../core/task/ITask.js"
import { ITaskContext } from "../core/types.js"

export class HarvestTask implements ITask {
  readonly name = "HarvestTask"
  readonly priority = 3
  readonly timeout = 200

  condition(ctx: ITaskContext): boolean {
    const { inventory, config, homePos } = ctx
    if (inventory.emptySlotsCount === 0) return false
    return hasRipeCrops(ctx.location, ctx.dimension, config, homePos)
  }

  execute(ctx: ITaskContext): void {
    const { config, dimension, inventory, homePos } = ctx
    const crops = findRipeCrops(ctx.location, dimension, config, homePos)
    if (crops.length === 0) return

    ctx.navigateTo(this.name, this.timeout, crops, (target) => {
      const cropLoc = { x: target.location.x, y: target.location.y - 1, z: target.location.z }
      const block = dimension.getBlock(cropLoc)
      if (!block) return true

      block.setType("minecraft:wheat")
      inventory.addItem(new ItemStack("minecraft:wheat"))
      return inventory.emptySlotsCount === 0
    })
  }
}

function isInHomeRange(pos: Vector3, homePos: Vector3 | undefined, homeRange: number): boolean {
  if (!homePos) return true
  const dx = pos.x - homePos.x
  const dy = pos.y - homePos.y
  const dz = pos.z - homePos.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz) <= homeRange
}

function hasRipeCrops(location: Vector3, dimension: Dimension, config: import("../core/types.js").IGolemConfig, homePos?: Vector3): boolean {
  return findRipeCrops(location, dimension, config, homePos).length > 0
}

function findRipeCrops(location: Vector3, dimension: Dimension, config: import("../core/types.js").IGolemConfig, homePos?: Vector3): Vector3[] {
  const from = { x: location.x - config.scanRange, y: location.y - 2, z: location.z - config.scanRange }
  const to = { x: location.x + config.scanRange, y: location.y + 2, z: location.z + config.scanRange }
  const vol = new BlockVolume(from, to)
  const cropTypes = config.crops.map(c => c.cropType)
  const result = dimension.getBlocks(vol, { includeTypes: cropTypes }, true)
  return [...result.getBlockLocationIterator()].filter(loc => {
    if (!isInHomeRange(loc, homePos, config.homeRange)) return false
    const block = dimension.getBlock(loc)
    if (!block) return false
    const ripe = config.crops.find(c => c.cropType === block.typeId)
    if (!ripe) return false
    const state = block.permutation.getState("growth") as number
    return state === ripe.growthState
  })
}
