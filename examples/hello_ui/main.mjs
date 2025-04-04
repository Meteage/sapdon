import { Image, Label, Panel, ServerUISystem, StackPanel, UIElement, UISystem } from "../../src/core/index.js";
import { Layout } from "../../src/core/ui/Properties/Layout.js";
import { Sprite } from "../../src/core/ui/Properties/Sprite.js";
import { Text } from "../../src/core/ui/Properties/Text.js";
import { UISystemRegistry } from "../../src/core/ui/registry/UISystemRegistry.js";


const test_ui_root = new Panel("root_panel").enableDebug();
      test_ui_root.setLayout(new Layout().setSize([100,100]))//设置根面板大小，必须
      test_ui_root.addControl(
            //添加堆栈面板
            new StackPanel("main")
            //添加新Stack 水平占比100% 垂直占比 10%
            .addStack(["100%","10%"],
                  //文本元素
                  new Label("title").enableDebug().setText(
                        new Text().setText("我的表单")
                  )
            )
            //添加新Stack 水平占比100% 垂直占比 70%
            .addStack(["100%","70%"],
                  //文本元素
                  new Label("title").enableDebug().setText(
                        new Text().setText("我的表单主体内容test")
                  )
            )
            //添加新Stack 水平占比100% 垂直占比 20%
            .addStack(["100%","20%"],
                  new StackPanel("buttons").setOrientation("horizontal")
                  .addStack(["50%","100%"],
                        //按键实现 继承自"sapdon_form_button_factory"
                        new UIElement("b1",undefined,"server_form.sapdon_form_button_factory").enableDebug()
                        //绑定脚本按钮
                        .addVariable("binding_button_text","test1") //绑定表单按钮test1
                  )
                  .addStack(["50%","100%"],
                        //按键实现 继承自"sapdon_form_button_factory"
                        new UIElement("b2",undefined,"server_form.sapdon_form_button_factory").enableDebug()
                        //绑定脚本按钮
                        .addVariable("binding_button_text","test2") //绑定表单按钮test2
                  )
            )
            
      )

const test_ui_system = new UISystem("test:test_ui","ui/"); //添加ui系统 
      test_ui_system.addElement(test_ui_root) //将根面包加入ui系统里
      
//UISystemRegistry.addOuterUIdefs(["ui/其他ui.json"])  导入外部ui文件

ServerUISystem.bindingTitlewithContent("我的自定义表单","test.root_panel")