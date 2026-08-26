import { Grid } from "../../elements/grid.js";
import { UIElement } from "../../elements/uiElement.js";
import { GridProp } from "../../properties/gridProp.js";
import { Layout } from "../../properties/layout.js";

/**
 * SapdonButtonPanel：按键网格面板。
 * 内部造一个 Grid（collection_name 注入 form_buttons），
 * 通过 place() 逐个把按钮内容按 pos_wrap 摆到指定格。
 *
 * 格 id 规则：place([w, h]) → id = h * cols + w（例 [1,5]、16 列 → 81 号格），
 * 控件命名 grid_item_<id>；只有 place 过的格子渲染，未 place 的不渲染。
 */
export class SapdonButtonPanel {
    private grid: Grid;
    private cols = 1;
    private rows = 1;

    constructor(gridId: string) {
        this.grid = new Grid(gridId);
    }

    /** 网格尺寸 [列, 行] */
    setDimensions([cols, rows]: [number, number]): this {
        this.cols = cols;
        this.rows = rows;
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

    /** 摆一个按钮到 [w, h]（内部生成带 grid_position 的 pos_wrap 面板，命名 grid_item_<id> 零填充） */
    place(gridPosition: [number, number], content: UIElement): this {
        const [w, h] = gridPosition;
        const id = h * this.cols + w;
        const name = `grid_item_${String(id).padStart(3, "0")}`;
        this.grid.addGridItem(gridPosition, content, name);
        return this;
    }

    build(): Grid {
        return this.grid;
    }
}