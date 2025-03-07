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
import { UIElement } from "./UIElement.js";
import { Input } from "../Properties/Input.js";
import { Sound } from "../Properties/Sound.js";
import { Layout } from "../Properties/Layout.js";
import { DataBinding } from "../Properties/DataBinding.js";
import { Factory } from "../Properties/Factory.js";
