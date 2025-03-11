export class Button extends UIElement {
    constructor(id: any, template: any);
    input: Input;
    sound: Sound;
    layout: Layout;
    dataBinding: DataBinding;
    factory: Factory;
    setDefaultControl(default_control: any): this;
    setHoverControl(hover_control: any): this;
    setPressedControl(pressed_control: any): this;
    setLockedControl(locked_control: any): this;
    setInput(input: any): this;
    setSound(sound: any): this;
    setLayout(layout: any): this;
}
import { UIElement } from "./uiElement.js";
import { Input } from "../properties/input.js";
import { Sound } from "../properties/sound.js";
import { Layout } from "../properties/layout.js";
import { DataBinding } from "../properties/dataBinding.js";
import { Factory } from "../properties/factory.js";
