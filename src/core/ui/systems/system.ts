import { UISystemRegistry } from '../registry/uiSystemRegistry.js'
import { Serializer } from '../../../utils/index.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any

// UI 文件核心类
export class UISystem {
  identifier: string
  namespace: string
  name: string
  path: string
  elements: Map<string, Any>
  animations: Map<string, Any>

  constructor(identifier: string, path: string) {
    this.identifier = identifier
    this.namespace = identifier.split(':')[0]
    this.name = identifier.split(':')[1]
    this.path = path
    this.elements = new Map()
    this.animations = new Map()

    UISystemRegistry.registerUISystem(this)
  }

  addElement(element: Any): this {
    this.elements.set(element.id, element)
    return this
  }

  getElement(element_name: string): Any {
    return this.elements.get(element_name)
  }

  addAnimation(name: string, value: Any): void {
    this.animations.set(name, value)
  }

  getAnimation(animation_name: string): Any {
    return this.animations.get(animation_name)
  }

  @Serializer
  toObject(): Record<string, Any> {
    const ui: Record<string, Any> = { namespace: this.namespace }
    // 序列化
    this.elements.forEach((value, key) => {
      ui[key] = value.serialize()[value.id]
    })
    return ui
  }
}