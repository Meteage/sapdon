export class UIElement {
    constructor(name: any, type: any, template: any);
    type: any;
    id: any;
    name: any;
    control: Control;
    properties: Map<any, any>;
    variables: Map<any, any>;
    modifications: any[];
    enableDebug(): this;
    setControl(control: any): this;
    addControl(control: any): this;
    addControls(controls: any): this;
    addVariable(name: any, value: any): this;
    addProp(name: any, value: any): this;
    addModification(modification: any): this;
    serialize(): {
        [x: number]: any;
    };
}
/**
 * Modifications ​
    To modify JSON UI in a non-intrusive way, you can use the modifications property to modify previously existing JSON UI elements from other packs (usually vanilla JSON UI files). Doing this makes sure only necessary parts are modified unless otherwise intended, to improve compatibility with other packs that modify the JSON UI.

    Modification	Description
    insert_back	insert at end of array
    insert_front	insert at start of array
    insert_after	insert after target in array
    insert_before	insert before target in array
    move_back	move target to end of array
    move_front	move target to start of array
    move_after	move target after second target
    move_before	move target before second target
    swap	swap first target with second target
    replace	replace first target with second target
    remove	remove target
 */
export class Modifications {
    static OPERATION: Readonly<{
        INSERT_BACK: "insert_back";
        INSERT_FRONT: "insert_front";
        INSERT_AFTER: "insert_after";
        INSERT_BEFORE: "insert_before";
        MOVE_BACK: "move_back";
        MOVE_FRONT: "move_front";
        MOVE_AFTER: "move_after";
        MOVE_BEFORE: "move_before";
        SWAP: "swap";
        REPLACE: "replace";
        REMOVE: "remove";
    }>;
}
import { Control } from "../properties/control.js";
