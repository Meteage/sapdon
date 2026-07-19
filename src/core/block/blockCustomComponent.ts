// ===== 事件参数类型 =====

export interface BeforeOnPlayerPlaceEvent {
  block: any
  cancel: boolean
  dimension: any
  face: string
  permutationToPlace: any
  player?: any
}

export interface OnBlockStateChangeEvent {
  block: any
  dimension: any
  previousPermutation: any
}

export interface OnBreakEvent {
  block: any
  dimension: any
  blockDestructionSource?: any
  brokenBlockPermutation: any
  entitySource?: any
}

export interface OnEntityEvent {
  block: any
  blockPermutation: any
  dimension: any
  entitySource: any
  name: string
}

export interface OnEntityFallOnEvent {
  block: any
  dimension: any
  entity?: any
  fallDistance: number
}

export interface OnPlaceEvent {
  block: any
  dimension: any
  previousBlock: any
}

export interface OnPlayerBreakEvent {
  block: any
  brokenBlockPermutation: any
  dimension: any
  player?: any
}

export interface OnPlayerInteractEvent {
  block: any
  dimension: any
  face: string
  faceLocation: any
  player?: any
}

export interface OnRandomTickEvent {
  block: any
  dimension: any
}

export interface OnRedstoneUpdateEvent {
  block: any
  dimension: any
  power: number
}

export interface OnStepOffEvent {
  block: any
  dimension: any
  entity?: any
}

export interface OnStepOnEvent {
  block: any
  dimension: any
  entity?: any
}

export interface OnTickEvent {
  block: any
  dimension: any
}

export interface BlockCustomComponentHandlers {
  beforeOnPlayerPlace?: (event: BeforeOnPlayerPlaceEvent) => void
  onBlockStateChange?: (event: OnBlockStateChangeEvent) => void
  onBreak?: (event: OnBreakEvent) => void
  onEntity?: (event: OnEntityEvent) => void
  onEntityFallOn?: (event: OnEntityFallOnEvent) => void
  onPlace?: (event: OnPlaceEvent) => void
  onPlayerBreak?: (event: OnPlayerBreakEvent) => void
  onPlayerInteract?: (event: OnPlayerInteractEvent) => void
  onRandomTick?: (event: OnRandomTickEvent) => void
  onRedstoneUpdate?: (event: OnRedstoneUpdateEvent) => void
  onStepOff?: (event: OnStepOffEvent) => void
  onStepOn?: (event: OnStepOnEvent) => void
  onTick?: (event: OnTickEvent) => void
}

/**
 * 块自定义组件构建器 - 提供流式 API 定义块事件处理器，
 * 并提供类型安全的事件参数绑定。
 *
 * @example
 * ```ts
 * const comp = new BlockCustomComponentBuilder('wiki:my_comp')
 *   .onTick(({ block }) => { block.setPermutation(...) })
 *   .onPlayerInteract(({ player }) => { ... })
 *
 * // 在 block JSON 中注册组件 ID
 * block.addComponent(BlockComponent.setCustomComponents([comp.id()]))
 * ```
 */
export class BlockCustomComponentBuilder {
  private componentId: string
  private handlers: BlockCustomComponentHandlers = {}

  constructor(componentId: string) {
    if (!componentId || typeof componentId !== 'string') {
      throw new Error('componentId is required and must be a string')
    }
    this.componentId = componentId
  }

  /** 返回组件标识符，用于 setCustomComponents */
  id(): string {
    return this.componentId
  }

  /** 返回已注册的事件处理器数量 */
  handlerCount(): number {
    return Object.keys(this.handlers).length
  }

  beforeOnPlayerPlace(handler: (event: BeforeOnPlayerPlaceEvent) => void): this {
    this.handlers.beforeOnPlayerPlace = handler; return this
  }

  onBlockStateChange(handler: (event: OnBlockStateChangeEvent) => void): this {
    this.handlers.onBlockStateChange = handler; return this
  }

  onBreak(handler: (event: OnBreakEvent) => void): this {
    this.handlers.onBreak = handler; return this
  }

  onEntity(handler: (event: OnEntityEvent) => void): this {
    this.handlers.onEntity = handler; return this
  }

  onEntityFallOn(handler: (event: OnEntityFallOnEvent) => void): this {
    this.handlers.onEntityFallOn = handler; return this
  }

  onPlace(handler: (event: OnPlaceEvent) => void): this {
    this.handlers.onPlace = handler; return this
  }

  onPlayerBreak(handler: (event: OnPlayerBreakEvent) => void): this {
    this.handlers.onPlayerBreak = handler; return this
  }

  onPlayerInteract(handler: (event: OnPlayerInteractEvent) => void): this {
    this.handlers.onPlayerInteract = handler; return this
  }

  onRandomTick(handler: (event: OnRandomTickEvent) => void): this {
    this.handlers.onRandomTick = handler; return this
  }

  onRedstoneUpdate(handler: (event: OnRedstoneUpdateEvent) => void): this {
    this.handlers.onRedstoneUpdate = handler; return this
  }

  onStepOff(handler: (event: OnStepOffEvent) => void): this {
    this.handlers.onStepOff = handler; return this
  }

  onStepOn(handler: (event: OnStepOnEvent) => void): this {
    this.handlers.onStepOn = handler; return this
  }

  onTick(handler: (event: OnTickEvent) => void): this {
    this.handlers.onTick = handler; return this
  }

  /** 构建处理器对象，可用于 runtime 的 registerCustomComponent */
  build(): BlockCustomComponentHandlers {
    return { ...this.handlers }
  }

}
