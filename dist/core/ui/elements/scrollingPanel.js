import { Control } from "../properties/control.js";
import { DataBinding } from "../properties/dataBinding.js";
import { Factory } from "../properties/factory.js";
import { Input } from "../properties/input.js";
import { Layout } from "../properties/layout.js";
import { ScrollView } from "../properties/scrollView.js";
import { UIElement } from "./uiElement.js";
export class ScrollingPanel extends UIElement {
    constructor(id, template) {
        super(id, "scroll_view", template);
        this.input = new Input();
        this.scrollView = new ScrollView();
        this.control = new Control();
        this.layout = new Layout();
        this.dataBinding = new DataBinding();
        this.factory = new Factory();
    }
    serialize() {
        //合并属性
        // 复制Input的属性
        for (const key in this.input) {
            if (this.input.hasOwnProperty(key)) {
                this.properties.set(key, this.input[key]);
            }
        }
        // 复制scrollView的属性
        for (const key in this.scrollView) {
            if (this.scrollView.hasOwnProperty(key)) {
                this.properties.set(key, this.scrollView[key]);
            }
        }
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
