/**
 * Button
    Property Name	Type	Default Value	Description
    default_control	string		Name of the child control that will be displayed only in the default state
    hover_control	string		Name of the child control that will be displayed only in the hover state
    pressed_control	string		Name of the child control that will be displayed only in the pressed state
    locked_control	string		Name of the child control that will be displayed only in the locked state
 */

import { Control } from '../properties/control.js'
import { DataBinding } from '../properties/dataBinding.js'
import { Factory } from '../properties/factory.js'
import { Input } from '../properties/input.js'
import { Layout } from '../properties/layout.js'
import { Sound } from '../properties/sound.js'
import { UIElement } from './uiElement.js'

export class Button extends UIElement {
  input: Input
  sound: Sound
  factory: Factory

  constructor(id: string, template?: string) {
    super(id, 'button', template)
    this.input = new Input()
    this.sound = new Sound()
    this.control = new Control()
    this.layout = new Layout()
    this.dataBinding = new DataBinding()
    this.factory = new Factory()
  }

  setDefaultControl(default_control: string): this {
    this.addProp('default_control', default_control)
    return this
  }

  setHoverControl(hover_control: string): this {
    this.addProp('hover_control', hover_control)
    return this
  }

  setPressedControl(pressed_control: string): this {
    this.addProp('pressed_control', pressed_control)
    return this
  }

  setLockedControl(locked_control: string): this {
    this.addProp('locked_control', locked_control)
    return this
  }

  setInput(input: Input): this {
    if (!(input instanceof Input)) throw new Error('需求Input类')
    this.input = input
    return this
  }

  setSound(sound: Sound): this {
    if (!(sound instanceof Sound)) throw new Error('需求Sound类')
    this.sound = sound
    return this
  }

  setLayout(layout: Layout): this {
    if (!(layout instanceof Layout)) throw new Error('参数需要Layout类')
    this.layout = layout
    return this
  }

  protected serializableSources(): object[] {
    return [this.layout, this.input, this.sound, this.dataBinding, this.factory, this.control]
  }
}