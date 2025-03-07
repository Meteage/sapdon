export class Biome {
    constructor(identifier: any);
    identifier: any;
    components: Map<any, any>;
    /**
     * 添加组件
     * @param {Map} componentMap 组件 Map
     */
    addComponent(componentMap: Map<any, any>): this;
    toJson(): {
        format_version: any;
        "minecraft:biome": any;
    };
}
