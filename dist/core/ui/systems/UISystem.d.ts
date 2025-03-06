export class UISystem {
    constructor(identifier: any, path: any);
    identifier: any;
    namespace: any;
    name: any;
    path: any;
    elements: Map<any, any>;
    animations: Map<any, any>;
    addElement(element: any): this;
    getElement(element_name: any): any;
    addAnimation(name: any, value: any): void;
    getAnimation(animation_name: any): any;
    toJson(): {
        namespace: any;
    };
}
