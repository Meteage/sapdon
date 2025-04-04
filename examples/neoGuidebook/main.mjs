import { Image, ItemAPI, ItemComponent, Label, Panel, StackPanel, UIElement } from "../../src/core/index.js";
import { Control } from "../../src/core/ui/Properties/Control.js";
import { Layout } from "../../src/core/ui/Properties/Layout.js";
import { Sprite } from "../../src/core/ui/Properties/Sprite.js";
import { Text } from "../../src/core/ui/Properties/Text.js";
import { Guidebook } from "../../src/core/ui/systems/guidebook.js";

const neoGuidebook = ItemAPI.createItem("sapdon:neo_guidebook", "items", "apple");
neoGuidebook.addComponent(ItemComponent.setCustomComponents(["sapdon:guibook"]));

// 创建一个新的指南
const neo_guidebook = new Guidebook("neo_guidebook:neo_guidebook", "ui/");

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

