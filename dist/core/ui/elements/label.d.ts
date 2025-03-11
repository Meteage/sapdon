export class Label extends UIElement {
    constructor(id: any, template: any);
    text: Text;
    layout: Layout;
    dataBinding: DataBinding;
    factory: Factory;
    setLayout(layout: any): this;
    setText(text: any): this;
}
import { UIElement } from "./uiElement.js";
import { Text } from "../properties/text.js";
import { Layout } from "../properties/layout.js";
import { DataBinding } from "../properties/dataBinding.js";
import { Factory } from "../properties/factory.js";
