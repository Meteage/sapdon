import { DataBindingObject } from '../dataBindingObject.js'

export class DataBinding {
  [key: string]: unknown

  declare bindings: DataBindingObject[]
  declare binding: DataBindingObject

  setBinding(binding: DataBindingObject): this {
    if (!this.bindings) this.bindings = []
    this.binding = binding
    return this
  }

  addDataBinding(dataBindingObject: DataBindingObject): this {
    if (!this.bindings) this.bindings = []
    this.bindings.push(dataBindingObject)
    return this
  }
}