import { GridProp } from "../Properties/gridProp.js";
import { CollectionPanel } from "./CollectionPanel.js";
export class Grid extends CollectionPanel {
    constructor(id, template) {
        super(id, template);
        this.grid = GridProp();
    }
    setGridProp(grid_prop) {
        this.grid = grid_prop;
        return this;
    }
    serialize() {
        // 复制grid的属性
        for (const key in this.grid) {
            if (this.grid.hasOwnProperty(key)) {
                this.properties.set(key, this.grid[key]);
            }
        }
        return super.serialize();
    }
}
