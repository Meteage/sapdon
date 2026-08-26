import { GridProp } from '../properties/gridProp.js'
import type { Offset2, JsonUIBag } from '../types.js'
import { CollectionPanel } from './collectionPanel.js'
import { Panel } from './panel.js'
import { UIElement, type SerializedElement } from './uiElement.js'

export class Grid extends CollectionPanel {
  gridNum: number
  grid: GridProp

  constructor(id: string, template?: string) {
    super(id, template)
    this.gridNum = 0
    this.grid = new GridProp()
  }

  setGridProp(grid_prop: GridProp): this {
    this.grid = grid_prop
    return this
  }

  addGridItem(grid_position: Offset2, content: UIElement | JsonUIBag, name?: string): this {
    const item_name = name || `grid_item_${this.gridNum}`
    const grid_item = new Panel(item_name)
    grid_item.addProp('grid_position', grid_position)
    grid_item.addControl(content)
    this.addControl(grid_item)
    this.gridNum++
    return this
  }

  serialize(): SerializedElement {
    // 复制grid的属性
    for (const key in this.grid) {
      if (this.grid.hasOwnProperty(key)) {
        this.properties.set(key, this.grid[key])
      }
    }
    // 类型修正
    this.properties.set('type', 'grid')

    return super.serialize()
  }
}