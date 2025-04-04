export class Panel extends UIElement {
    constructor(id: any, template: any);
    layout: Layout;
    dataBinding: DataBinding;
    factory: Factory;
    setLayout(layout: any): this;
}
import { UIElement } from "./uiElement.js";
import { Layout } from "../properties/layout.js";
import { DataBinding } from "../properties/dataBinding.js";
import { Factory } from "../properties/factory.js";
