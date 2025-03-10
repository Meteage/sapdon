export class Panel extends UIElement {
    constructor(id: any, template: any);
    layout: Layout;
    dataBinding: DataBinding;
    factory: Factory;
    setLayout(layout: any): this;
}
import { UIElement } from "./UIElement.js";
import { Layout } from "../Properties/Layout.js";
import { DataBinding } from "../Properties/DataBinding.js";
import { Factory } from "../Properties/Factory.js";
