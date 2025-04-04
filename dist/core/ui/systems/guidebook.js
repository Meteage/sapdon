import { ButtonMapping } from "../buttonMapping.js";
import { DataBindingObject } from "../dataBindingObject.js";
import { Button } from "../elements/button.js";
import { Image } from "../elements/image.js";
import { Label } from "../elements/label.js";
import { Panel } from "../elements/panel.js";
import { StackPanel } from "../elements/stackPanel.js";
import { UIElement } from "../elements/uiElement.js";
import { Control } from "../properties/control.js";
import { Input } from "../properties/input.js";
import { Layout } from "../properties/layout.js";
import { Sprite } from "../properties/sprite.js";
import { Text } from "../properties/text.js";
import { ServerUISystem } from "./serverForm.js";
import { UISystem } from "./system.js";
//表单按钮模板
const form_button_template = new Button("form_button_template", "common.button");
form_button_template.addVariable("default_texture|default", "");
form_button_template.addVariable("hover_texture|default", "");
form_button_template.addVariable("pressed_texture|default", "");
form_button_template.addVariable("binding_button_text|default", "");
form_button_template.dataBinding.addDataBinding(new DataBindingObject().setBindingType("collection_details")
    .setBindingCollectionName("form_buttons"));
form_button_template.dataBinding.addDataBinding(new DataBindingObject().setBindingType("collection")
    .setBindingCollectionName("form_buttons")
    .setBindingName("#form_button_text"));
form_button_template.dataBinding.addDataBinding(new DataBindingObject().setBindingType("view")
    .setSourcePropertyName("($binding_button_text = #form_button_text)")
    .setTargetPropertyName("#visible"));
form_button_template.addControls([
    new Image("default").setSprite(new Sprite().setTexture("$default_texture")),
    new Image("hover").setSprite(new Sprite().setTexture("$hover_texture")),
    new Image("pressed").setSprite(new Sprite().setTexture("$pressed_texture"))
]);
//f
const form_button_panel = new Panel("form_button_factory").enableDebug();
form_button_panel.addProp("type", "collection_panel");
form_button_panel.factory.setName("buttons").setControlName("$button_control");
form_button_panel.addProp("collection_name", "form_buttons");
form_button_panel.dataBinding.addDataBinding(new DataBindingObject().setBindingName("#form_button_length")
    .setBindingNameOverride("#collection_length"));
const page_template = new StackPanel("page_template").setOrientation("horizontal")
    .addVariable("page_left_content | default", "")
    .addVariable("page_right_content | default", "")
    .setLayout(new Layout().setSize(["90%", "90%"]))
    .addStack(["50%", "100%"], new UIElement("page_left", undefined, "$page_left_content").serialize())
    .addStack(["50%", "100%"], new UIElement("page_right", undefined, "$page_right_content").serialize());
page_template.dataBinding.addDataBinding(new DataBindingObject().setBindingType("view")
    .setSourcePropertyName("($binding_text = #form_text)")
    .setTargetPropertyName("#visible"));
export class Guidebook {
    #bindingList = [];
    constructor(identifier, path) {
        this.system = new UISystem(identifier, path);
        //init
        this.#binding();
        this.#addTemplate();
        this.#updateSystem();
    }
    addPageBinding(page_name, left_control_name, right_control_name) {
        this.#bindingList.push({
            page_name: page_name,
            left_control_name: left_control_name,
            right_control_name: right_control_name
        });
        //更新系统
        this.#updateSystem();
        return this;
    }
    addPage(page_name, left_control, right_control) {
        this.addPageBinding(page_name, left_control.name, right_control.name);
        //添加元素
        this.addElement(left_control);
        this.addElement(right_control);
        //更新系统
        this.#updateSystem();
        return this;
    }
    addElement(element) {
        this.system.addElement(element);
        return this;
    }
    #binding() {
        ServerUISystem.bindingTitlewithContent(this.system.name, `${this.system.namespace}.guidebook_root_panel`);
    }
    #addTemplate() {
        this.addElement(form_button_template);
        this.addElement(form_button_panel);
        this.addElement(page_template);
        //
        this.#updateSystem();
    }
    #updateSystem() {
        const guidebook_root_panel = new Panel("guidebook_root_panel");
        //开启调试框
        //guidebook_root_panel.enableDebug()
        //设置布局属性
        guidebook_root_panel.setLayout(new Layout().setSize([320, 207]));
        //添加子元素
        guidebook_root_panel.addControls([
            //添加背景
            new UIElement("book_background", undefined, "book.book_background"),
            //添加书页
            new StackPanel("book_page_stack_panel").setOrientation("horizontal")
                .setLayout(new Layout().setSize([320, 207]))
                .addVariable("page_size", [160, 207])
                .addStack("$page_size", new Panel("book_left_panel").addControls([
                {
                    "page_crease_image@book.page_crease_left_image": {
                        "size": ["100% - 40px", "100% - 14px"],
                        "offset": [0, -2]
                    }
                },
                {
                    "page_edge_image@book.page_edge_left_image": {
                        "size": ["100% - 7px", "100% - 16px"],
                        "offset": [7, -1]
                    }
                }
            ]).serialize())
                .addStack("$page_size", new Panel("book_right_panel").addControls([
                {
                    "page_crease_image@book.page_crease_right_image": {
                        "size": ["100% - 40px", "100% - 14px"],
                        "offset": [0, -2]
                    }
                },
                {
                    "page_edge_image@book.page_edge_right_image": {
                        "size": ["100% - 7px", "100% - 16px"],
                        "offset": [-7, -1]
                    }
                }
            ]).serialize()),
            //添加书页内容
            new Panel("page_content_root")
                .setControl(new Control().setLayer(5))
                .setLayout(new Layout().setSize(["90%", "90%"]))
                .addControls([
                new Panel("label_text_panel").setLayout(new Layout().setSize([32, 8]).setAnchorFrom("bottom_middle")
                    .setAnchorTo("bottom_middle")).addControl(new Label("page_content").setText(new Text().setText("#form_text").setColor([0, 0, 0]))),
                ...this.#bindingList.map(({ page_name, left_control_name, right_control_name }, index) => {
                    return new UIElement(`page_index_${index}`, undefined, "page_template")
                        .addVariable("binding_text", page_name)
                        .addVariable("page_left_content", left_control_name)
                        .addVariable("page_right_content", right_control_name);
                })
                /*
                new UIElement("page_1",undefined,"page_template")
                .addVariable("binding_text","page_index1")
                .addVariable("page_left_content","page_left_content")
                .addVariable("page_right_content","page_right_content"),
                new UIElement("page_2",undefined,"page_template")
                .addVariable("binding_text","page_index2")
                .addVariable("page_left_content","page_left_content")
                .addVariable("page_right_content","page_right_content"),
                new UIElement("page_3",undefined,"page_template")
                .addVariable("binding_text","page_index3")
                .addVariable("page_left_content","page_left_content")
                .addVariable("page_right_content","page_right_content")*/
            ]),
            //添加关闭按钮
            new Button("close_button").setLayout(new Layout().setSize([14, 14])
                .setAnchorFrom("top_right")
                .setAnchorTo("top_right"))
                .setInput(new Input().setButtonMappings([
                new ButtonMapping().setMappingType("pressed")
                    .setFromButtonId("button.menu_select")
                    .setToButtonId("button.menu_exit")
            ]))
                .addControls([
                new UIElement("default", undefined, "book.close_button_default"),
                new UIElement("hover", undefined, "book.close_button_hover"),
                new UIElement("pressed", undefined, "book.close_button_pressed"),
            ]),
            //添加下一页按钮
            new Panel("prev_button_panel").enableDebug()
                .setControl(new Control().setLayer(5))
                .setLayout(new Layout().setSize([24, 24])
                .setOffset([7, -9])
                .setAnchorFrom("bottom_left")
                .setAnchorTo("bottom_left"))
                .addControl(new UIElement("prev_button", undefined, "form_button_factory")
                .addVariable("binding_button_text", "test1")
                .addVariable("button_control", `${this.system.namespace}.form_button_template`)
                .addVariable("pressed_button_name", "button.form_button_click")
                .addVariable("default_texture", "textures/ui/book_pageleft_default")
                .addVariable("hover_texture", "textures/ui/book_pageleft_hover")
                .addVariable("pressed_texture", "textures/ui/book_pageleft_pressed")),
            new Panel("next_button_panel").enableDebug()
                .setControl(new Control().setLayer(5))
                .setLayout(new Layout().setSize([24, 24])
                .setOffset([-7, -9])
                .setAnchorFrom("bottom_right")
                .setAnchorTo("bottom_right"))
                .addControl(new UIElement("next_button", undefined, "form_button_factory")
                .addVariable("binding_button_text", "test2")
                .addVariable("button_control", "sapdon_guidebook.form_button_template")
                .addVariable("pressed_button_name", "button.form_button_click")
                .addVariable("default_texture", "textures/ui/book_pageright_default")
                .addVariable("hover_texture", "textures/ui/book_pageright_hover")
                .addVariable("pressed_texture", "textures/ui/book_pageright_pressed"))
        ]);
        this.addElement(guidebook_root_panel);
    }
}
