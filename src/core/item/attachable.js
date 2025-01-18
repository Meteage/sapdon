import { AddonClientEntityDefinition} from "../addon/entity/client_entity.js"
import { AddonAttachable } from "../addon/item/attachable.js"
import { ClientEntity } from "../entity/client_entity.js"


export class Attachable extends ClientEntity{
    constructor(identifier, min_engine_version = "1.8.0"){
        super(identifier, min_engine_version);
    }
    toJson() {
        const entity = new AddonAttachable(
            "1.8.0",
            new AddonClientEntityDefinition(this.description.toJson())
        );
        return entity.toJson();
    }
}

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