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
    /**
     * 设置网格的列数和行数。
     * @param {number[]} dimensions - 格式为 [columns, rows]
     * @returns {GridProp} 返回当前实例以支持链式调用
     */
    setGridDimensions(dimensions: number[]): GridProp;
    grid_dimensions: number[] | undefined;
    /**
     * 设置网格生成的最大项目数。
     * @param {number} maxItems - 最大项目数
     * @returns {GridProp} 返回当前实例以支持链式调用
     */
    setMaximumGridItems(maxItems: number): GridProp;
    maximum_grid_items: number | undefined;
    /**
     * 设置网格尺寸的绑定名称。
     * @param {string} binding - 绑定名称
     * @returns {GridProp} 返回当前实例以支持链式调用
     */
    setGridDimensionBinding(binding: string): GridProp;
    grid_dimension_binding: string | undefined;
    /**
     * 设置网格重新缩放方向。
     * @param {string} type - 可能值：vertical, horizontal, none（默认值：none）
     * @returns {GridProp} 返回当前实例以支持链式调用
     */
    setGridRescalingType(type?: string): GridProp;
    grid_rescaling_type: string | undefined;
    /**
     * 设置网格填充方向。
     * @param {string} direction - 可能值：vertical, horizontal, none（默认值：none）
     * @returns {GridProp} 返回当前实例以支持链式调用
     */
    setGridFillDirection(direction?: string): GridProp;
    grid_fill_direction: string | undefined;
    /**
     * 设置处理集合的子元素名称。
     * @param {string} template - 元素名称（例如："common.container_item"）
     * @returns {GridProp} 返回当前实例以支持链式调用
     */
    setGridItemTemplate(template: string): GridProp;
    grid_item_template: string | undefined;
    /**
     * 设置预缓存的网格项目数量。
     * @param {number} count - 预缓存数量
     * @returns {GridProp} 返回当前实例以支持链式调用
     */
    setPrecachedGridItemCount(count: number): GridProp;
    precached_grid_item_count: number | undefined;
}
