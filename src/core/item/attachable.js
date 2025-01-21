import { AddonAttachable, AddonAttachableDefinition, AddonAttachableDescription } from "../addon/item/attachable.js";


export class Attachable extends AddonAttachableDescription{
    constructor(identifier){
        super(identifier);
    }
    toJson() {
        const entity = new AddonAttachable(
            "1.8.0",
            new AddonAttachableDefinition(this)
        );
        return entity.toJson();
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

      console.log(JSON.stringify(attachable.toJson(),null,2))
debugger
*/