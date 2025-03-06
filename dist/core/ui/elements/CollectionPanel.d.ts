export class CollectionPanel extends UIElement {
    constructor(id: any, template: any);
    layout: Layout;
    dataBinding: DataBinding;
    factory: Factory;
    setCollectionName(collection_name: any): this;
    setLayout(layout: any): this;
}
import { UIElement } from "./UIElement.js";
import { Layout } from "../Properties/Layout.js";
import { DataBinding } from "../Properties/DataBinding.js";
import { Factory } from "../Properties/Factory.js";
