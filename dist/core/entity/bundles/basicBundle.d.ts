export class BasicBundle {
    /**
     * 添加组件到捆绑包
     * @param {Map} componentMap 组件
     * @returns {BasicBundle} 返回捆绑包对象
     */
    addComponent(componentMap: Map<any, any>): BasicBundle;
    addComponents(components: any): void;
    removeComponent(name: any): this;
    serialize(): Map<any, any>;
    #private;
}
export const BasicMovementBundle: BasicBundle;
