/**
 * Elements
    A JSON UI element is the basic form of data within JSON UI. Elements must have a unique name for each namespace so as to not have a conflict with other elements of the same name yet may have different functions.

    Here the element type is label so it will render a text of Hello World when called:

    vanilla/ui/example_file.json

    {
        "test_element": {
            "type": "label",
            "text": "Hello World"
        }
    }
    Types
    The following are some of the element types, which are possible values for the type property:

    label - for creating text objects
    image - for rendering images from a filepath provided
    button - for creating interactive and clickable elements
    panel - an empty container where you can store all other elements that may overlap to each other
    stack_panel - an empty container where you can store all other elements in a stack that doesn't overlap to each other
    grid - uses another element as a template, and then renders it repeatedly in multiple rows and columns
    factory - renders an element based off of another element, is capable of calling hardcoded values and variables
    custom - is paired with another property renderer which renders hardcoded JSON UI elements
    screen - elements that are called by the game directly, usually root panel elements
 */

import type { JsonUIBag, ModificationOperation } from '../types.js'
import { DataBinding } from '../properties/dataBinding.js'
import { Control } from '../properties/control.js'
import { Layout } from '../properties/layout.js'

// 基础元素序列化结果：id → JSON UI 对象
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SerializedElement = Record<string, JsonUIBag>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyJSON = any

// 基础元素类
export class UIElement {
  type: string | undefined
  id: string
  name: string
  control: Control
  layout: Layout
  properties: Map<string, AnyJSON>
  variables: Map<string, AnyJSON>
  dataBinding: DataBinding
  modifications: { array_name: string; operation: ModificationOperation; value: AnyJSON }[]

  constructor(name: string, type?: string, template?: string) {
    this.type = type
    this.id = template ? `${name}@${template}` : name
    this.name = name
    this.control = new Control()
    this.layout = new Layout()
    this.properties = new Map().set('type', type)
    this.variables = new Map()
    this.dataBinding = new DataBinding()
    this.modifications = []
  }

  enableDebug(color?: [number, number, number, number]): this {
    const board: { type: string; texture: string; nineslice_size: number; fill: boolean; keep_ratio: boolean; size: string[]; color?: number[] } = {
      type: 'image',
      texture: 'textures/ui/focus_border_white',
      nineslice_size: 1,
      fill: true,
      keep_ratio: false,
      size: ['100%', '100%'],
    }
    if (color) board.color = color
    this.control.addControl({ debug_board: board })
    return this
  }

  setLayout(layout: Layout): this {
    if (!(layout instanceof Layout)) throw new Error('参数需要Layout类')
    this.layout = layout
    return this
  }

  setControl(control: Control): this {
    this.control = control
    return this
  }

  addControl(control: UIElement | JsonUIBag): this {
    if (control instanceof UIElement) {
      this.control.addControl(control.serialize())
    } else {
      this.control.addControl(control)
    }
    return this
  }

  addControls(controls: (UIElement | JsonUIBag)[]): this {
    for (const i in controls) {
      this.addControl(controls[i])
    }
    return this
  }

  addVariable(name: string, value: AnyJSON): this {
    this.variables.set(`$${name}`, value)
    return this
  }

  addProp(name: string, value: AnyJSON): this {
    this.properties.set(name, value)
    return this
  }

  addModification(modification: { array_name: string; operation: ModificationOperation; value: AnyJSON }): this {
    this.modifications.push({
      array_name: modification.array_name,
      operation: modification.operation,
      value: modification.value,
    })
    this.addProp('modifications', this.modifications)
    return this
  }

  /**
   * 声明待序列化合并的属性包（子类覆写以加入自己的专属属性包）。
   * 合并顺序对结果无影响：重复键值均相同。
   */
  protected serializableSources(): object[] {
    return [this.control, this.dataBinding, this.layout]
  }

  serialize(): SerializedElement {
    // 复制所有属性包的属性
    for (const src of this.serializableSources()) {
      for (const key in src) {
        if (src.hasOwnProperty(key)) {
          this.properties.set(key, (src as JsonUIBag)[key])
        }
      }
    }

    const json = Object.fromEntries(this.properties)
    Object.assign(json, Object.fromEntries(this.variables))
    return {
      [this.id]: json,
    }
  }
}

// Modifications 方法
/**
 * Modifications
    To modify JSON UI in a non-intrusive way, you can use the modifications property to modify previously existing JSON UI elements from other packs (usually vanilla JSON UI files). Doing this makes sure only necessary parts are modified unless otherwise intended, to improve compatibility with other packs that modify the JSON UI.

    Modification	Description
    insert_back	insert at end of array
    insert_front	insert at start of array
    insert_after	insert after target in array
    insert_before	insert before target in array
    move_back	move target to end of array
    move_front	move target to start of array
    move_after	move target after second target
    move_before	move target before second target
    swap	swap first target with second target
    replace	replace first target with second target
    remove	remove target
 */
// Modifications操作类型常量类
export class Modifications {
  static OPERATION = Object.freeze({
    INSERT_BACK: 'insert_back',
    INSERT_FRONT: 'insert_front',
    INSERT_AFTER: 'insert_after',
    INSERT_BEFORE: 'insert_before',
    MOVE_BACK: 'move_back',
    MOVE_FRONT: 'move_front',
    MOVE_AFTER: 'move_after',
    MOVE_BEFORE: 'move_before',
    SWAP: 'swap',
    REPLACE: 'replace',
    REMOVE: 'remove',
  } as const)
}