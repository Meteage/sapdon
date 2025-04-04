/**
 * 自定义容器 UI 系统类，用于创建和管理容器界面。
 * 支持动态添加网格项、设置标题、调整尺寸等功能。
 */
export class ContainerUISystem {
    /**
     * 构造函数，初始化容器 UI 系统。
     * @param {string} identifier - 容器的唯一标识符。
     * @param {string} path - 资源路径。
     */
    constructor(identifier: string, path: string);
    system: UISystem;
    title: string;
    root_panel_size: number[];
    gridDimension: number[];
    output_grids: any[];
    main_panel: Panel;
    grids: Grid;
    setInputGrid(output_arr: any): void;
    /**
     * 向网格中添加一个网格项。
     * @param {number[]} grid_position - 网格项的位置 [行, 列] 用于定位实体的背包槽。
     * @param {number[]} offset - 网格项的偏移量 [x, y]。
     * @param {Object} [options] - 可选参数，用于配置网格项。
     * @param {boolean} [options.enable=true] - 是否启用该网格项，默认为 true。
     * @param {number[]} [options.size] - 网格项的大小 [宽度, 高度]。
     * @param {UIElement[]} [options.background_images] - 网格项的背景图片控件。
     * @returns {ContainerUISystem} 返回当前实例以支持链式调用。
     */
    addGridItem(grid_position: number[], offset: number[], options?: {
        enable?: boolean | undefined;
        size?: number[] | undefined;
        background_images?: UIElement[] | undefined;
    }): ContainerUISystem;
    addInputGrid(grid_position: any, offset: any, options: any): void;
    addOutputGrid(grid_position: any, offset: any, options: any): void;
    /**
     * 向主面板中添加一个 UI 元素。
     * @param {Object} element - 要添加的 UI 元素。
     * @returns {ContainerUISystem} 返回当前实例以支持链式调用。
     */
    addElementToMain(element: Object): ContainerUISystem;
    /**
     * 设置网格的维度（行和列）。
     * @param {number[]} dimension - 网格的维度 [行数, 列数]。
     * @returns {ContainerUISystem} 返回当前实例以支持链式调用。
     */
    setGridDimension(dimension: number[]): ContainerUISystem;
    /**
     * 设置容器的标题。
     * @param {string} title - 容器的标题。
     * @returns {ContainerUISystem} 返回当前实例以支持链式调用。
     */
    setTitle(title: string): ContainerUISystem;
    /**
     * 设置根面板的尺寸。
     * @param {number[]} size - 根面板的尺寸 [宽度, 高度]。
     * @returns {ContainerUISystem} 返回当前实例以支持链式调用。
     */
    setSize(size: number[]): ContainerUISystem;
    setItemMatrix(n: any, matrix: any): void;
    #private;
}
import { UISystem } from "./system.js";
import { Panel } from "../elements/panel.js";
import { Grid } from "../elements/grid.js";
import { UIElement } from "../elements/uiElement.js";
