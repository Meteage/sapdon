import { Modifications, UIElement } from "../elements/uiElement.js";
import { DataBindingObject } from "../dataBindingObject.js";
import { UISystem } from "./system.js";
import { Panel } from "../elements/panel.js";
import { Button } from "../elements/button.js";
import { Image } from "../elements/image.js";
import { Sprite } from "../properties/sprite.js";

export const ServerFormSystem = new UISystem("server_form:server_form","ui/");


export class ServerFormButton extends UIElement{
  /**
   * 定义一个新的表单按钮
   * @param {*} name 
   * @param {*} binding_button_name 
   */
  constructor(name,binding_button_name){
    super(name,undefined,"server_form.sapdon_form_button_factory")
    this.addVariable("binding_button_text",binding_button_name) 
  }
  /**
   * 
   * @param {string} texture 
   * @returns 
   */
  setDefaultTexture(texture){
    this.addVariable("default_texture",texture)
    return this
  }
  setPressedTexture(texture){
    this.addVariable("pressed_texture",texture)
    return this
  }
  setHoverTexture(texture){
    this.addVariable("hover_texture",texture)
    return this
  }
}

//表单按钮模板
const form_button_template = new Button("sapdon_form_button_template","common.button");
      form_button_template.addVariable("pressed_button_name", "button.form_button_click")
      form_button_template.addVariable("default_texture|default","textures/gui/newgui/buttons/borderless/light")
      form_button_template.addVariable("hover_texture|default","textures/gui/newgui/buttons/borderless/lighthover")
      form_button_template.addVariable("pressed_texture|default","textures/gui/newgui/buttons/borderless/lightpressed")
      form_button_template.addVariable("binding_button_text|default","")
      form_button_template.dataBinding.addDataBinding(
        new DataBindingObject().setBindingType("collection_details")
        .setBindingCollectionName("form_buttons")
      )
      form_button_template.dataBinding.addDataBinding(
        new DataBindingObject().setBindingType("collection")
        .setBindingCollectionName("form_buttons")
        .setBindingName("#form_button_text")
      )
      form_button_template.dataBinding.addDataBinding(
        new DataBindingObject().setBindingType("view")
        .setSourcePropertyName("($binding_button_text = #form_button_text)")
        .setTargetPropertyName("#visible")
      )
      
      form_button_template.addControls([
        new Image("default").setSprite(
            new Sprite().setTexture("$default_texture")
        ),
        new Image("hover").setSprite(
            new Sprite().setTexture("$hover_texture")
        ),
        new Image("pressed").setSprite(
            new Sprite().setTexture("$pressed_texture")
        )
      ])


//f
export const form_button_panel = new Panel("sapdon_form_button_factory")
      form_button_panel.addProp("type","collection_panel")
      form_button_panel.factory.setName("buttons").setControlName("sapdon_form_button_template");
      form_button_panel.addProp("collection_name","form_buttons")
      form_button_panel.dataBinding.addDataBinding(
        new DataBindingObject().setBindingName("#form_button_length")
        .setBindingNameOverride("#collection_length")
      )

ServerFormSystem.addElement(form_button_template)
ServerFormSystem.addElement(form_button_panel)

// third_party_server_screen — custom screen that suppresses the exit animation
const third_party_server_screen = new UIElement("third_party_server_screen", "screen", "common.base_screen");
third_party_server_screen.addVariable("screen_animations", ["@server_form.screen_exit_animation_pop_wait"]);
third_party_server_screen.addVariable("background_animations", ["@server_form.screen_exit_animation_pop_wait"]);
third_party_server_screen.addVariable("screen_content", "server_form.main_screen_content");
third_party_server_screen.addProp("button_mappings", [
  {
    "from_button_id": "button.menu_cancel",
    "to_button_id": "button.menu_exit",
    "mapping_type": "global"
  }
]);
ServerFormSystem.addElement(third_party_server_screen);

// screen_exit_animation_pop_wait — zero-offset animation to suppress exit transition
const screen_exit_animation = new UIElement("screen_exit_animation_pop_wait");
screen_exit_animation.addProp("anim_type", "offset");
screen_exit_animation.addProp("easing", "linear");
screen_exit_animation.addProp("duration", 0.1);
screen_exit_animation.addProp("from", [0, 0]);
screen_exit_animation.addProp("to", [0, 0]);
screen_exit_animation.addProp("play_event", "screen.exit_pop");
screen_exit_animation.addProp("end_event", "screen.exit_end");
ServerFormSystem.addElement(screen_exit_animation);


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
        custom_server_form_factory.factory.setName("server_form_factory")
        .setControlIds({
          "long_form": "@server_form.custom_root_panel"
        });

    //自定义ui模板 (只创建一次)
    if (!ServerFormSystem.getElement("custom_ui_template")) {
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
      ServerFormSystem.addElement(custom_ui_template)
    }

    //main_screen_content (只创建一次)
    if (!ServerFormSystem.getElement("main_screen_content")) {
      const main_screen_content = new UIElement("main_screen_content")
        .addModification({
          array_name: "controls",
          operation:Modifications.OPERATION.INSERT_BACK,
          value:[
            custom_server_form_factory.serialize()
          ]
        });
      ServerFormSystem.addElement(main_screen_content)
    }

    //custom_root_panel 每次重建 (绑定列表变化)
    const custom_form_root = new Panel("custom_form_root")
        custom_form_root.dataBinding.addDataBinding(
          new DataBindingObject().setBindingType("view")
          .setSourceControlName("custom_root_panel")
          .setSourcePropertyName(`(not ((#title_text - ${user_custom_ui_text}) = #title_text))`)
          .setTargetPropertyName("#visible")
        );

    this.#binding_map.forEach((content,key)=>{
      custom_form_root.control.addControl(
        new UIElement("custom_ui_"+key,undefined,"custom_ui_template")
        .addVariable("main_content",content)
        .addVariable("binding_text",key).serialize()
      )
    })

    const custom_root_panel = new Panel("custom_root_panel");
        custom_root_panel.dataBinding.addDataBinding(new DataBindingObject().setBindingName("#title_text"))
        custom_root_panel.control.addControl(custom_form_root.serialize())

    ServerFormSystem
    .addElement(long_form)
    .addElement(custom_root_panel)
  }
}