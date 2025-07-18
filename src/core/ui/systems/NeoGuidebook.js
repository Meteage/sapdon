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


const page_template = new StackPanel("page_template").setOrientation("horizontal")
      .addVariable("page_left_content | default","")
      .addVariable("page_right_content | default","")
      //.setLayout(new Layout().setSize(["90%","90%"]))
      .addStack(["50%","100%"],new UIElement("page_left",undefined,"$page_left_content"))
      .addStack(["50%","100%"],new UIElement("page_right",undefined,"$page_right_content"))
      page_template.dataBinding.addDataBinding(
        new DataBindingObject().setBindingType("view")
        .setSourcePropertyName("($binding_text = #form_text)")
        .setTargetPropertyName("#visible")
    );

export class NeoGuidebook {
    /**
     * @param {string} identifer - UI唯一标识符（格式 "命名空间:名称"）
     * @param {string} path - UI路径
     * @param {[number, number]} size - 面板尺寸 [宽, 高]
     * @param {string} background_image - 背景图路径
     * @param {number} page_num - 总页数
     */
    constructor(identifer, path, size, background_image, page_num) {
        this.identifer = identifer;
        this.path = path;
        this.size = size || [320, 207]; // 修复逗号错误
        this.background_image = background_image || "textures/ui/book_back";
        this.page_num = Math.max(1, page_num || 10); // 确保至少1页
        this.current_page = 0; // 当前页码
        this.pages = []; // 每页内容容器

        // 解析命名空间
        [this.namespace, this.name] = identifer.split(":");
        this.id = identifer.replace(':', '_');

        this.root_elements = [];
        this.system = new UISystem(identifer, path);
        this.root_panel = new Panel("neoguidebook_root_panel");

        // 注册UI系统
        ServerUISystem.bindingTitlewithContent(
            this.system.name,
            `${this.namespace}.neoguidebook_root_panel`
        );

        this.#init();
    }

    #init() {
        // 1. 设置面板尺寸
        this.setSize(this.size[0], this.size[1]);

        // 2. 添加基础UI元素
        this.addRootElements([
            // 背景图
            new Image("book_background")
                .setSprite(new Sprite().setTexture(this.background_image)),
            // 书页背景
            this.#createPage(),

            //Debug文本
            this.#createDebugText(),

            // 关闭按钮
            this.#createCloseButton(),

            // 翻页按钮
            this.#createPageButton("prev", [ 7, -9], "book_pageleft", "prev_button"),
            this.#createPageButton("next", [-7, -9], "book_pageright","next_button"),

            // 章节目录按钮
            this.#createHomeButton([0,0], ["8%","8%"], "home_button")
        ]);
        
        // 3. 注册PageTemplate
        this.registerElement(page_template);

        // 4. 初始化第一页内容
        //this.#updatePageContent();
        this.system.addElement(this.root_panel);
    }

    /** 创建关闭按钮 */
    #createCloseButton() {
        return new Button("close_button")
            .setLayout(
                new Layout()
                    .setSize([14, 14])
                    .setAnchorFrom("top_right")
                    .setAnchorTo("top_right")
            )
            .setInput(
                new Input().setButtonMappings([
                    new ButtonMapping()
                        .setMappingType("pressed")
                        .setFromButtonId("button.menu_select")
                        .setToButtonId("button.menu_exit")
                ])
            )
            .addControls([
                new UIElement("default", undefined, "book.close_button_default"),
                new UIElement("hover", undefined, "book.close_button_hover"),
                new UIElement("pressed", undefined, "book.close_button_pressed"),
            ]);
    }

    /** 创建翻页按钮（通用方法） */
    #createPageButton(type, offset, texturePrefix,bindingButtonName) {
        const buttonId = `${type}_button`;
        const button_anchor = type === "prev" ? "left" : "right";
        return new Panel(`${buttonId}_panel`)
            .setControl(new Control().setLayer(5))
            .setLayout(
                new Layout()
                    .setSize([24, 24])
                    .setOffset(offset)
                    .setAnchorFrom(`bottom_${button_anchor}`) 
                    .setAnchorTo(`bottom_${button_anchor}`) 
            )
            .addControl(
                new UIElement(buttonId, undefined, "server_form.sapdon_form_button_factory")
                    .addVariable("binding_button_text", `${bindingButtonName}`)
                    .addVariable("default_texture", `textures/ui/${texturePrefix}_default`)
                    .addVariable("hover_texture", `textures/ui/${texturePrefix}_hover`)
                    .addVariable("pressed_texture", `textures/ui/${texturePrefix}_pressed`)
            );
    }
    /**创建返回章节目录按键 */
    #createHomeButton(offset,size,bindingButtonName) {
        return new UIElement("home_button", undefined, "server_form.sapdon_form_button_factory")
            .addVariable("binding_button_text", bindingButtonName)
            .addVariable("default_texture", "textures/ui/book_shiftleft_default")
            .addVariable("hover_texture", "textures/ui/book_shiftleft_hover")
            .addProp("offset", offset)
            .addProp("size", size)
            .addProp("layer", 5)
            .addProp("anchor_from","bottom_middle")
            .addProp("anchor_to","bottom_middle")
    }
    /**创建书页 */
    #createPage() {
        return new StackPanel("book_page_stack_panel").setOrientation("horizontal")
        .setLayout(new Layout().setSize(this.size))
        .addVariable("page_size",[this.size[0]/2,this.size[1]])
        .addStack("$page_size",
            new Panel("book_left_panel").addControls([
                {
                    "page_crease_image@book.page_crease_left_image": {
                      "size": [ "100% - 40px", "100% - 14px" ],
                      "offset": [ 0, -2 ]
                    }
                },
                {
                    "page_edge_image@book.page_edge_left_image": {
                      "size": [ "100% - 7px", "100% - 16px" ],
                      "offset": [7,-1]
                    }
                }
            ])
        )
        .addStack("$page_size",
           new Panel("book_right_panel").addControls([
                {
                    "page_crease_image@book.page_crease_right_image": {
                      "size": [ "100% - 40px", "100% - 14px" ],
                      "offset": [ 0, -2 ]
                    }
                },
                {
                    "page_edge_image@book.page_edge_right_image": {
                      "size": [ "100% - 7px", "100% - 16px" ],
                      "offset": [-7,-1]
                    }
                }
            ])
        );
    }

    /**创建调试数据内容文本 */
    #createDebugText() {
        return new Panel("data_text_panel")
            .setLayout(new Layout().setSize([64, 8*8]).setAnchorFrom("top_middle").setAnchorTo("top_middle"))
            .setControl(new Control().setLayer(5))
            .addControl(new Label("data_content").setText(
                new Text().setText("#form_text").setColor([0,0,0])
            ));
    }
    /**
     * 
     * @param {string} page_name 
     * @param {UIElement} left_control 
     * @param {UIElement} right_control 
     * @returns 
     */
    addPage(page_name, left_control, right_control){
        left_control.name = `${page_name+left_control.name}`;
        right_control.name = `${page_name+right_control.name}`;
        right_control.id = `${page_name+right_control.id}`;
        left_control.id = `${page_name+left_control.id}`;

        this.pages.push({
            page_name: page_name,
            left_control_name: left_control.name,
            right_control_name: right_control.name
        });
        //添加元素
        this.registerElement(left_control)
        this.registerElement(right_control)

        //更新
        this.#updatePageContent();

        return this;
    }

    /** 更新页内容 */
    #updatePageContent() {
        const page_context_panel = new Panel("page_context_panel").setControl(
            new Control().setLayer(5)
        );
        // 2. 添加内容
        for (let index in this.pages){
            const {page_name,left_control_name,right_control_name} = this.pages[index];
            const page = new UIElement(`page_index_${index}`,undefined,"page_template")
                .addVariable("binding_text",page_name)
                .addVariable("page_left_content",left_control_name)
                .addVariable("page_right_content",right_control_name);
            page_context_panel.addControl(page);
        }
        this.root_elements[7] = page_context_panel;
        this.clearRootElements();
        this.root_panel.addControls(this.root_elements)
    }

     /**
     * 向系统注册一个元素
     * @param {UIElement} element 
     */
     registerElement(element){
        this.system.addElement(element);
        return this;
    }
    /**
     * 向根面板添加元素
     */
    addRootElement(element){
        this.root_elements.push(element);
        this.root_panel.control.controls = [];
        this.root_panel.addControls(this.root_elements);
        return this;
    }
    /**
     * 向根面板添加多个元素
     * @param {Array} elements 
     */
    addRootElements(elements){
        for(let i in elements){
            this.addRootElement(elements[i]);
        }
        return this;
    }
    /**
     * 清除根面板元素
     * @returns 
     */
    clearRootElements(){
        this.root_panel.control.controls = [];
        return this;
    }
    /**
     * 设置面板大小
     * @param {number} weith 
     * @param {number} height 
     * @returns 
     */
    setSize(weith,height){
        this.size = [weith,height];
        this.root_panel.setLayout(new Layout().setSize(this.size));
        return this;
    }
}


/*
const neo_guidebook = new NeoGuidebook("neo_guidebook:neo_guidebook","ui/");


// 创建一个新的指南
//const neo_guidebook = new Guidebook("neo_guidebook:neo_guidebook", "ui/");

//1
//本书介绍页
const book_intro = new StackPanel("book_intro_panel");
const book_intro_text = "自定义的模组介绍";
// 添加书名标题
book_intro.addStack(["100%", "10%"],new Label("book_name").setText(new Text().setText("NeoGuidebook").setColor([0,0,0])));
book_intro.addStack(["100%", "90%"],new Label("book_intro").setText(new Text().setText(book_intro_text).setColor([0,0,0])))

//章节目录
const book_chapter = new StackPanel("book_chapter_panel");
//添加标题
book_chapter.addStack(["100%","10%"],new Label("book_chapter").setText(new Text().setText("Chaper").setColor([0,0,0])))
//添加具体目录
book_chapter.addStack(["100%","90%"],
    //
    new StackPanel("book_directory")
    //分割
    .addStack(["100%","20%"],new Panel("none"))

    .addStack(["100%","20%"],
        new StackPanel("chaper1").setOrientation("horizontal")
        //添加章节跳转按键
        .addStack(["20%","100%"],
            //按键实现 继承自"sapdon_form_button_factory"
            new UIElement("b1",undefined,"server_form.sapdon_form_button_factory")
            //绑定脚本按钮
            .addVariable("binding_button_text","test3") //绑定表单按钮test1
            .addVariable("default_texture","textures/items/apple")
            .addVariable("hover_texture","textures/items/diamond")
            .addVariable("pressed_texture","textures/ui/book_pageleft_pressed")
        )
        //添加章节名字
        .addStack(["80%","100%"],new Label("chaper_name").setText(new Text().setText("chapter 1").setColor([0,0,0])))
    )
    //
    .addStack(["100%","20%"],
        new StackPanel("chaper2").setOrientation("horizontal")
        //添加图标
        .addStack(["20%","100%"],
            //按键实现 继承自"sapdon_form_button_factory"
            new UIElement("b1",undefined,"server_form.sapdon_form_button_factory")
            //绑定脚本按钮
            .addVariable("binding_button_text","test4") //绑定表单按钮test1
            .addVariable("default_texture","textures/items/diamond")
            .addVariable("hover_texture","textures/items/apple")
        )
        //添加章节名字
        .addStack(["80%","100%"],new Label("chaper_name").setText(new Text().setText("chapter 2").setColor([0,0,0])))

    )
)

neo_guidebook.addPage("page_index0",book_intro,book_chapter);
neo_guidebook.addPage("page_index1",new Panel("conten1").addControls([new Label("t1").setText(new Text().setText("第一章节内容\n介绍\n1\n2").setColor([0,0,0]))]),new Panel("none"));
neo_guidebook.addPage("page_index2",new Panel("conten2").addControls([new Label("t1").setText(new Text().setText("第二章节内容\n介绍\n1\n2").setColor([0,0,0]))]),new Panel("none"));
*/