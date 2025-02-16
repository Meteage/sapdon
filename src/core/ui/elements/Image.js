
import { Control } from "../Properties/Control.js";
import { DataBinding } from "../Properties/DataBinding.js";
import { Factory } from "../Properties/Factory.js";

import { Layout } from "../Properties/Layout.js";
import { Sprite } from "../Properties/Sprite.js";
import { UIElement } from "./UIElement.js";

export class Image extends UIElement{
    constructor(id,template){
        super(id,"image",template);
        this.sprite = new Sprite();
        this.control = new Control();
        this.layout = new Layout();
        this.dataBinding = new DataBinding();
        this.factory = new Factory();
    }
    serialize(){
        //合并属性

        // 复制Sprite的属性
        for (const key in this.sprite) {
            if (this.sprite.hasOwnProperty(key)) {
                this.properties.set(key, this.sprite[key]);
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
