export class Guidebook {
    constructor(identifier: any, path: any);
    system: UISystem;
    addPageBinding(page_name: any, left_control_name: any, right_control_name: any): this;
    addPage(page_name: any, left_control: any, right_control: any): this;
    addElement(element: any): this;
    #private;
}
import { UISystem } from "./UISystem.js";
