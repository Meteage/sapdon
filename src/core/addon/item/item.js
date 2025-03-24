import { Serializer } from "@utils"
//item json的结构对应的class

export class AddonItem {
    constructor(format_version,definitions){
        this.format_version = format_version;
        //键名为 ["minecfat:item"]
        this.definitions = definitions;
    }
    @Serializer
    toObject(){
        return {
            format_version:this.format_version,
            ["minecraft:item"]:this.definitions
        }
    }
}

export class AddonItemDefinition{
    constructor(description,components){
        this.description = description;
        this.components = components;
    }
}

export class AddonItemDescription{
    constructor(identifier,menu_category){
        this.identifier = identifier;
        this.menu_category = menu_category;
    }
}
