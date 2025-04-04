export class ScrollingPanel extends UIElement {
    constructor(id: any, template: any);
    input: Input;
    scrollView: ScrollView;
    layout: Layout;
    dataBinding: DataBinding;
    factory: Factory;
}
import { UIElement } from "./uiElement.js";
import { Input } from "../properties/input.js";
import { ScrollView } from "../properties/scrollView.js";
import { Layout } from "../properties/layout.js";
import { DataBinding } from "../properties/dataBinding.js";
import { Factory } from "../properties/factory.js";
