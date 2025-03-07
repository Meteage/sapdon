export class Label extends UIElement {
    constructor(id: any, template: any);
    text: Text;
    layout: Layout;
    dataBinding: DataBinding;
    factory: Factory;
    setLayout(layout: any): this;
    setText(text: any): this;
}
import { UIElement } from "./UIElement.js";
import { Text } from "../Properties/Text.js";
import { Layout } from "../Properties/Layout.js";
import { DataBinding } from "../Properties/DataBinding.js";
import { Factory } from "../Properties/Factory.js";
