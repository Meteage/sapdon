import { AddonClientEntity, AddonClientEntityDefinition, AddonClientEntityDescription } from "../addon/entity/client_entity.js";

export class ClientEntity extends AddonClientEntityDescription {
    constructor(identifier, data = {}){
        super(identifier);
        const keys = Object.keys(data);
        keys.forEach((key)=>{
            if(key == "identifier") return
            this[key] = data[key];
        });
    }
    toJson() {
        const entity = new AddonClientEntity(
            "1.10.0",
            new AddonClientEntityDefinition(this) 
        );
        return entity.toJson();
    }
}