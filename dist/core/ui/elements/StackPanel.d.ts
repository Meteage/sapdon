export class StackPanel extends Panel {
    type: string;
    orientation: string;
    stackNum: number;
    addStack(size: any, content: any, debug?: boolean): this;
    /**
     * Possible values:
        vertical
        horizontal
     * @param {*} orientation
     */
    setOrientation(orientation: any): this;
}
import { Panel } from "./Panel.js";
