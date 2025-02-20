import { Modifications, UIElement } from "../elements/UIElement.js";
import { DataBindingObject } from "../DataBindingObject.js";
import { UISystem } from "./UISystem.js";
import { Panel } from "../elements/Panel.js";

export const ServerFormSystem = new UISystem("server_form:server_form","ui/");

export class ServerUISystem  {
  static #binding_map = new Map();

  static #binding_title_list = [];

  static addBindingTitle(title_name){
    this.#binding_title_list.push(title_name);
  }

  static getBindingTitleList(){
    //console.log("arrr:",Array.from(this.#binding_map.keys()))
    return  this.#binding_title_list.concat(Array.from(this.#binding_map.keys()));

  }

  static getBindingContentList(){
    return  Array.from(this.#binding_map.values());
  }

  static bindingTitlewithContent(title_name, content){
    //添加绑定
    this.#binding_map.set(title_name,content);
    this.#updateServerFormSystem();
  }

  static #updateServerFormSystem(){
     //文本化处理
    //console.log("ttttt:",this.getBindingTitleList())
    const user_custom_ui_text = this.getBindingTitleList().map((title_name)=>{
      console.log("title_name",title_name)
      return `'${title_name}'`;
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

    //用户自定义ui内容绑定
    this.#binding_map.forEach((content,key)=>{
      //加入 root
      custom_form_root.control.addControl(
        new UIElement("custom_ui_"+key,undefined,"custom_ui_template")
        .addVariable("main_content",content)
        .addVariable("binding_text",key).serialize()
      )
    })

    //类似于 sreen，必要，不可改动
    const custom_root_panel = new Panel("custom_root_panel");
        custom_root_panel.dataBinding.addDataBinding(new DataBindingObject().setBindingName("#title_text"))
        custom_root_panel.control.addControl(custom_form_root.serialize())
    
    ServerFormSystem
    .addElement(custom_ui_template)   
    .addElement(long_form)
    .addElement(custom_root_panel)
    .addElement(main_screen_content)
  }
}