export class Grid extends CollectionPanel {
    gridNum: number;
    grid: GridProp;
    setGridProp(grid_prop: any): this;
    addGridItem(grid_position: any, content: any): this;
}
import { CollectionPanel } from "./collectionPanel.js";
import { GridProp } from "../properties/gridProp.js";
