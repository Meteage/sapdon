import { ITask } from "../core/task/ITask.js"
import { ITaskContext } from "../core/types.js"
import { BlockVolume, Container, Dimension, Vector3, BlockComponentTypes } from "@minecraft/server"
import { Utils } from "../utils.js"

export class StoreItemsTask implements ITask {
  readonly name = "StoreItemsTask"
  readonly priority = 0
  readonly timeout = 200

  condition(ctx: ITaskContext): boolean {
    const { inventory, config, homePos } = ctx
    for (const crop of config.crops) {
      if (hasCropToStore(inventory, crop.cropType)) return true
    }
    return false
  }

  execute(ctx: ITaskContext): void {
    const { config, dimension, location, inventory, homePos } = ctx
    const chests = findChests(location, dimension, config, homePos)
    if (chests.length === 0) return

    ctx.navigateTo(this.name, this.timeout, chests, (target) => {
      const chestPos = { x: target.location.x, y: target.location.y - 1, z: target.location.z }
      const container = getChestContainer(dimension, chestPos)
      if (!container) return true

      let storedAny = false
      for (let i = 0; i < inventory.size; i++) {
        const item = inventory.getItem(i)
        if (!item) continue
        if (isSeed(item.typeId, config)) continue
        if (Utils.transferItemBetweenContainers(i, inventory, container)) {
          storedAny = true
        }
      }

      return storedAny
    })
  }
}

function hasCropToStore(inv: Container, cropType: string): boolean {
  for (let i = 0; i < inv.size; i++) {
    const item = inv.getItem(i)
    if (item && item.typeId === cropType) return true
  }
  return false
}

function isSeed(typeId: string, config: import("../core/types.js").IGolemConfig): boolean {
  return config.crops.some(c => c.seedType === typeId)
}

function isInHomeRange(pos: Vector3, homePos: Vector3 | undefined, homeRange: number): boolean {
  if (!homePos) return true
  const dx = pos.x - homePos.x
  const dy = pos.y - homePos.y
  const dz = pos.z - homePos.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz) <= homeRange
}

function findChests(location: Vector3, dimension: Dimension, config: import("../core/types.js").IGolemConfig, homePos?: Vector3): Vector3[] {
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
