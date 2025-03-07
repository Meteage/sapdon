export class Attachable extends AddonAttachableDescription {
    constructor(identifier: any);
    getId(): string;
    toJson(): any;
}
import { AddonAttachableDescription } from "../addon/item/attachable.js";
