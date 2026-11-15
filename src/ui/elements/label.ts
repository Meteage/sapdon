import { Control } from '../properties/control.js'
import { DataBinding } from '../properties/dataBinding.js'
import { Factory } from '../properties/factory.js'
import { Layout } from '../properties/layout.js'
import { Text } from '../properties/text.js'
import { UIElement } from './uiElement.js'

export class Label extends UIElement {
  text: Text
  factory: Factory

  constructor(id: string, template?: string) {
    super(id, 'label', template)
    this.text = new Text()
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

  setText(text: Text): this {
    this.text = text
    return this
  }

  protected serializableSources(): object[] {
    return [this.text, this.layout, this.dataBinding, this.factory, this.control]
  }
}