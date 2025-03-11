import { Control } from "../properties/control.js";
import { DataBinding } from "../properties/dataBinding.js";
import { Factory } from "../properties/factory.js";
import { Layout } from "../properties/layout.js";
import { UIElement } from "./uiElement.js";
export class CollectionPanel extends UIElement {
    constructor(id, template) {
        super(id, "collection_panel", template);
        this.control = new Control();
        this.layout = new Layout();
        this.dataBinding = new DataBinding();
        this.factory = new Factory();
    }
    setCollectionName(collection_name) {
        this.addProp("collection_name", collection_name);
        return this;
    }
    setLayout(layout) {
        if (!(layout instanceof Layout))
            new Error("参数需要Layout类");
        this.layout = layout;
        return this;
    }
    serialize() {
        //序列化
        // 复制Layout的属性
        for (const key in this.layout) {
            if (this.layout.hasOwnProperty(key)) {
                this.properties.set(key, this.layout[key]);
            }
        }
        // 复制DataBinding的属性
        for (const key in this.dataBinding) {
            if (this.dataBinding.hasOwnProperty(key)) {
                this.properties.set(key, this.dataBinding[key]);
            }
        }
        // 复制Factory的属性
        for (const key in this.factory) {
            if (this.factory.hasOwnProperty(key)) {
                this.properties.set(key, this.factory[key]);
            }
        }
        // 复制Control的属性
        for (const key in this.control) {
            if (this.control.hasOwnProperty(key)) {
                this.properties.set(key, this.control[key]);
            }
        }
        // 调用父类的serialize方法
        return super.serialize();
    }
}
