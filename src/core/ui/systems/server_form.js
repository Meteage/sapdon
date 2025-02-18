import { Modifications, UIElement } from "../elements/UIElement.js";
import { DataBindingObject } from "../DataBindingObject.js";
import { UISystem } from "./UISystem.js";
import { Panel } from "../elements/Panel.js";


export const ServerFromSystem = new UISystem("server_form:server_form","ui/");

/*
    const user_custom_ui_list = ServerUISystem.getAllUISystem();
    //文本化处理
    const user_custom_ui_text = user_custom_ui_list.map(({form_name,ui_system})=>{
        return form_name;
    }).join('-');

    console.log("custom_ui:",user_custom_ui_list)
*/
//对原表单进行合理隐藏
export const updateServerFormSystem = (user_custom_ui_list)=>{

  //文本化处理
const user_custom_ui_text = user_custom_ui_list.map(({form_name,ui_system})=>{
    return `'${form_name}'`;
}).join('-');

const long_form = new UIElement("long_form")
    .addModification({
        array_name: "bindings",
        operation:Modifications.OPERATION.INSERT_BACK,
        value:[
            new DataBindingObject().setBindingName("#title_text"),
            new DataBindingObject().setBindingType("view")
            .setSourcePropertyName(`((#title_text - ${user_custom_ui_text}) = #title_text)`)
            .setTargetPropertyName("#visible")
        ]
    });
  
const custom_server_form_factory =  new Panel("custom_server_form_factory");
      custom_server_form_factory.factory.setName("server_form_factory") //工程名被绑定至表单，不可改动
      .setControlIds({"long_form": "@server_form.custom_root_panel"});

//加入自定义表单内容
const main_screen_content = new UIElement("main_screen_content")
    .addModification({
      array_name: "controls",
      operation:Modifications.OPERATION.INSERT_BACK,
      value:[
        custom_server_form_factory.serialize()
      ]
  });

//自定义ui模板
const custom_ui_template = new Panel("custom_ui_template")
      custom_ui_template.dataBinding.addDataBinding(
        new DataBindingObject().setBindingName("#title_text")
      ).addDataBinding(
        new DataBindingObject().setBindingType("view")
        .setSourcePropertyName("(#title_text = $binding_text)")
        .setTargetPropertyName("#visible")
      )
      custom_ui_template.control.addControl(
        new UIElement("main",undefined,"$main_content").serialize()
      )

//类似于 root ，决定什么时候加载自定义界面 ，不可改动
const custom_form_root = new Panel("custom_form_root")
      //custom_form_root.addVariable("title_needs_to_contain",user_custom_ui_text)
      custom_form_root.dataBinding.addDataBinding(
        new DataBindingObject().setBindingType("view")
        .setSourceControlName("custom_root_panel")
        .setSourcePropertyName(`(not ((#title_text - ${user_custom_ui_text}) = #title_text))`)
        .setTargetPropertyName("#visible")
      );

//用户自定义ui注册
user_custom_ui_list.forEach(({form_name,ui_system}) => {
  //注册
  ServerFromSystem.addElement(ui_system);
  //加入 root
  custom_form_root.control.addControl(
    new UIElement("custom_ui_"+form_name,undefined,"custom_ui_template")
    .addVariable("main_content",ui_system.name)
    .addVariable("binding_text",form_name).serialize()
  )
});

//类似于 sreen，必要，不可改动
const custom_root_panel = new Panel("custom_root_panel");
      custom_root_panel.dataBinding.addDataBinding(new DataBindingObject().setBindingName("#title_text"))
      custom_root_panel.control.addControl(custom_form_root.serialize())
   


ServerFromSystem
  .addElement(custom_ui_template)   
  .addElement(long_form)
  .addElement(custom_root_panel)
  .addElement(main_screen_content)
}
//console.log(JSON.stringify(ServerFromSystem.toJson(),null,2))