import { Control } from '../properties/control.js'
import { DataBinding } from '../properties/dataBinding.js'
import { Factory } from '../properties/factory.js'
import { Layout } from '../properties/layout.js'
import { UIElement } from './uiElement.js'

export class Panel extends UIElement {
  factory: Factory

  /**
   * @param {string} id
   * @param {string} [template]
   */
  constructor(id: string, template?: string) {
    super(id, 'panel', template)
    this.control = new Control()
    this.layout = new Layout()
    this.dataBinding = new DataBinding()
    this.factory = new Factory()
  }

  setLayout(layout: Layout): this {
    if (!(layout instanceof Layout)) throw new Error('参数需要Layout类')
    this.layout = layout
    return this
  }

  protected serializableSources(): object[] {
    return [this.layout, this.dataBinding, this.factory, this.control]
  }
}