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
 *
 * 新增的两段式放置（推荐）：
 *  - addButtons([...])：批量顺排，内部自动占下一格（grid_position/命名=内部处理）
 *  - addButtonAt([w,h], btn)：显式摆到靠后的指定格（需覆盖该格，否则引擎不渲染）
 * 底层细节（grid_position / pos_wrap / 命名 / 顺序）被封装，使用者无需关心。
 */
export class SapdonButtonPanel {
    private grid: Grid;
    private cols = 1;
    private rows = 1;
    private occupied = new Set<number>();
    private nextIndex = 0;
    private debug = false;

    private static readonly RED = [1, 0, 0, 1] as [number, number, number, number];

    constructor(gridId: string) {
        this.grid = new Grid(gridId);
    }

    /** 每个放置格渲染红色调试框（用于观察 grid_position / pos_wrap 布局） */
    enableDebug(): this {
        this.debug = true;
        return this;
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

    /**
     * 批量顺排：内部按 cols 换行自动占下一格，grid_position / 命名内部处理。
     * 放置顺序即运行时 form_buttons 的 selection 顺序，无需手动对齐。
     */
    addButtons(buttons: UIElement[]): this {
        for (const btn of buttons) {
            const id = this.nextIndex;
            const w = id % this.cols;
            const h = Math.floor(id / this.cols);
            if (this.occupied.has(id)) {
                throw new Error(`格子 [${w}, ${h}] (index ${id}) 已被占用`);
            }
            if (id >= this.cols * this.rows) {
                throw new Error(`超出网格 ${this.cols}x${this.rows} 范围`);
            }
            this.occupied.add(id);
            this.nextIndex++;
            this.placeInternal([w, h], id, btn);
        }
        return this;
    }

    /**
     * 显式摆位：占 [w, h] 格（用于"单独一个、且序号靠后"的按钮）。
     * 该格已被占用或超出网格范围则 throw。
     */
    addButtonAt([w, h]: [number, number], button: UIElement): this {
        const id = h * this.cols + w;
        if (this.occupied.has(id)) {
            throw new Error(`格子 [${w}, ${h}] 已被占用`);
        }
        if (id >= this.cols * this.rows) {
            throw new Error(`格子 [${w}, ${h}] 超出网格 ${this.cols}x${this.rows}`);
        }
        this.occupied.add(id);
        this.nextIndex = Math.max(this.nextIndex, id + 1);
        this.placeInternal([w, h], id, button);
        return this;
    }

    /** 摆一个按钮（内部生成带 grid_position 的 pos_wrap 面板，命名 grid_item_<id> 零填充） */
    private placeInternal([w, h]: [number, number], id: number, content: UIElement): void {
        const name = `grid_item_${String(id).padStart(3, "0")}`;
        this.grid.addGridItem([w, h], content, name, this.debug ? SapdonButtonPanel.RED : undefined);
    }

    /** 摆一个按钮到 [w, h]（内部生成带 grid_position 的 pos_wrap 面板，命名 grid_item_<id> 零填充） */
    place(gridPosition: [number, number], content: UIElement): this {
        const [w, h] = gridPosition;
        const id = h * this.cols + w;
        this.placeInternal([w, h], id, content);
        return this;
    }

    build(): Grid {
        return this.grid;
    }
}