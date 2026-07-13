import { ITask } from "../core/task/ITask.js"
import { ITaskContext } from "../core/types.js"
import { BlockVolume, Container, Dimension, Vector3 } from "@minecraft/server"
import { Utils } from "../utils.js"

export class PlantTask implements ITask {
  readonly name = "PlantTask"
  readonly priority = 2
  readonly timeout = 200

  condition(ctx: ITaskContext): boolean {
    const { inventory, config, homePos } = ctx
    if (!hasAnySeed(inventory, config)) return false
    return hasEmptyFarmland(ctx.location, ctx.dimension, ctx.config, homePos)
  }

  execute(ctx: ITaskContext): void {
    const { config, dimension, location, inventory, homePos } = ctx
    const farmlands = findEmptyFarmland(location, dimension, config, homePos)
    if (farmlands.length === 0) return

    ctx.navigateTo(this.name, this.timeout, farmlands, (target) => {
      const plantPos = target.location
      if (!dimension.getBlock(plantPos)?.isAir) return true

      const seedType = config.crops[0]?.seedType ?? "minecraft:wheat_seeds"
      const slot = Utils.findSlotByItemType(inventory, seedType)
      if (slot === undefined) return true

      const seedStack = inventory.getItem(slot)
      if (!seedStack || seedStack.amount <= 0) return true

      if (seedStack.amount === 1) {
        inventory.setItem(slot, undefined)
      } else {
        seedStack.amount--
        inventory.setItem(slot, seedStack)
      }

      dimension.getBlock(plantPos)?.setType(config.crops[0]?.cropType ?? "minecraft:wheat")
      return true
    })
  }
}

function hasAnySeed(inv: Container, config: import("../core/types.js").IGolemConfig): boolean {
  for (const crop of config.crops) {
    for (let i = 0; i < inv.size; i++) {
      const item = inv.getItem(i)
      if (item && item.typeId === crop.seedType) return true
    }
  }
  return false
}

function isInHomeRange(pos: Vector3, homePos: Vector3 | undefined, homeRange: number): boolean {
  if (!homePos) return true
  const dx = pos.x - homePos.x
  const dy = pos.y - homePos.y
  const dz = pos.z - homePos.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz) <= homeRange
}

function hasEmptyFarmland(location: Vector3, dimension: Dimension, config: import("../core/types.js").IGolemConfig, homePos?: Vector3): boolean {
  return findEmptyFarmland(location, dimension, config, homePos).length > 0
}

function findEmptyFarmland(location: Vector3, dimension: Dimension, config: import("../core/types.js").IGolemConfig, homePos?: Vector3): Vector3[] {
  const from = { x: location.x - config.scanRange, y: location.y - 2, z: location.z - config.scanRange }
  const to = { x: location.x + config.scanRange, y: location.y + 2, z: location.z + config.scanRange }
  const vol = new BlockVolume(from, to)
  const result = dimension.getBlocks(vol, { includeTypes: ["minecraft:farmland"] }, true)
  const positions = [...result.getBlockLocationIterator()]
  return positions.filter(pos => {
    if (!isInHomeRange(pos, homePos, config.homeRange)) return false
    return dimension.getBlock(pos)?.above()?.isAir
  })
}
