import { AddonAttachable, AddonAttachableDefinition, AddonAttachableDescription } from "../addon/item/attachable.js";
import { Serializer, serialize } from "../../utils/index.js"

export class Attachable extends AddonAttachableDescription{
    constructor(identifier){
        super(identifier);
    }

    getId() {
        return this.identifier;
    }
    
    @Serializer
    toObject() {
        const entity = new AddonAttachable(
            "1.8.0",
            new AddonAttachableDefinition(this)
        );
        return serialize(entity);
    }
}

/*
const attachable = new Attachable("test")
      attachable.addMaterial("default", "armor")
      attachable.addMaterial("enchanted","armor_enchanted")
      attachable.addTexture("default","textures/models/armor/custom_main")
      attachable.addTexture("enchanted", "textures/misc/enchanted_actor_glint")
      attachable.addGeometry("default", "geometry.player.armor.chestplate")
      attachable.addRenderController("controller.render.armor")
      attachable.setScript("parent_setup","v.chest_layer_visible = 0.0;")

      console.log(JSON.stringify(attachable.@Serializer
    toObject(),null,2))
debugger
*/