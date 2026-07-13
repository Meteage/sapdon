import { ITask } from "../core/task/ITask.js"
import { ITaskContext, IGolemConfig } from "../core/types.js"
import { BlockVolume, Container, Dimension, Vector3, BlockComponentTypes } from "@minecraft/server"
import { Utils } from "../utils.js"

export class FetchSeedsTask implements ITask {
  readonly name = "FetchSeedsTask"
  readonly priority = 1
  readonly timeout = 200

  condition(ctx: ITaskContext): boolean {
    const { inventory, config, homePos } = ctx
    if (inventory.emptySlotsCount === 0) return false
    if (hasAnySeed(inventory, config)) return false
    if (!anyChestHasSeed(ctx.location, ctx.dimension, config, homePos)) return false
    return true
  }

  execute(ctx: ITaskContext): void {
    const { dimension, location, config, inventory, homePos } = ctx
    const chests = findChests(location, dimension, config, homePos)
    if (chests.length === 0) return

    ctx.navigateTo(this.name, this.timeout, chests, (target) => {
      const chestPos = { x: target.location.x, y: target.location.y - 1, z: target.location.z }
      const container = getChestContainer(dimension, chestPos)
      if (!container) return true

      const seedType = config.crops[0]?.seedType
      if (!seedType) return true

      const seedSlot = Utils.findSlotByItemType(container, seedType)
      if (seedSlot === undefined) return true

      Utils.transferItemBetweenContainers(seedSlot, container, inventory)
      return true
    })
  }
}

function hasAnySeed(inv: Container, config: IGolemConfig): boolean {
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

function findChests(location: Vector3, dimension: Dimension, config: IGolemConfig, homePos?: Vector3): Vector3[] {
  const from = { x: location.x - config.scanRange, y: location.y - 2, z: location.z - config.scanRange }
  const to = { x: location.x + config.scanRange, y: location.y + 2, z: location.z + config.scanRange }
  const vol = new BlockVolume(from, to)
  const result = dimension.getBlocks(vol, { includeTypes: config.chestTypes }, true)
  return [...result.getBlockLocationIterator()].filter(pos => isInHomeRange(pos, homePos, config.homeRange))
}

function getChestContainer(dim: Dimension, loc: Vector3): Container | undefined {
  const block = dim.getBlock(loc)
  if (!block || !block.isValid) return undefined
  const comp = block.getComponent(BlockComponentTypes.Inventory)
  return comp?.container
}

function anyChestHasSeed(location: Vector3, dimension: Dimension, config: IGolemConfig, homePos?: Vector3): boolean {
  const chests = findChests(location, dimension, config, homePos)
  for (const chestPos of chests) {
    const container = getChestContainer(dimension, chestPos)
    if (!container) continue
    for (const crop of config.crops) {
      if (Utils.findSlotByItemType(container, crop.seedType) !== undefined) return true
    }
  }
  return false
}
