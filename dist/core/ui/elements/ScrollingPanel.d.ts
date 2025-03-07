export class ScrollingPanel extends UIElement {
    constructor(id: any, template: any);
    input: Input;
    scrollView: ScrollView;
    layout: Layout;
    dataBinding: DataBinding;
    factory: Factory;
}
import { UIElement } from "./UIElement.js";
import { Input } from "../Properties/Input.js";
import { ScrollView } from "../Properties/ScrollView.js";
import { Layout } from "../Properties/Layout.js";
import { DataBinding } from "../Properties/DataBinding.js";
import { Factory } from "../Properties/Factory.js";
