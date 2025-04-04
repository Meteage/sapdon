/**
 * Button ​
    Property Name	Type	Default Value	Description
    default_control	string		Name of the child control that will be displayed only in the default state
    hover_control	string		Name of the child control that will be displayed only in the hover state
    pressed_control	string		Name of the child control that will be displayed only in the pressed state
    locked_control	string		Name of the child control that will be displayed only in the locked state
 */
import { Control } from "../properties/control.js";
import { DataBinding } from "../properties/dataBinding.js";
import { Factory } from "../properties/factory.js";
import { Input } from "../properties/input.js";
import { Layout } from "../properties/layout.js";
import { Sound } from "../properties/sound.js";
import { UIElement } from "./uiElement.js";
export class Button extends UIElement {
    constructor(id, template) {
        super(id, "button", template);
        this.input = new Input();
        this.sound = new Sound();
        this.control = new Control();
        this.layout = new Layout();
        this.dataBinding = new DataBinding();
        this.factory = new Factory();
    }
    setDefaultControl(default_control) {
        this.addProp("default_control", default_control);
        return this;
    }
    setHoverControl(hover_control) {
        this.addProp("hover_control", hover_control);
        return this;
    }
    setPressedControl(pressed_control) {
        this.addProp("pressed_control", pressed_control);
        return this;
    }
    setLockedControl(locked_control) {
        this.addProp("locked_control", locked_control);
        return this;
    }
    setInput(input) {
        if (!(input instanceof Input))
            new Error("需求Input类");
        this.input = input;
        return this;
    }
    setSound(sound) {
        if (!(sound instanceof Sound))
            new Error("需求Sound类");
        this.sound = sound;
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
        // 复制input的属性
        for (const key in this.input) {
            if (this.input.hasOwnProperty(key)) {
                this.properties.set(key, this.input[key]);
            }
        }
        // 复制sound的属性
        for (const key in this.sound) {
            if (this.sound.hasOwnProperty(key)) {
                this.properties.set(key, this.sound[key]);
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
