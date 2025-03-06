export class NativeEntity {
    constructor(identifier: any, proto_id: any, options?: {});
    identifier: any;
    entity: BasicEntity;
    client_entity: ClientEntity;
}
import { BasicEntity } from "./BasicEntity.js";
import { ClientEntity } from "./ClientEntity.js";
