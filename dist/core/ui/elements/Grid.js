import { GridProp } from "../properties/gridProp.js";
import { CollectionPanel } from "./collectionPanel.js";
import { Panel } from "./panel.js";
export class Grid extends CollectionPanel {
    constructor(id, template) {
        super(id, template);
        this.gridNum = 0;
        this.grid = new GridProp();
    }
    setGridProp(grid_prop) {
        this.grid = grid_prop;
        return this;
    }
    addGridItem(grid_position, content) {
        const grid_item = new Panel(`grid_item_${this.gridNum}`);
        grid_item.addProp("grid_position", grid_position);
        grid_item.addControl(content);
        this.addControl(grid_item);
        this.gridNum++;
        return this;
    }
    serialize() {
        // 复制grid的属性
        for (const key in this.grid) {
            if (this.grid.hasOwnProperty(key)) {
                this.properties.set(key, this.grid[key]);
            }
        }
        //类型修正
        this.properties.set("type", "grid");
        return super.serialize();
    }
}
