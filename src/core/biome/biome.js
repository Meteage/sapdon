import { AddonBiome, AddonBiomeDefinition, AddonBiomeDescription } from "../addon/biome.js";
import { Serializer, serialize } from "../../utils/index.js"

export class Biome{
    constructor(identifier){
        this.identifier = identifier;
        this.components = new Map();
    }
    /**
     * 添加组件
     * @param {Map} componentMap 组件 Map
     */
    addComponent(componentMap) {
        if (!componentMap || !(componentMap instanceof Map)) {
            throw new Error("componentMap is required and must be a Map");
        }
        for (const [key, value] of componentMap.entries()) {
            this.components.set(key, value);
        }
        return this;
    }
    
    @Serializer
    toObject(){
        return serialize(new AddonBiome(
            "1.13.0",
            new AddonBiomeDefinition(
                new AddonBiomeDescription(this.identifier),
                Object.fromEntries(this.components)
            )
        ))
    }
}
