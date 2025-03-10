export class Image extends UIElement {
    constructor(id: any, template: any);
    sprite: Sprite;
    layout: Layout;
    dataBinding: DataBinding;
    factory: Factory;
    setSprite(sprite: any): this;
}
import { UIElement } from "./UIElement.js";
import { Sprite } from "../Properties/Sprite.js";
import { Layout } from "../Properties/Layout.js";
import { DataBinding } from "../Properties/DataBinding.js";
import { Factory } from "../Properties/Factory.js";
