export class Image extends UIElement {
    constructor(id: any, template: any);
    sprite: Sprite;
    layout: Layout;
    dataBinding: DataBinding;
    factory: Factory;
    setSprite(sprite: any): this;
}
import { UIElement } from "./uiElement.js";
import { Sprite } from "../properties/sprite.js";
import { Layout } from "../properties/layout.js";
import { DataBinding } from "../properties/dataBinding.js";
import { Factory } from "../properties/factory.js";
