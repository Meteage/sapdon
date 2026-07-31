import { AddonAttachable, AddonAttachableDefinition, AddonAttachableDescription } from "../addon/item/attachable.js";
import { Serializer, serialize } from "../../utils/index.js"

export class Attachable extends AddonAttachableDescription {
    constructor(identifier: string) {
        super(identifier);
    }

    getId(): string {
        return this.identifier;
    }

    @Serializer
    toObject(): Record<string, any> {
        const entity = new AddonAttachable(
            "1.8.0",
            new AddonAttachableDefinition(this)
        );
        return serialize(entity) as Record<string, any>;
    }
}
