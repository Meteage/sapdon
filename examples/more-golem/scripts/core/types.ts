import { Container, Dimension, Entity, Vector3 } from "@minecraft/server"

export interface ICropConfig {
  seedType: string
  cropType: string
  growthState: number
}

export interface IGolemConfig {
  scanRange: number
  scanInterval: number
  tickInterval: number
  cooldownDuration: number
  crops: ICropConfig[]
  chestTypes: string[]
}

export const DEFAULT_GOLEM_CONFIG: IGolemConfig = {
  scanRange: 8,
  scanInterval: 40,
  tickInterval: 40,
  cooldownDuration: 200,
  crops: [
    { seedType: "minecraft:wheat_seeds", cropType: "minecraft:wheat", growthState: 7 }
  ],
  chestTypes: ["minecraft:chest"]
}

export const GOLEM_PROPERTY = "more_golem:golem_index"
export const TARGET_PROPERTY = "more_golem:target_index"

export const GOLEM_FARMER_TYPE = "more_golem:frame_golem"
export const GOLEM_TARGET_TYPE = "more_golem:golem_target"

export interface ITaskContext {
  golem: BaseGolemLike
  dimension: Dimension
  inventory: Container
  location: Vector3
  config: IGolemConfig
  navigateTo(taskName: string, timeout: number, targets: Vector3[], onArrive: (target: Entity) => boolean): void
}

export interface BaseGolemLike {
  self: Entity
  numberId: number
  setWaypoint(location: Vector3): boolean
  inventoryHas(typeId: string): boolean
  inventoryHasAmount(typeId: string, amount: number): boolean
  getContext(): ITaskContext
}
