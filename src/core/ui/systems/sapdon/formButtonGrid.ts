import { DataBindingObject } from "../../dataBindingObject.js";
import { Grid } from "../../elements/grid.js";
import { UIElement } from "../../elements/uiElement.js";
import { GridProp } from "../../properties/gridProp.js";
import { Layout } from "../../properties/layout.js";
import { FormButton } from "./formButton.js";

/**
 * FormButtonGrid：按键格盘（几何 + 激活）。
 * 内部一个 Grid（collection: form_buttons），把面板按 dimensions 分格；
 * addButton 时按 index 派生基准格 base 并注入 FormButton 的三组绑定。
 */
export class FormButtonGrid {
    private grid: Grid
    private cols: number
    private rows: number
    private index = 0
    private debug = false

    private static readonly RED = [1, 0, 0, 1] as [number, number, number, number]

    constructor(id: string, options: { dimensions: [number, number]; size: [number | string, number | string] }) {
        const [c, r] = options.dimensions
        this.cols = c
        this.rows = r
        this.grid = new Grid(id)
        this.grid.setGridProp(new GridProp().setGridDimensions([c, r]))
        this.grid.setLayout(new Layout().setSize(options.size as [any, any]))
        this.grid.setCollectionName('form_buttons')
    }

    /** 给每个格子描红调试框 */
    enableDebug(): this {
        this.debug = true
        return this
    }

    /** 加一枚按钮：index 决定基准格（off_col = index%c, off_row = index/c）；给 pos 则叠加。Grid 注入绑定并生效。 */
    addButton(index: number, btn: FormButton, pos?: [number, number]): this {
        // grid_position 顺序 = [col, row]；基准格行优先：col = index%c, row = index/c
        const base_col = index % this.cols
        const base_row = Math.floor(index / this.cols)
        const col = -base_col + (pos ? pos[0] : 0)
        const row = -base_row + (pos ? pos[1] : 0)
        btn.layout.setOffset([`${col * 100}%`, `${row * 100}%`] as unknown as [number, number]) // 百分偏移重映射位置（保留 size/anchor）
        this.injectBindings(btn)
        this.grid.addGridItem([base_col, base_row], btn, `grid_item_${String(index).padStart(3, '0')}`,
            this.debug ? FormButtonGrid.RED : undefined)
        this.index = Math.max(this.index, index + 1)
        return this
    }

    /** 注入 FormButton 的集合/门控绑定（离开 Grid 则无效） */
    private injectBindings(btn: FormButton): void {
        btn.dataBinding.addDataBinding(
            new DataBindingObject().setBindingType('collection_details').setBindingCollectionName('form_buttons')
        )
        btn.dataBinding.addDataBinding(
            new DataBindingObject().setBindingType('collection')
                .setBindingCollectionName('form_buttons')
                .setBindingName('#form_button_text')
        )
        btn.dataBinding.addDataBinding(
            new DataBindingObject().setBindingType('view')
                .setSourcePropertyName('($binding_button_text = #form_button_text)')
                .setTargetPropertyName('#visible')
        )
    }

    build(): UIElement {
        return this.grid
    }
}