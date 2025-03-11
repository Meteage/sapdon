export class NativeEntity {
    constructor(identifier: any, proto_id: any, options?: {});
    identifier: any;
    entity: BasicEntity;
    client_entity: ClientEntity;
}
import { BasicEntity } from "./basicEntity.js";
import { ClientEntity } from "./clientEntity.js";
