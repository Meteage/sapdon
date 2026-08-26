import { Layout } from '../properties/layout.js'
import type { JsonUIBag, Size2 } from '../types.js'
import { Panel } from './panel.js'
import { type UIElement, type SerializedElement } from './uiElement.js'

export class StackPanel extends Panel {
  orientation: string
  stackNum: number

  constructor(id: string, template?: string) {
    super(id, template)
    this.type = 'stack_panel'
    this.orientation = 'vertical'
    this.stackNum = 0

    // init
    this.setLayout(new Layout().setSize(['100%', '100%']))
  }

  addStack(size: Size2 | string, content: UIElement | JsonUIBag, debug = false): this {
    const stack = new Panel(`stack${this.stackNum}`)
      .setLayout(new Layout().setSize(size))
      .addControl(content)
    if (debug) stack.enableDebug()
    this.addControl(stack)
    this.stackNum++
    return this
  }

  /**
   * Possible values:
     vertical
     horizontal
   * @param {string} orientation
   */
  setOrientation(orientation: string): this {
    this.orientation = orientation
    return this
  }

  serialize(): SerializedElement {
    this.properties.set('type', 'stack_panel')
    this.properties.set('orientation', this.orientation)
    return super.serialize()
  }
}