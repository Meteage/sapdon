export namespace EntityAPI {
    function createNativeEntity(identifier: string, proto_id: string, options?: any): {
        behavior: BasicEntity;
        resource: ClientEntity;
    };
    function createEntity(identifier: string, texture: string, behData: any, resData: any, options?: any): {
        behavior: BasicEntity;
        resource: ClientEntity;
    };
    function createProjectile(identifier: string, texture: string, options?: any): {
        behavior: BasicEntity;
        resource: ClientEntity;
    };
}
import { BasicEntity } from "../entity/BasicEntity.js";
import { ClientEntity } from "../entity/ClientEntity.js";
