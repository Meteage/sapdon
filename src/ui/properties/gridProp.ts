/**
 * Grid 类
 *
 * 该类表示一个网格控件属性，用于管理网格布局及其相关属性。
 *
 * 属性：
 * - grid_dimensions: Vector [columns, rows] - 网格的列数和行数
 * - maximum_grid_items: int - 网格生成的最大项目数
 * - grid_dimension_binding: string - 网格尺寸的绑定名称
 * - grid_rescaling_type: enum - 网格重新缩放方向（可能值：vertical, horizontal, none，默认值：none）
 * - grid_fill_direction: enum - 网格填充方向（可能值：vertical, horizontal, none，默认值：none）
 * - grid_item_template: string - 处理集合的子元素名称（例如："common.container_item"）
 * - precached_grid_item_count: int - 预缓存的网格项目数量
 */

export class GridProp {
  [key: string]: unknown

  declare grid_dimensions: [number, number]
  declare maximum_grid_items: number
  declare grid_dimension_binding: string
  declare grid_rescaling_type: 'vertical' | 'horizontal' | 'none'
  declare grid_fill_direction: 'vertical' | 'horizontal' | 'none'
  declare grid_item_template: string
  declare precached_grid_item_count: number

  /**
   * 设置网格的列数和行数。
   * @param {[number, number]} dimensions - 格式为 [columns, rows]
   * @returns {GridProp} 返回当前实例以支持链式调用
   */
  setGridDimensions(dimensions: [number, number]): this {
    this.grid_dimensions = dimensions
    return this
  }

  /**
   * 设置网格生成的最大项目数。
   * @param {number} maxItems - 最大项目数
   * @returns {GridProp} 返回当前实例以支持链式调用
   */
  setMaximumGridItems(maxItems: number): this {
    this.maximum_grid_items = maxItems
    return this
  }

  /**
   * 设置网格尺寸的绑定名称。
   * @param {string} binding - 绑定名称
   * @returns {GridProp} 返回当前实例以支持链式调用
   */
  setGridDimensionBinding(binding: string): this {
    this.grid_dimension_binding = binding
    return this
  }

  /**
   * 设置网格重新缩放方向。
   * @param {'vertical' | 'horizontal' | 'none'} type - 可能值：vertical, horizontal, none（默认值：none）
   * @returns {GridProp} 返回当前实例以支持链式调用
   */
  setGridRescalingType(type: 'vertical' | 'horizontal' | 'none' = 'none'): this {
    this.grid_rescaling_type = type
    return this
  }

  /**
   * 设置网格填充方向。
   * @param {'vertical' | 'horizontal' | 'none'} direction - 可能值：vertical, horizontal, none（默认值：none）
   * @returns {GridProp} 返回当前实例以支持链式调用
   */
  setGridFillDirection(direction: 'vertical' | 'horizontal' | 'none' = 'none'): this {
    this.grid_fill_direction = direction
    return this
  }

  /**
   * 设置处理集合的子元素名称。
   * @param {string} template - 元素名称（例如："common.container_item"）
   * @returns {GridProp} 返回当前实例以支持链式调用
   */
  setGridItemTemplate(template: string): this {
    this.grid_item_template = template
    return this
  }

  /**
   * 设置预缓存的网格项目数量。
   * @param {number} count - 预缓存数量
   * @returns {GridProp} 返回当前实例以支持链式调用
   */
  setPrecachedGridItemCount(count: number): this {
    this.precached_grid_item_count = count
    return this
  }
}