
import { Control } from "../properties/control.js";
import { DataBinding } from "../properties/dataBinding.js";
import { Factory } from "../properties/factory.js";

import { Layout } from "../properties/layout.js";
import { Sprite } from "../properties/sprite.js";
import { UIElement } from "./uiElement.js";

export class Image extends UIElement{
    constructor(id,template){
        super(id,"image",template);
        this.sprite = new Sprite();
        this.control = new Control();
        this.layout = new Layout();
        this.dataBinding = new DataBinding();
        this.factory = new Factory();
    }
    setSprite(sprite){
        this.sprite = sprite;
        return this;
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
