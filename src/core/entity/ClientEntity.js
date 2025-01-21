import { AddonClientEntity, AddonClientEntityDefinition, AddonClientEntityDescription } from "../addon/entity/client_entity.js";

export class ClientEntity extends AddonClientEntityDescription {
    constructor(identifier){
        super(identifier);
    }
    toJson() {
        const entity = new AddonClientEntity(
            "1.8.0",
            new AddonClientEntityDefinition(this)
        );
        return entity.toJson();
    }
}