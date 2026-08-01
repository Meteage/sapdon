import { AddonAttachable, AddonAttachableDefinition, AddonAttachableDescription } from "../addon/item/attachable.js";
import { Serializer, serialize } from "../../utils/index.js"

export class Attachable extends AddonAttachableDescription {
    #formatVersion: string;

    constructor(identifier: string, formatVersion = "1.8.0") {
        super(identifier);
        this.#formatVersion = formatVersion;
    }

    getId(): string {
        return this.identifier;
    }

    @Serializer
    toObject(): Record<string, any> {
        const entity = new AddonAttachable(
            this.#formatVersion,
            new AddonAttachableDefinition(this)
        );
        return serialize(entity) as Record<string, any>;
    }
}
