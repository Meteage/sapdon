export class Attachable extends AddonAttachableDescription {
    constructor(identifier: any);
    getId(): string;
    toJson(): Object;
}
import { AddonAttachableDescription } from "../addon/item/attachable.js";
