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
 *   .onTick()                        // 只声明事件类型，生成骨架代码
 *   .onPlayerInteract(({ player }) => { ... })  // 带完整 handler
 *
 * // 在 block JSON 中注册组件 ID
 * block.addComponent(BlockComponent.setCustomComponents([comp.id()]))
 * ```
 */
export class BlockCustomComponentBuilder {
  private static allInstances: BlockCustomComponentBuilder[] = []
  private componentId: string
  private handlers: BlockCustomComponentHandlers = {}
  private declaredEvents: Set<string> = new Set()

  constructor(componentId: string) {
    if (!componentId || typeof componentId !== 'string') {
      throw new Error('componentId is required and must be a string')
    }
    this.componentId = componentId
    BlockCustomComponentBuilder.allInstances.push(this)
  }

  /** 返回所有已创建的构建器实例 */
  static getAllInstances(): BlockCustomComponentBuilder[] {
    return BlockCustomComponentBuilder.allInstances
  }

  /** 重置实例列表（用于测试/热重载） */
  static resetInstances(): void {
    BlockCustomComponentBuilder.allInstances.length = 0
  }

  /** 返回组件标识符，用于 setCustomComponents */
  id(): string {
    return this.componentId
  }

  /** 返回已声明（含 handler）的事件名称列表 */
  declaredEventNames(): string[] {
    return [...this.declaredEvents]
  }

  /** 返回已注册的事件处理器数量 */
  handlerCount(): number {
    return Object.keys(this.handlers).length
  }

  beforeOnPlayerPlace(handler?: (event: BeforeOnPlayerPlaceEvent) => void): this {
    this.declaredEvents.add('beforeOnPlayerPlace')
    if (handler) this.handlers.beforeOnPlayerPlace = handler; return this
  }

  onBlockStateChange(handler?: (event: OnBlockStateChangeEvent) => void): this {
    this.declaredEvents.add('onBlockStateChange')
    if (handler) this.handlers.onBlockStateChange = handler; return this
  }

  onBreak(handler?: (event: OnBreakEvent) => void): this {
    this.declaredEvents.add('onBreak')
    if (handler) this.handlers.onBreak = handler; return this
  }

  onEntity(handler?: (event: OnEntityEvent) => void): this {
    this.declaredEvents.add('onEntity')
    if (handler) this.handlers.onEntity = handler; return this
  }

  onEntityFallOn(handler?: (event: OnEntityFallOnEvent) => void): this {
    this.declaredEvents.add('onEntityFallOn')
    if (handler) this.handlers.onEntityFallOn = handler; return this
  }

  onPlace(handler?: (event: OnPlaceEvent) => void): this {
    this.declaredEvents.add('onPlace')
    if (handler) this.handlers.onPlace = handler; return this
  }

  onPlayerBreak(handler?: (event: OnPlayerBreakEvent) => void): this {
    this.declaredEvents.add('onPlayerBreak')
    if (handler) this.handlers.onPlayerBreak = handler; return this
  }

  onPlayerInteract(handler?: (event: OnPlayerInteractEvent) => void): this {
    this.declaredEvents.add('onPlayerInteract')
    if (handler) this.handlers.onPlayerInteract = handler; return this
  }

  onRandomTick(handler?: (event: OnRandomTickEvent) => void): this {
    this.declaredEvents.add('onRandomTick')
    if (handler) this.handlers.onRandomTick = handler; return this
  }

  onRedstoneUpdate(handler?: (event: OnRedstoneUpdateEvent) => void): this {
    this.declaredEvents.add('onRedstoneUpdate')
    if (handler) this.handlers.onRedstoneUpdate = handler; return this
  }

  onStepOff(handler?: (event: OnStepOffEvent) => void): this {
    this.declaredEvents.add('onStepOff')
    if (handler) this.handlers.onStepOff = handler; return this
  }

  onStepOn(handler?: (event: OnStepOnEvent) => void): this {
    this.declaredEvents.add('onStepOn')
    if (handler) this.handlers.onStepOn = handler; return this
  }

  onTick(handler?: (event: OnTickEvent) => void): this {
    this.declaredEvents.add('onTick')
    if (handler) this.handlers.onTick = handler; return this
  }

  /** 构建处理器对象，可用于 runtime 的 registerCustomComponent */
  build(): BlockCustomComponentHandlers {
    return { ...this.handlers }
  }

  /** 生成 runtime 脚本模块源码 */
  generateRuntimeCode(): string {
    const safeName = this.componentId.replace(/[^a-zA-Z0-9_]/g, '_')
    const lines: string[] = []
    lines.push('// Auto-generated by sapdon. Edit to implement your component.')
    lines.push(`import { world } from '@minecraft/server';\n`)
    lines.push(`const ${safeName} = {`)

    for (const eventName of this.declaredEvents) {
      const handler = this.handlers[eventName as keyof BlockCustomComponentHandlers]
      const params = eventParamNames[eventName] || 'event'
      if (handler) {
        const fnSrc = handler.toString()
        lines.push(`  ${eventName}: ${fnSrc},`)
      } else {
        lines.push(`  ${eventName}(${params}) {`)
        lines.push(`    // TODO: implement`)
        lines.push(`  },`)
      }
    }

    lines.push('};\n')
    lines.push(`export { ${safeName} };`)
    return lines.join('\n')
  }
}

/** 各事件的参数名映射 */
const eventParamNames: Record<string, string> = {
  beforeOnPlayerPlace: '{ block, dimension, face, permutationToPlace, player }',
  onBlockStateChange: '{ block, dimension, previousPermutation }',
  onBreak: '{ block, dimension, brokenBlockPermutation }',
  onEntity: '{ block, dimension, entitySource }',
  onEntityFallOn: '{ block, dimension, entity, fallDistance }',
  onPlace: '{ block, dimension, previousBlock }',
  onPlayerBreak: '{ block, dimension, player }',
  onPlayerInteract: '{ block, dimension, face, faceLocation, player }',
  onRandomTick: '{ block, dimension }',
  onRedstoneUpdate: '{ block, dimension, power }',
  onStepOff: '{ block, dimension, entity }',
  onStepOn: '{ block, dimension, entity }',
  onTick: '{ block, dimension }',
}
