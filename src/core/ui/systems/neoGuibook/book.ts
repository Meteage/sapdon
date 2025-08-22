
//重新设计指导手册
//书页以一页一页为独立的单位
//书页格局布局 有 纯文本类 分类导航类  选项栏类  起始页类
//元件 标题title 书签bar 选项栏 分类栏 文本text
//每一个书页都是一个Panel 有两种类型 单页型 与 双叶型
//单页型 只有一页内容 双叶型 有两页内容


import { ButtonMapping } from "../../buttonMapping.js";
import { DataBindingObject } from "../../dataBindingObject.js";
import { Button } from "../../elements/button.js";
import { Image } from "../../elements/image.js";
import { Label } from "../../elements/label.js";
import { Panel } from "../../elements/panel.js";
import { StackPanel } from "../../elements/stackPanel.js";
import { UIElement } from "../../elements/uiElement.js";
import { Control } from "../../properties/control.js";
import { Input } from "../../properties/input.js";
import { Layout } from "../../properties/layout.js";
import { Sprite } from "../../properties/sprite.js";
import { Text } from "../../properties/text.js";
import { ServerFormButton, ServerUISystem } from "../serverForm.js";
import { UISystem } from "../system.js";

type BookPage = {
    /** 书页ID */
    id: string;
    /** 书页内容 */
    content: Panel;
}

//指导书类 实现指导手册注册 书页管理 
export class NeoGuidebook {
    //书页管理
    private identifer:string;
    private book_pages:BookPage[] = [];
    private size:[number,number];
    private background_image:string = "textures/ui/book_back";

    //
    private system:UISystem;
    private root_panel_id:string;
    private root_panel_name:string;
    private root_panel_elements:UIElement[] = [];
    
    /**
     * @param {string} identifer - UI唯一标识符（格式 "命名空间:名称"）
     * @param {string} path - UI路径 例如"ui/"
     * @param {[number, number]} size - 面板尺寸 [宽, 高]
     */
    constructor(identifer:string,path:string,size?:[number,number]){
        this.identifer = identifer;
        // 解析命名空间
        const [namespace, name] = identifer.split(":");

        //根面板名字
        this.root_panel_name = `${name}_root_panel`;
        this.root_panel_id = `${namespace}.${this.root_panel_name}`;
        this.size = size || [320,207];

        //注册
        this.system = new UISystem(identifer, path);
        // 注册UI系统
        ServerUISystem.bindingTitlewithContent(
            this.system.name,
            this.root_panel_id
        );

        //初始化
        this.initUI();

    }

    /**添加单页书面 */
    public addSinglePageStack(page_id:string,page_content:Panel){
        
        page_content.addVariable("binding_text",page_id);
        page_content.dataBinding.addDataBinding(
            new DataBindingObject().setBindingType("view")
            .setSourcePropertyName("($binding_text = #form_text)")
            .setTargetPropertyName("#visible")
        );

        this.book_pages.push({
            id: page_id,
            content:page_content
        });
        this.updataUI();
    }

    /**添加双页书面 */
    public addDoublePageStack(page_id:string,left_page:Panel,right_page:Panel){
        const page = new StackPanel(`${page_id}_page_panel`).setOrientation("horizontal")
              .setControl(new Control().setLayer(5))
              //.setLayout(new Layout().setSize(["90%","90%"]))
              .addVariable("binding_text",page_id)
              .addStack(["50%","100%"],left_page)
              .addStack(["50%","100%"],right_page)
              page.dataBinding.addDataBinding(
                new DataBindingObject().setBindingType("view")
                .setSourcePropertyName("($binding_text = #form_text)")
                .setTargetPropertyName("#visible")
            );

        this.book_pages.push({
            id: page_id,
            content:page
        });

        this.updataUI();
    }

    private createPagesPanel(){
        return new Panel("book_pages_panel")
            .setLayout(new Layout().setSize(["100%","100%"]))
            .setControl(new Control().setLayer(5))
            .addControls(this.book_pages.map(page => page.content));
    }

    private initUI() {
        
        // 2. 添加基础UI元素
        this.addRootElements([
            // 背景图
            new Image("book_background")
                .setSprite(new Sprite().setTexture(this.background_image)),
            // 书页背景
            this.createBookPage(),

            //Debug文本
            this.createDebugText(),

            // 关闭按钮
            this.createCloseButton(),

            // 翻页按钮
            this.createPageButton("prev", [ 7, -9], "book_pageleft", "prev_button"),
            this.createPageButton("next", [-7, -9], "book_pageright","next_button"),

            // 章节目录按钮
            this.createHomeButton([0,0], ["8%","8%"], "home_button")
        ]);

        this.updataUI();
    }
    

    private updataUI(){

        const root_panel = new Panel(this.root_panel_name);
        root_panel.setLayout(new Layout().setSize(this.size));
        root_panel.addControls(this.root_panel_elements);
        root_panel.addControl(this.createPagesPanel());

        this.system.addElement(root_panel);
    }
    
    /** 创建关闭按钮 */
    private createCloseButton() {
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
    private createPageButton(type:string, offset:[number,number], texturePrefix:string,bindingButtonName:string) {
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
    private createHomeButton(offset:[number,number],size:[number|string,number|string],bindingButtonName:string) {
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
    private createBookPage() {
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
    private createDebugText() {
        return new Panel("data_text_panel")
            .setLayout(new Layout().setSize([64, 8*8]).setAnchorFrom("top_middle").setAnchorTo("top_middle"))
            .setControl(new Control().setLayer(5))
            .addControl(new Label("data_content").setText(
                new Text().setText("#form_text").setColor([0,0,0])
            ));
    }

    /**
     * 向系统注册一个元素
     * @param {UIElement} element 
     */
    public registerElement(element:UIElement){
        this.system.addElement(element);
        return this;
    }
    /**
     * 向根面板添加元素
     */
    public addRootElement(element:UIElement){
        this.root_panel_elements.push(element);
        return this;
    }

     /**
     * 向根面板添加多个元素
     * @param {Array} elements 
     */
    public addRootElements(elements:UIElement[]){
        for(let i in elements){
            this.addRootElement(elements[i]);
        }
        return this;
    }
}

