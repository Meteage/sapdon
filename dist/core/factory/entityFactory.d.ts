export function registerEntity(behData: any, resData: any): void;
export namespace EntityAPI {
    function createNativeEntity(identifier: string, proto_id: string, options?: Object): {
        behavior: BasicEntity;
        resource: ClientEntity;
    };
    function createEntity(identifier: string, texture: string, behData: Object, resData: Object, options?: Object): {
        behavior: BasicEntity;
        resource: ClientEntity;
    };
    function createProjectile(identifier: string, texture: string, options?: Object): {
        behavior: BasicEntity;
        resource: ClientEntity;
    };
}
import { BasicEntity } from "../entity/basicEntity.js";
import { ClientEntity } from "../entity/clientEntity.js";
