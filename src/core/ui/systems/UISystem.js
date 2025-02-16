// UI 文件核心类
export class UISystem {

    constructor(identity, path) {
      this.identity = identity;
      this.namespace = identity.split(':')[0];
      this.name = identity.split(':')[1];
      this.path = path;
      this.elements = new Map();
      this.animations = new Map();
    }
  
    addElement(element) {
        this.elements.set(element.id, element);
        return this;
    }

    getElement(element_name){
        return this.elements.get(element_name);
    }


    addAnimation(name,value){
        this.animations.set(name,value);
    }

    getAnimation(animation_name){
        return this.animations.get(animation_name);
    }
  
    toJson() {
        const ui = {namespace:this.namespace};
        //序列化
        this.elements.forEach((value,key)=>{
            console.log("elements key:",key)
            console.log("elements value:",value);
            ui[key] = value.serialize()[value.id]
        })
        console.log("ui:",ui)
        return ui;
    }
}
