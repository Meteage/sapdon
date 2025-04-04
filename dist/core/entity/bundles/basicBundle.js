import { EntityComponent } from "../componets/entityComponet.js";
export class BasicBundle {
    //私有属性 存储组件
    #components = new Map();
    /**
     * 捆绑包 捆绑包是一个附带有一些实体组件的集合，能够方便地将这些组件添加到一个实体上。
     */
    constructor() {
        //空构造函数
    }
    /**
     * 添加组件到捆绑包
     * @param {Map} componentMap 组件
     * @returns {BasicBundle} 返回捆绑包对象
     */
    addComponent(componentMap) {
        if (!(componentMap instanceof Map)) {
            throw new Error("componentMap must be an instance of Map.");
        }
        for (const [key, value] of componentMap) {
            this.#components.set(key, value);
        }
        return this; // 支持链式调用
    }
    addComponents(components) {
        components.forEach(component_map => {
            this.addComponent(component_map);
        });
    }
    removeComponent(name) {
        this.#components.delete(name);
        return this;
    }
    //序列化
    serialize() {
        return this.#components;
    }
}
