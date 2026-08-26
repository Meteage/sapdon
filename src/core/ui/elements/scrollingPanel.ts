import { Control } from '../properties/control.js'
import { DataBinding } from '../properties/dataBinding.js'
import { Factory } from '../properties/factory.js'
import { Input } from '../properties/input.js'
import { Layout } from '../properties/layout.js'
import { ScrollView } from '../properties/scrollView.js'
import { UIElement } from './uiElement.js'

export class ScrollingPanel extends UIElement {
  input: Input
  scrollView: ScrollView
  factory: Factory

  constructor(id: string, template?: string) {
    super(id, 'scroll_view', template)
    this.input = new Input()
    this.scrollView = new ScrollView()
    this.control = new Control()
    this.layout = new Layout()
    this.dataBinding = new DataBinding()
    this.factory = new Factory()
  }

  protected serializableSources(): object[] {
    return [this.input, this.scrollView, this.layout, this.dataBinding, this.factory, this.control]
  }
}