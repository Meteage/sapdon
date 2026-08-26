import { Control } from '../properties/control.js'
import { DataBinding } from '../properties/dataBinding.js'
import { Factory } from '../properties/factory.js'
import { Layout } from '../properties/layout.js'
import { Sprite } from '../properties/sprite.js'
import { UIElement } from './uiElement.js'

export class Image extends UIElement {
  sprite: Sprite
  factory: Factory

  constructor(id: string, template?: string) {
    super(id, 'image', template)
    this.sprite = new Sprite()
    this.control = new Control()
    this.layout = new Layout()
    this.dataBinding = new DataBinding()
    this.factory = new Factory()
  }

  setSprite(sprite: Sprite): this {
    this.sprite = sprite
    return this
  }

  protected serializableSources(): object[] {
    return [this.sprite, this.layout, this.dataBinding, this.factory, this.control]
  }
}