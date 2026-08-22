import { Grid } from "../../elements/grid.js";
import { UIElement } from "../../elements/uiElement.js";
import { GridProp } from "../../properties/gridProp.js";
import { Layout } from "../../properties/layout.js";

/**
 * SapdonButtonPanel：按键网格面板。
 * 内部造一个 Grid（collection_name 注入 form_buttons），
 * 通过 place() 逐个把 form_button 内容按 pos_wrap 摆到指定格。
 */
export class SapdonButtonPanel {
    private grid: Grid;

    constructor(gridId: string) {
        this.grid = new Grid(gridId);
    }

    /** 网格尺寸 [列, 行] */
    setDimensions([cols, rows]: [number, number]): this {
        this.grid.setGridProp(new GridProp().setGridDimensions([cols, rows]));
        return this;
    }

    setSize(size: [number | string, number | string]): this {
        this.grid.setLayout(new Layout().setSize(size as [any, any]));
        return this;
    }

    /** 注入按钮集合 */
    setCollection(collectionName: string): this {
        this.grid.setCollectionName(collectionName);
        return this;
    }

    /** 摆一个按钮(内部会生成带 grid_position 的 pos_wrap 面板包裹) */
    place(gridPosition: [number, number], content: UIElement): this {
        this.grid.addGridItem(gridPosition, content);
        return this;
    }

    build(): Grid {
        return this.grid;
    }
}