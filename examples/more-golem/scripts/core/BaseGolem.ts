import { BlockFilter, BlockVolume, Container, Dimension, Entity, EntityComponentTypes, Vector3, world, system } from "@minecraft/server"
import { TaskEngine } from "./task/TaskEngine.js"
import { ITaskContext, IGolemConfig, DEFAULT_GOLEM_CONFIG, GOLEM_PROPERTY, TARGET_PROPERTY, GOLEM_TARGET_TYPE } from "./types.js"

type position = `${number},${number},${number}`

export abstract class BaseGolem {
  static activeGolems = new Map<number, BaseGolem>()

  readonly self: Entity
  readonly numberId: number
  protected inventory: Container
  protected engine: TaskEngine = new TaskEngine()
  protected config: IGolemConfig
  protected intervalIds: number[] = []

  readonly homePos: Vector3

  private targetMap = new Map<position, Entity>()
  private currentCallback: ((target: Entity) => boolean) | null = null
  private currentTaskName: string | null = null
  private currentTimeout = 0
  private navStartTick = 0

  constructor(dim: Dimension, typeId: string, numberId: number, location: Vector3, config: IGolemConfig = DEFAULT_GOLEM_CONFIG, existingEntity?: Entity) {
    this.config = config
    this.numberId = numberId
    this.homePos = { x: location.x, y: location.y, z: location.z }
    this.self = existingEntity ?? this.spawnGolem(dim, typeId, location)
    this.inventory = this.self.getComponent(EntityComponentTypes.Inventory)!.container!

    BaseGolem.activeGolems.set(this.numberId, this)
    this.initIntervals(dim)
  }

  private spawnGolem(dim: Dimension, typeId: string, location: Vector3): Entity {
    const golem = dim.spawnEntity(typeId, location)
    golem.setProperty(GOLEM_PROPERTY, this.numberId)
    golem.nameTag = String(this.numberId)
    return golem
  }

  private spawnTarget(dim: Dimension, location: Vector3): Entity | undefined {
    const key = this.locationToPosition(location)
    const gridLoc = this.getGridLocation(location)
    if (this.targetMap.has(key)) return undefined
    const target = dim.spawnEntity(GOLEM_TARGET_TYPE, gridLoc)
    target.setProperty(TARGET_PROPERTY, this.numberId)
    this.targetMap.set(key, target)
    return target
  }

  setWaypoint(location: Vector3): boolean {
    const target = this.spawnTarget(this.self.dimension, location)
    return target !== undefined
  }

  protected placeWaypoints(waypoints: Vector3[]) {
    waypoints.forEach(pos => this.spawnTarget(this.self.dimension, pos))
  }

  protected clearAllTargets() {
    for (const [, target] of this.targetMap) {
      if (target.isValid) target.remove()
    }
    this.targetMap.clear()
  }

  protected registerTask(taskName: string, timeout: number, targetList: Vector3[], onArrive: (target: Entity) => boolean) {
    if (this.targetMap.size > 0) return
    if (targetList.length === 0) return

    this.currentTaskName = taskName
    this.currentTimeout = timeout
    this.currentCallback = onArrive
    this.navStartTick = system.currentTick
    this.placeWaypoints(targetList)
  }

  protected tickNavigation() {
    if (this.targetMap.size === 0) return

    const elapsed = system.currentTick - this.navStartTick
    if (elapsed >= this.currentTimeout) {
      if (this.currentTaskName) {
        const cdS = (this.config.cooldownDuration / 20).toFixed(1)
        world.sendMessage(`§7[#${this.numberId}] §f${this.currentTaskName.padEnd(14)} §7· §cTIMEOUT · CD ${cdS}s`)
        this.engine.setCooldown(this.currentTaskName, this.config.cooldownDuration)
      }
      this.clearAllTargets()
      this.currentTaskName = null
      this.currentCallback = null
      return
    }

    let bestKey: position | null = null
    let bestTarget: Entity | null = null
    let bestDist = Infinity

    for (const [key, target] of this.targetMap) {
      if (!target.isValid) { this.targetMap.delete(key); continue }
      const dist = this.distance(this.self.location, target.location)
      if (dist < bestDist) {
        bestDist = dist
        bestKey = key
        bestTarget = target
      }
    }

    if (!bestKey || !bestTarget || bestDist > 2) return

    this.currentCallback?.(bestTarget)
    this.navStartTick = system.currentTick
    if (bestTarget.isValid) bestTarget.remove()
    this.targetMap.delete(bestKey)
  }

  navigateTo(taskName: string, timeout: number, targets: Vector3[], onArrive: (target: Entity) => boolean) {
    this.registerTask(taskName, timeout, targets, onArrive)
  }

  addTask(task: import("./task/ITask.js").ITask) {
    this.engine.register(task)
  }

  getContext(): ITaskContext {
    return {
      golem: this,
      dimension: this.self.dimension,
      inventory: this.inventory,
      location: this.self.location,
      config: this.config,
      homePos: this.homePos,
      homeRange: this.config.homeRange,
      navigateTo: (taskName, timeout, targets, onArrive) => this.navigateTo(taskName, timeout, targets, onArrive),
    }
  }

  isInHomeRange(pos: Vector3): boolean {
    const dx = pos.x - this.homePos.x
    const dy = pos.y - this.homePos.y
    const dz = pos.z - this.homePos.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz) <= this.config.homeRange
  }

  remove() {
    BaseGolem.activeGolems.delete(this.numberId)
    this.clearAllTargets()
    for (const id of this.intervalIds) {
      system.clearRun(id)
    }
    if (this.self.isValid) this.self.remove()
  }

  isValid(): boolean {
    return this.self.isValid
  }

  private initIntervals(dim: Dimension) {
    this.intervalIds.push(system.runInterval(() => {
      for (const [, target] of this.targetMap) {
        if (!target.isValid) continue
        dim.spawnParticle("minecraft:blue_flame_particle", target.location)
      }
    }, 10))

    this.intervalIds.push(system.runInterval(() => {
      for (const [key, target] of this.targetMap) {
        if (!target?.isValid) this.targetMap.delete(key)
      }
    }, 20 * 30))

    this.intervalIds.push(system.runInterval(() => {
      if (this.targetMap.size === 0 || !this.currentTaskName) return
      const elapsed = system.currentTick - this.navStartTick
      const remain = Math.max(0, this.currentTimeout - elapsed)
      world.sendMessage(`§7[#${this.numberId}] §f${this.currentTaskName.padEnd(14)} §7· §6${(remain / 20).toFixed(1).padStart(5)}s §7/ ${(this.currentTimeout / 20).toFixed(1)}s`)
    }, 20))
  }

  protected tickTasks() {
    if (!this.self.isValid) return
    this.tickNavigation()
    this.engine.tick(this.getContext())
  }

  private getGridLocation(loc: Vector3): Vector3 {
    return {
      x: Math.ceil(loc.x) + 0.5,
      y: Math.ceil(loc.y) + 1,
      z: Math.ceil(loc.z) + 0.5,
    }
  }

  private locationToPosition(loc: Vector3): position {
    const g = this.getGridLocation(loc)
    return `${g.x},${g.y},${g.z}`
  }

  protected scanNearbyBlocks(
    center: Vector3,
    size: Vector3,
    filter: BlockFilter
  ): Vector3[] {
    const from = { x: center.x - size.x, y: center.y - size.y, z: center.z - size.z }
    const to = { x: center.x + size.x, y: center.y + size.y, z: center.z + size.z }
    const vol = new BlockVolume(from, to)
    const result = this.self.dimension.getBlocks(vol, filter, true)
    return [...result.getBlockLocationIterator()]
  }

  protected findBlocks(center: Vector3, size: Vector3, includeTypes: string[]): Vector3[] {
    return this.scanNearbyBlocks(center, size, { includeTypes })
  }

  protected findBlocksByType(center: Vector3, size: Vector3, typeIds: string[]): Vector3[] {
    return this.scanNearbyBlocks(center, size, { includeTypes: typeIds })
  }

  inventoryHas(typeId: string): boolean {
    if (this.inventory.size === this.inventory.emptySlotsCount) return false
    for (let i = 0; i < this.inventory.size; i++) {
      const item = this.inventory.getItem(i)
      if (item && item.typeId === typeId) return true
    }
    return false
  }

  inventoryHasAmount(typeId: string, amount: number): boolean {
    for (let i = 0; i < this.inventory.size; i++) {
      const item = this.inventory.getItem(i)
      if (item && item.typeId === typeId && item.amount >= amount) return true
    }
    return false
  }

  protected distance(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }
}
