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
        this.elements.set(element.id, element.serialize()[element.id]);
        return this;
    }


    addAnimation(name,value){
        this.animations.set(name,value);
    }
  
    toJson() {
        const ui = Object.fromEntries(this.elements);
        ui.namespace = this.namespace;
        return ui;
    }
}
