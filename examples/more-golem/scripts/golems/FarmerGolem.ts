import { Dimension, Vector3, system } from "@minecraft/server"
import { BaseGolem, IGolemConfig } from "../core/index.js"
import { PlantTask, HarvestTask, FetchSeedsTask, StoreItemsTask } from "../tasks/index.js"

const FARMER_CONFIG: IGolemConfig = {
  scanRange: 8,
  scanInterval: 40,
  tickInterval: 40,
  cooldownDuration: 200,
  crops: [{ seedType: "minecraft:wheat_seeds", cropType: "minecraft:wheat", growthState: 7 }],
  chestTypes: ["minecraft:chest"],
}

export class FarmerGolem extends BaseGolem {
  constructor(dimension: Dimension, numberId: number, location: Vector3) {
    super(dimension, "more_golem:frame_golem", numberId, location, FARMER_CONFIG)

    this.addTask(new PlantTask())
    this.addTask(new HarvestTask())
    this.addTask(new FetchSeedsTask())
    this.addTask(new StoreItemsTask())

    system.runInterval(() => this.tickTasks(), FARMER_CONFIG.tickInterval)
  }
}
